use super::models::{Folder, FolderInput, Note, NoteInput};
use crate::{
    infrastructure::state::AppState, modules::tasks, shared::domain, shared::errors::ApiError,
};
use sqlx::{PgConnection, types::Json as DbJson};
use uuid::Uuid;

pub(super) async fn save_folder(
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

pub(super) async fn save_note(
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
