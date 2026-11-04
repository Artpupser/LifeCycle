use crate::{
    modules::tasks::Task, shared::domain, shared::errors::ApiError, shared::schedule::Schedule,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct HabitConfig {
    pub icon: String,
    pub workout_id: Option<Uuid>,
}

impl Default for HabitConfig {
    fn default() -> Self {
        Self {
            icon: "tabler:seedling".into(),
            workout_id: None,
        }
    }
}

impl HabitConfig {
    pub(super) fn validate(&self, schedule: &Schedule) -> Result<(), ApiError> {
        domain::text(&self.icon, 1, 128)?;
        if schedule.recurrence == "once" || schedule.time.is_some() {
            return Err(ApiError::validation(
                "Habits require a repeating all-day schedule",
            ));
        }
        Ok(())
    }
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HabitStatus {
    #[default]
    Pending,
    Completed,
    Skipped,
    Cancelled,
}

#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct HabitMark {
    pub status: HabitStatus,
    pub note: String,
    pub marked_at: Option<DateTime<Utc>>,
}

#[derive(sqlx::FromRow)]
pub(super) struct Version {
    pub(super) task_id: Uuid,
    pub(super) effective_from: NaiveDate,
    pub(super) snapshot: DbJson<Task>,
    pub(super) ended_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Default, Debug)]
pub struct HabitStatistics {
    pub(crate) active: bool,
    pub(crate) id: Uuid,
    pub(crate) title: String,
    pub(crate) expected: u32,
    pub(crate) completed: u32,
    pub(crate) skipped: u32,
    pub(crate) cancelled: u32,
    pub(crate) missed: u32,
    pub(crate) pending: u32,
    pub(crate) completion_rate: f64,
    pub(crate) current_streak: u32,
    pub(crate) best_streak: u32,
    pub(crate) longest_missed_streak: u32,
    pub(crate) shortest_missed_streak: u32,
    pub(crate) last_missed_streak: u32,
}
