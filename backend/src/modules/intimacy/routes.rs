use super::handlers::{create, delete, list, read, update};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/sex", get(list).post(create))
        .route("/api/sex/{id}", get(read).put(update).delete(delete))
}
