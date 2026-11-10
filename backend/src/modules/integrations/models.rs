use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Provider {
    pub id: String,
    pub name: String,
    pub icon: String,
    pub kind: String,
    pub capabilities: Vec<String>,
    pub settings_path: String,
    pub authorization_origin: Option<String>,
    pub authorization_path: Option<String>,
}
pub fn providers() -> Vec<Provider> {
    serde_json::from_str(include_str!("../../../../shared/integrations.json"))
        .expect("integration registry")
}
#[derive(Default, Serialize, Deserialize, Clone)]
pub struct Credentials {
    pub account_id: Option<String>,
    pub api_key: Option<String>,
    #[serde(default)]
    pub epic: Option<EpicCredentials>,
    #[serde(default)]
    pub battlenet: Option<EpicCredentials>,
    #[serde(default)]
    pub battle_tag: Option<String>,
    #[serde(default)]
    pub epic_session: Option<EpicSession>,
    #[serde(default)]
    pub sessions: std::collections::HashMap<String, SessionTokens>,
}
#[derive(Serialize, Deserialize, Clone)]
pub struct EpicCredentials {
    pub client_id: String,
    pub client_secret: String,
}
#[derive(Serialize, Deserialize, Clone)]
pub struct SessionTokens {
    pub access_token: String,
    pub refresh_token: String,
    pub expires_at: DateTime<Utc>,
    pub display_name: Option<String>,
}
pub type EpicSession = SessionTokens;
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct CodeInput {
    pub state: String,
    pub code: String,
}
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Game {
    pub provider: String,
    #[serde(default = "yes")]
    pub ownership_verified: bool,
    pub id: String,
    pub name: String,
    pub playtime_minutes: Option<u64>,
    pub recent_minutes: Option<u64>,
    pub last_played_at: Option<DateTime<Utc>>,
    pub store_url: String,
    #[serde(default)]
    pub preview: Option<String>,
    #[serde(default)]
    pub image_url: Option<String>,
}
#[derive(Serialize, Deserialize, Clone)]
pub struct Snapshot {
    pub games: Vec<Game>,
    pub recent_available: bool,
    #[serde(default = "yes")]
    pub playtime_available: bool,
}
fn yes() -> bool {
    true
}
#[derive(Serialize)]
pub struct Integration {
    #[serde(flatten)]
    pub provider: Provider,
    pub instance_id: Option<uuid::Uuid>,
    pub connected: bool,
    pub configured: bool,
    pub account_id: Option<String>,
    pub client_id: Option<String>,
    pub display_name: Option<String>,
    pub syncing: bool,
    pub authorizing: bool,
    pub retry_at: Option<DateTime<Utc>>,
    pub revision: i64,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
}
#[derive(sqlx::FromRow)]
pub struct Row {
    #[sqlx(default)]
    pub authorization_started_at: Option<DateTime<Utc>>,
    pub failure_count: i32,
    pub retry_at: Option<DateTime<Utc>>,
    pub instance_id: uuid::Uuid,
    pub last_attempt_at: Option<DateTime<Utc>>,
    pub encrypted_config: Vec<u8>,
    pub revision: i64,
    pub last_synced_at: Option<DateTime<Utc>>,
    pub last_error: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct KeyInput {
    pub instance_id: Option<uuid::Uuid>,
    pub revision: i64,
    pub api_key: Option<String>,
    #[serde(default)]
    pub remove_key: bool,
    pub client_id: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Revision {
    pub instance_id: Option<uuid::Uuid>,
    pub revision: i64,
}
