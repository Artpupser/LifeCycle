use crate::modules::tasks;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Board {
    pub(super) emoji: String,
    pub(super) id: Uuid,
    pub(super) name: String,
    pub(super) view: String,
    pub(super) zoom: String,
    pub(super) revision: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Column {
    pub(super) color: String,
    pub(super) id: Uuid,
    pub(super) name: String,
    pub(super) position: i32,
}

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Item {
    pub(super) task_id: Uuid,
    pub(super) column_id: Uuid,
    pub(super) position: i32,
}

#[derive(Serialize)]
pub(super) struct BoardState {
    pub(super) board: Board,
    pub(super) columns: Vec<Column>,
    pub(super) items: Vec<Item>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Name {
    pub(super) name: String,
    #[serde(default)]
    pub(super) emoji: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Revision {
    pub(super) revision: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BoardInput {
    pub(super) emoji: Option<String>,
    pub(super) revision: i64,
    pub(super) name: String,
    pub(super) view: String,
    pub(super) zoom: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ColumnInput {
    pub(super) revision: i64,
    pub(super) name: String,
    pub(super) position: Option<i32>,
    pub(super) color: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct RemoveColumn {
    pub(super) revision: i64,
    pub(super) target_id: Option<Uuid>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Move {
    pub(super) revision: i64,
    pub(super) column_id: Uuid,
    pub(super) before_id: Option<Uuid>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct NewTask {
    pub(super) revision: i64,
    pub(super) column_id: Uuid,
    pub(super) task: tasks::TaskInput,
}

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Membership {
    pub(super) task_id: Uuid,
    pub(super) board_id: Uuid,
    pub(super) column_id: Uuid,
    pub(super) board_name: String,
    pub(super) column_name: String,
}
