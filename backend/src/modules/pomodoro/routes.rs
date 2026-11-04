use super::handlers::{active, change, start};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/pomodoro", get(active).post(start))
        .route("/api/pomodoro/{id}/{action}", axum::routing::post(change))
}
