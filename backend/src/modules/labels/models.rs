use crate::shared::domain;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub(super) struct Data {
    pub(super) name: String,
    pub(super) color: String,
    #[serde(default)]
    pub(super) icon: Option<String>,
}

#[derive(Serialize)]
pub(super) struct Label {
    pub(super) id: Uuid,
    pub(super) name: String,
    pub(super) color: String,
    pub(super) kind: String,
    pub(super) icon: Option<String>,
    pub(super) function_key: Option<String>,
    pub(super) is_system: bool,
    pub(super) revision: i64,
}

#[derive(sqlx::FromRow)]
pub(super) struct Row {
    pub(super) id: Uuid,
    pub(super) kind: String,
    pub(super) function_key: Option<String>,
    pub(super) is_system: bool,
    pub(super) encrypted_data: Vec<u8>,
    pub(super) revision: i64,
}

#[derive(Deserialize, Default)]
pub(super) struct Filter {
    pub(super) kind: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Input {
    pub(super) name: String,
    #[serde(default = "domain::default_color")]
    pub(super) color: String,
    #[serde(default = "tag_kind")]
    pub(super) kind: String,
    pub(super) revision: Option<i64>,
    #[serde(default)]
    pub(super) function_key: Option<String>,
    #[serde(default)]
    pub(super) icon: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct Revision {
    pub(super) revision: i64,
}

pub(super) fn tag_kind() -> String {
    "tag".into()
}
