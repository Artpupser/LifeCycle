use super::handlers::{
    add_column, create, create_task, list, memberships, move_item, read, remove, remove_column,
    remove_item, update, update_column,
};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

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
