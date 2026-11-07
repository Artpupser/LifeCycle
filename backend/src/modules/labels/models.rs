use crate::shared::domain;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub(super) struct Data {
    pub(super) name: String,
    pub(super) color: String,
    #[serde(default)]
    pub(super) icon: Option<String>,
    #[serde(default)]
    pub(super) description: String,
    #[serde(default)]
    pub(super) image_id: Option<Uuid>,
    #[serde(default = "personal")]
    pub(super) in_collection: bool,
}
impl Default for Data {
    fn default() -> Self {
        Self {
            name: String::new(),
            color: domain::default_color(),
            icon: None,
            description: String::new(),
            image_id: None,
            in_collection: true,
        }
    }
}

#[derive(Serialize)]
pub(super) struct Label {
    pub(super) in_collection: bool,
    pub(super) value: Option<String>,
    pub(super) id: Uuid,
    pub(super) name: String,
    pub(super) color: String,
    pub(super) kind: String,
    pub(super) icon: Option<String>,
    pub(super) function_key: Option<String>,
    pub(super) is_system: bool,
    pub(super) repeatable: bool,
    pub(super) revision: i64,
    pub(super) description: String,
    pub(super) image_id: Option<Uuid>,
}

#[derive(Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct CollectionDetails {
    #[serde(default = "personal")]
    pub(super) in_collection: bool,
    #[serde(default)]
    pub(super) description: String,
    pub(super) image_id: Option<Uuid>,
}
impl Default for CollectionDetails {
    fn default() -> Self {
        Self {
            in_collection: true,
            description: String::new(),
            image_id: None,
        }
    }
}

#[derive(sqlx::FromRow)]
pub(super) struct Row {
    pub(super) id: Uuid,
    pub(super) kind: String,
    pub(super) function_key: Option<String>,
    pub(super) is_system: bool,
    pub(super) repeatable: bool,
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
    pub(super) repeatable: Option<bool>,
    #[serde(default)]
    pub(super) icon: Option<String>,
    pub(super) details: Option<CollectionDetails>,
}

#[derive(Deserialize)]
pub(super) struct Revision {
    pub(super) revision: i64,
}

pub(super) fn tag_kind() -> String {
    "tag".into()
}
pub(super) fn personal() -> bool {
    true
}
