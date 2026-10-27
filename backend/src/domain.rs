use crate::{error::ApiError, settings::Settings, state::AppState};
use chrono::{NaiveDate, Utc};
use serde::Deserialize;
use sqlx::PgConnection;
use uuid::Uuid;

pub fn text(value: &str, min: usize, max: usize) -> Result<(), ApiError> {
    if value.trim().chars().count() < min || value.chars().count() > max {
        return Err(ApiError::validation(
            "Text length is outside the supported range",
        ));
    }
    Ok(())
}
pub fn color(value: &str) -> Result<(), ApiError> {
    if value.len() != 7
        || !value.starts_with('#')
        || !value[1..].bytes().all(|c| c.is_ascii_hexdigit())
    {
        return Err(ApiError::validation("Color must use #RRGGBB format"));
    }
    Ok(())
}
pub fn tags(values: &[String]) -> Result<(), ApiError> {
    if values.len() > 30 {
        return Err(ApiError::validation("At most 30 tags are supported"));
    }
    for value in values {
        text(value, 1, 64)?;
    }
    Ok(())
}
pub fn not_found() -> ApiError {
    ApiError::new(
        axum::http::StatusCode::NOT_FOUND,
        "not_found",
        "Resource not found",
    )
}
pub fn conflict(message: &'static str) -> ApiError {
    ApiError::new(axum::http::StatusCode::CONFLICT, "conflict", message)
}
pub async fn settings(state: &AppState, user: Uuid) -> Result<Settings, ApiError> {
    Ok(sqlx::query_scalar::<_, sqlx::types::Json<Settings>>(
        "SELECT data FROM app.settings WHERE user_id=$1",
    )
    .bind(user)
    .fetch_optional(&state.database)
    .await?
    .map_or_else(Settings::default, |v| v.0))
}
pub async fn local_today(state: &AppState, user: Uuid) -> Result<(NaiveDate, String), ApiError> {
    let settings = settings(state, user).await?;
    let zone = settings
        .timezone
        .parse::<chrono_tz::Tz>()
        .map_err(|_| ApiError::internal())?;
    Ok((
        Utc::now().with_timezone(&zone).date_naive(),
        settings.timezone,
    ))
}
pub async fn event(
    db: &mut PgConnection,
    user: Uuid,
    kind: &str,
    entity: &str,
    id: Uuid,
    payload: serde_json::Value,
) -> Result<(), ApiError> {
    sqlx::query("INSERT INTO app.activity_events (id,user_id,event_type,entity_type,entity_id,payload) VALUES($1,$2,$3,$4,$5,$6)")
        .bind(Uuid::new_v4()).bind(user).bind(kind).bind(entity).bind(id).bind(payload).execute(db).await?;
    Ok(())
}
#[derive(Deserialize, Default)]
pub struct Search {
    pub q: Option<String>,
    pub folder_id: Option<Uuid>,
    pub status: Option<String>,
    pub from: Option<NaiveDate>,
    pub to: Option<NaiveDate>,
    pub tag: Option<String>,
}
impl Search {
    pub fn validate(&self) -> Result<(), ApiError> {
        if let Some(q) = &self.q {
            text(q, 0, 200)?;
        }
        if let Some(tag) = &self.tag {
            text(tag, 1, 64)?;
        }
        Ok(())
    }
}
pub fn default_color() -> String {
    "#6366F1".to_owned()
}
