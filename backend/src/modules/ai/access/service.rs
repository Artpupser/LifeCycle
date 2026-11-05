use super::models::{Access, Input};
use crate::{
    infrastructure::state::AppState, modules::ai, modules::tasks, shared::domain,
    shared::errors::ApiError,
};
use axum::{Json, http::StatusCode};
use sqlx::PgConnection;
use uuid::Uuid;

pub(crate) async fn change(
    s: AppState,
    user: Uuid,
    id: Uuid,
    v: Input,
    table: &str,
) -> Result<Json<Access>, ApiError> {
    let table = object_table(table)?;
    let mut tx = s.database.begin().await?;
    ai::config(&mut tx, user).await?;
    tasks::lock_tasks(&mut tx, user).await?;
    let old: Access = sqlx::query_as(&format!(
        "SELECT ai_shared,ai_access_revision FROM app.{table} WHERE user_id=$1 AND id=$2 FOR UPDATE"
    ))
    .bind(user)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    if old.ai_access_revision != v.revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "ai_access_stale",
            "Sharing changed; reload this item",
        ));
    }
    let result = if old.ai_shared == v.ai_shared {
        old
    } else {
        let result=sqlx::query_as(&format!("UPDATE app.{table} SET ai_shared=$3,ai_access_revision=ai_access_revision+1 WHERE user_id=$1 AND id=$2 RETURNING ai_shared,ai_access_revision"))
            .bind(user).bind(id).bind(v.ai_shared).fetch_one(&mut *tx).await?;
        sqlx::query(
            "UPDATE app.ai_settings SET revision=revision+1,updated_at=now() WHERE user_id=$1",
        )
        .bind(user)
        .execute(&mut *tx)
        .await?;
        ai::invalidate(&mut tx, user).await?;
        result
    };
    tx.commit().await?;
    Ok(Json(result))
}

pub(crate) async fn exercise_visible(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<bool, ApiError> {
    visible(db, user, "exercises", id).await
}

pub(crate) async fn visible(
    db: &mut PgConnection,
    user: Uuid,
    kind: &str,
    id: Uuid,
) -> Result<bool, ApiError> {
    let table = object_table(kind)?;
    Ok(sqlx::query_scalar(&format!(
        "SELECT EXISTS(SELECT 1 FROM app.{table} WHERE user_id=$1 AND id=$2 AND ai_shared)"
    ))
    .bind(user)
    .bind(id)
    .fetch_one(db)
    .await?)
}

pub(crate) fn object_table(kind: &str) -> Result<&'static str, ApiError> {
    match kind {
        "notes" => Ok("notes"),
        "tasks" | "habits" => Ok("tasks"),
        "workouts" => Ok("workouts"),
        "exercises" => Ok("exercises"),
        "contacts" => Ok("contacts"),
        "countdowns" => Ok("countdowns"),
        "intimacy" => Ok("intimacy_entries"),
        "boards" => Ok("task_boards"),
        _ => Err(ApiError::validation("Unsupported AI subject")),
    }
}
