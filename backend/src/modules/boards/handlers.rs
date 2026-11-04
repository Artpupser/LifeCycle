use super::models::{
    Board, BoardInput, BoardState, ColumnInput, Membership, Move, Name, NewTask, RemoveColumn,
    Revision,
};
use super::service::{bump, check, column_save, state};
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
use uuid::Uuid;

pub(super) async fn create_task(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<NewTask>,
) -> Result<Json<BoardState>, ApiError> {
    let mut tx = s.database.begin().await?;
    check(&mut tx, u.id, id, v.revision).await?;
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.board_columns WHERE user_id=$1 AND board_id=$2 AND id=$3)",
    )
    .bind(u.id)
    .bind(id)
    .bind(v.column_id)
    .fetch_one(&mut *tx)
    .await?;
    if !exists {
        return Err(domain::not_found());
    }
    let task_id = Uuid::new_v4();
    tasks::save_in(&s, &mut tx, u.id, task_id, v.task, true).await?;
    let position:i32=sqlx::query_scalar("SELECT coalesce(max(position)+1,0) FROM app.board_items WHERE user_id=$1 AND board_id=$2 AND column_id=$3").bind(u.id).bind(id).bind(v.column_id).fetch_one(&mut *tx).await?;
    sqlx::query("INSERT INTO app.board_items(user_id,task_id,board_id,column_id,position) VALUES($1,$2,$3,$4,$5)").bind(u.id).bind(task_id).bind(id).bind(v.column_id).bind(position).execute(&mut *tx).await?;
    bump(&mut tx, u.id, id).await?;
    let result = state(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn memberships(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Membership>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT i.task_id,i.board_id,i.column_id,b.name AS board_name,c.name AS column_name FROM app.board_items i JOIN app.task_boards b ON b.user_id=i.user_id AND b.id=i.board_id JOIN app.board_columns c ON c.user_id=i.user_id AND c.board_id=i.board_id AND c.id=i.column_id WHERE i.user_id=$1 ORDER BY i.board_id,i.column_id,i.position,i.task_id").bind(u.id).fetch_all(&s.database).await?))
}

pub(super) async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Board>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,name,view,zoom,revision,emoji FROM app.task_boards WHERE user_id=$1 ORDER BY name,id").bind(u.id).fetch_all(&s.database).await?))
}

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<BoardState>, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let result = state(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Name>,
) -> Result<(StatusCode, Json<BoardState>), ApiError> {
    domain::text(&v.name, 1, 200)?;
    domain::text(&v.emoji, 0, 128)?;
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let id = Uuid::new_v4();
    sqlx::query("INSERT INTO app.task_boards(id,user_id,name,emoji) VALUES($1,$2,$3,$4)")
        .bind(id)
        .bind(u.id)
        .bind(v.name.trim())
        .bind(v.emoji)
        .execute(&mut *tx)
        .await?;
    for (position, name) in ["Запланировано", "В работе", "Готово"].iter().enumerate()
    {
        sqlx::query("INSERT INTO app.board_columns(id,user_id,board_id,name,position,color) VALUES($1,$2,$3,$4,$5,$6)").bind(Uuid::new_v4()).bind(u.id).bind(id).bind(name).bind(position as i32).bind(["#0EA5E9","#F59E0B","#16A34A"][position]).execute(&mut *tx).await?;
    }
    let result = state(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(result)))
}

