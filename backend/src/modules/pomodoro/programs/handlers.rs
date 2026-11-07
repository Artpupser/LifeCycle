use super::models::{Config, ConfigInput, History, HistoryQuery, Revision, Start};
use super::runtime::{insert_run, lock, sync};
use crate::{
    infrastructure::state::AppState,
    modules::pomodoro::Session,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

pub(super) async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Config>>, ApiError> {
    Ok(Json(
        sqlx::query_as(
            "SELECT * FROM app.pomodoro_configs WHERE user_id=$1 ORDER BY created_at,id",
        )
        .bind(u.id)
        .fetch_all(&s.database)
        .await?,
    ))
}

pub(super) async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<ConfigInput>,
) -> Result<(StatusCode, Json<Config>), ApiError> {
    domain::text(&v.name, 1, 100)?;
    v.data.validate()?;
    Ok((StatusCode::CREATED,Json(sqlx::query_as("INSERT INTO app.pomodoro_configs(id,user_id,name,data) VALUES($1,$2,$3,$4) RETURNING *").bind(Uuid::new_v4()).bind(u.id).bind(v.name.trim()).bind(DbJson(v.data)).fetch_one(&s.database).await?)))
}

pub(super) async fn update(
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

pub(super) async fn delete(
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

pub(super) async fn start(
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
        crate::modules::pomodoro::ensure_focus_task(&s, u.id, task).await?;
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

pub(super) async fn history(
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
    let mut items:Vec<Session>=sqlx::query_as("SELECT * FROM app.pomodoro_sessions WHERE user_id=$1 AND status IN ('completed','cancelled') AND NOT EXISTS(SELECT 1 FROM app.history_removals h WHERE h.user_id=$1 AND h.kind='pomodoro' AND h.item_key=app.pomodoro_sessions.id::text) ORDER BY ended_at DESC,id DESC LIMIT 51 OFFSET $2").bind(u.id).bind(q.offset).fetch_all(&mut *tx).await?;
    let next_offset = if items.len() > 50 {
        items.truncate(50);
        Some(q.offset + 50)
    } else {
        None
    };
    tx.commit().await?;
    Ok(Json(History { items, next_offset }))
}
