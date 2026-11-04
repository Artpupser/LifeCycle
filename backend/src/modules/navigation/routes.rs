use super::handlers::{read, update};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/navigation", get(read).put(update))
}
