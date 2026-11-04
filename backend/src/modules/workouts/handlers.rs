use super::models::Record;
use super::service::{delete_exercise_in, delete_workout_in, save_exercise, save_workout};
use crate::{
    infrastructure::state::AppState,
    modules::workouts::plan::{Exercise, Workout},
    shared::auth::CurrentUser,
    shared::domain::{self, Search},
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use uuid::Uuid;

pub(super) async fn exercises(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Record<Exercise>>>, ApiError> {
    q.validate()?;
    Ok(Json(sqlx::query_as("SELECT * FROM app.exercises WHERE user_id=$1 AND ($2::text IS NULL OR strpos(lower((data->>'title')||' '||(data->>'description')),lower($2))>0) ORDER BY created_at,id").bind(u.id).bind(q.q).fetch_all(&s.database).await?))
}

pub(super) async fn workouts(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Record<Workout>>>, ApiError> {
    q.validate()?;
    Ok(Json(sqlx::query_as("SELECT * FROM app.workouts WHERE user_id=$1 AND ($2::text IS NULL OR strpos(lower((data->>'title')||' '||(data->>'description')),lower($2))>0) AND ($3::text IS NULL OR (data->'tags') ? $3) ORDER BY created_at,id").bind(u.id).bind(q.q).bind(q.tag).fetch_all(&s.database).await?))
}

pub(super) async fn read_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Record<Exercise>>, ApiError> {
    Ok(Json(
        sqlx::query_as("SELECT * FROM app.exercises WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .fetch_optional(&s.database)
            .await?
            .ok_or_else(domain::not_found)?,
    ))
}

pub(super) async fn read_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Record<Workout>>, ApiError> {
    Ok(Json(
        sqlx::query_as("SELECT * FROM app.workouts WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .fetch_optional(&s.database)
            .await?
            .ok_or_else(domain::not_found)?,
    ))
}

pub(super) async fn create_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Exercise>,
) -> Result<(StatusCode, Json<Record<Exercise>>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_exercise(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}

pub(super) async fn update_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Exercise>,
) -> Result<Json<Record<Exercise>>, ApiError> {
    Ok(Json(save_exercise(&s, u.id, id, v, false).await?))
}

pub(super) async fn delete_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_exercise_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn create_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Workout>,
) -> Result<(StatusCode, Json<Record<Workout>>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_workout(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}

pub(super) async fn update_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Workout>,
) -> Result<Json<Record<Workout>>, ApiError> {
    Ok(Json(save_workout(&s, u.id, id, v, false).await?))
}

pub(super) async fn delete_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_workout_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
