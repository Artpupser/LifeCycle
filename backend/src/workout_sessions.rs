use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    habits,
    state::AppState,
    tasks::{self, TaskOccurrence},
    workout_plan::Snapshot,
    workouts,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
struct StepResult {
    step_index: i32,
    status: String,
    elapsed_seconds: i64,
    actual_repetitions: u32,
    ended_at: DateTime<Utc>,
}
#[derive(Clone, Serialize, sqlx::FromRow)]
struct Session {
    id: Uuid,
    workout_id: Uuid,
    habit_id: Option<Uuid>,
    occurrence_date: Option<NaiveDate>,
    habit_occurrence: Option<DbJson<TaskOccurrence>>,
    snapshot: DbJson<Snapshot>,
    status: String,
    step_index: i32,
    elapsed_seconds: i64,
    segment_started_at: Option<DateTime<Utc>>,
    results: DbJson<Vec<StepResult>>,
    revision: i64,
    note: String,
    habit_completed: bool,
    started_at: DateTime<Utc>,
    ended_at: Option<DateTime<Utc>>,
}
impl Session {
    fn elapsed_at(&self, now: DateTime<Utc>) -> i64 {
        self.elapsed_seconds
            + self
                .segment_started_at
                .map_or(0, |start| (now - start).num_seconds().max(0))
    }
    fn display(mut self) -> Self {
        self.elapsed_seconds = self.elapsed_at(Utc::now());
        self
    }
    fn active(&self) -> bool {
        ["running", "paused"].contains(&self.status.as_str())
    }
    fn advance(
        &mut self,
        action: &str,
        repetitions: Option<u32>,
        now: DateTime<Utc>,
    ) -> Result<(), ApiError> {
        if !self.active() || (action == "next" && self.status != "running") {
            return Err(domain::conflict(
                "Resume an active workout before completing a step",
            ));
        }
        let step = self
            .snapshot
            .steps
            .get(self.step_index as usize)
            .ok_or_else(ApiError::internal)?;
        let elapsed = self.elapsed_at(now);
        if action == "next" && elapsed < i64::from(step.duration_seconds) {
            return Err(domain::conflict("The step timer has not elapsed"));
        }
        let actual = if action == "skip" || step.repetitions == 0 {
            0
        } else {
            repetitions.unwrap_or(step.repetitions)
        };
        if actual > 10000 {
            return Err(ApiError::validation("Repetitions must be at most 10000"));
        }
        self.results.push(StepResult {
            step_index: self.step_index,
            status: if action == "skip" {
                "skipped"
            } else {
                "completed"
            }
            .into(),
            elapsed_seconds: elapsed,
            actual_repetitions: actual,
            ended_at: now,
        });
        self.step_index += 1;
        self.elapsed_seconds = 0;
        self.segment_started_at = if self.status == "running" {
            Some(now)
        } else {
            None
        };
        if self.step_index as usize == self.snapshot.steps.len() {
            let complete = self.results.iter().all(|result| {
                let step = &self.snapshot.steps[result.step_index as usize];
                step.exercise.is_none()
                    || result.status == "completed" && result.actual_repetitions >= step.repetitions
            });
            self.status = if complete { "completed" } else { "partial" }.into();
            self.segment_started_at = None;
            self.ended_at = Some(now);
        }
        Ok(())
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Start {
    workout_id: Uuid,
    habit_id: Option<Uuid>,
    date: Option<NaiveDate>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Command {
    revision: i64,
    actual_repetitions: Option<u32>,
    note: Option<String>,
}
#[derive(Deserialize)]
struct HistoryQuery {
    workout_id: Option<Uuid>,
    before: Option<DateTime<Utc>>,
}
#[derive(Serialize, sqlx::FromRow)]
struct Summary {
    id: Uuid,
    workout_id: Uuid,
    title: String,
    date: NaiveDate,
    status: String,
    confirmed_steps: i32,
    habit_completed: bool,
    started_at: DateTime<Utc>,
    ended_at: Option<DateTime<Utc>>,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/workout-sessions", get(history).post(start))
        .route("/api/workout-sessions/active", get(active))
        .route("/api/workout-sessions/{id}", get(read))
        .route("/api/workout-sessions/{id}/{action}", post(change))
}
async fn active(
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
async fn read(
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
async fn history(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<HistoryQuery>,
) -> Result<Json<Vec<Summary>>, ApiError> {
    let rows = sqlx::query_as::<_,Summary>("SELECT id,workout_id,snapshot->'plan'->>'title' AS title,(snapshot->>'date')::date AS date,status,jsonb_array_length(results) AS confirmed_steps,habit_completed,started_at,ended_at FROM app.workout_sessions WHERE user_id=$1 AND ($2::uuid IS NULL OR workout_id=$2) AND ($3::timestamptz IS NULL OR started_at<$3) ORDER BY started_at DESC,id LIMIT 50").bind(u.id).bind(q.workout_id).bind(q.before).fetch_all(&s.database).await?;
    Ok(Json(rows))
}
async fn start(
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
async fn change(
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
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn time_uses_server_segments_and_pause_freezes_elapsed() {
        let now = Utc::now();
        let mut row = fixture(now);
        row.segment_started_at = Some(now - chrono::Duration::seconds(10));
        assert_eq!(row.elapsed_at(now), 10);
        row.segment_started_at = None;
        row.elapsed_seconds = 10;
        assert_eq!(row.elapsed_at(now + chrono::Duration::minutes(1)), 10);
    }
    fn fixture(now: DateTime<Utc>) -> Session {
        let snapshot:Snapshot=serde_json::from_value(serde_json::json!({"plan":{"title":"Test","rounds":[]},"date":"2026-10-28","steps":[{"title":"Hold","round_title":"Round","cycle":1,"entry_id":null,"exercise":{"title":"Hold","kind":"duration"},"repetitions":0,"seconds_per_repetition":5,"duration_seconds":5}]})).unwrap();
        Session {
            id: Uuid::new_v4(),
            workout_id: Uuid::new_v4(),
            habit_id: None,
            occurrence_date: None,
            habit_occurrence: None,
            snapshot: DbJson(snapshot),
            status: "running".into(),
            step_index: 0,
            elapsed_seconds: 0,
            segment_started_at: Some(now),
            results: DbJson(vec![]),
            revision: 0,
            note: String::new(),
            habit_completed: false,
            started_at: now,
            ended_at: None,
        }
    }
    #[test]
    fn early_finish_is_rejected_and_skip_is_partial() {
        let now = Utc::now();
        let mut row = fixture(now);
        assert!(row.advance("next", None, now).is_err());
        row.advance("skip", None, now).unwrap();
        assert_eq!(row.status, "partial");
        assert!(row.advance("next", None, now).is_err());
        let mut done = fixture(now);
        done.advance("next", None, now + chrono::Duration::seconds(5))
            .unwrap();
        assert_eq!(done.status, "completed");
    }
}
