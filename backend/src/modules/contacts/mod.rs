mod domain;
mod dto;
mod handlers;
mod relationships;
mod repository;
mod service;

pub(crate) use domain::Contact;
#[cfg(test)]
pub(crate) use domain::ContactData;
pub use handlers::routes;
pub(crate) use repository::{all, disable_birthday, enable_birthday, load, lock};

#[cfg(test)]
use domain::duplicate;

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn duplicates_normalize_phones_and_use_stable_import_ids() {
        let mut a = ContactData {
            first_name: "Anna".into(),
            phones: vec!["+7 (900) 123-45-67".into()],
            ..Default::default()
        };
        let mut b = ContactData {
            first_name: "Other".into(),
            phones: vec!["0079001234567".into()],
            ..Default::default()
        };
        assert!(duplicate(&a, &b));
        b.phones.clear();
        assert!(!duplicate(&a, &b));
        a.source_keys.push("vcard:one".into());
        b.source_keys = a.source_keys.clone();
        assert!(duplicate(&a, &b));
    }
    #[test]
    fn names_dates_numbers_and_labels_are_validated() {
        let today = "2026-11-02".parse().unwrap();
        assert!(ContactData::default().clean(today).is_err());
        let mut c = ContactData {
            first_name: " Anna ".into(),
            tags: vec![" Team ".into(), "team".into()],
            ..Default::default()
        };
        assert!(c.clean(today).is_ok());
        let saved = serde_json::to_value(&c).unwrap();
        assert_eq!(saved["gender"], "unspecified");
        assert!(
            serde_json::from_value::<ContactData>(serde_json::json!({"gender":"invalid"})).is_err()
        );
        assert_eq!(c.tags, vec!["Team"]);
        c.birth_date = Some("2027-01-01".parse().unwrap());
        assert!(c.clean(today).is_err());
    }
}
