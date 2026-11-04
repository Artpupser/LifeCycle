use super::handlers::{feed, remove};
use crate::infrastructure::state::AppState;
use axum::Router;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/history", axum::routing::get(feed))
        .route("/api/history/{kind}/{key}", axum::routing::delete(remove))
}
