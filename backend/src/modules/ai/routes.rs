use super::chats::{chats, create_chat, delete_chat, read_chat};
use super::requests::{cancel_turn, preview, read_turn, send};
use super::settings::{ollama_models, read_config, remove_connection, update_config};
use crate::infrastructure::state::AppState;
use axum::{Router, routing::get};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/ai/ollama/models", get(ollama_models))
        .route("/api/ai/settings", get(read_config).put(update_config))
        .route(
            "/api/ai/connections/{provider}",
            axum::routing::delete(remove_connection),
        )
        .route("/api/ai/chats", get(chats).post(create_chat))
        .route("/api/ai/chats/{id}", get(read_chat).delete(delete_chat))
        .route("/api/ai/chats/{id}/preview", axum::routing::post(preview))
        .route("/api/ai/chats/{id}/messages", axum::routing::post(send))
        .route(
            "/api/ai/chats/{chat}/messages/{id}",
            get(read_turn).delete(cancel_turn),
        )
}
