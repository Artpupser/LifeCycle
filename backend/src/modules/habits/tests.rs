use super::dto::MarkInput;
use super::marks::{normalize_mark, task_status};
use super::models::{HabitConfig, HabitMark, HabitStatus};
use super::statistics::summarize;
use crate::modules::tasks::{Task, TaskOccurrence, TaskOccurrenceResponse};
use uuid::Uuid;

fn fixture() -> Task {
    serde_json::from_value(serde_json::json!({
        "id":Uuid::new_v4(),"title":"Read","description":"","status":"todo","tags":[],"color":"#123456","priority":"normal","parent_id":null,"due_at":null,
        "schedule":{"start_date":"2026-01-01","time":null,"timezone":"UTC","duration_minutes":30,"recurrence":"daily","interval_days":1,"weekdays":[],"end_date":null},
        "source_kind":"habit","source_id":null,"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z","habit":{"icon":"🌱"}
    })).unwrap()
}
fn row(task: &Task, date: &str, status: HabitStatus) -> TaskOccurrenceResponse {
    TaskOccurrenceResponse {
        editable: true,
        occurrence: TaskOccurrence {
            task: task.clone(),
            date: date.parse().unwrap(),
            starts_at: None,
            status: "todo".into(),
            habit_mark: Some(HabitMark {
                status,
                ..Default::default()
            }),
        },
    }
}
#[test]
fn completion_is_explicit_and_old_subhabit_input_is_rejected() {
    let config = HabitConfig::default();
    let mark = normalize_mark(
        MarkInput {
            status: HabitStatus::Completed,
            note: String::new(),
        },
        &config,
    )
    .unwrap();
    assert_eq!(task_status(&mark, &config), "completed");
    assert!(
        serde_json::from_value::<MarkInput>(
            serde_json::json!({"status":"completed","completed_sub_habits":[]})
        )
        .is_err()
    );
}
#[test]
fn statistics_distinguish_cancellation_skips_missing_and_future() {
    let task = fixture();
    let rows = vec![
        row(&task, "2026-01-01", HabitStatus::Completed),
        row(&task, "2026-01-02", HabitStatus::Cancelled),
        row(&task, "2026-01-03", HabitStatus::Completed),
        row(&task, "2026-01-04", HabitStatus::Skipped),
        row(&task, "2026-01-05", HabitStatus::Pending),
        row(&task, "2026-01-06", HabitStatus::Pending),
        row(&task, "2026-01-07", HabitStatus::Pending),
    ];
    let stats = summarize(&task, &rows, "2026-01-06T12:00:00Z".parse().unwrap());
    assert_eq!(
        (
            stats.expected,
            stats.completed,
            stats.cancelled,
            stats.skipped,
            stats.missed,
            stats.pending
        ),
        (6, 2, 1, 1, 1, 1)
    );
    assert_eq!((stats.best_streak, stats.current_streak), (2, 0));
    assert_eq!(
        (
            stats.longest_missed_streak,
            stats.shortest_missed_streak,
            stats.last_missed_streak
        ),
        (2, 2, 2)
    );
    assert_eq!(stats.completion_rate, 50.0);
}
#[test]
fn current_untimed_pending_does_not_break_a_completed_streak() {
    let task = fixture();
    let rows = vec![
        row(&task, "2026-01-01", HabitStatus::Completed),
        row(&task, "2026-01-02", HabitStatus::Pending),
    ];
    let stats = summarize(&task, &rows, "2026-01-02T23:00:00Z".parse().unwrap());
    assert_eq!(
        (stats.current_streak, stats.pending, stats.missed),
        (1, 1, 0)
    );
}
#[test]
fn habits_are_repeating_all_day_events() {
    let mut schedule = fixture().schedule.unwrap();
    schedule.time = None;
    assert!(HabitConfig::default().validate(&schedule).is_ok());
    schedule.recurrence = "once".into();
    assert!(HabitConfig::default().validate(&schedule).is_err());
}
