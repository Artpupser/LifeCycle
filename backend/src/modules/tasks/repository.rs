use super::models::Task;
use crate::{infrastructure::state::AppState, shared::domain, shared::errors::ApiError};
use sqlx::PgConnection;
use uuid::Uuid;

pub async fn get_active(state: &AppState, user: Uuid, id: Uuid) -> Result<Task, ApiError> {
    sqlx::query_as("SELECT * FROM app.tasks WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .fetch_optional(&state.database)
        .await?
        .ok_or_else(domain::not_found)
}

pub async fn lock_tasks(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(user.to_string())
        .execute(db)
        .await?;
    Ok(())
}
