use super::models::TaskOccurrenceResponse;
use crate::{shared::domain, shared::schedule::Schedule};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct TaskInput {
    pub(super) title: String,
    pub(super) description: String,
    pub(super) status: String,
    pub(super) tags: Vec<String>,
    pub(super) color: String,
    pub(super) priority: String,
    pub(super) parent_id: Option<Uuid>,
    pub(super) due_at: Option<DateTime<Utc>>,
    pub(super) schedule: Option<Schedule>,
}

impl Default for TaskInput {
    fn default() -> Self {
        Self {
            title: String::new(),
            description: String::new(),
            status: "todo".into(),
            tags: vec![],
            color: domain::default_color(),
            priority: "normal".into(),
            parent_id: None,
            due_at: None,
            schedule: None,
        }
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct OccurrenceInput {
    pub(super) status: String,
}

#[derive(Deserialize)]
pub(super) struct TodayQuery {
    pub(super) date: Option<NaiveDate>,
}

#[derive(Deserialize)]
pub(super) struct CalendarQuery {
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
}

#[derive(Serialize)]
pub(super) struct TodayResponse {
    pub(super) date: NaiveDate,
    pub(super) timezone: String,
    pub(super) tasks: Vec<TaskOccurrenceResponse>,
    pub(super) events: Vec<crate::modules::countdowns::EventOccurrence>,
}

#[derive(Serialize)]
pub(super) struct CalendarResponse {
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
    pub(super) timezone: String,
    pub(super) occurrences: Vec<TaskOccurrenceResponse>,
    pub(super) events: Vec<crate::modules::countdowns::EventOccurrence>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct PlanInput {
    pub(super) expected_updated_at: DateTime<Utc>,
    pub(super) starts_at: DateTime<Utc>,
    pub(super) duration_minutes: u32,
    pub(super) occurrence_date: Option<NaiveDate>,
}
