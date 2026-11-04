use crate::shared::schedule::Schedule;
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Task {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub status: String,
    pub tags: DbJson<Vec<String>>,
    pub color: String,
    pub priority: String,
    pub parent_id: Option<Uuid>,
    pub due_at: Option<DateTime<Utc>>,
    pub schedule: Option<DbJson<Schedule>>,
    pub source_kind: String,
    pub source_id: Option<Uuid>,
    #[serde(default)]
    pub habit: Option<DbJson<crate::modules::habits::HabitConfig>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct TaskOccurrence {
    pub task: Task,
    pub date: NaiveDate,
    pub starts_at: Option<DateTime<Utc>>,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub habit_mark: Option<crate::modules::habits::HabitMark>,
}

#[derive(Serialize)]
pub struct TaskOccurrenceResponse {
    #[serde(flatten)]
    pub occurrence: TaskOccurrence,
    pub editable: bool,
}
