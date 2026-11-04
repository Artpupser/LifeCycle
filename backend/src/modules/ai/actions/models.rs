use crate::modules::ai::Permissions;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use uuid::Uuid;

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
pub(super) enum Entity {
    Exercise,
    Workout,
    Task,
    Note,
}

impl Entity {
    pub(super) fn table(self) -> &'static str {
        match self {
            Self::Exercise => "exercises",
            Self::Workout => "workouts",
            Self::Task => "tasks",
            Self::Note => "notes",
        }
    }
    pub(super) fn allowed(self, p: &Permissions) -> bool {
        p.changes
            && match self {
                Self::Exercise | Self::Workout => p.training(),
                Self::Task => p.tasks,
                Self::Note => p.notes,
            }
    }
}

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub(super) enum Operation {
    Create,
    Update,
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Action {
    pub(super) entity: Entity,
    pub(super) operation: Operation,
    pub(super) id: Uuid,
    pub(super) expected_updated_at: Option<DateTime<Utc>>,
    pub(super) data: Value,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Prepare {
    pub(super) revision: i64,
    pub(super) source_turn_id: Option<Uuid>,
    pub(super) summary: String,
    pub(super) actions: Vec<Action>,
}

#[derive(Clone, Serialize, Deserialize)]
pub(super) struct Change {
    pub(super) action: Action,
    pub(super) before: Option<Value>,
    pub(super) after: Value,
    pub(super) applied_updated_at: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize)]
pub(super) struct Data {
    pub(super) summary: String,
    pub(super) changes: Vec<Change>,
}

#[derive(sqlx::FromRow)]
pub(super) struct Row {
    pub(super) id: Uuid,
    pub(super) source_turn_id: Option<Uuid>,
    pub(super) config_revision: i64,
    pub(super) status: String,
    pub(super) encrypted_data: Vec<u8>,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub(super) struct View {
    pub(super) id: Uuid,
    pub(super) source_turn_id: Option<Uuid>,
    pub(super) config_revision: i64,
    pub(super) status: String,
    pub(super) data: Data,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Confirmation {
    pub(super) confirmed: bool,
}

#[derive(Deserialize)]
pub(super) struct Page {
    pub(super) before: Option<DateTime<Utc>>,
}

pub(super) const COLUMNS: &str =
    "id,source_turn_id,config_revision,status,encrypted_data,created_at,updated_at";
