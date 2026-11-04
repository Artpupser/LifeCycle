use super::domain::ContactData;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Input {
    pub(super) data: ContactData,
    pub(super) revision: Option<i64>,
    #[serde(default)]
    pub(super) allow_duplicate: bool,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Delete {
    pub(super) revision: i64,
    pub(super) events: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ImportItem {
    pub(super) id: Option<Uuid>,
    pub(super) data: ContactData,
    pub(super) revision: Option<i64>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Import {
    pub(super) items: Vec<ImportItem>,
}
#[derive(Serialize)]
pub(super) struct Imported {
    pub(super) created: usize,
    pub(super) updated: usize,
    pub(super) skipped: usize,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct LabelChange {
    pub(super) kind: String,
    pub(super) name: String,
    pub(super) replacement: Option<String>,
}
