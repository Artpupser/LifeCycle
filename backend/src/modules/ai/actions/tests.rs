use super::models::{Action, Entity, Operation};
use super::service::{check_actions, merge};
use crate::modules::ai::Permissions;
use serde_json::json;
use uuid::Uuid;

fn action() -> Action {
    Action {
        entity: Entity::Exercise,
        operation: Operation::Create,
        id: Uuid::new_v4(),
        expected_updated_at: None,
        data: json!({"title":"Test","kind":"repetitions"}),
    }
}
#[test]
fn untrusted_actions_need_both_scopes_and_versions() {
    let a = action();
    assert!(check_actions(std::slice::from_ref(&a), &Permissions::default()).is_err());
    let p = Permissions {
        changes: true,
        workout_editor: true,
        ..Default::default()
    };
    assert!(check_actions(std::slice::from_ref(&a), &p).is_ok());
    assert!(check_actions(&[a.clone(), a.clone()], &p).is_err());
    let mut update = a;
    update.operation = Operation::Update;
    assert!(check_actions(&[update], &p).is_err());
    assert!(
        serde_json::from_value::<Action>(
            json!({"entity":"permissions","operation":"update","id":Uuid::new_v4(),"data":{}})
        )
        .is_err()
    );
}
#[test]
fn patches_preserve_omitted_fields_and_reject_nonobjects() {
    let mut data =
        json!({"title":"Old","description":"Keep **Markdown**","images":[Uuid::new_v4()]});
    merge(&mut data, &json!({"title":"New"})).unwrap();
    assert_eq!(data["description"], "Keep **Markdown**");
    assert_eq!(data["images"].as_array().unwrap().len(), 1);
    assert!(merge(&mut data, &json!([])).is_err());
}
