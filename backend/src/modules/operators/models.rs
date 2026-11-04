use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Lookup {
    pub(super) phone: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Preferences {
    pub(super) enabled: bool,
    pub(super) api_key: Option<String>,
    #[serde(default)]
    pub(super) remove_key: bool,
}

#[derive(Serialize)]
pub(super) struct Status {
    pub(super) enabled: bool,
    pub(super) configured: bool,
}

#[derive(Serialize, Deserialize, Clone)]
pub(super) struct ResultData {
    pub(super) operator: String,
    pub(super) source: String,
    pub(super) checked_at: chrono::DateTime<chrono::Utc>,
    pub(super) ported: bool,
}

#[derive(Deserialize)]
pub(super) struct ProviderData {
    pub(super) operator: Option<String>,
    #[serde(default)]
    pub(super) mnp_ported: bool,
    #[serde(default)]
    pub(super) found: bool,
}
