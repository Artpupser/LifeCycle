use super::models::Chat;
use super::repository::{config, expire, history, require_chat};
use crate::{
    infrastructure::state::AppState, shared::auth::CurrentUser, shared::domain,
    shared::errors::ApiError,
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn chats(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Chat>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,version,created_at FROM app.ai_chats WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 100").bind(u.id).fetch_all(&s.database).await?))
}

pub(super) async fn create_chat(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<(StatusCode, Json<Chat>), ApiError> {
    let mut tx = s.database.begin().await?;
    config(&mut tx, u.id).await?;
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM app.ai_chats WHERE user_id=$1")
        .bind(u.id)
        .fetch_one(&mut *tx)
        .await?;
    if count >= 100 {
        return Err(domain::conflict(
            "Delete an old conversation before creating another",
        ));
    }
    let chat = sqlx::query_as(
        "INSERT INTO app.ai_chats(id,user_id) VALUES($1,$2) RETURNING id,version,created_at",
    )
    .bind(Uuid::new_v4())
    .bind(u.id)
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(chat)))
}

pub(super) async fn read_chat(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, ApiError> {
    let mut tx = s.database.begin().await?;
    config(&mut tx, u.id).await?;
    expire(&mut tx, u.id).await?;
    let chat = require_chat(&mut tx, u.id, id).await?;
    let messages = history(&s, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(json!({"chat":chat,"messages":messages})))
}

pub(super) async fn delete_chat(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    config(&mut tx, u.id).await?;
    require_chat(&mut tx, u.id, id).await?;
    sqlx::query("DELETE FROM app.ai_chats WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
