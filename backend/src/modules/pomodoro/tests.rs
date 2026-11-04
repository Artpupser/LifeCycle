use super::models::Session;
use chrono::Utc;
use uuid::Uuid;

#[test]
fn elapsed_uses_server_segments_and_stops_while_paused() {
    let now = Utc::now();
    let mut row = Session {
        id: Uuid::new_v4(),
        task_id: None,
        phase: "work".into(),
        status: "running".into(),
        duration_seconds: 60,
        elapsed_seconds: 10,
        started_at: now,
        segment_started_at: Some(now - chrono::Duration::seconds(20)),
        ended_at: None,
        updated_at: now,
        run_id: None,
        interval_index: None,
        interval_kind: None,
        program_name: None,
        program: None,
    };
    assert_eq!(row.elapsed_at(now), 30);
    row.segment_started_at = None;
    assert_eq!(row.elapsed_at(now), 10);
}
