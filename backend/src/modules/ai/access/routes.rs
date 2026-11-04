use super::handlers::{exercise, note, notes_bulk, workout};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::put};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/notes/ai-access", put(notes_bulk))
        .route("/api/notes/{id}/ai-access", put(note))
        .route("/api/workouts/{id}/ai-access", put(workout))
        .route("/api/exercises/{id}/ai-access", put(exercise))
}
