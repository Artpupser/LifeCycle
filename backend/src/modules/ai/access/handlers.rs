use super::models::{Access, BulkAccess, BulkInput, Input};
use super::service::change;
use crate::{
    infrastructure::state::AppState,
    modules::ai,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use uuid::Uuid;

pub(super) async fn notes_bulk(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<BulkInput>,
) -> Result<Json<Vec<BulkAccess>>, ApiError> {
    let ids: std::collections::BTreeSet<_> = v.items.iter().map(|item| item.id).collect();
    if !v.confirmed || v.items.is_empty() || v.items.len() > 200 || ids.len() != v.items.len() {
        return Err(ApiError::validation("Confirm 1–200 distinct notes"));
    }
    let mut tx = s.database.begin().await?;
    ai::config(&mut tx, u.id).await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let mut changed = false;
    let mut result = Vec::with_capacity(v.items.len());
    for item in v.items {
        let old: Access = sqlx::query_as("SELECT ai_shared,ai_access_revision FROM app.notes WHERE user_id=$1 AND id=$2 FOR UPDATE")
            .bind(u.id).bind(item.id).fetch_optional(&mut *tx).await?.ok_or_else(domain::not_found)?;
        if old.ai_access_revision != item.revision {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "ai_access_stale",
                "Sharing changed; reload selected notes",
            ));
        }
        let access = if old.ai_shared == v.ai_shared {
            old
        } else {
            changed = true;
            sqlx::query_as("UPDATE app.notes SET ai_shared=$3,ai_access_revision=ai_access_revision+1 WHERE user_id=$1 AND id=$2 RETURNING ai_shared,ai_access_revision")
                .bind(u.id).bind(item.id).bind(v.ai_shared).fetch_one(&mut *tx).await?
        };
        result.push(BulkAccess {
            id: item.id,
            access,
        });
    }
    if changed {
        sqlx::query(
            "UPDATE app.ai_settings SET revision=revision+1,updated_at=now() WHERE user_id=$1",
        )
        .bind(u.id)
        .execute(&mut *tx)
        .await?;
        ai::invalidate(&mut tx, u.id).await?;
    }
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Access>, ApiError> {
    change(s, u.id, id, v, "notes").await
}

pub(super) async fn workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Access>, ApiError> {
    change(s, u.id, id, v, "workouts").await
}

pub(super) async fn exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Access>, ApiError> {
    change(s, u.id, id, v, "exercises").await
}
