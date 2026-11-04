use super::models::{Chat, Config, Turn, TurnRow};
use super::service::open;
use crate::{infrastructure::state::AppState, shared::domain, shared::errors::ApiError};
use sqlx::PgConnection;
use uuid::Uuid;

pub(super) const TURN_COLUMNS: &str =
    "id,config_revision,model,provider,status,error_code,encrypted_data,created_at,finished_at";

pub(crate) async fn config(db: &mut PgConnection, user: Uuid) -> Result<Config, ApiError> {
    sqlx::query("INSERT INTO app.ai_settings(user_id) VALUES($1) ON CONFLICT DO NOTHING")
        .bind(user)
        .execute(&mut *db)
        .await?;
    Ok(sqlx::query_as("SELECT model,enabled,permissions,encrypted_key,encrypted_openrouter_key,provider,auth_mode,active_account_id,revision,ollama_url FROM app.ai_settings WHERE user_id=$1 FOR UPDATE").bind(user).fetch_one(db).await?)
}

pub(crate) async fn invalidate(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("DELETE FROM app.ai_previews WHERE user_id=$1")
        .bind(user)
        .execute(&mut *db)
        .await?;
    sqlx::query("UPDATE app.ai_turns SET status='cancelled',error_code='ai_permissions_changed',finished_at=now() WHERE user_id=$1 AND status='pending'").bind(user).execute(&mut *db).await?;
    sqlx::query("DELETE FROM app.ai_login_attempts WHERE user_id=$1")
        .bind(user)
        .execute(db)
        .await?;
    Ok(())
}

pub(super) async fn expire(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("UPDATE app.ai_turns SET status='failed',error_code='ai_interrupted',finished_at=now() WHERE user_id=$1 AND status='pending' AND created_at<now()-interval '2 minutes'").bind(user).execute(&mut *db).await?;
    sqlx::query("DELETE FROM app.ai_previews WHERE user_id=$1 AND expires_at<=now()")
        .bind(user)
        .execute(db)
        .await?;
    Ok(())
}

pub(super) async fn require_chat(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<Chat, ApiError> {
    sqlx::query_as(
        "SELECT id,version,created_at FROM app.ai_chats WHERE id=$1 AND user_id=$2 FOR UPDATE",
    )
    .bind(id)
    .bind(user)
    .fetch_optional(db)
    .await?
    .ok_or_else(domain::not_found)
}

pub(super) fn turn(s: &AppState, user: Uuid, chat: Uuid, row: TurnRow) -> Result<Turn, ApiError> {
    let data = open(
        s,
        &format!("ai:turn:{user}:{chat}:{}", row.id),
        &row.encrypted_data,
    )?;
    Ok(Turn {
        id: row.id,
        config_revision: row.config_revision,
        model: row.model,
        provider: row.provider,
        status: row.status,
        error_code: row.error_code,
        data,
        created_at: row.created_at,
        finished_at: row.finished_at,
    })
}

pub(super) async fn history(s: &AppState, user: Uuid, chat: Uuid) -> Result<Vec<Turn>, ApiError> {
    let rows:Vec<TurnRow>=sqlx::query_as(&format!("SELECT {TURN_COLUMNS} FROM app.ai_turns WHERE user_id=$1 AND chat_id=$2 ORDER BY created_at,id")).bind(user).bind(chat).fetch_all(&s.database).await?;
    rows.into_iter()
        .map(|row| turn(s, user, chat, row))
        .collect()
}

pub(super) async fn load_turn(
    s: &AppState,
    user: Uuid,
    chat: Uuid,
    id: Uuid,
) -> Result<Turn, ApiError> {
    let row = sqlx::query_as(&format!(
        "SELECT {TURN_COLUMNS} FROM app.ai_turns WHERE user_id=$1 AND chat_id=$2 AND id=$3"
    ))
    .bind(user)
    .bind(chat)
    .bind(id)
    .fetch_optional(&s.database)
    .await?
    .ok_or_else(domain::not_found)?;
    turn(s, user, chat, row)
}
