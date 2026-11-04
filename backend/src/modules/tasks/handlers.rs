use super::dto::{
    CalendarQuery, CalendarResponse, OccurrenceInput, PlanInput, TaskInput, TodayQuery,
    TodayResponse,
};
use super::models::{Task, TaskOccurrence, TaskOccurrenceResponse};
use super::planning::{replanned, schedule_matches_profile_dates};
use super::repository::{get_active, lock_tasks};
use super::service::{delete_in, occurrences, persist_occurrence, save, save_in, valid_status};
use crate::{
    infrastructure::state::AppState,
    shared::auth::CurrentUser,
    shared::domain::{self, Search},
    shared::errors::{ApiError, ApiJson},
    shared::schedule::Schedule,
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::NaiveDate;
use sqlx::types::Json as DbJson;
use uuid::Uuid;

pub(super) async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Task>>, ApiError> {
    q.validate()?;
    if let Some(status) = &q.status {
        valid_status(status)?;
    }
    if q.from
        .zip(q.to)
        .is_some_and(|(a, b)| b < a || (b - a).num_days() > 365)
    {
        return Err(ApiError::validation(
            "Date filter must cover at most 366 dates",
        ));
    }
    let tasks = sqlx::query_as::<_, Task>(
        "SELECT * FROM app.tasks WHERE user_id=$1 AND source_kind='manual'
         AND ($2::text IS NULL OR strpos(lower(title||' '||description),lower($2))>0)
         AND ($3::text IS NULL OR status=$3) AND ($4::text IS NULL OR tags ? $4)
         ORDER BY created_at,id",
    )
    .bind(u.id)
    .bind(&q.q)
    .bind(&q.status)
    .bind(&q.tag)
    .fetch_all(&s.database)
    .await?;
    if q.from.is_none() && q.to.is_none() {
        return Ok(Json(tasks));
    }
    let timezone = domain::settings(&s, u.id)
        .await?
        .timezone
        .parse::<chrono_tz::Tz>()
        .map_err(|_| ApiError::internal())?;
    let filtered = tasks
        .into_iter()
        .filter(|task| {
            if let Some(schedule) = &task.schedule {
                schedule_matches_profile_dates(schedule, q.from, q.to, &timezone)
            } else if let Some(due) = task.due_at {
                let date = due.with_timezone(&timezone).date_naive();
                q.from.is_none_or(|from| date >= from) && q.to.is_none_or(|to| date <= to)
            } else {
                false
            }
        })
        .collect();
    Ok(Json(filtered))
}

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(get_active(&s, u.id, id).await?))
}

pub(super) async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<TaskInput>,
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
    ApiJson(v): ApiJson<TaskInput>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(save(&s, u.id, id, v, false).await?))
}

pub(super) async fn delete(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn mark(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, date)): Path<(Uuid, NaiveDate)>,
    ApiJson(v): ApiJson<OccurrenceInput>,
) -> Result<Json<TaskOccurrenceResponse>, ApiError> {
    valid_status(&v.status)?;
    let mut tx = s.database.begin().await?;
    lock_tasks(&mut tx, u.id).await?;
    let task: Task = sqlx::query_as("SELECT * FROM app.tasks WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(u.id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    if task.source_kind != "manual" {
        return Err(domain::conflict("Use habit marks for this occurrence"));
    }
    if task
        .schedule
        .as_ref()
        .is_some_and(|schedule| !schedule.occurs_on(date))
    {
        return Err(ApiError::validation(
            "Task does not occur on the selected date",
        ));
    }
    let occurrence = persist_occurrence(&mut tx, u.id, &task, date, &v.status).await?;
    if task
        .schedule
        .as_ref()
        .is_none_or(|v| v.recurrence == "once")
    {
        sqlx::query("UPDATE app.tasks SET status=$3,updated_at=now() WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .bind(&v.status)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(Json(TaskOccurrenceResponse {
        occurrence,
        editable: true,
    }))
}

