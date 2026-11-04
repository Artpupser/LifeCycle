use super::handlers::{active, change, history, read, start};
use crate::infrastructure::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/workout-sessions", get(history).post(start))
        .route("/api/workout-sessions/active", get(active))
        .route("/api/workout-sessions/{id}", get(read))
        .route("/api/workout-sessions/{id}/{action}", post(change))
}
