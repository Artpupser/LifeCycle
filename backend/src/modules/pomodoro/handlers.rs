use super::models::{Session, Start};
use crate::{
    infrastructure::state::AppState,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use chrono::Utc;
use uuid::Uuid;

pub(super) async fn active(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Option<Session>>, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    crate::modules::pomodoro::programs::lock(&mut tx, u.id).await?;
    if let Some(row) = crate::modules::pomodoro::programs::sync(&mut tx, u.id).await? {
        tx.commit().await?;
        return Ok(Json(Some(row.for_display())));
    }
    let row=sqlx::query_as::<_,Session>("SELECT * FROM app.pomodoro_sessions WHERE user_id=$1 AND status IN ('running','paused') LIMIT 1").bind(u.id).fetch_optional(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(row.map(Session::for_display)))
}

pub(super) async fn start(
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
        crate::modules::pomodoro::ensure_focus_task(&s, u.id, task).await?;
    }
    crate::modules::pomodoro::programs::lock(&mut tx, u.id).await?;
    crate::modules::pomodoro::programs::sync(&mut tx, u.id).await?;
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

pub(super) async fn change(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, action)): Path<(Uuid, String)>,
    body: axum::body::Bytes,
) -> Result<Json<Session>, ApiError> {
    if !["pause", "resume", "finish", "cancel", "reset"].contains(&action.as_str()) {
        return Err(domain::not_found());
    }
    let input = if body.is_empty() {
        Default::default()
    } else {
        serde_json::from_slice(&body).map_err(|_| ApiError::validation("Invalid timer action"))?
    };
    let run: Option<Option<Uuid>> =
        sqlx::query_scalar("SELECT run_id FROM app.pomodoro_sessions WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .fetch_optional(&s.database)
            .await?;
    if run.flatten().is_some() {
        return Ok(Json(
            crate::modules::pomodoro::programs::change(&s, u.id, id, &action, input).await?,
        ));
    }
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    crate::modules::pomodoro::programs::lock(&mut tx, u.id).await?;
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
