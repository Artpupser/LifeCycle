use super::handlers::{accounts, authorize, callback, complete, disconnect, models, select, start};
use crate::infrastructure::state::AppState;
use axum::{
    Router,
    routing::{get, post},
};

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/ai/login/start", post(start))
        .route("/api/ai/login/authorize", get(authorize))
        .route("/api/ai/login/callback", get(callback))
        .route("/api/ai/login/complete", get(complete))
        .route("/api/ai/accounts", get(accounts))
        .route("/api/ai/accounts/{id}", post(select).delete(disconnect))
        .route("/api/ai/models", get(models))
}
