use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub(super) const ISSUER: &str = "https://auth.openai.com";

pub(super) const TOKEN_URL: &str = "https://auth.openai.com/api/accounts/oauth/token";

pub(super) const RESOURCE: &str = "https://api.openai.com/v1";

pub(super) const PLAN_SCOPE: &str = "chatgpt.tokens.use.direct";

#[derive(Serialize, Deserialize, Clone)]
pub(super) struct Credentials {
    pub(super) access_token: String,
    pub(super) refresh_token: String,
    pub(super) id_token: String,
    pub(super) scope: String,
    pub(super) expires_at: DateTime<Utc>,
}

#[derive(Serialize, Deserialize, Clone)]
pub(super) struct Account {
    pub(super) client_id: String,
    pub(super) subject: String,
    pub(super) email: Option<String>,
    pub(super) credentials: Option<Credentials>,
}

#[derive(Serialize, Deserialize)]
pub(super) struct Pending {
    pub(super) state: String,
    pub(super) nonce: String,
    pub(super) verifier: String,
    pub(super) session_hash: String,
    pub(super) redirect_uri: String,
    pub(super) host_id: String,
    pub(super) account_id: Option<Uuid>,
    pub(super) account: Option<Account>,
    pub(super) result: Option<Account>,
    #[serde(default)]
    pub(super) registered_client: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct StartInput {
    pub(super) revision: i64,
    pub(super) account_id: Option<Uuid>,
}

#[derive(Deserialize)]
pub(super) struct AttemptQuery {
    pub(super) id: Uuid,
}

#[derive(Deserialize)]
pub(super) struct Callback {
    pub(super) state: String,
    pub(super) code: Option<String>,
    pub(super) client_id: Option<String>,
    pub(super) error: Option<String>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Revision {
    pub(super) revision: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct DisconnectInput {
    pub(super) revision: i64,
    #[serde(default)]
    pub(super) forget: bool,
}

#[derive(Deserialize)]
pub(super) struct Claims {
    pub(super) iat: u64,
    pub(super) sub: String,
    pub(super) nonce: Option<String>,
    pub(super) email: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct TokenResponse {
    pub(super) access_token: String,
    pub(super) refresh_token: Option<String>,
    pub(super) id_token: Option<String>,
    pub(super) token_type: String,
    pub(super) expires_in: i64,
    pub(super) scope: Option<String>,
}
