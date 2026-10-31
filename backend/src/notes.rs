use crate::{
    auth::CurrentUser,
    domain::{self, Search},
    error::{ApiError, ApiJson},
    state::AppState,
    tasks,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgConnection, types::Json as DbJson};
use uuid::Uuid;

#[derive(Deserialize, Default)]
#[serde(default, deny_unknown_fields)]
struct FolderInput {
    name: String,
    #[serde(default = "domain::default_color")]
    color: String,
}
#[derive(Serialize, sqlx::FromRow)]
struct Folder {
    id: Uuid,
    name: String,
    color: String,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct NoteInput {
    title: String,
    content: String,
    tags: Vec<String>,
    #[serde(default = "domain::default_color")]
    color: String,
    folder_id: Option<Uuid>,
}
#[derive(Serialize, sqlx::FromRow)]
pub(crate) struct Note {
    id: Uuid,
    title: String,
    content: String,
    tags: DbJson<Vec<String>>,
    color: String,
    folder_id: Option<Uuid>,
    ai_shared: bool,
    ai_access_revision: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/notes/folders", get(folders).post(create_folder))
        .route(
            "/api/notes/folders/{id}",
            get(folder).put(update_folder).delete(delete_folder),
        )
        .route("/api/notes", get(notes).post(create_note))
        .route(
            "/api/notes/{id}",
            get(note).put(update_note).delete(delete_note),
        )
}
async fn folders(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Folder>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,name,color,created_at,updated_at FROM app.note_folders WHERE user_id=$1 ORDER BY name,id").bind(u.id).fetch_all(&s.database).await?))
}
async fn folder(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Folder>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,name,color,created_at,updated_at FROM app.note_folders WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).fetch_optional(&s.database).await?.ok_or_else(domain::not_found)?))
}
async fn create_folder(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<FolderInput>,
) -> Result<(StatusCode, Json<Folder>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_folder(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}
async fn update_folder(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<FolderInput>,
) -> Result<Json<Folder>, ApiError> {
    Ok(Json(save_folder(&s, u.id, id, v, false).await?))
}
async fn save_folder(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    v: FolderInput,
    create: bool,
) -> Result<Folder, ApiError> {
    domain::text(&v.name, 1, 100)?;
    domain::color(&v.color)?;
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, user).await?;
    let query = if create {
        "INSERT INTO app.note_folders (id,user_id,name,color) VALUES($1,$2,$3,$4) RETURNING id,name,color,created_at,updated_at"
    } else {
        "UPDATE app.note_folders SET name=$3,color=$4,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,name,color,created_at,updated_at"
    };
    let result = sqlx::query_as(query)
        .bind(id)
        .bind(user)
        .bind(v.name)
        .bind(v.color)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    domain::event(
        &mut tx,
        user,
        if create {
            "folder_created"
        } else {
            "folder_updated"
        },
        "folder",
        id,
        serde_json::json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(result)
}
async fn delete_folder(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let rows = sqlx::query("DELETE FROM app.note_folders WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(u.id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if rows == 0 {
        return Err(domain::not_found());
    }
    sqlx::query(
        "UPDATE app.notes SET folder_id=NULL,updated_at=now() WHERE folder_id=$1 AND user_id=$2",
    )
    .bind(id)
    .bind(u.id)
    .execute(&mut *tx)
    .await?;
    domain::event(
        &mut tx,
        u.id,
        "folder_deleted",
        "folder",
        id,
        serde_json::json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn notes(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Note>>, ApiError> {
    q.validate()?;
    Ok(Json(sqlx::query_as("SELECT id,title,content,tags,color,folder_id,ai_shared,ai_access_revision,created_at,updated_at FROM app.notes WHERE user_id=$1 AND ($2::text IS NULL OR strpos(lower(title||' '||content),lower($2))>0) AND ($3::uuid IS NULL OR folder_id=$3) AND ($4::text IS NULL OR tags ? $4) ORDER BY updated_at DESC,id").bind(u.id).bind(q.q).bind(q.folder_id).bind(q.tag).fetch_all(&s.database).await?))
}
async fn note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Note>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,title,content,tags,color,folder_id,ai_shared,ai_access_revision,created_at,updated_at FROM app.notes WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).fetch_optional(&s.database).await?.ok_or_else(domain::not_found)?))
}
async fn create_note(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<NoteInput>,
) -> Result<(StatusCode, Json<Note>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_note(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}
async fn update_note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<NoteInput>,
) -> Result<Json<Note>, ApiError> {
    Ok(Json(save_note(&s, u.id, id, v, false).await?))
}
async fn save_note(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    v: NoteInput,
    create: bool,
) -> Result<Note, ApiError> {
    let mut tx = s.database.begin().await?;
    let note = save_note_in(&mut tx, user, id, v, create).await?;
    tx.commit().await?;
    Ok(note)
}
pub(crate) async fn save_note_in(
    tx: &mut PgConnection,
    user: Uuid,
    id: Uuid,
    v: NoteInput,
    create: bool,
) -> Result<Note, ApiError> {
    domain::text(&v.title, 1, 200)?;
    domain::text(&v.content, 0, 200000)?;
    domain::color(&v.color)?;
    domain::tags(&v.tags)?;
    tasks::lock_tasks(tx, user).await?;
    if let Some(folder) = v.folder_id
        && sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM app.note_folders WHERE id=$1 AND user_id=$2 FOR UPDATE",
        )
        .bind(folder)
        .bind(user)
        .fetch_optional(&mut *tx)
        .await?
        .is_none()
    {
        return Err(ApiError::validation(
            "Folder does not belong to the current user or was deleted",
        ));
    }
    let query = if create {
        "INSERT INTO app.notes (id,user_id,title,content,tags,color,folder_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,title,content,tags,color,folder_id,ai_shared,ai_access_revision,created_at,updated_at"
    } else {
        "UPDATE app.notes SET title=$3,content=$4,tags=$5,color=$6,folder_id=$7,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,title,content,tags,color,folder_id,ai_shared,ai_access_revision,created_at,updated_at"
    };
    let result = sqlx::query_as(query)
        .bind(id)
        .bind(user)
        .bind(v.title)
        .bind(v.content)
        .bind(DbJson(v.tags))
        .bind(v.color)
        .bind(v.folder_id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    domain::event(
        tx,
        user,
        if create {
            "note_created"
        } else {
            "note_updated"
        },
        "note",
        id,
        serde_json::json!({}),
    )
    .await?;
    Ok(result)
}
async fn delete_note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_note_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
pub(crate) async fn delete_note_in(
    tx: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<(), ApiError> {
    tasks::lock_tasks(tx, user).await?;
    let rows = sqlx::query("DELETE FROM app.notes WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(user)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if rows == 0 {
        return Err(domain::not_found());
    }
    domain::event(tx, user, "note_deleted", "note", id, serde_json::json!({})).await?;
    Ok(())
}
