use super::{
    domain::{Contact, WriteMode},
    dto::{Delete, Import, Imported, Input, LabelChange},
    repository::{all, load},
    service,
};
use crate::{
    auth::CurrentUser,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use uuid::Uuid;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/contacts", get(list).post(create))
        .route("/api/contacts/import", post(import))
        .route("/api/contacts/labels", post(labels))
        .route("/api/contacts/{id}", get(read).put(update).delete(delete))
}
async fn list(
    State(state): State<AppState>,
    user: CurrentUser,
) -> Result<Json<Vec<Contact>>, ApiError> {
    Ok(Json(
        all(&state, user.id, &mut *state.database.acquire().await?).await?,
    ))
}
async fn read(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Contact>, ApiError> {
    Ok(Json(
        load(&state, user.id, id, &mut *state.database.acquire().await?).await?,
    ))
}
async fn create(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(input): ApiJson<Input>,
) -> Result<(StatusCode, Json<Contact>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(service::save(&state, user.id, Uuid::new_v4(), input, WriteMode::Create).await?),
    ))
}
async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(input): ApiJson<Input>,
) -> Result<Json<Contact>, ApiError> {
    Ok(Json(
        service::save(&state, user.id, id, input, WriteMode::Update).await?,
    ))
}
async fn delete(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(input): ApiJson<Delete>,
) -> Result<StatusCode, ApiError> {
    service::delete(&state, user.id, id, input).await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn import(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(input): ApiJson<Import>,
) -> Result<Json<Imported>, ApiError> {
    Ok(Json(service::import(&state, user.id, input).await?))
}

async fn labels(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(input): ApiJson<LabelChange>,
) -> Result<StatusCode, ApiError> {
    service::labels(&state, user.id, input).await?;
    Ok(StatusCode::NO_CONTENT)
}
