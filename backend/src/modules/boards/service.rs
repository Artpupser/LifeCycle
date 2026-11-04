use super::models::{BoardState, ColumnInput};
use crate::{
    infrastructure::state::AppState, modules::tasks, shared::domain, shared::errors::ApiError,
};
use axum::{Json, http::StatusCode};
use sqlx::PgConnection;
use uuid::Uuid;

pub(super) async fn state(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<BoardState, ApiError> {
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

pub(super) async fn check(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
    revision: i64,
) -> Result<(), ApiError> {
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

pub(super) async fn bump(db: &mut PgConnection, user: Uuid, id: Uuid) -> Result<(), ApiError> {
    sqlx::query("UPDATE app.task_boards SET revision=revision+1 WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}

pub(super) async fn column_save(
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
