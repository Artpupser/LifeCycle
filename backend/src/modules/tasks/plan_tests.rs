use super::planning::replanned;
use crate::shared::schedule::Schedule;

fn schedule() -> Schedule {
    serde_json::from_value(serde_json::json!({"start_date":"2026-10-18","time":"02:30","timezone":"Europe/Berlin","duration_minutes":30,"recurrence":"weekly","weekdays":[7],"end_date":"2026-11-01"})).unwrap()
}
#[test]
fn gantt_rejects_the_second_dst_instant_and_keeps_the_series_anchor() {
    let day = "2026-10-25".parse().unwrap();
    assert!(
        replanned(
            schedule(),
            "2026-10-25T01:30:00Z".parse().unwrap(),
            30,
            Some(day)
        )
        .is_err()
    );
    let result = replanned(
        schedule(),
        "2026-10-25T00:45:00Z".parse().unwrap(),
        90,
        Some(day),
    )
    .unwrap();
    assert_eq!(result.start_date.to_string(), "2026-10-18");
    assert_eq!(result.end_date.unwrap().to_string(), "2026-11-01");
    assert_eq!(result.time.unwrap().to_string(), "02:45:00");
    assert_eq!(result.duration_minutes, 90);
    assert_eq!(
        result
            .occurrence_start("2026-11-01".parse().unwrap())
            .unwrap()
            .unwrap()
            .to_rfc3339(),
        "2026-11-01T01:45:00+00:00"
    );
}
#[test]
fn gantt_moves_the_entire_weekly_rule_and_validates_occurrences_and_precision() {
    let day = "2026-10-25".parse().unwrap();
    let result = replanned(
        schedule(),
        "2026-10-26T22:30:00Z".parse().unwrap(),
        120,
        Some(day),
    )
    .unwrap();
    assert_eq!(result.start_date.to_string(), "2026-10-19");
    assert_eq!(result.end_date.unwrap().to_string(), "2026-11-02");
    assert_eq!(result.weekdays, vec![1]);
    assert!(
        replanned(
            schedule(),
            "2026-10-25T00:30:01Z".parse().unwrap(),
            30,
            Some(day)
        )
        .is_err()
    );
    assert!(
        replanned(
            schedule(),
            "2026-10-25T00:30:00Z".parse().unwrap(),
            1441,
            Some(day)
        )
        .is_err()
    );
    assert!(
        replanned(
            schedule(),
            "2026-10-25T00:30:00Z".parse().unwrap(),
            30,
            Some("2026-10-24".parse().unwrap())
        )
        .is_err()
    );
}
