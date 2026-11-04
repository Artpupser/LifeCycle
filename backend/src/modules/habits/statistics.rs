use super::models::{HabitStatistics, HabitStatus};
use crate::modules::tasks::{Task, TaskOccurrenceResponse};
use chrono::{DateTime, Duration, Utc};

pub(crate) fn summarize(
    task: &Task,
    rows: &[TaskOccurrenceResponse],
    now: DateTime<Utc>,
) -> HabitStatistics {
    let mut result = HabitStatistics {
        id: task.id,
        title: task.title.clone(),
        ..Default::default()
    };
    let mut success = 0;
    let mut missing = 0;
    let mut missing_runs = vec![];
    let mut relevant: Vec<_> = rows
        .iter()
        .filter(|row| row.occurrence.task.id == task.id)
        .collect();
    relevant.sort_by_key(|row| row.occurrence.date);
    for row in relevant {
        let occurrence = &row.occurrence;
        let schedule = occurrence.task.schedule.as_ref().unwrap();
        let today = now
            .with_timezone(&schedule.timezone.parse::<chrono_tz::Tz>().unwrap())
            .date_naive();
        if occurrence.date > today {
            continue;
        }
        let mark = occurrence.habit_mark.clone().unwrap_or_default();
        result.expected += 1;
        match mark.status {
            HabitStatus::Cancelled => {
                result.cancelled += 1;
                continue;
            }
            HabitStatus::Completed => {
                result.completed += 1;
                success += 1;
                result.best_streak = result.best_streak.max(success);
                if missing > 0 {
                    missing_runs.push(missing);
                    missing = 0;
                }
            }
            HabitStatus::Skipped => {
                result.skipped += 1;
                success = 0;
                missing += 1;
            }
            HabitStatus::Pending => {
                let expired = occurrence.date < today
                    || occurrence.starts_at.is_some_and(|start| {
                        start + Duration::minutes(i64::from(schedule.duration_minutes)) <= now
                    });
                if expired {
                    result.missed += 1;
                    success = 0;
                    missing += 1;
                } else {
                    result.pending += 1;
                }
            }
        }
    }
    if missing > 0 {
        missing_runs.push(missing);
    }
    result.current_streak = success;
    result.longest_missed_streak = missing_runs.iter().copied().max().unwrap_or(0);
    result.shortest_missed_streak = missing_runs.iter().copied().min().unwrap_or(0);
    result.last_missed_streak = missing_runs.last().copied().unwrap_or(0);
    let counted = result.completed + result.skipped + result.missed;
    result.completion_rate = if counted == 0 {
        0.0
    } else {
        f64::from(result.completed) * 100.0 / f64::from(counted)
    };
    result
}