pub(super) async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<BoardInput>,
) -> Result<Json<BoardState>, ApiError> {
    domain::text(&v.name, 1, 200)?;
    if let Some(emoji) = &v.emoji {
        domain::text(emoji, 0, 128)?;
    }
    if !["kanban", "gantt"].contains(&v.view.as_str())
        || !["day", "week", "fortnight"].contains(&v.zoom.as_str())
    {
        return Err(ApiError::validation("Unsupported board view"));
    }
    let mut tx = s.database.begin().await?;
    check(&mut tx, u.id, id, v.revision).await?;
    sqlx::query("UPDATE app.task_boards SET name=$3,view=$4,zoom=$5,emoji=coalesce($6,emoji),revision=revision+1 WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).bind(v.name.trim()).bind(v.view).bind(v.zoom).bind(v.emoji).execute(&mut *tx).await?;
    let result = state(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn remove(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    check(&mut tx, u.id, id, v.revision).await?;
    sqlx::query("DELETE FROM app.board_items WHERE user_id=$1 AND board_id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM app.task_boards WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn add_column(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<ColumnInput>,
) -> Result<Json<BoardState>, ApiError> {
    column_save(s, u.id, id, Uuid::new_v4(), v, true).await
}

pub(super) async fn update_column(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, column)): Path<(Uuid, Uuid)>,
    ApiJson(v): ApiJson<ColumnInput>,
) -> Result<Json<BoardState>, ApiError> {
    column_save(s, u.id, id, column, v, false).await
}

pub(super) async fn remove_column(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, column)): Path<(Uuid, Uuid)>,
    ApiJson(v): ApiJson<RemoveColumn>,
) -> Result<Json<BoardState>, ApiError> {
    let mut tx = s.database.begin().await?;
    check(&mut tx, u.id, id, v.revision).await?;
    let columns = state(&mut tx, u.id, id).await?.columns;
    if !columns.iter().any(|c| c.id == column) {
        return Err(domain::not_found());
    }
    let count: i64 = sqlx::query_scalar(
        "SELECT count(*) FROM app.board_items WHERE user_id=$1 AND board_id=$2 AND column_id=$3",
    )
    .bind(u.id)
    .bind(id)
    .bind(column)
    .fetch_one(&mut *tx)
    .await?;
    if let Some(target) = v.target_id {
        if target == column || !columns.iter().any(|c| c.id == target) {
            return Err(ApiError::validation("Choose another column on this board"));
        }
        let offset:i32=sqlx::query_scalar("SELECT coalesce(max(position)+1,0) FROM app.board_items WHERE user_id=$1 AND board_id=$2 AND column_id=$3").bind(u.id).bind(id).bind(target).fetch_one(&mut *tx).await?;
        sqlx::query("UPDATE app.board_items SET column_id=$4,position=position+$5 WHERE user_id=$1 AND board_id=$2 AND column_id=$3").bind(u.id).bind(id).bind(column).bind(target).bind(offset).execute(&mut *tx).await?;
    } else if count > 0 {
        return Err(domain::conflict(
            "Move tasks to another column before deleting",
        ));
    }
    sqlx::query("DELETE FROM app.board_columns WHERE user_id=$1 AND board_id=$2 AND id=$3")
        .bind(u.id)
        .bind(id)
        .bind(column)
        .execute(&mut *tx)
        .await?;
    for (position, c) in columns.iter().filter(|c| c.id != column).enumerate() {
        sqlx::query(
            "UPDATE app.board_columns SET position=$4 WHERE user_id=$1 AND board_id=$2 AND id=$3",
        )
        .bind(u.id)
        .bind(id)
        .bind(c.id)
        .bind(position as i32)
        .execute(&mut *tx)
        .await?;
    }
    bump(&mut tx, u.id, id).await?;
    let result = state(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn move_item(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, task)): Path<(Uuid, Uuid)>,
    ApiJson(v): ApiJson<Move>,
) -> Result<Json<BoardState>, ApiError> {
    let mut tx = s.database.begin().await?;
    check(&mut tx, u.id, id, v.revision).await?;
    let exists:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND id=$2 AND source_kind='manual') AND EXISTS(SELECT 1 FROM app.board_columns WHERE user_id=$1 AND board_id=$3 AND id=$4)").bind(u.id).bind(task).bind(id).bind(v.column_id).fetch_one(&mut *tx).await?;
    if !exists {
        return Err(domain::not_found());
    }
    let old: Option<Uuid> =
        sqlx::query_scalar("SELECT board_id FROM app.board_items WHERE user_id=$1 AND task_id=$2")
            .bind(u.id)
            .bind(task)
            .fetch_optional(&mut *tx)
            .await?;
    let mut items:Vec<Uuid>=sqlx::query_scalar("SELECT task_id FROM app.board_items WHERE user_id=$1 AND board_id=$2 AND column_id=$3 AND task_id<>$4 ORDER BY position,task_id").bind(u.id).bind(id).bind(v.column_id).bind(task).fetch_all(&mut *tx).await?;
    let index = if let Some(before) = v.before_id {
        items
            .iter()
            .position(|t| *t == before)
            .ok_or_else(|| ApiError::validation("Insertion target is not in this column"))?
    } else {
        items.len()
    };
    items.insert(index, task);
    sqlx::query("INSERT INTO app.board_items(user_id,task_id,board_id,column_id,position) VALUES($1,$2,$3,$4,0) ON CONFLICT(user_id,task_id) DO UPDATE SET board_id=$3,column_id=$4,position=0").bind(u.id).bind(task).bind(id).bind(v.column_id).execute(&mut *tx).await?;
    for (position, t) in items.iter().enumerate() {
        sqlx::query("UPDATE app.board_items SET position=$3 WHERE user_id=$1 AND task_id=$2")
            .bind(u.id)
            .bind(t)
            .bind(position as i32)
            .execute(&mut *tx)
            .await?;
    }
    if let Some(old) = old.filter(|old| *old != id) {
        bump(&mut tx, u.id, old).await?;
    }
    bump(&mut tx, u.id, id).await?;
    let result = state(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn remove_item(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, task)): Path<(Uuid, Uuid)>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<Json<BoardState>, ApiError> {
    let mut tx = s.database.begin().await?;
    check(&mut tx, u.id, id, v.revision).await?;
    let rows =
        sqlx::query("DELETE FROM app.board_items WHERE user_id=$1 AND board_id=$2 AND task_id=$3")
            .bind(u.id)
            .bind(id)
            .bind(task)
            .execute(&mut *tx)
            .await?
            .rows_affected();
    if rows == 0 {
        return Err(domain::not_found());
    }
    bump(&mut tx, u.id, id).await?;
    let result = state(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(result))
}
