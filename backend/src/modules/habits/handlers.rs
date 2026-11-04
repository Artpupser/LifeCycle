use super::dto::{DeleteHistory, HabitInput, MarkInput, Range};
use super::marks::mark_in_transaction;
use super::models::HabitStatistics;
use super::occurrences::{occurrences, validate_range};
use super::repository::{historical_task, historical_tasks, owned};
use super::service::save;
use super::statistics::summarize;
use crate::{
    infrastructure::state::AppState,
    modules::tasks::{self, Task, TaskOccurrence, TaskOccurrenceResponse},
    shared::auth::CurrentUser,
    shared::domain::{self, Search},
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::{NaiveDate, Utc};
use sqlx::types::Json as DbJson;
use std::collections::BTreeSet;
use uuid::Uuid;

pub(super) async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Task>>, ApiError> {
    q.validate()?;
    Ok(Json(sqlx::query_as("SELECT * FROM app.tasks WHERE user_id=$1 AND source_kind='habit' AND ($2::text IS NULL OR strpos(lower(title||' '||description),lower($2))>0) AND ($3::text IS NULL OR tags ? $3) ORDER BY created_at,id")
        .bind(u.id).bind(q.q).bind(q.tag).fetch_all(&s.database).await?))
}

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(owned(&s, u.id, id).await?))
}

pub(super) async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<HabitInput>,
) -> Result<(StatusCode, Json<Task>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}

pub(super) async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<HabitInput>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(save(&s, u.id, id, v, false).await?))
}

pub(super) async fn delete(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    sqlx::query("UPDATE app.habit_versions SET ended_at=now() WHERE user_id=$1 AND task_id=$2 AND ended_at IS NULL").bind(u.id).bind(id).execute(&mut *tx).await?;
    let count =
        sqlx::query("DELETE FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='habit'")
            .bind(id)
            .bind(u.id)
            .execute(&mut *tx)
            .await?
            .rows_affected();
    if count == 0 {
        return Err(domain::not_found());
    }
    // A discarded draft with no recorded results must not create a permanent statistics card.
    sqlx::query("DELETE FROM app.habit_versions WHERE user_id=$1 AND task_id=$2 AND NOT EXISTS(SELECT 1 FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2) AND NOT EXISTS(SELECT 1 FROM app.workout_sessions WHERE user_id=$1 AND strpos(snapshot::text,$3)>0)")
        .bind(u.id).bind(id).bind(id.to_string()).execute(&mut *tx).await?;
    domain::event(
        &mut tx,
        u.id,
        "habit_deleted",
        "habit",
        id,
        serde_json::json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn delete_history(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<DeleteHistory>,
) -> Result<StatusCode, ApiError> {
    if !v.confirmed {
        return Err(ApiError::validation("Confirm history deletion"));
    }
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.habit_versions WHERE user_id=$1 AND task_id=$2)",
    )
    .bind(u.id)
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;
    if !exists {
        return Err(domain::not_found());
    }
    let active: bool =
        sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND id=$2)")
            .bind(u.id)
            .bind(id)
            .fetch_one(&mut *tx)
            .await?;
    if active {
        return Err(domain::conflict("Delete the habit before its history"));
    }
    sqlx::query("DELETE FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;

    sqlx::query("DELETE FROM app.habit_versions WHERE user_id=$1 AND task_id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    sqlx::query(
        "DELETE FROM app.activity_events WHERE user_id=$1 AND entity_id=$2 AND entity_type='habit'",
    )
    .bind(u.id)
    .bind(id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn mark(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, date)): Path<(Uuid, NaiveDate)>,
    ApiJson(v): ApiJson<MarkInput>,
) -> Result<Json<TaskOccurrenceResponse>, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let result = mark_in_transaction(&mut tx, u.id, id, date, v).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn history(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<TaskOccurrenceResponse>>, ApiError> {
    historical_task(&s, u.id, id).await?;
    let active: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND id=$2 AND source_kind='habit')",
    )
    .bind(u.id)
    .bind(id)
    .fetch_one(&s.database)
    .await?;
    let rows=sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND NOT EXISTS(SELECT 1 FROM app.history_removals h WHERE h.user_id=$1 AND h.kind='habit' AND h.item_key=$2::text||':'||occurrence_date::text) ORDER BY occurrence_date DESC")
        .bind(u.id).bind(id).fetch_all(&s.database).await?;
    Ok(Json(
        rows.into_iter()
            .map(|v| TaskOccurrenceResponse {
                occurrence: v.0,
                editable: active,
            })
            .collect(),
    ))
}

pub(super) async fn statistics(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Range>,
) -> Result<Json<Vec<HabitStatistics>>, ApiError> {
    validate_range(q.from, q.to)?;
    let settings = domain::settings(&s, u.id).await?;
    let rows = occurrences(&s, u.id, q.from, q.to, &settings.timezone).await?;
    let tasks = historical_tasks(&s, u.id).await?;
    let active: BTreeSet<Uuid> =
        sqlx::query_scalar("SELECT id FROM app.tasks WHERE user_id=$1 AND source_kind='habit'")
            .bind(u.id)
            .fetch_all(&s.database)
            .await?
            .into_iter()
            .collect();
    let now = Utc::now();
    let mut stats: Vec<_> = tasks
        .iter()
        .map(|task| {
            let mut stat = summarize(task, &rows, now);
            stat.active = active.contains(&task.id);
            stat
        })
        .collect();
    stats.sort_by(|a, b| {
        b.completion_rate
            .total_cmp(&a.completion_rate)
            .then(b.completed.cmp(&a.completed))
            .then(a.title.cmp(&b.title))
    });
    Ok(Json(stats))
}

pub(super) async fn single_statistics(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    Query(q): Query<Range>,
) -> Result<Json<HabitStatistics>, ApiError> {
    let task = historical_task(&s, u.id, id).await?;
    let settings = domain::settings(&s, u.id).await?;
    let rows = occurrences(&s, u.id, q.from, q.to, &settings.timezone).await?;
    let mut stat = summarize(&task, &rows, Utc::now());
    stat.active = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND id=$2 AND source_kind='habit')",
    )
    .bind(u.id)
    .bind(id)
    .fetch_one(&s.database)
    .await?;
    Ok(Json(stat))
}
