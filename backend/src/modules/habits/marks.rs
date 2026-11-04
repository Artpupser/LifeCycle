use super::dto::MarkInput;
use super::models::{HabitConfig, HabitMark, HabitStatus};
use crate::{
    modules::tasks::{Task, TaskOccurrence, TaskOccurrenceResponse},
    shared::domain,
    shared::errors::ApiError,
};
use axum::http::StatusCode;
use chrono::{NaiveDate, Utc};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

pub(super) fn task_status(mark: &HabitMark, _config: &HabitConfig) -> &'static str {
    match mark.status {
        HabitStatus::Completed => "completed",
        HabitStatus::Skipped | HabitStatus::Cancelled => "rejected",
        HabitStatus::Pending => "todo",
    }
}

pub(super) fn normalize_mark(v: MarkInput, _config: &HabitConfig) -> Result<HabitMark, ApiError> {
    domain::text(&v.note, 0, 200000)?;
    Ok(HabitMark {
        status: v.status,
        note: v.note,
        marked_at: None,
    })
}

pub(super) async fn mark_in_transaction(
    tx: &mut sqlx::PgConnection,
    user: Uuid,
    id: Uuid,
    date: NaiveDate,
    v: MarkInput,
) -> Result<TaskOccurrenceResponse, ApiError> {
    let (task, saved) = editable_occurrence(tx, user, id, date).await?;
    let schedule = task.schedule.as_ref().ok_or_else(ApiError::internal)?;
    let config = task.habit.as_ref().ok_or_else(ApiError::internal)?;
    let mut mark = normalize_mark(v, config)?;
    if let Some(saved) = &saved {
        let mut old = saved.habit_mark.clone().unwrap_or_default();
        old.marked_at = None;
        if old == mark {
            return Ok(TaskOccurrenceResponse {
                occurrence: saved.clone(),
                editable: true,
            });
        }
    }
    mark.marked_at = Some(Utc::now());
    let status = task_status(&mark, config).to_owned();
    let occurrence = TaskOccurrence {
        starts_at: schedule.occurrence_start(date)?,
        task,
        date,
        status,
        habit_mark: Some(mark),
    };
    sqlx::query("INSERT INTO app.task_occurrences(user_id,task_id,occurrence_date,status,snapshot) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,task_id,occurrence_date) DO UPDATE SET status=EXCLUDED.status,snapshot=EXCLUDED.snapshot,updated_at=now()")
        .bind(user).bind(id).bind(date).bind(&occurrence.status).bind(DbJson(&occurrence)).execute(&mut *tx).await?;
    domain::event(
        tx,
        user,
        "habit_marked",
        "habit",
        id,
        serde_json::json!({"date":date,"status":occurrence.habit_mark.as_ref().map(|m|&m.status)}),
    )
    .await?;
    Ok(TaskOccurrenceResponse {
        occurrence,
        editable: true,
    })
}

pub(super) async fn editable_occurrence(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    id: Uuid,
    date: NaiveDate,
) -> Result<(Task, Option<TaskOccurrence>), ApiError> {
    let active: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND id=$2 AND source_kind='habit')",
    )
    .bind(user)
    .bind(id)
    .fetch_one(&mut *db)
    .await?;
    if !active {
        return Err(domain::not_found());
    }
    let saved = sqlx::query_scalar::<_, DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND occurrence_date=$3").bind(user).bind(id).bind(date).fetch_optional(&mut *db).await?;
    let task = if let Some(saved) = &saved {
        saved.task.clone()
    } else {
        sqlx::query_scalar::<_, DbJson<Task>>("SELECT snapshot FROM app.habit_versions WHERE user_id=$1 AND task_id=$2 AND effective_from<=$3 ORDER BY effective_from DESC LIMIT 1").bind(user).bind(id).bind(date).fetch_optional(&mut *db).await?.ok_or_else(domain::not_found)?.0
    };
    let schedule = task.schedule.as_ref().ok_or_else(ApiError::internal)?;
    let today = Utc::now()
        .with_timezone(
            &schedule
                .timezone
                .parse::<chrono_tz::Tz>()
                .map_err(|_| ApiError::internal())?,
        )
        .date_naive();
    if date > today || !schedule.occurs_on(date) {
        return Err(ApiError::validation(
            "Select a current or past scheduled occurrence",
        ));
    }
    Ok((task, saved.map(|row| row.0)))
}

pub async fn workout_occurrence(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    id: Uuid,
    date: NaiveDate,
    workout: Uuid,
) -> Result<TaskOccurrence, ApiError> {
    let (task, saved) = editable_occurrence(db, user, id, date).await?;
    let schedule = task.schedule.as_ref().ok_or_else(ApiError::internal)?;
    if task
        .habit
        .as_ref()
        .is_none_or(|h| h.workout_id != Some(workout))
    {
        return Err(domain::conflict(
            "This occurrence is not linked to the selected workout",
        ));
    }
    if let Some(saved) = saved {
        return Ok(saved);
    }
    Ok(TaskOccurrence {
        starts_at: schedule.occurrence_start(date)?,
        task,
        date,
        status: "todo".into(),
        habit_mark: None,
    })
}

pub async fn complete_workout(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    original: &TaskOccurrence,
    workout: Uuid,
) -> Result<bool, ApiError> {
    let current = match workout_occurrence(db, user, original.task.id, original.date, workout).await
    {
        Ok(value) => value,
        Err(error)
            if error.status == StatusCode::NOT_FOUND
                || error.status == StatusCode::CONFLICT
                || error.status == StatusCode::BAD_REQUEST =>
        {
            return Ok(false);
        }
        Err(error) => return Err(error),
    };
    let mark = current.habit_mark.unwrap_or_default();
    if mark.status == HabitStatus::Completed {
        return Ok(true);
    }
    if matches!(mark.status, HabitStatus::Skipped | HabitStatus::Cancelled) {
        return Ok(false);
    }
    mark_in_transaction(
        db,
        user,
        original.task.id,
        original.date,
        MarkInput {
            status: HabitStatus::Completed,
            note: mark.note,
        },
    )
    .await?;
    Ok(true)
}
