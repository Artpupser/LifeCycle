use super::models::{Action, Anchor, MAX_REPLAY_INTERVALS, Program, ProgramState, Run};
use crate::{
    infrastructure::state::AppState, modules::pomodoro::Session, modules::tasks, shared::domain,
    shared::errors::ApiError,
};
use axum::http::StatusCode;
use chrono::Utc;
use sqlx::{PgConnection, types::Json as DbJson};
use uuid::Uuid;

pub(crate) async fn lock(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,17))")
        .bind(user.to_string())
        .execute(db)
        .await?;
    Ok(())
}

pub(super) async fn insert_run(
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

pub(crate) async fn sync(db: &mut PgConnection, user: Uuid) -> Result<Option<Session>, ApiError> {
    let run:Option<Run>=sqlx::query_as("SELECT * FROM app.pomodoro_runs WHERE user_id=$1 AND status IN ('running','paused') FOR UPDATE").bind(user).fetch_optional(&mut *db).await?;
    let Some(run) = run else {
        return Ok(None);
    };
    settle(db, user, &run).await
}

pub(super) async fn settle(
    db: &mut PgConnection,
    user: Uuid,
    run: &Run,
) -> Result<Option<Session>, ApiError> {
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
