use super::models::{EntryData, Kind, PartnerDetails, SoloDetails, Statistics, TimeOccurrence};
use super::service::context;
use uuid::Uuid;

fn entry() -> EntryData {
    serde_json::from_value(serde_json::json!({"kind":"sex", "local_start":"2026-10-25T02:30:00", "timezone":"Europe/Berlin"})).unwrap()
}
#[test]
fn collection_journal_measurements_preserve_zero_false_and_both_emotion_phases() {
    let mut data = entry();
    let now = "2026-10-28T12:00:00Z".parse().unwrap();
    assert_eq!(data.libido_level, None);
    assert_eq!(data.satisfaction_level, None);
    data.libido_level = Some(0);
    data.satisfaction_level = Some(10);
    data.planned = Some(false);
    data.emotions_before = vec!["Возбуждение".into()];
    data.emotions_after = vec!["Радость".into()];
    data.lubricants = vec!["Личная смазка".into()];
    data.contraception = vec!["Личное средство".into()];
    assert!(data.validate(now).is_ok());
    let saved: EntryData = serde_json::from_slice(&serde_json::to_vec(&data).unwrap()).unwrap();
    assert_eq!(saved, data);
    data.libido_level = Some(11);
    assert!(data.validate(now).is_err());
    data.libido_level = Some(0);
    data.satisfaction_level = Some(11);
    assert!(data.validate(now).is_err());
    data.satisfaction_level = Some(0);
    assert!(data.validate(now).is_ok());
}
#[test]
fn collection_legacy_observations_become_notes_without_reintroducing_retired_fields() {
    let mut data: EntryData = serde_json::from_value(serde_json::json!({
        "kind":"masturbation", "local_start":"2026-10-25T02:30:00", "timezone":"Europe/Berlin",
        "emotions":["Радость"], "feelings_after":["Личное наблюдение"], "note":"Заметка",
        "solo":{"porn_sources":[],"feelings_after":"Old private text"}
    }))
    .unwrap();
    data.retire_legacy_fields();
    assert!(data.emotions_before.is_empty());
    assert_eq!(data.emotions_after, vec!["Радость"]);
    assert_eq!(
        data.note,
        "Заметка\n\nЛичное наблюдение\n\nOld private text"
    );
    let once = data.clone();
    data.retire_legacy_fields();
    assert_eq!(data, once);
    let saved = serde_json::to_value(&data).unwrap();
    assert!(saved.get("feelings_after").is_none());
    assert!(saved.get("emotions").is_none());
    assert!(saved["solo"].get("feelings_after").is_none());
    assert_eq!(saved["emotions_after"], serde_json::json!(["Радость"]));
}
#[test]
fn actual_times_reject_dst_gaps_and_preserve_both_repeated_instants() {
    let mut data = entry();
    let first = data.start().unwrap();
    data.time_occurrence = TimeOccurrence::Later;
    assert_eq!(data.start().unwrap() - first, chrono::Duration::hours(1));
    data.local_start = "2026-03-29T02:30:00".parse().unwrap();
    assert!(data.start().is_err());
    data.local_start = "2026-10-25T02:30:01".parse().unwrap();
    assert!(data.start().is_err());
}
#[test]
fn optional_answers_accept_zero_false_but_reject_incompatible_details_and_future() {
    let mut data = entry();
    data.ejaculation_count = Some(0);
    data.repeat_desired = Some(false);
    let now = "2026-10-28T12:00:00Z".parse().unwrap();
    assert!(data.validate(now).is_ok());
    data.solo = Some(SoloDetails::default());
    assert!(data.validate(now).is_err());
    data.solo = None;
    data.duration_minutes = Some(0);
    assert!(data.validate(now).is_err());
    data.duration_minutes = None;
    data.local_start = "2026-10-29T12:00:00".parse().unwrap();
    assert!(data.validate(now).is_err());
}
#[test]
fn statistics_count_events_not_days_and_exclude_unanswered_measurements() {
    let mut stats = Statistics::default();
    let mut data = entry();
    let start = "2026-10-24T23:30:00Z".parse().unwrap();
    data.duration_minutes = Some(20);
    data.ejaculation_count = Some(0);
    data.repeat_desired = Some(false);
    data.partner = Some(PartnerDetails {
        protection_used: Some(false),
        ..Default::default()
    });
    stats.add(&data, start, chrono_tz::Asia::Tokyo);
    data.duration_minutes = None;
    data.ejaculation_count = None;
    data.repeat_desired = None;
    data.kind = Kind::Masturbation;
    data.partner = None;
    stats.add(&data, start, chrono_tz::Asia::Tokyo);
    assert_eq!(
        (
            stats.total,
            stats.active_days,
            stats.sex,
            stats.masturbation
        ),
        (2, 1, 1, 1)
    );
    assert_eq!(stats.average_duration_minutes, Some(20.0));
    assert_eq!(
        (
            stats.duration_answers,
            stats.ejaculation_answers,
            stats.ejaculations
        ),
        (1, 2, 2)
    );
    assert_eq!(
        (stats.repeat_desired.no, stats.repeat_desired.unknown),
        (1, 1)
    );
    assert_eq!(
        (stats.protection_used.no, stats.protection_used.unknown),
        (1, 0)
    );
    assert!(stats.days.contains_key(&"2026-10-25".parse().unwrap()));
    assert_eq!(Statistics::default().average_duration_minutes, None);
}
#[test]
fn ciphertext_is_bound_to_owner_and_individual_entry() {
    let cipher = crate::shared::crypto::DataCipher::new(&[9; 32]);
    let user = Uuid::new_v4();
    let id = Uuid::new_v4();
    let plain = serde_json::to_vec(&entry()).unwrap();
    let encrypted = cipher
        .encrypt(&plain, context(user, id).as_bytes())
        .unwrap();
    assert!(
        cipher
            .decrypt(&encrypted, context(user, Uuid::new_v4()).as_bytes())
            .is_err()
    );
    assert!(
        cipher
            .decrypt(&encrypted, context(Uuid::new_v4(), id).as_bytes())
            .is_err()
    );
    assert_eq!(
        cipher
            .decrypt(&encrypted, context(user, id).as_bytes())
            .unwrap(),
        plain
    );
}
