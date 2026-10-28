use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    state::AppState,
    tasks,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
#[derive(Serialize, sqlx::FromRow)]
struct Session {
    id: Uuid,
    task_id: Option<Uuid>,
    phase: String,
    status: String,
    duration_seconds: i64,
    elapsed_seconds: i64,
    started_at: DateTime<Utc>,
    segment_started_at: Option<DateTime<Utc>>,
    ended_at: Option<DateTime<Utc>>,
    updated_at: DateTime<Utc>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Start {
    task_id: Option<Uuid>,
    phase: String,
}
impl Session {
    fn elapsed_at(&self, now: DateTime<Utc>) -> i64 {
        let running = self
            .segment_started_at
            .map_or(0, |start| (now - start).num_seconds().max(0));
        (self.elapsed_seconds + running).min(self.duration_seconds)
    }
    fn for_display(mut self) -> Self {
        self.elapsed_seconds = self.elapsed_at(Utc::now());
        self
    }
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/pomodoro", get(active).post(start))
        .route("/api/pomodoro/{id}/{action}", axum::routing::post(change))
}
async fn active(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Option<Session>>, ApiError> {
    let row=sqlx::query_as::<_,Session>("SELECT * FROM app.pomodoro_sessions WHERE user_id=$1 AND status IN ('running','paused') LIMIT 1").bind(u.id).fetch_optional(&s.database).await?;
    Ok(Json(row.map(Session::for_display)))
}
async fn start(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Start>,
) -> Result<(StatusCode, Json<Session>), ApiError> {
    if !["work", "break"].contains(&v.phase.as_str()) {
        return Err(ApiError::validation("Pomodoro phase must be work or break"));
    }
    let settings = domain::settings(&s, u.id).await?;
    let duration = if v.phase == "work" {
        settings.pomodoro_work_minutes
    } else {
        settings.pomodoro_break_minutes
    };
    let id = Uuid::new_v4();
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    if let Some(task) = v.task_id {
        tasks::get_active(&s, u.id, task).await?;
    }
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,17))")
        .bind(u.id.to_string())
        .execute(&mut *tx)
        .await?;
    if sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM app.pomodoro_sessions WHERE user_id=$1 AND status IN ('running','paused')",
    )
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?
    .is_some()
    {
        return Err(domain::conflict("Finish or cancel the active timer first"));
    }
    let row=sqlx::query_as::<_,Session>(
        "INSERT INTO app.pomodoro_sessions(id,user_id,task_id,phase,status,duration_seconds,segment_started_at)
         VALUES($1,$2,$3,$4,'running',$5,now()) RETURNING *"
    ).bind(id).bind(u.id).bind(v.task_id).bind(v.phase).bind(i64::from(duration)*60).fetch_one(&mut *tx).await?;
    domain::event(
        &mut tx,
        u.id,
        "pomodoro_started",
        "pomodoro",
        id,
        serde_json::json!({"phase":row.phase,"duration_seconds":row.duration_seconds}),
    )
    .await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(row)))
}
async fn change(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, action)): Path<(Uuid, String)>,
) -> Result<Json<Session>, ApiError> {
    if !["pause", "resume", "finish", "cancel"].contains(&action.as_str()) {
        return Err(domain::not_found());
    }
    let mut tx = s.database.begin().await?;
    let mut row = sqlx::query_as::<_, Session>(
        "SELECT * FROM app.pomodoro_sessions WHERE id=$1 AND user_id=$2 FOR UPDATE",
    )
    .bind(id)
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    let now = Utc::now();
    let elapsed = row.elapsed_at(now);
    match action.as_str() {
        "pause" if row.status == "running" => {
            row.status = "paused".into();
            row.elapsed_seconds = elapsed;
            row.segment_started_at = None;
        }
        "resume" if row.status == "paused" => {
            row.status = "running".into();
            row.segment_started_at = Some(now);
        }
        "finish" if ["running", "paused"].contains(&row.status.as_str()) => {
            if elapsed < row.duration_seconds {
                return Err(domain::conflict(
                    "Timer cannot be completed before its duration elapses",
                ));
            }
            row.status = "completed".into();
            row.elapsed_seconds = elapsed;
            row.segment_started_at = None;
            row.ended_at = Some(now);
        }
        "cancel" if ["running", "paused"].contains(&row.status.as_str()) => {
            row.status = "cancelled".into();
            row.elapsed_seconds = elapsed;
            row.segment_started_at = None;
            row.ended_at = Some(now);
        }
        _ => {
            return Err(domain::conflict(
                "Timer action is invalid for its current state",
            ));
        }
    }
    row.updated_at = now;
    sqlx::query("UPDATE app.pomodoro_sessions SET status=$3,elapsed_seconds=$4,segment_started_at=$5,ended_at=$6,updated_at=$7 WHERE id=$1 AND user_id=$2")
        .bind(id).bind(u.id).bind(&row.status).bind(row.elapsed_seconds).bind(row.segment_started_at).bind(row.ended_at).bind(now).execute(&mut *tx).await?;
    domain::event(&mut tx,u.id,&format!("pomodoro_{action}"),"pomodoro",id,serde_json::json!({"phase":row.phase,"elapsed_seconds":row.elapsed_seconds,"status":row.status})).await?;
    tx.commit().await?;
    Ok(Json(row.for_display()))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn elapsed_uses_server_segments_and_stops_while_paused() {
        let now = Utc::now();
        let mut row = Session {
            id: Uuid::new_v4(),
            task_id: None,
            phase: "work".into(),
            status: "running".into(),
            duration_seconds: 60,
            elapsed_seconds: 10,
            started_at: now,
            segment_started_at: Some(now - chrono::Duration::seconds(20)),
            ended_at: None,
            updated_at: now,
        };
        assert_eq!(row.elapsed_at(now), 30);
        row.segment_started_at = None;
        assert_eq!(row.elapsed_at(now), 10);
    }
}
