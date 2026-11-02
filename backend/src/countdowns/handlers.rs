use super::{
    domain::computed,
    dto::{CountdownInput, Unlink},
    model::Countdown,
    repository::{self, WriteMode, rows, save},
};
use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use chrono::Utc;
use uuid::Uuid;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/countdowns", get(list).post(create))
        .route("/api/countdowns/{id}", get(read).put(update).delete(delete))
        .route("/api/countdowns/{id}/unlink", post(unlink))
}
async fn list(
    State(state): State<AppState>,
    user: CurrentUser,
) -> Result<Json<Vec<Countdown>>, ApiError> {
    let zone = domain::settings(&state, user.id).await?.timezone;
    let now = Utc::now();
    Ok(Json(
        rows(&state, user.id)
            .await?
            .into_iter()
            .map(|row| computed(row, now, &zone))
            .collect::<Result<_, _>>()?,
    ))
}
async fn read(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Countdown>, ApiError> {
    let row = rows(&state, user.id)
        .await?
        .into_iter()
        .find(|row| row.id == id)
        .ok_or_else(domain::not_found)?;
    Ok(Json(computed(
        row,
        Utc::now(),
        &domain::settings(&state, user.id).await?.timezone,
    )?))
}
async fn create(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(input): ApiJson<CountdownInput>,
) -> Result<(StatusCode, Json<Countdown>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save(&state, user.id, Uuid::new_v4(), input, WriteMode::Create).await?),
    ))
}
async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(input): ApiJson<CountdownInput>,
) -> Result<Json<Countdown>, ApiError> {
    Ok(Json(
        save(&state, user.id, id, input, WriteMode::Update).await?,
    ))
}
async fn delete(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    repository::delete(&state, user.id, id).await
}

async fn unlink(
    State(state): State<AppState>,
    user: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(input): ApiJson<Unlink>,
) -> Result<StatusCode, ApiError> {
    repository::unlink(&state, user.id, id, input).await
}
