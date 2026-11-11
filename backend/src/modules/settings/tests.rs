use super::models::{Settings, ThemeColors};

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
    let mut settings: Settings = serde_json::from_str(r#"{"timezone":"Europe/Moscow"}"#).unwrap();
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

#[test]
fn collection_visibility_uses_catalog_and_preserves_legacy_settings() {
    let mut settings: Settings = serde_json::from_str(r#"{"timezone":"UTC"}"#).unwrap();
    assert!(settings.hidden_collections.is_empty());
    settings.hidden_collections = vec!["toy".into(), "lubricant".into()];
    assert!(settings.validate().is_ok());
    let saved = serde_json::to_string(&settings).unwrap();
    let restored: Settings = serde_json::from_str(&saved).unwrap();
    assert_eq!(settings.hidden_collections, restored.hidden_collections);
    settings.hidden_collections.push("unknown".into());
    assert!(settings.validate().is_err());
}
#[test]
fn collection_order_validates_unique_catalog_identifiers() {
    let mut settings = Settings {
        collection_order: vec!["emotion".into(), "toy".into()],
        ..Default::default()
    };
    assert!(settings.validate().is_ok());
    let restored: Settings =
        serde_json::from_str(&serde_json::to_string(&settings).unwrap()).unwrap();
    assert_eq!(settings.collection_order, restored.collection_order);
    settings.collection_order.push("toy".into());
    assert!(settings.validate().is_err());
    settings.collection_order = vec!["unknown".into()];
    assert!(settings.validate().is_err());
}
