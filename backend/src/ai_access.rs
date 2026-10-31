//! Per-object access is changed only by the owner, never by AI action payloads.
use crate::{
    ai,
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    state::AppState,
    tasks,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::put,
};
use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    ai_shared: bool,
    revision: i64,
}
#[derive(Serialize, sqlx::FromRow)]
struct Access {
    ai_shared: bool,
    ai_access_revision: i64,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/notes/{id}/ai-access", put(note))
        .route("/api/workouts/{id}/ai-access", put(workout))
        .route("/api/exercises/{id}/ai-access", put(exercise))
}
async fn note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Access>, ApiError> {
    change(s, u.id, id, v, "notes").await
}
async fn workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Access>, ApiError> {
    change(s, u.id, id, v, "workouts").await
}
async fn exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Access>, ApiError> {
    change(s, u.id, id, v, "exercises").await
}
async fn change(
    s: AppState,
    user: Uuid,
    id: Uuid,
    v: Input,
    table: &str,
) -> Result<Json<Access>, ApiError> {
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
    match kind {
        "notes" | "workouts" | "exercises" => Ok(sqlx::query_scalar(&format!(
            "SELECT EXISTS(SELECT 1 FROM app.{kind} WHERE user_id=$1 AND id=$2 AND ai_shared)"
        ))
        .bind(user)
        .bind(id)
        .fetch_one(db)
        .await?),
        _ => Ok(true),
    }
}
