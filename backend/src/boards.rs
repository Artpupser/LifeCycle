//! Board membership is independent of task status and recurring occurrence results.
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
struct Board {
    emoji: String,
    id: Uuid,
    name: String,
    view: String,
    zoom: String,
    revision: i64,
}
#[derive(Serialize, sqlx::FromRow)]
struct Column {
    color: String,
    id: Uuid,
    name: String,
    position: i32,
}
#[derive(Serialize, sqlx::FromRow)]
struct Item {
    task_id: Uuid,
    column_id: Uuid,
    position: i32,
}
#[derive(Serialize)]
struct BoardState {
    board: Board,
    columns: Vec<Column>,
    items: Vec<Item>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Name {
    name: String,
    #[serde(default)]
    emoji: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Revision {
    revision: i64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct BoardInput {
    emoji: Option<String>,
    revision: i64,
    name: String,
    view: String,
    zoom: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ColumnInput {
    revision: i64,
    name: String,
    position: Option<i32>,
    color: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct RemoveColumn {
    revision: i64,
    target_id: Option<Uuid>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Move {
    revision: i64,
    column_id: Uuid,
    before_id: Option<Uuid>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct NewTask {
    revision: i64,
    column_id: Uuid,
    task: tasks::TaskInput,
}
async fn create_task(
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
#[derive(Serialize, sqlx::FromRow)]
struct Membership {
    task_id: Uuid,
    board_id: Uuid,
    column_id: Uuid,
    board_name: String,
    column_name: String,
}
async fn memberships(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Membership>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT i.task_id,i.board_id,i.column_id,b.name AS board_name,c.name AS column_name FROM app.board_items i JOIN app.task_boards b ON b.user_id=i.user_id AND b.id=i.board_id JOIN app.board_columns c ON c.user_id=i.user_id AND c.board_id=i.board_id AND c.id=i.column_id WHERE i.user_id=$1 ORDER BY i.board_id,i.column_id,i.position,i.task_id").bind(u.id).fetch_all(&s.database).await?))
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/boards", get(list).post(create))
        .route("/api/boards/memberships", get(memberships))
        .route("/api/boards/{id}", get(read).put(update).delete(remove))
        .route("/api/boards/{id}/tasks", axum::routing::post(create_task))
        .route("/api/boards/{id}/columns", axum::routing::post(add_column))
        .route(
            "/api/boards/{id}/columns/{column}",
            axum::routing::put(update_column).delete(remove_column),
        )
        .route(
            "/api/boards/{id}/items/{task}",
            axum::routing::put(move_item).delete(remove_item),
        )
}
async fn list(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Board>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,name,view,zoom,revision,emoji FROM app.task_boards WHERE user_id=$1 ORDER BY name,id").bind(u.id).fetch_all(&s.database).await?))
}
async fn state(db: &mut PgConnection, user: Uuid, id: Uuid) -> Result<BoardState, ApiError> {
    let board = sqlx::query_as(
        "SELECT id,name,view,zoom,revision,emoji FROM app.task_boards WHERE user_id=$1 AND id=$2",
    )
    .bind(user)
    .bind(id)
    .fetch_optional(&mut *db)
    .await?
    .ok_or_else(domain::not_found)?;
    let columns = sqlx::query_as("SELECT id,name,position,color FROM app.board_columns WHERE user_id=$1 AND board_id=$2 ORDER BY position,id").bind(user).bind(id).fetch_all(&mut *db).await?;
    let items = sqlx::query_as("SELECT task_id,column_id,position FROM app.board_items WHERE user_id=$1 AND board_id=$2 ORDER BY column_id,position,task_id").bind(user).bind(id).fetch_all(db).await?;
    Ok(BoardState {
        board,
        columns,
        items,
    })
}
async fn check(db: &mut PgConnection, user: Uuid, id: Uuid, revision: i64) -> Result<(), ApiError> {
    tasks::lock_tasks(db, user).await?;
    let current: i64 = sqlx::query_scalar(
        "SELECT revision FROM app.task_boards WHERE user_id=$1 AND id=$2 FOR UPDATE",
    )
    .bind(user)
    .bind(id)
    .fetch_optional(&mut *db)
    .await?
    .ok_or_else(domain::not_found)?;
    if current != revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "board_stale",
            "Board changed; refresh before retrying",
        ));
    }
    Ok(())
}
async fn bump(db: &mut PgConnection, user: Uuid, id: Uuid) -> Result<(), ApiError> {
    sqlx::query("UPDATE app.task_boards SET revision=revision+1 WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}
async fn read(
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
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Name>,
) -> Result<(StatusCode, Json<BoardState>), ApiError> {
    domain::text(&v.name, 1, 200)?;
    domain::text(&v.emoji, 0, 16)?;
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
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<BoardInput>,
) -> Result<Json<BoardState>, ApiError> {
    domain::text(&v.name, 1, 200)?;
    if let Some(emoji) = &v.emoji {
        domain::text(emoji, 0, 16)?;
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
async fn remove(
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
async fn add_column(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<ColumnInput>,
) -> Result<Json<BoardState>, ApiError> {
    column_save(s, u.id, id, Uuid::new_v4(), v, true).await
}
async fn update_column(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, column)): Path<(Uuid, Uuid)>,
    ApiJson(v): ApiJson<ColumnInput>,
) -> Result<Json<BoardState>, ApiError> {
    column_save(s, u.id, id, column, v, false).await
}
async fn column_save(
    s: AppState,
    user: Uuid,
    id: Uuid,
    column: Uuid,
    v: ColumnInput,
    create: bool,
) -> Result<Json<BoardState>, ApiError> {
    domain::text(&v.name, 1, 100)?;
    let mut tx = s.database.begin().await?;
    check(&mut tx, user, id, v.revision).await?;
    let mut columns: Vec<Uuid> = sqlx::query_scalar(
        "SELECT id FROM app.board_columns WHERE user_id=$1 AND board_id=$2 ORDER BY position,id",
    )
    .bind(user)
    .bind(id)
    .fetch_all(&mut *tx)
    .await?;
    if !create && !columns.contains(&column) {
        return Err(domain::not_found());
    }
    let previous_position = columns
        .iter()
        .position(|c| *c == column)
        .unwrap_or(columns.len()) as i32;
    let position = v.position.unwrap_or(previous_position);
    if let Some(color) = &v.color {
        domain::color(color)?;
    }
    columns.retain(|c| *c != column);
    if position < 0 || position as usize > columns.len() {
        return Err(ApiError::validation("Invalid column position"));
    }
    if create {
        sqlx::query("INSERT INTO app.board_columns(id,user_id,board_id,name,position,color) VALUES($1,$2,$3,$4,0,$5)").bind(column).bind(user).bind(id).bind(v.name.trim()).bind(v.color.as_deref().unwrap_or("#64748B")).execute(&mut *tx).await?;
    } else {
        sqlx::query(
            "UPDATE app.board_columns SET name=$4,color=coalesce($5,color) WHERE id=$1 AND user_id=$2 AND board_id=$3",
        )
        .bind(column)
        .bind(user)
        .bind(id)
        .bind(v.name.trim())
        .bind(v.color)
        .execute(&mut *tx)
        .await?;
    }
    columns.insert(position as usize, column);
    for (position, c) in columns.iter().enumerate() {
        sqlx::query(
            "UPDATE app.board_columns SET position=$4 WHERE user_id=$1 AND board_id=$2 AND id=$3",
        )
        .bind(user)
        .bind(id)
        .bind(c)
        .bind(position as i32)
        .execute(&mut *tx)
        .await?;
    }
    bump(&mut tx, user, id).await?;
    let result = state(&mut tx, user, id).await?;
    tx.commit().await?;
    Ok(Json(result))
}
async fn remove_column(
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
async fn move_item(
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
async fn remove_item(
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
