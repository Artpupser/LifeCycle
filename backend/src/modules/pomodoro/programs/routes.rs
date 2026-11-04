use super::handlers::{create, delete, history, list, start, update};
use crate::infrastructure::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/pomodoro/configs", get(list).post(create))
        .route(
            "/api/pomodoro/configs/{id}",
            axum::routing::put(update).delete(delete),
        )
        .route("/api/pomodoro/program", post(start))
        .route("/api/pomodoro/history", get(history))
}
