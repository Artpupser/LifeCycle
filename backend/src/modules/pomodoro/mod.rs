//! Pomodoro module.
mod handlers;
mod models;
mod routes;
#[cfg(test)]
mod tests;
pub(crate) use models::Session;
pub use routes::routes;
pub(crate) mod programs;

/// Resolve the same current occurrence used by Today before linking a new timer.
pub(crate) async fn ensure_focus_task(
    state: &crate::infrastructure::state::AppState,
    user: uuid::Uuid,
    id: uuid::Uuid,
) -> Result<(), crate::shared::errors::ApiError> {
    use crate::{modules::tasks, shared::domain};
    let task = tasks::get_active(state, user, id).await?;
    let settings = domain::settings(state, user).await?;
    let zone = settings.timezone.parse::<chrono_tz::Tz>().map_err(|_| crate::shared::errors::ApiError::internal())?;
    let today = chrono::Utc::now().with_timezone(&zone).date_naive();
    let occurrences = tasks::occurrences(state, user, today, today, &settings.timezone).await?;
    let recurring = task.schedule.as_ref().is_some_and(|schedule| schedule.recurrence != "once");
    let status = occurrences.iter().find(|item| item.occurrence.task.id == id).map(|item| item.occurrence.status.as_str()).or(if recurring { None } else { Some(task.status.as_str()) });
    if !matches!(status, Some("todo" | "in_progress")) {
        return Err(domain::conflict("Choose an unfinished task for focus"));
    }
    Ok(())
}
