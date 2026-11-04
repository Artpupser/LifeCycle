use super::models::Navigation;

#[test]
fn navigation_requires_known_unique_order_and_pins() {
    let mut value = Navigation::default();
    assert!(value.validate().is_ok());
    value.pinned.clear();
    assert!(value.validate().is_ok());
    value.pinned.push("/other".into());
    assert!(value.validate().is_err());
    value = Navigation::default();
    value.ordering[1] = value.ordering[0].clone();
    assert!(value.validate().is_err());
}
