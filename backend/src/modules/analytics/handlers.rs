use super::models::{Privacy, Range, Report};
use super::service::{build_report, privacy};
use crate::{
    infrastructure::state::AppState,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Query, State, rejection::QueryRejection},
};

pub(super) async fn read_privacy(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Privacy>, ApiError> {
    Ok(Json(privacy(&s, u.id).await?))
}

pub(super) async fn update_privacy(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Privacy>,
) -> Result<Json<Privacy>, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    sqlx::query("INSERT INTO app.analytics_privacy(user_id,include_profile,include_intimacy) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET include_profile=EXCLUDED.include_profile,include_intimacy=EXCLUDED.include_intimacy,updated_at=now()")
        .bind(u.id).bind(v.include_profile).bind(v.include_intimacy).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(v))
}

pub(super) async fn report(
    State(s): State<AppState>,
    u: CurrentUser,
    query: Result<Query<Range>, QueryRejection>,
) -> Result<Json<Report>, ApiError> {
    let Query(q) = query.map_err(|_| ApiError::validation("Invalid analytics range"))?;
    q.validate()?;
    Ok(Json(build_report(&s, u.id, q.from, q.to, None).await?))
}
