use super::functions;
use super::handlers::{create, list, list_tags, remove, update};

use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .merge(functions::routes())
        .route("/api/labels", get(list).post(create))
        .route(
            "/api/labels/{id}",
            axum::routing::put(update).delete(remove),
        )
        .route("/api/task-tags", get(list_tags).post(create))
        .route(
            "/api/task-tags/{id}",
            axum::routing::put(update).delete(remove),
        )
}
