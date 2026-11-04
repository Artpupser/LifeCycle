use super::handlers::{
    calendar, create, delete, history, list, mark, read, today, update, update_plan,
};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/tasks", get(list).post(create))
        .route("/api/tasks/{id}", get(read).put(update).delete(delete))
        .route(
            "/api/tasks/{id}/occurrences/{date}",
            axum::routing::post(mark),
        )
        .route("/api/tasks/{id}/history", get(history))
        .route("/api/tasks/{id}/plan", axum::routing::put(update_plan))
        .route("/api/today", get(today))
        .route("/api/calendar", get(calendar))
}
