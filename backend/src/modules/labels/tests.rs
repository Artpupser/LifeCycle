use super::models::Data;
use super::service::validate_icon;

#[test]
fn legacy_labels_keep_defaults_and_icon_names_cannot_be_markup_or_urls() {
    let label: Data = serde_json::from_str(r##"{"name":"Legacy","color":"#123456"}"##).unwrap();
    assert!(label.icon.is_none());
    for icon in ["tabler:coin", "twemoji:grinning-face", "tabler:zodiac-leo"] {
        assert!(validate_icon(Some(icon)).is_ok());
    }
    for icon in [
        "https://example.test/icon.svg",
        "<svg>",
        "tabler:",
        ":coin",
        "a:b:c",
    ] {
        assert!(validate_icon(Some(icon)).is_err());
    }
}
