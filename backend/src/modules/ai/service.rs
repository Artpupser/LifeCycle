use super::models::Turn;
use crate::{infrastructure::state::AppState, shared::errors::ApiError};
use axum::http::StatusCode;
use chrono::Utc;
use serde::{Serialize, de::DeserializeOwned};
use serde_json::{Value, json};
use uuid::Uuid;

pub(crate) fn stale() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "ai_stale",
        "Settings, conversation or preview changed; review a new preview",
    )
}

pub(crate) fn seal<T: Serialize>(
    s: &AppState,
    context: &str,
    value: &T,
) -> Result<Vec<u8>, ApiError> {
    s.cipher.encrypt(
        &serde_json::to_vec(value).map_err(|_| ApiError::internal())?,
        context.as_bytes(),
    )
}

pub(crate) fn open<T: DeserializeOwned>(
    s: &AppState,
    context: &str,
    bytes: &[u8],
) -> Result<T, ApiError> {
    serde_json::from_slice(&s.cipher.decrypt(bytes, context.as_bytes())?)
        .map_err(|_| ApiError::internal())
}

pub(super) fn question(request: &Value) -> &str {
    request
        .get("input")
        .unwrap_or(&request["messages"])
        .as_array()
        .and_then(|v| v.last())
        .and_then(|v| v["content"].as_str())
        .unwrap_or("")
}

pub(super) fn allowed_history(messages: &[Turn], revision: i64) -> Vec<Value> {
    let selected: Vec<_> = messages
        .iter()
        .filter(|t| t.status == "completed" && t.config_revision == revision)
        .rev()
        .take(10)
        .collect();
    let mut output = Vec::new();
    for t in selected.into_iter().rev() {
        output.push(json!({"role":"user","content":question(&t.data.request)}));
        output.push(json!({"role":"assistant","content":t.data.answer}));
    }
    output
}

pub(super) async fn rate_limit(s: &AppState, user: Uuid, request: Uuid) -> Result<(), ApiError> {
    let mut redis = s.redis.get_multiplexed_async_connection().await?;
    let seconds: u64 = redis::Script::new("local now=tonumber(ARGV[1]); redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now-3600000); if redis.call('ZCARD',KEYS[1])>=50 then return 3600 end; if redis.call('ZCOUNT',KEYS[1],now-60000,'+inf')>=5 then return 60 end; redis.call('ZADD',KEYS[1],now,ARGV[2]); redis.call('PEXPIRE',KEYS[1],3600000); return 0")
        .key(format!("ai:requests:{user}"))
        .arg(Utc::now().timestamp_millis())
        .arg(request.to_string())
        .invoke_async(&mut redis).await?;
    if seconds > 0 {
        return Err(ApiError::rate_limited(seconds));
    }
    Ok(())
}
