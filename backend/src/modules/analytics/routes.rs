use super::handlers::{read_privacy, report, update_privacy};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/analytics", get(report)).route(
        "/api/analytics/privacy",
        get(read_privacy).put(update_privacy),
    )
}
