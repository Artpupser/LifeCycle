//! Canonical reusable task tags. Historical snapshots retain the original names.
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
use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use uuid::Uuid;
#[derive(Serialize, sqlx::FromRow)]
struct Tag {
    id: Uuid,
    name: String,
    revision: i64,
    color: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Name {
    name: String,
    #[serde(default = "domain::default_color")]
    color: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Update {
    name: String,
    color: Option<String>,
    revision: i64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Revision {
    revision: i64,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/task-tags", get(list).post(create))
        .route(
            "/api/task-tags/{id}",
            axum::routing::put(update).delete(remove),
        )
}
async fn list(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Tag>>, ApiError> {
    Ok(Json(
        sqlx::query_as(
            "SELECT id,name,revision,color FROM app.task_tags WHERE user_id=$1 ORDER BY name,id",
        )
        .bind(u.id)
        .fetch_all(&s.database)
        .await?,
    ))
}
// Backwards-compatible task API: new legacy string tags become reusable registry entries.
pub(crate) async fn register(
    db: &mut PgConnection,
    user: Uuid,
    tags: &[String],
) -> Result<(), ApiError> {
    for name in tags {
        sqlx::query("INSERT INTO app.task_tags(id,user_id,name) VALUES($1,$2,$3) ON CONFLICT(user_id,name) DO NOTHING").bind(Uuid::new_v4()).bind(user).bind(name).execute(&mut *db).await?;
    }
    Ok(())
}
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Name>,
) -> Result<(StatusCode, Json<Tag>), ApiError> {
    domain::text(&v.name, 1, 64)?;
    domain::color(&v.color)?;
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let duplicate: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.task_tags WHERE user_id=$1 AND name=$2)",
    )
    .bind(u.id)
    .bind(v.name.trim())
    .fetch_one(&mut *tx)
    .await?;
    if duplicate {
        return Err(domain::conflict("Tag already exists"));
    }
    let tag = sqlx::query_as(
        "INSERT INTO app.task_tags(id,user_id,name,color) VALUES($1,$2,$3,$4) RETURNING id,name,revision,color",
    )
    .bind(Uuid::new_v4())
    .bind(u.id)
    .bind(v.name.trim())
    .bind(v.color)
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(tag)))
}
async fn locked(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
    revision: i64,
) -> Result<Tag, ApiError> {
    tasks::lock_tasks(db, user).await?;
    let tag: Tag = sqlx::query_as(
        "SELECT id,name,revision,color FROM app.task_tags WHERE user_id=$1 AND id=$2 FOR UPDATE",
    )
    .bind(user)
    .bind(id)
    .fetch_optional(db)
    .await?
    .ok_or_else(domain::not_found)?;
    if tag.revision != revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "tag_stale",
            "Tag changed; reload before retrying",
        ));
    }
    Ok(tag)
}
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Update>,
) -> Result<Json<Tag>, ApiError> {
    domain::text(&v.name, 1, 64)?;
    let mut tx = s.database.begin().await?;
    let tag = locked(&mut tx, u.id, id, v.revision).await?;
    let name = v.name.trim();
    let color = v.color.unwrap_or_else(|| tag.color.clone());
    domain::color(&color)?;
    let duplicate: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.task_tags WHERE user_id=$1 AND name=$2 AND id<>$3)",
    )
    .bind(u.id)
    .bind(name)
    .bind(id)
    .fetch_one(&mut *tx)
    .await?;
    if duplicate {
        return Err(domain::conflict("Tag already exists"));
    }
    if name != tag.name {
        sqlx::query("UPDATE app.tasks SET tags=(SELECT jsonb_agg(CASE WHEN value=$2 THEN $3 ELSE value END ORDER BY ord) FROM jsonb_array_elements_text(tags) WITH ORDINALITY t(value,ord)),updated_at=now() WHERE user_id=$1 AND source_kind='manual' AND tags ? $2").bind(u.id).bind(&tag.name).bind(name).execute(&mut *tx).await?;
    }
    let result=sqlx::query_as("UPDATE app.task_tags SET name=$3,color=$4,revision=revision+1 WHERE user_id=$1 AND id=$2 RETURNING id,name,revision,color").bind(u.id).bind(id).bind(name).bind(color).fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(result))
}
async fn remove(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    let tag = locked(&mut tx, u.id, id, v.revision).await?;
    sqlx::query("UPDATE app.tasks SET tags=tags-$2,updated_at=now() WHERE user_id=$1 AND source_kind='manual' AND tags ? $2").bind(u.id).bind(tag.name).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM app.task_tags WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
