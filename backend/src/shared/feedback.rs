//! Durable delivery extends the existing UI feedback owner; feature modules only enqueue messages.
mod push;
use crate::{
    infrastructure::state::AppState,
    shared::{auth::CurrentUser, errors::ApiError},
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
pub(crate) use push::deliver as deliver_push;
use serde::{Deserialize, Serialize};
use uuid::Uuid;
#[derive(Serialize, Deserialize)]
pub struct Message {
    pub message: String,
    pub parameters: serde_json::Value,
    pub href: String,
}
#[derive(Serialize)]
struct Entry {
    pub id: Uuid,
    #[serde(flatten)]
    pub message: Message,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/notifications", get(list))
        .route(
            "/api/notifications/push",
            get(push::configuration)
                .put(push::subscribe)
                .delete(push::unsubscribe),
        )
        .route("/api/notifications/{id}/read", post(read))
}
pub async fn enqueue(
    s: &AppState,
    db: &mut sqlx::PgConnection,
    user: Uuid,
    key: &str,
    message: Message,
) -> Result<(), ApiError> {
    if !message.href.starts_with('/')
        || message.href.starts_with("//")
        || message.href.len() > 300
        || key.len() > 300
    {
        return Err(ApiError::validation("Invalid notification"));
    }
    let id = Uuid::new_v4();
    let bytes = s.cipher.encrypt(
        &serde_json::to_vec(&message).map_err(|_| ApiError::internal())?,
        format!("feedback:{user}:{id}").as_bytes(),
    )?;
    sqlx::query("INSERT INTO app.feedback_notifications(id,user_id,dedupe_key,encrypted_data) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,dedupe_key) DO NOTHING").bind(id).bind(user).bind(key).bind(bytes).execute(db).await?;
    Ok(())
}
async fn list(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Entry>>, ApiError> {
    let rows:Vec<(Uuid,Vec<u8>)>=sqlx::query_as("SELECT id,encrypted_data FROM app.feedback_notifications WHERE user_id=$1 AND read_at IS NULL ORDER BY created_at LIMIT 20").bind(u.id).fetch_all(&s.database).await?;
    let mut result = vec![];
    for (id, bytes) in rows {
        let message = serde_json::from_slice(
            &s.cipher
                .decrypt(&bytes, format!("feedback:{}:{id}", u.id).as_bytes())?,
        )
        .map_err(|_| ApiError::internal())?;
        result.push(Entry { id, message });
    }
    Ok(Json(result))
}
async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    sqlx::query("UPDATE app.feedback_notifications SET read_at=now() WHERE id=$1 AND user_id=$2 AND read_at IS NULL").bind(id).bind(u.id).execute(&s.database).await?;
    Ok(StatusCode::NO_CONTENT)
}
