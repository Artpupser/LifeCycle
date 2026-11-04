use super::models::{Conditions, Input};

#[test]
fn training_conditions_preserve_unknown_and_limit_unicode() {
    let value = Conditions {
        goals: Some("  Выносливость  ".into()),
        equipment: Some("  ".into()),
        restrictions: None,
    }
    .normalize()
    .unwrap();
    assert_eq!(value.goals.as_deref(), Some("Выносливость"));
    assert_eq!(value.equipment, None);
    assert!(
        Conditions {
            goals: Some("🙂".repeat(2000)),
            ..Default::default()
        }
        .normalize()
        .is_ok()
    );
    assert!(
        Conditions {
            goals: Some("я".repeat(2001)),
            ..Default::default()
        }
        .normalize()
        .is_err()
    );
    assert!(serde_json::from_str::<Input>(r#"{"revision":0,"data":{"ai_shared":true}}"#).is_err());
}
