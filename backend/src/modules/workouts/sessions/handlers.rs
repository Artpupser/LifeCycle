use super::models::{Command, HistoryQuery, Session, Start, Summary};
use crate::{
    infrastructure::state::AppState,
    modules::habits,
    modules::tasks,
    modules::workouts,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use chrono::Utc;
use sqlx::types::Json as DbJson;
use uuid::Uuid;

pub(super) async fn active(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Option<Session>>, ApiError> {
    let row = sqlx::query_as::<_, Session>(
        "SELECT * FROM app.workout_sessions WHERE user_id=$1 AND status IN ('running','paused')",
    )
    .bind(u.id)
    .fetch_optional(&s.database)
    .await?;
    Ok(Json(row.map(Session::display)))
}

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Session>, ApiError> {
    Ok(Json(
        sqlx::query_as::<_, Session>(
            "SELECT * FROM app.workout_sessions WHERE user_id=$1 AND id=$2",
        )
        .bind(u.id)
        .bind(id)
        .fetch_optional(&s.database)
        .await?
        .ok_or_else(domain::not_found)?
        .display(),
    ))
}

pub(super) async fn history(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<HistoryQuery>,
) -> Result<Json<Vec<Summary>>, ApiError> {
    let rows = sqlx::query_as::<_,Summary>("SELECT id,workout_id,snapshot->'plan'->>'title' AS title,(snapshot->>'date')::date AS date,status,jsonb_array_length(results) AS confirmed_steps,habit_completed,started_at,ended_at FROM app.workout_sessions WHERE user_id=$1 AND NOT EXISTS(SELECT 1 FROM app.history_removals h WHERE h.user_id=$1 AND h.kind='workout' AND h.item_key=app.workout_sessions.id::text) AND ($2::uuid IS NULL OR workout_id=$2) AND ($3::timestamptz IS NULL OR started_at<$3) ORDER BY started_at DESC,id LIMIT 50").bind(u.id).bind(q.workout_id).bind(q.before).fetch_all(&s.database).await?;
    Ok(Json(rows))
}

pub(super) async fn start(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Start>,
) -> Result<Json<Session>, ApiError> {
    if v.habit_id.is_some() != v.date.is_some() {
        return Err(ApiError::validation(
            "Habit and occurrence date must be supplied together",
        ));
    }
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    if let Some(row) = sqlx::query_as::<_, Session>(
        "SELECT * FROM app.workout_sessions WHERE user_id=$1 AND status IN ('running','paused')",
    )
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?
    {
        if row.workout_id == v.workout_id
            && row.habit_id == v.habit_id
            && row.occurrence_date == v.date
        {
            return Ok(Json(row.display()));
        }
        return Err(domain::conflict(
            "Finish or cancel the active workout first",
        ));
    }
    if v.habit_id.is_some()
        && let Some(row) = sqlx::query_as::<_,Session>("SELECT * FROM app.workout_sessions WHERE user_id=$1 AND habit_id=$2 AND occurrence_date=$3 AND status='completed'").bind(u.id).bind(v.habit_id).bind(v.date).fetch_optional(&mut *tx).await?
    {
        if row.workout_id != v.workout_id {
            return Err(domain::conflict("This occurrence already has a completed workout"));
        }
        return Ok(Json(row));
    }
    let workout = workouts::require_active(&mut tx, u.id, v.workout_id).await?;
    let exercises = workouts::active_exercises(&mut tx, u.id).await?;
    workout.validate(&exercises)?;
    let occurrence = if let (Some(id), Some(date)) = (v.habit_id, v.date) {
        Some(habits::workout_occurrence(&mut tx, u.id, id, date, v.workout_id).await?)
    } else {
        None
    };
    let date = if let Some(date) = v.date {
        date
    } else {
        domain::local_today(&s, u.id).await?.0
    };
    let snapshot = workout.snapshot(&exercises, date);
    if serde_json::to_vec(&snapshot)
        .map_err(|_| ApiError::internal())?
        .len()
        > 4 * 1024 * 1024
    {
        return Err(ApiError::validation(
            "Workout snapshot must fit within 4 MiB; shorten descriptions or split the plan",
        ));
    }
    let id = Uuid::new_v4();
    let row = sqlx::query_as("INSERT INTO app.workout_sessions(id,user_id,workout_id,habit_id,occurrence_date,habit_occurrence,snapshot,status,segment_started_at) VALUES($1,$2,$3,$4,$5,$6,$7,'running',now()) RETURNING *").bind(id).bind(u.id).bind(v.workout_id).bind(v.habit_id).bind(v.date).bind(occurrence.map(DbJson)).bind(DbJson(snapshot)).fetch_one(&mut *tx).await?;
    domain::event(
        &mut tx,
        u.id,
        "workout_started",
        "workout_session",
        id,
        serde_json::json!({"workout_id":v.workout_id,"habit_id":v.habit_id,"date":v.date}),
    )
    .await?;
    tx.commit().await?;
    Ok(Json(row))
}

pub(super) async fn change(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, action)): Path<(Uuid, String)>,
    ApiJson(v): ApiJson<Command>,
) -> Result<Json<Session>, ApiError> {
    if !["pause", "resume", "next", "skip", "cancel", "note"].contains(&action.as_str()) {
        return Err(domain::not_found());
    }
    if let Some(note) = &v.note {
        domain::text(note, 0, 200000)?;
    }
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let mut row = sqlx::query_as::<_, Session>(
        "SELECT * FROM app.workout_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE",
    )
    .bind(id)
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    if row.revision != v.revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "stale_workout",
            "Workout changed; refresh before retrying",
        ));
    }
    let now = Utc::now();
    match action.as_str() {
        "pause" if row.status == "running" => {
            row.elapsed_seconds = row.elapsed_at(now);
            row.segment_started_at = None;
            row.status = "paused".into();
        }
        "resume" if row.status == "paused" => {
            row.segment_started_at = Some(now);
            row.status = "running".into();
        }
        "cancel" if row.active() => {
            row.elapsed_seconds = row.elapsed_at(now);
            row.segment_started_at = None;
            row.status = "cancelled".into();
            row.ended_at = Some(now);
        }
        "next" | "skip" => row.advance(&action, v.actual_repetitions, now)?,
        "note" => {}
        _ => {
            return Err(domain::conflict(
                "Invalid action for the current workout state",
            ));
        }
    }
    if let Some(note) = v.note {
        row.note = note;
    }
    if row.status == "completed"
        && action == "next"
        && let Some(original) = &row.habit_occurrence
    {
        row.habit_completed =
            habits::complete_workout(&mut tx, u.id, original, row.workout_id).await?;
    }
    row.revision += 1;
    sqlx::query("UPDATE app.workout_sessions SET status=$3,step_index=$4,elapsed_seconds=$5,segment_started_at=$6,results=$7,revision=$8,note=$9,habit_completed=$10,ended_at=$11 WHERE id=$1 AND user_id=$2").bind(id).bind(u.id).bind(&row.status).bind(row.step_index).bind(row.elapsed_seconds).bind(row.segment_started_at).bind(&row.results).bind(row.revision).bind(&row.note).bind(row.habit_completed).bind(row.ended_at).execute(&mut *tx).await?;
    domain::event(&mut tx,u.id,&format!("workout_{action}"),"workout_session",id,serde_json::json!({"status":row.status,"step_index":row.step_index,"habit_completed":row.habit_completed})).await?;
    tx.commit().await?;
    Ok(Json(row.display()))
}
