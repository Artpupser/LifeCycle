use super::handlers::{
    create, delete, delete_history, history, list, mark, read, single_statistics, statistics,
    update,
};
use crate::infrastructure::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/habits", get(list).post(create))
        .route("/api/habits/statistics", get(statistics))
        .route("/api/habits/{id}", get(read).put(update).delete(delete))
        .route("/api/habits/{id}/marks/{date}", post(mark))
        .route(
            "/api/habits/{id}/history",
            get(history).delete(delete_history),
        )
        .route("/api/habits/{id}/statistics", get(single_statistics))
}
