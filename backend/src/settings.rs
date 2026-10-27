use crate::{
    auth::CurrentUser,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{Json, Router, extract::State, routing::get};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(default, deny_unknown_fields)]
pub struct Settings {
    pub timezone: String,
    pub language: String,
    pub theme: String,
    pub reminders_enabled: bool,
    pub reminder_minutes_before: u32,
    pub week_starts_on: String,
    pub pomodoro_work_minutes: u32,
    pub pomodoro_break_minutes: u32,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            timezone: "UTC".to_owned(),
            language: "ru".to_owned(),
            theme: "system".to_owned(),
            reminders_enabled: false,
            reminder_minutes_before: 10,
            week_starts_on: "monday".to_owned(),
            pomodoro_work_minutes: 25,
            pomodoro_break_minutes: 5,
        }
    }
}
impl Settings {
    pub fn validate(&self) -> Result<(), ApiError> {
        if self.timezone.parse::<chrono_tz::Tz>().is_err() {
            return Err(ApiError::validation(
                "Timezone must be a supported IANA timezone",
            ));
        }
        if self.language != "ru" {
            return Err(ApiError::validation(
                "Only Russian language is currently supported",
            ));
        }
        if !["system", "light", "dark"].contains(&self.theme.as_str()) {
            return Err(ApiError::validation("Unsupported theme"));
        }
        if !["monday", "sunday"].contains(&self.week_starts_on.as_str()) {
            return Err(ApiError::validation("Unsupported week start"));
        }
        if self.reminder_minutes_before > 1440
            || !(1..=180).contains(&self.pomodoro_work_minutes)
            || !(1..=180).contains(&self.pomodoro_break_minutes)
        {
            return Err(ApiError::validation(
                "Reminder or timer duration is outside the supported range",
            ));
        }
        Ok(())
    }
}
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/settings", get(read).put(update))
}
async fn read(
    State(state): State<AppState>,
    user: CurrentUser,
) -> Result<Json<Settings>, ApiError> {
    let stored = sqlx::query_scalar::<_, sqlx::types::Json<Settings>>(
        "SELECT data FROM app.settings WHERE user_id=$1",
    )
    .bind(user.id)
    .fetch_optional(&state.database)
    .await?;
    Ok(Json(stored.map_or_else(Settings::default, |value| value.0)))
}
async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(settings): ApiJson<Settings>,
) -> Result<Json<Settings>, ApiError> {
    settings.validate()?;
    sqlx::query("INSERT INTO app.settings (user_id,data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()")
        .bind(user.id).bind(sqlx::types::Json(&settings)).execute(&state.database).await?;
    Ok(Json(settings))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn validates_iana_timezone_and_bounds() {
        let mut s = Settings {
            timezone: "Europe/Moscow".into(),
            ..Settings::default()
        };
        assert!(s.validate().is_ok());
        s.timezone = "Mars/Olympus".into();
        assert!(s.validate().is_err());
        s.timezone = "UTC".into();
        s.pomodoro_work_minutes = 0;
        assert!(s.validate().is_err());
    }
}
