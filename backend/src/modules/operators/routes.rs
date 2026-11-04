use super::handlers::{lookup, read, save};
use crate::infrastructure::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/operators/settings", get(read).put(save))
        .route("/api/operators/lookup", post(lookup))
}
