use crate::{modules::habits::HabitStatistics, modules::intimacy, shared::errors::ApiError};
use chrono::{DateTime, Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Default, Deserialize, Serialize, sqlx::FromRow)]
#[serde(deny_unknown_fields)]
pub(super) struct Privacy {
    pub(super) include_profile: bool,
    pub(super) include_intimacy: bool,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Range {
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
}

impl Range {
    pub(super) fn validate(&self) -> Result<(), ApiError> {
        if !(0..366).contains(&(self.to - self.from).num_days())
            || !(1900..=9998).contains(&self.from.year())
            || !(1900..=9998).contains(&self.to.year())
        {
            return Err(ApiError::validation(
                "Analytics supports 1 to 366 inclusive dates between 1900 and 9998",
            ));
        }
        Ok(())
    }
}

#[derive(Default, Serialize)]
pub(super) struct TaskMetrics {
    pub(super) scheduled: u64,
    pub(super) completed: u64,
    pub(super) rejected: u64,
    pub(super) in_progress: u64,
    pub(super) pending: u64,
    pub(super) missed: u64,
    pub(super) future: u64,
    pub(super) planned_minutes: u64,
    pub(super) completion_rate: Option<f64>,
}

#[derive(Default, Serialize)]
pub(super) struct HabitMetrics {
    pub(super) expected: u64,
    pub(super) completed: u64,
    pub(super) skipped: u64,
    pub(super) cancelled: u64,
    pub(super) missed: u64,
    pub(super) pending: u64,
    pub(super) completion_rate: Option<f64>,
    pub(super) ranking: Vec<HabitStatistics>,
}

#[derive(Default, Serialize, sqlx::FromRow)]
pub(super) struct TimerMetrics {
    pub(super) completed: i64,
    pub(super) cancelled: i64,
    pub(super) seconds: i64,
}

#[derive(Default, Serialize, sqlx::FromRow)]
pub(super) struct WorkoutMetrics {
    pub(super) completed: i64,
    pub(super) partial: i64,
    pub(super) cancelled: i64,
    pub(super) exercise_steps: i64,
    pub(super) repetitions: i64,
    pub(super) seconds: i64,
}

#[derive(Default, Serialize)]
pub(super) struct Day {
    pub(super) date: NaiveDate,
    pub(super) events: i64,
    pub(super) tasks_completed: u64,
    pub(super) habits_completed: u64,
    pub(super) focus_seconds: i64,
    pub(super) workouts_completed: i64,
}

#[derive(Serialize)]
pub(super) struct ProfileMetrics {
    pub(super) age_years: Option<u32>,
    pub(super) height_cm: Option<f64>,
    pub(super) weight_kg: Option<f64>,
}

#[derive(Serialize)]
pub(crate) struct Report {
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
    pub(super) timezone: String,
    pub(super) generated_at: DateTime<Utc>,
    pub(super) privacy: Privacy,
    pub(super) event_count: i64,
    pub(super) active_days: usize,
    pub(super) event_types: BTreeMap<String, i64>,
    pub(super) tasks: TaskMetrics,
    pub(super) habits: HabitMetrics,
    pub(super) pomodoro: TimerMetrics,
    pub(super) workouts: WorkoutMetrics,
    pub(super) days: Vec<Day>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) profile: Option<ProfileMetrics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub(super) intimacy: Option<intimacy::AnalyticsSummary>,
}
