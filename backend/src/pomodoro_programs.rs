use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    pomodoro::Session,
    state::AppState,
    tasks,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgConnection, types::Json as DbJson};
use uuid::Uuid;

const MAX_REPLAY_INTERVALS: i64 = 5000;

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Program {
    pub work_seconds: i64,
    pub chill_seconds: i64,
    pub more_chill_seconds: i64,
    pub sequence: Vec<String>,
    pub repeat: bool,
}
impl Program {
    fn validate(&self) -> Result<(), ApiError> {
        if self.sequence.is_empty()
            || self.sequence.len() > 60
            || !self.sequence.iter().any(|s| s == "w")
            || self
                .sequence
                .iter()
                .any(|s| !["w", "c", "mc"].contains(&s.as_str()))
            || [
                self.work_seconds,
                self.chill_seconds,
                self.more_chill_seconds,
            ]
            .iter()
            .any(|s| !(1..=86400).contains(s))
        {
            return Err(ApiError::validation(
                "A program needs 1–60 w/c/mc intervals including work, each duration 1–86400 seconds",
            ));
        }
        Ok(())
    }
    fn duration(&self, kind: &str) -> i64 {
        match kind {
            "w" => self.work_seconds,
            "c" => self.chill_seconds,
            _ => self.more_chill_seconds,
        }
    }
    fn total(&self) -> i64 {
        self.sequence.iter().map(|k| self.duration(k)).sum()
    }
    fn offset(&self, index: i64) -> i64 {
        let count = self.sequence.len() as i64;
        index / count * self.total()
            + self
                .sequence
                .iter()
                .take((index % count) as usize)
                .map(|k| self.duration(k))
                .sum::<i64>()
    }
    fn position(&self, elapsed: i64) -> (i64, i64) {
        if !self.repeat && elapsed >= self.total() {
            return (self.sequence.len() as i64, 0);
        }
        let mut left = elapsed % self.total();
        let cycle_start = elapsed / self.total() * self.sequence.len() as i64;
        for (step, kind) in self.sequence.iter().enumerate() {
            let d = self.duration(kind);
            if left < d {
                return (cycle_start + step as i64, left);
            }
            left -= d;
        }
        unreachable!()
    }
}
#[derive(Serialize, sqlx::FromRow)]
struct Config {
    id: Uuid,
    name: String,
    data: DbJson<Program>,
    revision: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ConfigInput {
    name: String,
    data: Program,
    revision: Option<i64>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Start {
    config_id: Uuid,
    revision: i64,
    task_id: Option<Uuid>,
}
#[derive(Clone, Serialize, Deserialize)]
struct Anchor {
    elapsed: i64,
    at: DateTime<Utc>,
}
#[derive(sqlx::FromRow)]
struct Run {
    id: Uuid,
    task_id: Option<Uuid>,
    name: String,
    data: DbJson<Program>,
    status: String,
    elapsed_seconds: i64,
    segment_started_at: Option<DateTime<Utc>>,
    anchors: DbJson<Vec<Anchor>>,
    processed_intervals: i64,
    revision: i64,
}
impl Run {
    fn elapsed(&self, now: DateTime<Utc>) -> i64 {
        let n = self.elapsed_seconds
            + self
                .segment_started_at
                .map_or(0, |at| (now - at).num_seconds().max(0));
        if self.data.repeat {
            n
        } else {
            n.min(self.data.total())
        }
    }
    fn wall(&self, offset: i64, end: bool) -> DateTime<Utc> {
        let anchor = self
            .anchors
            .iter()
            .rev()
            .find(|a| {
                if end {
                    a.elapsed < offset
                } else {
                    a.elapsed <= offset
                }
            })
            .unwrap_or(&self.anchors[0]);
        anchor.at + Duration::seconds(offset - anchor.elapsed)
    }
}
#[derive(Serialize)]
pub(crate) struct ProgramState {
    run_id: Uuid,
    name: String,
    interval_index: i64,
    sequence_length: usize,
    cycle: i64,
    next_kind: Option<String>,
    next_duration_seconds: Option<i64>,
    repeat: bool,
    revision: i64,
    pub(crate) history_pending: i64,
}
#[derive(Deserialize, Default)]
struct HistoryQuery {
    #[serde(default)]
    offset: i64,
}
#[derive(Serialize)]
struct History {
    items: Vec<Session>,
    next_offset: Option<i64>,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/pomodoro/configs", get(list).post(create))
        .route(
            "/api/pomodoro/configs/{id}",
            axum::routing::put(update).delete(delete),
        )
        .route("/api/pomodoro/program", post(start))
        .route("/api/pomodoro/history", get(history))
}
pub(crate) async fn lock(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,17))")
        .bind(user.to_string())
        .execute(db)
        .await?;
    Ok(())
}
async fn list(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Config>>, ApiError> {
    Ok(Json(
        sqlx::query_as(
            "SELECT * FROM app.pomodoro_configs WHERE user_id=$1 ORDER BY created_at,id",
        )
        .bind(u.id)
        .fetch_all(&s.database)
        .await?,
    ))
}
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<ConfigInput>,
) -> Result<(StatusCode, Json<Config>), ApiError> {
    domain::text(&v.name, 1, 100)?;
    v.data.validate()?;
    Ok((StatusCode::CREATED,Json(sqlx::query_as("INSERT INTO app.pomodoro_configs(id,user_id,name,data) VALUES($1,$2,$3,$4) RETURNING *").bind(Uuid::new_v4()).bind(u.id).bind(v.name.trim()).bind(DbJson(v.data)).fetch_one(&s.database).await?)))
}
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<ConfigInput>,
) -> Result<Json<Config>, ApiError> {
    domain::text(&v.name, 1, 100)?;
    v.data.validate()?;
    let mut tx = s.database.begin().await?;
    let old: Config =
        sqlx::query_as("SELECT * FROM app.pomodoro_configs WHERE id=$1 AND user_id=$2 FOR UPDATE")
            .bind(id)
            .bind(u.id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(domain::not_found)?;
    if v.revision != Some(old.revision) {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "pomodoro_config_stale",
            "Configuration changed; reload before saving",
        ));
    }
    let row=sqlx::query_as("UPDATE app.pomodoro_configs SET name=$3,data=$4,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1 AND user_id=$2 RETURNING *").bind(id).bind(u.id).bind(v.name.trim()).bind(DbJson(v.data)).fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(row))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Revision {
    revision: i64,
}
async fn delete(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    let revision: i64 = sqlx::query_scalar(
        "SELECT revision FROM app.pomodoro_configs WHERE user_id=$1 AND id=$2 FOR UPDATE",
    )
    .bind(u.id)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    if revision != v.revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "pomodoro_config_stale",
            "Configuration changed; reload before deleting",
        ));
    }
    sqlx::query("DELETE FROM app.pomodoro_configs WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn insert_run(
    db: &mut PgConnection,
    user: Uuid,
    config: Option<Uuid>,
    task: Option<Uuid>,
    name: &str,
    data: &Program,
) -> Result<(), ApiError> {
    let now = Utc::now();
    let id = Uuid::new_v4();
    sqlx::query("INSERT INTO app.pomodoro_runs(id,user_id,config_id,task_id,name,data,status,segment_started_at,anchors,started_at) VALUES($1,$2,$3,$4,$5,$6,'running',$7,$8,$7)")
        .bind(id).bind(user).bind(config).bind(task).bind(name).bind(DbJson(data)).bind(now).bind(DbJson(vec![Anchor{elapsed:0,at:now}])).execute(&mut *db).await?;
    domain::event(
        db,
        user,
        "pomodoro_started",
        "pomodoro",
        id,
        serde_json::json!({"program":true}),
    )
    .await?;
    Ok(())
}
async fn start(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Start>,
) -> Result<(StatusCode, Json<Session>), ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    lock(&mut tx, u.id).await?;
    sync(&mut tx, u.id).await?;
    if sqlx::query_scalar::<_,bool>("SELECT EXISTS(SELECT 1 FROM app.pomodoro_sessions WHERE user_id=$1 AND status IN ('running','paused'))").bind(u.id).fetch_one(&mut *tx).await?{return Err(domain::conflict("Finish or cancel the active timer first"));}
    if let Some(task) = v.task_id {
        tasks::get_active(&s, u.id, task).await?;
    }
    let config: Config =
        sqlx::query_as("SELECT * FROM app.pomodoro_configs WHERE id=$1 AND user_id=$2 FOR SHARE")
            .bind(v.config_id)
            .bind(u.id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(domain::not_found)?;
    if config.revision != v.revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "pomodoro_config_stale",
            "Configuration changed; reload before starting",
        ));
    }
    insert_run(
        &mut tx,
        u.id,
        Some(config.id),
        v.task_id,
        &config.name,
        &config.data,
    )
    .await?;
    let session = sync(&mut tx, u.id).await?.ok_or_else(ApiError::internal)?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(session)))
}
// Replay at most 5000 intervals per request. The clock is computed arithmetically and never lags.
// Stop/reset wait for replay to drain, preserving every completed interval even after a long suspension.
pub(crate) async fn sync(db: &mut PgConnection, user: Uuid) -> Result<Option<Session>, ApiError> {
    let run:Option<Run>=sqlx::query_as("SELECT * FROM app.pomodoro_runs WHERE user_id=$1 AND status IN ('running','paused') FOR UPDATE").bind(user).fetch_optional(&mut *db).await?;
    let Some(run) = run else {
        return Ok(None);
    };
    settle(db, user, &run).await
}
async fn settle(db: &mut PgConnection, user: Uuid, run: &Run) -> Result<Option<Session>, ApiError> {
    let now = Utc::now();
    let elapsed = run.elapsed(now);
    let (index, within) = run.data.position(elapsed);
    let count = run.data.sequence.len() as i64;
    let done = !run.data.repeat && index == count;
    let active:Option<Session>=sqlx::query_as("SELECT * FROM app.pomodoro_sessions WHERE user_id=$1 AND run_id=$2 AND status IN ('running','paused') FOR UPDATE").bind(user).bind(run.id).fetch_optional(&mut *db).await?;
    if let Some(old) = &active
        && (done || old.interval_index != Some(index))
    {
        let interval_index = old.interval_index.ok_or_else(|| {
            tracing::error!(session_id = %old.id, "Program session is missing its interval index");
            ApiError::internal()
        })?;
        let end = run.wall(run.data.offset(interval_index) + old.duration_seconds, true);
        sqlx::query("UPDATE app.pomodoro_sessions SET status='completed',elapsed_seconds=duration_seconds,segment_started_at=NULL,ended_at=$3,updated_at=$3 WHERE user_id=$1 AND id=$2").bind(user).bind(old.id).bind(end).execute(&mut *db).await?;
    }
    let until = index.min(run.processed_intervals + MAX_REPLAY_INTERVALS);
    let mut records = Vec::new();
    for ordinal in run.processed_intervals..until {
        let kind = &run.data.sequence[(ordinal % count) as usize];
        let duration = run.data.duration(kind);
        let offset = run.data.offset(ordinal);
        records.push(serde_json::json!({"index":ordinal,"kind":kind,"phase":if kind=="w"{"work"}else{"break"},"duration":duration,"start":run.wall(offset,false),"end":run.wall(offset+duration,true)}));
    }
    if !records.is_empty() {
        sqlx::query("INSERT INTO app.pomodoro_sessions(id,user_id,task_id,run_id,interval_index,interval_kind,program_name,phase,status,duration_seconds,elapsed_seconds,started_at,ended_at,updated_at) SELECT gen_random_uuid(),$1,$2,$3,r.index,r.kind,$4,r.phase,'completed',r.duration,r.duration,r.start,r.end,r.end FROM jsonb_to_recordset($5::jsonb) AS r(index bigint,kind text,phase text,duration bigint,start timestamptz,\"end\" timestamptz) ON CONFLICT(user_id,run_id,interval_index) DO NOTHING")
            .bind(user).bind(run.task_id).bind(run.id).bind(&run.name).bind(DbJson(records)).execute(&mut *db).await?;
        sqlx::query(
            "UPDATE app.pomodoro_runs SET processed_intervals=$3 WHERE user_id=$1 AND id=$2",
        )
        .bind(user)
        .bind(run.id)
        .bind(until)
        .execute(&mut *db)
        .await?;
        domain::event(
            db,
            user,
            "pomodoro_intervals_completed",
            "pomodoro",
            run.id,
            serde_json::json!({"intervals":until-run.processed_intervals}),
        )
        .await?;
    }
    if done {
        let end = run.wall(run.data.total(), true);
        sqlx::query("UPDATE app.pomodoro_runs SET status='completed',elapsed_seconds=$3,segment_started_at=NULL,ended_at=$4,revision=revision+1 WHERE user_id=$1 AND id=$2").bind(user).bind(run.id).bind(elapsed).bind(end).execute(&mut *db).await?;
        return Ok(None);
    }
    let kind = &run.data.sequence[(index % count) as usize];
    let mut session:Session=sqlx::query_as("INSERT INTO app.pomodoro_sessions(id,user_id,task_id,run_id,interval_index,interval_kind,program_name,phase,status,duration_seconds,elapsed_seconds,started_at,segment_started_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT(user_id,run_id,interval_index) DO UPDATE SET status=EXCLUDED.status,elapsed_seconds=EXCLUDED.elapsed_seconds,segment_started_at=EXCLUDED.segment_started_at,updated_at=clock_timestamp() RETURNING *")
        .bind(Uuid::new_v4()).bind(user).bind(run.task_id).bind(run.id).bind(index).bind(kind).bind(&run.name).bind(if kind=="w"{"work"}else{"break"}).bind(&run.status).bind(run.data.duration(kind)).bind(within).bind(run.wall(run.data.offset(index),false)).bind(if run.status=="running"{Some(now)}else{None}).fetch_one(&mut *db).await?;
    let next = if run.data.repeat || index % count + 1 < count {
        Some(run.data.sequence[((index + 1) % count) as usize].clone())
    } else {
        None
    };
    session.program = Some(ProgramState {
        run_id: run.id,
        name: run.name.clone(),
        interval_index: index,
        sequence_length: count as usize,
        cycle: index / count + 1,
        next_duration_seconds: next.as_ref().map(|k| run.data.duration(k)),
        next_kind: next,
        repeat: run.data.repeat,
        revision: run.revision,
        history_pending: index - until,
    });
    Ok(Some(session))
}
#[derive(Default, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct Action {
    revision: Option<i64>,
}
pub(crate) async fn change(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    action: &str,
    v: Action,
) -> Result<Session, ApiError> {
    let mut tx = s.database.begin().await?;
    // Reset may reattach a task. Keep the same lock order as task deletion/start.
    tasks::lock_tasks(&mut tx, user).await?;
    lock(&mut tx, user).await?;
    let original: Session =
        sqlx::query_as("SELECT * FROM app.pomodoro_sessions WHERE user_id=$1 AND id=$2")
            .bind(user)
            .bind(id)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(domain::not_found)?;
    let current = sync(&mut tx, user).await?;
    let Some(current) = current else {
        tx.commit().await?;
        return Err(domain::conflict("Program has completed; refresh the timer"));
    };
    let state = current.program.as_ref().ok_or_else(ApiError::internal)?;
    if current.id != id || v.revision.is_some_and(|r| r != state.revision) {
        tx.commit().await?;
        return Err(domain::conflict("Timer changed; refresh before acting"));
    }
    if state.history_pending > 0 {
        tx.commit().await?;
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "pomodoro_history_pending",
            "History is synchronizing; refresh and retry",
        ));
    }
    if !["pause", "resume", "cancel", "reset"].contains(&action) {
        return Err(domain::conflict("Program intervals advance automatically"));
    }
    let mut run: Run =
        sqlx::query_as("SELECT * FROM app.pomodoro_runs WHERE user_id=$1 AND id=$2 FOR UPDATE")
            .bind(user)
            .bind(original.run_id)
            .fetch_one(&mut *tx)
            .await?;
    let now = Utc::now();
    let elapsed = run.elapsed(now);
    match action {
        "pause" if run.status == "running" => {
            run.status = "paused".into();
            run.segment_started_at = None;
            run.elapsed_seconds = elapsed;
        }
        "resume" if run.status == "paused" => {
            run.status = "running".into();
            run.segment_started_at = Some(now);
            run.anchors.0.push(Anchor { elapsed, at: now });
        }
        "cancel" | "reset" => {
            run.status = "cancelled".into();
            run.segment_started_at = None;
            run.elapsed_seconds = elapsed;
        }
        _ => {
            return Err(domain::conflict(
                "Timer action is invalid for its current state",
            ));
        }
    }
    sqlx::query("UPDATE app.pomodoro_runs SET status=$3,elapsed_seconds=$4,segment_started_at=$5,anchors=$6,revision=revision+1,ended_at=$7 WHERE user_id=$1 AND id=$2")
        .bind(user).bind(run.id).bind(&run.status).bind(run.elapsed_seconds).bind(run.segment_started_at).bind(&run.anchors).bind(if run.status=="cancelled"{Some(now)}else{None}).execute(&mut *tx).await?;
    domain::event(
        &mut tx,
        user,
        &format!("pomodoro_{action}"),
        "pomodoro",
        run.id,
        serde_json::json!({}),
    )
    .await?;
    let result = if run.status == "cancelled" {
        let stopped:Session=sqlx::query_as("UPDATE app.pomodoro_sessions SET status='cancelled',elapsed_seconds=$3,segment_started_at=NULL,ended_at=$4,updated_at=$4 WHERE user_id=$1 AND id=$2 RETURNING *").bind(user).bind(id).bind(current.elapsed_at(now)).bind(now).fetch_one(&mut *tx).await?;
        if action == "reset" {
            insert_run(&mut tx, user, None, run.task_id, &run.name, &run.data).await?;
            sync(&mut tx, user).await?.ok_or_else(ApiError::internal)?
        } else {
            stopped
        }
    } else {
        sync(&mut tx, user).await?.ok_or_else(ApiError::internal)?
    };
    tx.commit().await?;
    Ok(result)
}
async fn history(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<HistoryQuery>,
) -> Result<Json<History>, ApiError> {
    if q.offset < 0 || q.offset > 1_000_000 {
        return Err(ApiError::validation("History offset is out of range"));
    }
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    lock(&mut tx, u.id).await?;
    sync(&mut tx, u.id).await?;
    let mut items:Vec<Session>=sqlx::query_as("SELECT * FROM app.pomodoro_sessions WHERE user_id=$1 AND status IN ('completed','cancelled') ORDER BY ended_at DESC,id DESC LIMIT 51 OFFSET $2").bind(u.id).bind(q.offset).fetch_all(&mut *tx).await?;
    let next_offset = if items.len() > 50 {
        items.truncate(50);
        Some(q.offset + 50)
    } else {
        None
    };
    tx.commit().await?;
    Ok(Json(History { items, next_offset }))
}
#[cfg(test)]
mod tests {
    use super::*;
    fn program(repeat: bool) -> Program {
        Program {
            work_seconds: 2,
            chill_seconds: 1,
            more_chill_seconds: 3,
            sequence: vec!["w".into(), "c".into(), "w".into(), "mc".into()],
            repeat,
        }
    }
    #[test]
    fn boundaries_cycles_and_long_suspension_are_arithmetic() {
        let p = program(true);
        assert_eq!(p.position(0), (0, 0));
        assert_eq!(p.position(2), (1, 0));
        assert_eq!(p.position(8), (4, 0));
        assert_eq!(p.position(8_000_001), (4_000_000, 1));
        assert_eq!(p.offset(4_000_000), 8_000_000);
        assert_eq!(program(false).position(999), (4, 0));
    }
    #[test]
    fn program_rejects_empty_unknown_and_unbounded_intervals() {
        let mut p = program(false);
        assert!(p.validate().is_ok());
        p.sequence.clear();
        assert!(p.validate().is_err());
        p.sequence = vec!["c".into()];
        assert!(p.validate().is_err());
        p.sequence = vec!["w".into()];
        p.work_seconds = 0;
        assert!(p.validate().is_err());
    }
}
