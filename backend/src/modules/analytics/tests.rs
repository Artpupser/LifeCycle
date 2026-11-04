use super::models::{Privacy, Range};
use super::service::{habit_metrics, percent, profile_metrics, task_metrics};
use crate::{
    modules::habits::HabitStatistics,
    modules::profile,
    modules::tasks::{self, TaskOccurrenceResponse},
};
use chrono::{DateTime, Duration, NaiveDate, Utc};
use uuid::Uuid;

#[test]
fn bounded_ranges_and_unknown_percent_are_explicit() {
    let d: NaiveDate = "2026-01-01".parse().unwrap();
    assert!(
        Range {
            from: d,
            to: d + Duration::days(365)
        }
        .validate()
        .is_ok()
    );
    assert!(
        Range {
            from: d,
            to: d + Duration::days(366)
        }
        .validate()
        .is_err()
    );
    assert!(
        Range {
            from: d,
            to: d - Duration::days(1)
        }
        .validate()
        .is_err()
    );
    assert_eq!(percent(0, 0), None);
    assert_eq!(percent(1, 4), Some(25.0));
}
#[test]
fn profile_summary_does_not_serialize_identity_or_medical_details() {
    let p = profile::Profile {
        name: "Secret".into(),
        conditions: vec!["Secret".into()],
        birth_date: Some("2000-10-29".parse().unwrap()),
        height_cm: Some(180.0),
        ..Default::default()
    };
    let summary = serde_json::to_value(profile_metrics(p, "2026-10-28".parse().unwrap())).unwrap();
    assert_eq!(summary["age_years"], 25);
    assert_eq!(summary.as_object().unwrap().len(), 3);
    assert!(!summary.to_string().contains("Secret"));
    assert!(!Privacy::default().include_profile && !Privacy::default().include_intimacy);
}
#[test]
fn habit_rollup_weights_results_and_excludes_cancellations_and_pending() {
    let stats = vec![
        HabitStatistics {
            expected: 4,
            completed: 1,
            skipped: 1,
            cancelled: 1,
            pending: 1,
            completion_rate: 50.0,
            ..Default::default()
        },
        HabitStatistics {
            expected: 8,
            completed: 6,
            missed: 2,
            completion_rate: 75.0,
            ..Default::default()
        },
    ];
    let result = habit_metrics(stats);
    assert_eq!(
        (result.completed, result.cancelled, result.pending),
        (7, 1, 1)
    );
    assert_eq!(result.completion_rate, Some(70.0));
}
#[test]
fn task_metrics_use_profile_dates_and_do_not_count_future_or_pending_as_missed() {
    let o:tasks::TaskOccurrence=serde_json::from_value(serde_json::json!({
        "task":{"id":Uuid::new_v4(),"title":"Task","description":"","status":"todo","tags":[],"color":"#123456","priority":"normal","parent_id":null,"due_at":null,"schedule":null,"source_kind":"manual","source_id":null,"habit":null,"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"},
        "date":"2026-01-02","starts_at":"2026-01-01T15:30:00Z","status":"completed"
    })).unwrap();
    let now: DateTime<Utc> = "2026-01-01T16:00:00Z".parse().unwrap();
    let rows = vec![TaskOccurrenceResponse {
        occurrence: o.clone(),
        editable: false,
    }];
    let utc = task_metrics(&rows, chrono_tz::UTC, now);
    assert_eq!((utc.completed, utc.future), (1, 0));
    let mut future = o.clone();
    future.starts_at = None;
    future.date = "2026-01-03".parse().unwrap();
    let mut pending = o.clone();
    pending.starts_at = None;
    pending.date = "2026-01-01".parse().unwrap();
    pending.status = "todo".into();
    let mut missed = pending.clone();
    missed.date = "2025-12-31".parse().unwrap();
    let rows = [o, future, pending, missed]
        .into_iter()
        .map(|occurrence| TaskOccurrenceResponse {
            occurrence,
            editable: false,
        })
        .collect::<Vec<_>>();
    let result = task_metrics(&rows, chrono_tz::UTC, now);
    assert_eq!(
        (
            result.completed,
            result.future,
            result.pending,
            result.missed
        ),
        (1, 1, 1, 1)
    );
    assert_eq!(result.completion_rate, Some(50.0));
}
