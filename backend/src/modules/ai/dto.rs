use super::models::Permissions;
use chrono::NaiveDate;
use serde::Deserialize;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ConfigInput {
    pub(super) revision: i64,
    pub(super) model: String,
    pub(super) enabled: bool,
    pub(super) permissions: Permissions,
    pub(super) api_key: Option<String>,
    #[serde(default)]
    pub(super) remove_key: bool,
    pub(super) provider: Option<String>,
    pub(super) ollama_url: Option<String>,
    pub(super) auth_mode: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct PreviewInput {
    pub(super) revision: i64,
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
    pub(super) message: String,
    pub(super) search: Option<String>,
    pub(super) scenario: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct SendInput {
    pub(super) request_id: Uuid,
    pub(super) preview_id: Uuid,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ConnectionRevision {
    pub(super) revision: i64,
}
