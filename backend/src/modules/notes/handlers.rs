use super::models::{BulkAction, BulkNotes, Folder, FolderInput, Note, NoteInput, NoteSearch};
use super::service::{delete_note_in, save_folder, save_note, save_note_in};
use crate::{
    infrastructure::state::AppState,
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
use uuid::Uuid;

pub(super) async fn folders(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Folder>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,name,color,created_at,updated_at FROM app.note_folders WHERE user_id=$1 ORDER BY name,id").bind(u.id).fetch_all(&s.database).await?))
}

pub(super) async fn folder(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Folder>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,name,color,created_at,updated_at FROM app.note_folders WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).fetch_optional(&s.database).await?.ok_or_else(domain::not_found)?))
}

pub(super) async fn create_folder(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<FolderInput>,
) -> Result<(StatusCode, Json<Folder>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_folder(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}

pub(super) async fn update_folder(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<FolderInput>,
) -> Result<Json<Folder>, ApiError> {
    Ok(Json(save_folder(&s, u.id, id, v, false).await?))
}

pub(super) async fn delete_folder(
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

pub(super) async fn notes(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(query): Query<NoteSearch>,
) -> Result<Json<Vec<Note>>, ApiError> {
    let q = query.search;
    q.validate()?;
    let shared = match query.ai_access.as_deref() {
        None => None,
        Some("private") => Some(false),
        Some("ai_shared") => Some(true),
        _ => return Err(ApiError::validation("Unsupported AI access filter")),
    };
    Ok(Json(sqlx::query_as("SELECT id,title,content,tags,color,folder_id,ai_shared,ai_access_revision,created_at,updated_at FROM app.notes WHERE user_id=$1 AND ($2::text IS NULL OR strpos(lower(title||' '||content),lower($2))>0) AND ($3::uuid IS NULL OR folder_id=$3) AND ($4::text IS NULL OR tags ? $4) AND ($5::boolean IS NULL OR ai_shared=$5) ORDER BY updated_at DESC,id").bind(u.id).bind(q.q).bind(q.folder_id).bind(q.tag).bind(shared).fetch_all(&s.database).await?))
}

pub(super) async fn note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Note>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,title,content,tags,color,folder_id,ai_shared,ai_access_revision,created_at,updated_at FROM app.notes WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).fetch_optional(&s.database).await?.ok_or_else(domain::not_found)?))
}

pub(super) async fn create_note(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<NoteInput>,
) -> Result<(StatusCode, Json<Note>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_note(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}

pub(super) async fn update_note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<NoteInput>,
) -> Result<Json<Note>, ApiError> {
    Ok(Json(save_note(&s, u.id, id, v, false).await?))
}

pub(super) async fn delete_note(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_note_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn bulk(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(value): ApiJson<BulkNotes>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let unique: std::collections::BTreeSet<_> = value.items.iter().map(|item| item.id).collect();
    if value.items.is_empty() || value.items.len() > 200 || unique.len() != value.items.len() {
        return Err(ApiError::validation("Select 1 to 200 distinct notes"));
    }
    domain::tags(&value.tags)?;
    if matches!(value.action, BulkAction::Color) {
        domain::color(
            value
                .color
                .as_deref()
                .ok_or_else(|| ApiError::validation("Choose a color"))?,
        )?;
    }
    if matches!(value.action, BulkAction::Delete) && !value.confirmed {
        return Err(ApiError::validation("Confirm deletion"));
    }
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let ids: Vec<_> = unique.into_iter().collect();
    let rows = sqlx::query_as::<_, Note>(
        "SELECT * FROM app.notes WHERE user_id=$1 AND id=ANY($2) ORDER BY id FOR UPDATE",
    )
    .bind(u.id)
    .bind(&ids)
    .fetch_all(&mut *tx)
    .await?;
    if rows.len() != ids.len() {
        return Err(domain::not_found());
    }
    for row in &rows {
        if value
            .items
            .iter()
            .find(|item| item.id == row.id)
            .is_none_or(|item| item.updated_at != row.updated_at)
        {
            return Err(domain::conflict(
                "A selected note changed; refresh the selection",
            ));
        }
    }
    // Validate all derived tag sets and the target folder before the first mutation.
    if matches!(value.action, BulkAction::Move)
        && let Some(folder) = value.folder_id
        && !sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM app.note_folders WHERE user_id=$1 AND id=$2)",
        )
        .bind(u.id)
        .bind(folder)
        .fetch_one(&mut *tx)
        .await?
    {
        return Err(domain::not_found());
    }
    let mut changes = vec![];
    for row in rows {
        let mut tags = row.tags.0;
        if matches!(value.action, BulkAction::TagsAdd) {
            for tag in &value.tags {
                if !tags.contains(tag) {
                    tags.push(tag.clone());
                }
            }
        }
        if matches!(value.action, BulkAction::TagsRemove) {
            tags.retain(|tag| !value.tags.contains(tag));
        }
        domain::tags(&tags)?;
        let input = NoteInput {
            title: row.title,
            content: row.content,
            tags,
            color: if matches!(value.action, BulkAction::Color) {
                value.color.clone().unwrap_or(row.color)
            } else {
                row.color
            },
            folder_id: if matches!(value.action, BulkAction::Move) {
                value.folder_id
            } else {
                row.folder_id
            },
        };
        changes.push((row.id, input));
    }
    let affected = changes.len();
    for (id, input) in changes {
        if matches!(value.action, BulkAction::Delete) {
            delete_note_in(&mut tx, u.id, id).await?;
        } else {
            save_note_in(&mut tx, u.id, id, input, false).await?;
        }
    }
    tx.commit().await?;
    Ok(Json(serde_json::json!({"affected":affected})))
}
