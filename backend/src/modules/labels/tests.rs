use super::models::Data;
use super::service::validate_icon;

#[test]
fn legacy_labels_keep_defaults_and_icon_names_cannot_be_markup_or_urls() {
    let label: Data = serde_json::from_str(r##"{"name":"Legacy","color":"#123456"}"##).unwrap();
    assert!(label.icon.is_none());
    assert!(label.description.is_empty());
    assert!(label.image_id.is_none());
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

#[test]
fn collection_catalog_preserves_stored_values_and_separates_fixed_from_personal_lists() {
    use super::catalog::{collection_expandable, fixed_collection_value};
    for kind in ["toy", "setting", "position", "porn_source"] {
        assert_eq!(collection_expandable(kind), Some(true));
    }
    for (kind, value) in [
        ("emotion", "Удовольствие"),
        ("lubricant", "water_based"),
        ("contraception", "external_condom"),
        ("sex_type", "anal"),
        ("sex_type", "other"),
    ] {
        assert_eq!(collection_expandable(kind), Some(false));
        assert!(fixed_collection_value(kind, value));
    }
    assert!(!fixed_collection_value("emotion", "personal invention"));
    assert!(!fixed_collection_value("sex_type", "unknown"));
    assert_eq!(collection_expandable("tag"), None);
    assert_eq!(collection_expandable("feelings_after"), None);
    assert_eq!(
        super::catalog::fixed_icon("emotion", "Радость").as_deref(),
        Some("twemoji:grinning-face")
    );
}

#[test]
fn collection_metadata_round_trips_and_distinguishes_old_clients_from_explicit_image_removal() {
    use super::models::Input;
    let data: Data = serde_json::from_str(r##"{"name":"My item","color":"#123456","description":"Private details","image_id":"123e4567-e89b-12d3-a456-426614174000"}"##).unwrap();
    let stored: Data = serde_json::from_slice(&serde_json::to_vec(&data).unwrap()).unwrap();
    assert_eq!(stored.description, data.description);
    assert_eq!(stored.image_id, data.image_id);
    let old: Input = serde_json::from_str(r#"{"name":"Renamed","revision":2}"#).unwrap();
    assert!(old.details.is_none());
    assert!(super::models::CollectionDetails::default().in_collection);
    assert_eq!(
        super::catalog::stored_value("sex_type", "Оральный"),
        Some("oral".into())
    );
    let clear: Input = serde_json::from_str(
        r#"{"name":"Renamed","revision":2,"details":{"description":"Kept","image_id":null}}"#,
    )
    .unwrap();
    let clear = clear.details.unwrap();
    assert_eq!(clear.description, "Kept");
    assert!(clear.image_id.is_none());
}
