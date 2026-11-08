use super::{models::*, service};
use crate::{
    infrastructure::state::AppState,
    shared::{
        auth::CurrentUser,
        errors::{ApiError, ApiJson},
    },
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/videogames", get(read))
        .route("/api/videogames/refresh", post(refresh))
        .route(
            "/api/videogames/preferences",
            axum::routing::put(preferences),
        )
        .route("/api/videogames/acquired", axum::routing::put(mark))
        .route("/api/videogames/sales/{id}/calendar", post(calendar))
}
async fn read(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Catalog>, ApiError> {
    Ok(Json(service::catalog(&s, u.id).await?))
}
async fn refresh(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Catalog>, ApiError> {
    service::refresh(&s).await?;
    service::notify_subscribers(&s).await?;
    Ok(Json(service::catalog(&s, u.id).await?))
}
async fn preferences(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(input): ApiJson<Preferences>,
) -> Result<StatusCode, ApiError> {
    service::preferences(&s, u.id, input).await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn mark(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(input): ApiJson<Mark>,
) -> Result<StatusCode, ApiError> {
    service::mark(&s, u.id, input).await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn calendar(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<String>,
) -> Result<Json<Vec<uuid::Uuid>>, ApiError> {
    Ok(Json(service::add_sale(&s, u.id, &id).await?))
}
