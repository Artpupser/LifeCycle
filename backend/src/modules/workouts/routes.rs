use super::handlers::{
    create_exercise, create_workout, delete_exercise, delete_workout, exercises, read_exercise,
    read_workout, update_exercise, update_workout, workouts,
};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/exercises", get(exercises).post(create_exercise))
        .route(
            "/api/exercises/{id}",
            get(read_exercise)
                .put(update_exercise)
                .delete(delete_exercise),
        )
        .route("/api/workouts", get(workouts).post(create_workout))
        .route(
            "/api/workouts/{id}",
            get(read_workout).put(update_workout).delete(delete_workout),
        )
}
