use crate::{
    infrastructure::state::AppState, modules::tasks::Task, shared::domain, shared::errors::ApiError,
};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

pub(super) async fn owned(s: &AppState, user: Uuid, id: Uuid) -> Result<Task, ApiError> {
    sqlx::query_as("SELECT * FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='habit'")
        .bind(id)
        .bind(user)
        .fetch_optional(&s.database)
        .await?
        .ok_or_else(domain::not_found)
}

pub(crate) async fn historical_tasks(s: &AppState, user: Uuid) -> Result<Vec<Task>, ApiError> {
    Ok(sqlx::query_scalar::<_, DbJson<Task>>("SELECT DISTINCT ON(task_id) snapshot FROM app.habit_versions WHERE user_id=$1 ORDER BY task_id,effective_from DESC")
        .bind(user).fetch_all(&s.database).await?.into_iter().map(|v|v.0).collect())
}

pub(super) async fn historical_task(s: &AppState, user: Uuid, id: Uuid) -> Result<Task, ApiError> {
    Ok(sqlx::query_scalar::<_, DbJson<Task>>("SELECT snapshot FROM app.habit_versions WHERE user_id=$1 AND task_id=$2 ORDER BY effective_from DESC LIMIT 1")
        .bind(user).bind(id).fetch_optional(&s.database).await?.ok_or_else(domain::not_found)?.0)
}
