use super::models::{Permissions, Turn, TurnData};
use super::service::allowed_history;
use super::settings::valid_model;
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

#[test]
fn permissions_default_off_and_reject_unknown_scopes() {
    assert_eq!(
        serde_json::from_value::<Permissions>(json!({})).unwrap(),
        Permissions::default()
    );
    assert!(serde_json::from_value::<Permissions>(json!({"everything":true})).is_err());
    assert!(valid_model("gpt-4.1-mini", "openai"));
    assert!(!valid_model("https://other-host/", "openrouter"));
    assert!(!valid_model("gpt\r\nsecret", "openai"));
}
#[test]
fn permission_changes_exclude_old_messages_from_new_requests() {
    let make = |revision, status: &str| Turn {
        id: Uuid::new_v4(),
        config_revision: revision,
        model: "model".into(),
        provider: "openai".into(),

        status: status.into(),
        error_code: None,
        data: TurnData {
            request: json!({"input":[{"content":"Private question"}]}),
            answer: Some("Private answer".into()),
            usage: None,
        },
        created_at: Utc::now(),
        finished_at: None,
    };
    let messages = vec![
        make(1, "completed"),
        make(2, "failed"),
        make(2, "completed"),
    ];
    assert_eq!(allowed_history(&messages, 3).len(), 0);
    assert_eq!(allowed_history(&messages, 2).len(), 2);
    assert_eq!(
        allowed_history(&messages, 1)[1]["content"],
        "Private answer"
    );
}
