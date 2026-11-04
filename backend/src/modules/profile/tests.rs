use super::models::{Firsts, HabitPeriod, HarmfulHabit, Profile};
use super::service::merge;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn profile_accepts_optional_fields_without_gender_inference() {
    let p = Profile {
        gender: "female".to_owned(),
        penis_length_cm: Some(12.0),
        pregnant: Some(false),
        ..Profile::default()
    };
    assert!(p.validate().is_ok());
}
#[test]
fn profile_rejects_future_birthdates_and_impossible_measurements() {
    let mut p = Profile {
        birth_date: Some(Utc::now().date_naive() + chrono::Duration::days(1)),
        ..Profile::default()
    };
    assert!(p.validate().is_err());
    p.birth_date = None;
    p.height_cm = Some(-1.0);
    assert!(p.validate().is_err());
}
#[test]
fn partial_current_updates_preserve_origin_and_first_events() {
    let mut value = serde_json::json!({"name":"Current","origin":{"given_name":"Birth name","surname":"Birth surname"},"firsts":{"job":"First job","achievement":"First achievement"}});
    merge(
        &mut value,
        serde_json::json!({"name":"New current","origin":{"region":"New region"},"firsts":{"job":""}}),
    );
    let p: Profile = serde_json::from_value(value).unwrap();
    assert_eq!(p.origin.given_name, "Birth name");
    assert_eq!(p.origin.surname, "Birth surname");
    assert_eq!(p.firsts.job, "");
    assert_eq!(p.firsts.achievement, "First achievement");
    assert!(p.harmful_habits.is_empty());
    assert_eq!(p.origin.maternal_birth_order, None);
}
#[test]
fn historical_years_and_habit_periods_validate_without_inventing_unknowns() {
    let mut p = Profile::default();
    p.firsts.school_entry_year = Some(2010);
    p.firsts.school_graduation_year = Some(2009);
    assert!(p.validate().is_err());
    p.firsts = Firsts::default();
    let mut habit = HarmfulHabit {
        id: Uuid::new_v4(),
        name: "Smoking".into(),
        current: Some(false),
        ever: None,
        periods: vec![],
    };
    p.harmful_habits = vec![habit.clone()];
    assert!(p.validate().is_ok());
    habit.current = Some(true);
    habit.ever = Some(false);
    p.harmful_habits = vec![habit.clone()];
    assert!(p.validate().is_err());
    habit.ever = Some(true);
    habit.periods = vec![HabitPeriod {
        id: Uuid::new_v4(),
        start_date: Some("2020-01-02".parse().unwrap()),
        end_date: Some("2020-01-01".parse().unwrap()),
        note: "".into(),
    }];
    p.harmful_habits = vec![habit];
    assert!(p.validate().is_err());
}
