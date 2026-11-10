use crate::shared::errors::ApiError;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(default, deny_unknown_fields)]
pub struct Settings {
    pub hidden_collections: Vec<String>,
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
    pub(super) fn validate(&self) -> Result<(), ApiError> {
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
            crate::shared::domain::color(color)?;
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
            hidden_collections: Vec::new(),
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
            week_starts_on: "monday".to_owned(),
            pomodoro_work_minutes: 25,
            pomodoro_break_minutes: 5,
        }
    }
}

impl Settings {
    pub fn validate(&self) -> Result<(), ApiError> {
        if self.hidden_collections.len() > crate::modules::labels::collection_catalog().len()
            || self.hidden_collections.iter().any(|kind| {
                !crate::modules::labels::collection_catalog()
                    .iter()
                    .any(|item| item.id == *kind)
            })
        {
            return Err(ApiError::validation("Unsupported hidden collection"));
        }
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
            "system", "light", "dark", "ocean", "forest", "dusk", "sand", "custom",
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
        if !(1..=180).contains(&self.pomodoro_work_minutes)
            || !(1..=180).contains(&self.pomodoro_break_minutes)
        {
            return Err(ApiError::validation(
                "Timer duration is outside the supported range",
            ));
        }
        Ok(())
    }
}
