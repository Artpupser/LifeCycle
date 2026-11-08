use super::handlers::{download, upload};
use super::models::MAX_BYTES;
use crate::infrastructure::state::AppState;
use axum::{Router, extract::DefaultBodyLimit, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/media",
            axum::routing::post(upload).layer(DefaultBodyLimit::max(MAX_BYTES)),
        )
        .route("/api/media/{id}", get(download))
        .route("/api/media/providers/{id}", get(super::provider::download))
}
