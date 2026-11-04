use crate::shared::domain::{self, Search};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Deserialize, Default)]
#[serde(default, deny_unknown_fields)]
pub(super) struct FolderInput {
    pub(super) name: String,
    #[serde(default = "domain::default_color")]
    pub(super) color: String,
}

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Folder {
    pub(super) id: Uuid,
    pub(super) name: String,
    pub(super) color: String,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Clone, Serialize, Deserialize, Default)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct NoteInput {
    pub(super) title: String,
    pub(super) content: String,
    pub(super) tags: Vec<String>,
    #[serde(default = "domain::default_color")]
    pub(super) color: String,
    pub(super) folder_id: Option<Uuid>,
}

#[derive(Serialize, sqlx::FromRow)]
pub(crate) struct Note {
    pub(super) id: Uuid,
    pub(super) title: String,
    pub(super) content: String,
    pub(super) tags: DbJson<Vec<String>>,
    pub(super) color: String,
    pub(super) folder_id: Option<Uuid>,
    pub(super) ai_shared: bool,
    pub(super) ai_access_revision: i64,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Deserialize, Default)]
pub(super) struct NoteSearch {
    #[serde(flatten)]
    pub(super) search: Search,
    pub(super) ai_access: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BulkItem {
    pub(super) id: Uuid,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum BulkAction {
    Move,
    TagsAdd,
    TagsRemove,
    Color,
    Delete,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BulkNotes {
    pub(super) items: Vec<BulkItem>,
    pub(super) action: BulkAction,
    pub(super) folder_id: Option<Uuid>,
    #[serde(default)]
    pub(super) tags: Vec<String>,
    pub(super) color: Option<String>,
    #[serde(default)]
    pub(super) confirmed: bool,
}