pub(super) async fn history(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<TaskOccurrenceResponse>>, ApiError> {
    let rule = sqlx::query_as::<_, (Option<DbJson<Schedule>>,)>(
        "SELECT schedule FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='manual'",
    )
    .bind(id)
    .bind(u.id)
    .fetch_optional(&s.database)
    .await?;
    let rows = sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND snapshot->'task'->>'source_kind'='manual' AND NOT EXISTS(SELECT 1 FROM app.history_removals h WHERE h.user_id=$1 AND h.kind='task' AND h.item_key=$2::text||':'||occurrence_date::text) ORDER BY occurrence_date DESC").bind(u.id).bind(id).fetch_all(&s.database).await?;
    if rule.is_none() && rows.is_empty() {
        return Err(domain::not_found());
    }
    Ok(Json(
        rows.into_iter()
            .map(|row| {
                let occurrence = row.0;
                let editable = rule.as_ref().is_some_and(|(schedule,)| {
                    schedule
                        .as_ref()
                        .is_none_or(|schedule| schedule.occurs_on(occurrence.date))
                });
                TaskOccurrenceResponse {
                    occurrence,
                    editable,
                }
            })
            .collect(),
    ))
}

pub(super) async fn today(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<TodayQuery>,
) -> Result<Json<TodayResponse>, ApiError> {
    let (local, timezone) = domain::local_today(&s, u.id).await?;
    let date = q.date.unwrap_or(local);
    let tasks = occurrences(&s, u.id, date, date, &timezone).await?;
    let events = crate::modules::countdowns::occurrences(&s, u.id, date, date, &timezone).await?;
    Ok(Json(TodayResponse {
        date,
        timezone,
        tasks,
        events,
    }))
}

pub(super) async fn calendar(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<CalendarQuery>,
) -> Result<Json<CalendarResponse>, ApiError> {
    let timezone = domain::settings(&s, u.id).await?.timezone;
    let mut occurrences = occurrences(&s, u.id, q.from, q.to, &timezone).await?;
    occurrences.retain(|item| item.occurrence.status != "completed");
    let events = crate::modules::countdowns::occurrences(&s, u.id, q.from, q.to, &timezone).await?;
    Ok(Json(CalendarResponse {
        from: q.from,
        to: q.to,
        timezone,
        occurrences,
        events,
    }))
}

pub(super) async fn update_plan(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<PlanInput>,
) -> Result<Json<Task>, ApiError> {
    let mut tx = s.database.begin().await?;
    lock_tasks(&mut tx, u.id).await?;
    let task: Task = sqlx::query_as("SELECT * FROM app.tasks WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    if task.updated_at != v.expected_updated_at {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "task_stale",
            "Task changed; reload before rescheduling",
        ));
    }
    if task.source_kind != "manual" || matches!(task.status.as_str(), "completed" | "rejected") {
        return Err(domain::conflict(
            "Only pending manual tasks can be rescheduled on the timeline",
        ));
    }
    let schedule = task
        .schedule
        .ok_or_else(|| ApiError::validation("Add a schedule before using the timeline"))?
        .0;
    let finalized: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND occurrence_date=$3 AND status IN ('completed','rejected'))")
        .bind(u.id).bind(id).bind(v.occurrence_date.unwrap_or(schedule.start_date)).fetch_one(&mut *tx).await?;
    if finalized {
        return Err(domain::conflict(
            "Historical results cannot be moved on the timeline",
        ));
    }
    let schedule = replanned(schedule, v.starts_at, v.duration_minutes, v.occurrence_date)?;
    let input = TaskInput {
        title: task.title,
        description: task.description,
        status: task.status,
        tags: task.tags.0,
        color: task.color,
        priority: task.priority,
        parent_id: task.parent_id,
        due_at: task.due_at,
        schedule: Some(schedule),
    };
    let result = save_in(&s, &mut tx, u.id, id, input, false).await?;
    tx.commit().await?;
    Ok(Json(result))
}
