use super::handlers::{feed, remove, remove_bulk};
use crate::infrastructure::state::AppState;
use axum::Router;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/history", axum::routing::get(feed))
        .route("/api/history/remove", axum::routing::post(remove_bulk))
        .route("/api/history/{kind}/{key}", axum::routing::delete(remove))
}
