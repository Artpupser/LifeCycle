use super::models::Session;
use crate::modules::workouts::plan::Snapshot;
use chrono::{DateTime, Utc};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[test]
fn time_uses_server_segments_and_pause_freezes_elapsed() {
    let now = Utc::now();
    let mut row = fixture(now);
    row.segment_started_at = Some(now - chrono::Duration::seconds(10));
    assert_eq!(row.elapsed_at(now), 10);
    row.segment_started_at = None;
    row.elapsed_seconds = 10;
    assert_eq!(row.elapsed_at(now + chrono::Duration::minutes(1)), 10);
}
fn fixture(now: DateTime<Utc>) -> Session {
    let snapshot:Snapshot=serde_json::from_value(serde_json::json!({"plan":{"title":"Test","rounds":[]},"date":"2026-10-28","steps":[{"title":"Hold","round_title":"Round","cycle":1,"entry_id":null,"exercise":{"title":"Hold","kind":"duration"},"repetitions":0,"seconds_per_repetition":5,"duration_seconds":5}]})).unwrap();
    Session {
        id: Uuid::new_v4(),
        workout_id: Uuid::new_v4(),
        habit_id: None,
        occurrence_date: None,
        habit_occurrence: None,
        snapshot: DbJson(snapshot),
        status: "running".into(),
        step_index: 0,
        elapsed_seconds: 0,
        segment_started_at: Some(now),
        results: DbJson(vec![]),
        revision: 0,
        note: String::new(),
        habit_completed: false,
        started_at: now,
        ended_at: None,
    }
}
#[test]
fn early_finish_is_rejected_and_skip_is_partial() {
    let now = Utc::now();
    let mut row = fixture(now);
    assert!(row.advance("next", None, now).is_err());
    row.advance("skip", None, now).unwrap();
    assert_eq!(row.status, "partial");
    assert!(row.advance("next", None, now).is_err());
    let mut done = fixture(now);
    done.advance("next", None, now + chrono::Duration::seconds(5))
        .unwrap();
    assert_eq!(done.status, "completed");
}
