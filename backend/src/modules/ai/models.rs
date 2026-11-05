use crate::{
    infrastructure::state::AppState, modules::ai::login as ai_login, shared::errors::ApiError,
};
use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct Permissions {
    pub(crate) analytics: bool,
    pub(crate) tasks: bool,
    pub(crate) habits: bool,
    pub(crate) workouts: bool,
    pub(crate) notes: bool,
    pub(crate) profile: bool,
    pub(crate) intimacy: bool,
    pub(crate) contacts: bool,
    pub(crate) countdowns: bool,
    pub(crate) boards: bool,
    #[serde(skip_serializing)]
    pub(crate) workout_editor: bool,
    #[serde(skip_serializing)]
    pub(crate) personalization: bool,
    pub(crate) changes: bool,
}

impl Permissions {
    pub(crate) fn training(&self) -> bool {
        self.workouts || self.workout_editor
    }
}

#[derive(sqlx::FromRow)]
pub(crate) struct Config {
    pub(crate) model: String,
    pub(crate) enabled: bool,
    pub(crate) permissions: DbJson<Permissions>,
    pub(super) encrypted_key: Option<Vec<u8>>,
    pub(super) encrypted_openrouter_key: Option<Vec<u8>>,
    pub(crate) provider: String,
    pub(crate) ollama_url: String,
    pub(crate) auth_mode: String,
    pub(crate) active_account_id: Option<Uuid>,
    pub(crate) revision: i64,
}

#[derive(Serialize)]
pub(super) struct ConfigView {
    pub(super) ollama_url: String,
    pub(super) provider: String,
    pub(super) auth_mode: String,
    pub(super) active_account_id: Option<Uuid>,
    pub(super) login_available: bool,
    pub(super) model: String,
    pub(super) enabled: bool,
    pub(super) permissions: Permissions,
    pub(super) key_present: bool,
    pub(super) openai_key_present: bool,
    pub(super) openrouter_key_present: bool,
    pub(super) revision: i64,
}

impl Config {
    pub(super) fn view(self, s: &AppState) -> ConfigView {
        let key_present = self.selected_key().is_some();
        let openai_key_present = self.encrypted_key.is_some();
        let openrouter_key_present = self.encrypted_openrouter_key.is_some();
        ConfigView {
            ollama_url: self.ollama_url,
            provider: self.provider,
            auth_mode: self.auth_mode,
            active_account_id: self.active_account_id,
            login_available: ai_login::available(s),
            model: self.model,
            enabled: self.enabled,
            permissions: self.permissions.0,
            key_present,
            openai_key_present,
            openrouter_key_present,
            revision: self.revision,
        }
    }
    pub(super) fn ready(&self) -> Result<(), ApiError> {
        if !self.enabled
            || (self.auth_mode == "login" && self.active_account_id.is_none())
            || (self.provider != "ollama"
                && self.auth_mode == "api_key"
                && self.selected_key().is_none())
        {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "ai_not_configured",
                "Connect the selected provider and enable AI first",
            ));
        }
        Ok(())
    }
    pub(super) fn selected_key(&self) -> Option<&Vec<u8>> {
        if self.provider == "ollama" {
            None
        } else if self.provider == "openrouter" {
            self.encrypted_openrouter_key.as_ref()
        } else {
            self.encrypted_key.as_ref()
        }
    }
}

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Chat {
    pub(super) id: Uuid,
    pub(super) version: i64,
    pub(super) created_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub(super) struct Preview {
    pub(super) id: Uuid,
    pub(super) expires_at: DateTime<Utc>,
    pub(super) config_revision: i64,
    pub(super) history_turns: usize,
    pub(super) request: Value,
}

#[derive(Serialize, Deserialize)]
pub(super) struct TurnData {
    pub(super) request: Value,
    pub(super) answer: Option<String>,
    pub(super) usage: Option<Value>,
}

#[derive(sqlx::FromRow)]
pub(super) struct TurnRow {
    pub(super) id: Uuid,
    pub(super) config_revision: i64,
    pub(super) model: String,
    pub(super) provider: String,
    pub(super) status: String,
    pub(super) error_code: Option<String>,
    pub(super) encrypted_data: Vec<u8>,
    pub(super) created_at: DateTime<Utc>,
    pub(super) finished_at: Option<DateTime<Utc>>,
}

#[derive(Serialize)]
pub(super) struct Turn {
    pub(super) id: Uuid,
    pub(super) config_revision: i64,
    pub(super) model: String,
    pub(super) provider: String,
    pub(super) status: String,
    pub(super) error_code: Option<String>,
    pub(super) data: TurnData,
    pub(super) created_at: DateTime<Utc>,
    pub(super) finished_at: Option<DateTime<Utc>>,
}
