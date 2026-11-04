use super::handlers::{apply, dismiss, list, prepare, undo};
use crate::infrastructure::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/ai/actions", get(list).post(prepare))
        .route("/api/ai/actions/{id}/apply", post(apply))
        .route("/api/ai/actions/{id}/undo", post(undo))
        .route("/api/ai/actions/{id}/dismiss", post(dismiss))
}
