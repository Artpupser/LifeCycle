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
    pub time_format: String,
    pub language: String,
    pub theme: String,
    pub custom_theme: Option<ThemeColors>,
    pub background_image: Option<uuid::Uuid>,
    pub background_dim: u8,
    pub sounds_enabled: bool,
    pub animations_enabled: bool,
    pub effects_enabled: bool,
    pub sound_ui: bool,
    pub sound_notifications: bool,
    pub sound_volume: u8,
    pub sound_theme: String,
    pub reminders_enabled: bool,
    pub reminder_minutes_before: u32,
    pub week_starts_on: String,
    pub pomodoro_work_minutes: u32,
    pub pomodoro_break_minutes: u32,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(deny_unknown_fields)]
pub struct ThemeColors {
    pub background: String,
    pub foreground: String,
    pub card: String,
    pub primary: String,
    pub primary_foreground: String,
    pub muted: String,
    pub muted_foreground: String,
    pub border: String,
    pub destructive: String,
}
impl ThemeColors {
    fn validate(&self) -> Result<(), ApiError> {
        for color in [
            &self.background,
            &self.foreground,
            &self.card,
            &self.primary,
            &self.primary_foreground,
            &self.muted,
            &self.muted_foreground,
            &self.border,
            &self.destructive,
        ] {
            crate::domain::color(color)?;
        }
        fn luminance(color: &str) -> f64 {
            let values: Vec<f64> = [1, 3, 5]
                .iter()
                .map(|&index| {
                    let value = u8::from_str_radix(&color[index..index + 2], 16).unwrap_or(0)
                        as f64
                        / 255.0;
                    if value <= 0.04045 {
                        value / 12.92
                    } else {
                        ((value + 0.055) / 1.055).powf(2.4)
                    }
                })
                .collect();
            0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2]
        }
        for (background, foreground) in [
            (&self.background, &self.foreground),
            (&self.card, &self.foreground),
            (&self.primary, &self.primary_foreground),
        ] {
            let a = luminance(background);
            let b = luminance(foreground);
            if (a.max(b) + 0.05) / (a.min(b) + 0.05) < 4.5 {
                return Err(ApiError::validation(
                    "Theme text contrast must be at least 4.5:1",
                ));
            }
        }
        Ok(())
    }
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            timezone: "UTC".to_owned(),
            time_format: "24h".to_owned(),
            language: "ru".to_owned(),
            theme: "system".to_owned(),
            custom_theme: None,
            background_image: None,
            background_dim: 85,
            sounds_enabled: false,
            animations_enabled: true,
            effects_enabled: true,
            sound_ui: true,
            sound_notifications: true,
            sound_volume: 25,
            sound_theme: "soft".into(),
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
        if !["ru", "en"].contains(&self.language.as_str()) {
            return Err(ApiError::validation("Unsupported language"));
        }
        if !["12h", "24h"].contains(&self.time_format.as_str()) {
            return Err(ApiError::validation("Unsupported time format"));
        }
        if ![
            "system", "light", "dark", "ocean", "forest", "dusk", "rose", "sand", "custom",
        ]
        .contains(&self.theme.as_str())
        {
            return Err(ApiError::validation("Unsupported theme"));
        }
        if let Some(colors) = &self.custom_theme {
            colors.validate()?;
        }
        if self.theme == "custom" && self.custom_theme.is_none() {
            return Err(ApiError::validation("Custom theme colors are required"));
        }
        if self.background_dim > 95
            || self.sound_volume > 100
            || !["soft", "glass", "mechanical", "default"].contains(&self.sound_theme.as_str())
        {
            return Err(ApiError::validation(
                "Unsupported appearance or sound settings",
            ));
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
    if let Some(id) = settings.background_image {
        let owned = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM app.media WHERE id=$1 AND user_id=$2)",
        )
        .bind(id)
        .bind(user.id)
        .fetch_one(&state.database)
        .await?;
        if !owned {
            return Err(crate::domain::not_found());
        }
    }
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
    #[test]
    fn time_format_preserves_stored_settings_and_rejects_unknown_values() {
        let mut settings: Settings =
            serde_json::from_str(r#"{"timezone":"Europe/Moscow"}"#).unwrap();
        assert_eq!(settings.time_format, "24h");
        settings.time_format = "12h".into();
        assert!(settings.validate().is_ok());
        settings.time_format = "unknown".into();
        assert!(settings.validate().is_err());
    }
    #[test]
    fn supports_languages_themes_and_sound_limits_with_legacy_defaults() {
        let mut settings: Settings = serde_json::from_str(r#"{"timezone":"UTC"}"#).unwrap();
        assert!(!settings.sounds_enabled);
        assert!(settings.animations_enabled);
        assert!(settings.effects_enabled);
        assert_eq!(settings.background_dim, 85);
        settings.language = "en".into();
        settings.theme = "ocean".into();
        settings.sounds_enabled = true;
        assert!(settings.validate().is_ok());
        settings.sound_volume = 101;
        assert!(settings.validate().is_err());
        settings.sound_volume = 25;
        settings.sound_theme = "unknown".into();
        assert!(settings.validate().is_err());
        settings.sound_theme = "soft".into();
        settings.background_dim = 96;
        assert!(settings.validate().is_err());
        settings.background_dim = 85;
        settings.language = "unknown".into();
        assert!(settings.validate().is_err());
    }
    #[test]
    fn validates_custom_palette_colors_and_contrast() {
        let mut settings = Settings {
            theme: "custom".into(),
            ..Settings::default()
        };
        assert!(settings.validate().is_err());
        settings.custom_theme = Some(ThemeColors {
            background: "#ffffff".into(),
            foreground: "#111111".into(),
            card: "#ffffff".into(),
            primary: "#111111".into(),
            primary_foreground: "#ffffff".into(),
            muted: "#eeeeee".into(),
            muted_foreground: "#333333".into(),
            border: "#cccccc".into(),
            destructive: "#b42332".into(),
        });
        assert!(settings.validate().is_ok());
        settings.custom_theme.as_mut().unwrap().foreground = "#ffffff".into();
        assert!(settings.validate().is_err());
        settings.custom_theme.as_mut().unwrap().foreground = "url(https://example.test)".into();
        assert!(settings.validate().is_err());
    }
}
