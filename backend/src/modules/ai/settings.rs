use super::dto::{ConfigInput, ConnectionRevision};
use super::models::{Config, ConfigView};
use super::repository::{config, expire, invalidate};
use super::service::{seal, stale};
use crate::{
    infrastructure::state::AppState,
    modules::ai::providers::responses as ai_provider,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde_json::{Value, json};
use sqlx::types::Json as DbJson;

pub(super) async fn remove_connection(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(provider): Path<String>,
    ApiJson(v): ApiJson<ConnectionRevision>,
) -> Result<StatusCode, ApiError> {
    if !["openai", "openrouter"].contains(&provider.as_str()) {
        return Err(domain::not_found());
    }
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(stale());
    }
    let column = if provider == "openai" {
        "encrypted_key"
    } else {
        "encrypted_openrouter_key"
    };
    sqlx::query(&format!("UPDATE app.ai_settings SET {column}=NULL,enabled=CASE WHEN provider=$2 AND auth_mode='api_key' THEN false ELSE enabled END,revision=revision+1,updated_at=now() WHERE user_id=$1"))
        .bind(u.id).bind(provider).execute(&mut *tx).await?;
    invalidate(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn read_config(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<ConfigView>, ApiError> {
    let mut tx = s.database.begin().await?;
    let v = config(&mut tx, u.id).await?.view(&s);
    expire(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(Json(v))
}

pub(super) fn valid_model(model: &str, provider: &str) -> bool {
    !model.is_empty()
        && model.len() <= 100
        && model.bytes().all(|b| {
            b.is_ascii_alphanumeric()
                || b"-_.:".contains(&b)
                || (["openrouter", "ollama"].contains(&provider) && b == b'/')
        })
        && !model.contains("://")
}

pub(super) async fn update_config(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(mut v): ApiJson<ConfigInput>,
) -> Result<Json<ConfigView>, ApiError> {
    v.permissions.workouts |= v.permissions.workout_editor;
    v.permissions.workout_editor = false;
    v.permissions.personalization = false;
    if v.remove_key && v.api_key.is_some() {
        return Err(ApiError::validation(
            "Use a valid Responses API model ID and one key action",
        ));
    }
    if let Some(key) = &v.api_key
        && (!(20..=512).contains(&key.len()) || !key.bytes().all(|b| b.is_ascii_graphic()))
    {
        return Err(ApiError::validation("Invalid API key format"));
    }
    let mut tx = s.database.begin().await?;
    let old = config(&mut tx, u.id).await?;
    if old.revision != v.revision {
        return Err(stale());
    }
    let provider = v.provider.as_deref().unwrap_or(&old.provider);
    let auth_mode = v.auth_mode.as_deref().unwrap_or(&old.auth_mode);
    if !["openai", "openrouter", "ollama"].contains(&provider)
        || !["api_key", "login"].contains(&auth_mode)
        || (auth_mode == "login" && provider != "openai")
        || !valid_model(&v.model, provider)
        || (auth_mode == "login" && (v.api_key.is_some() || v.remove_key))
    {
        return Err(ApiError::validation(
            "Invalid provider, authentication method or model",
        ));
    }
    let ollama_url = crate::modules::ai::providers::ollama::endpoint(
        v.ollama_url.as_deref().unwrap_or(&old.ollama_url),
    )
    .map_err(|_| ApiError::validation("Use a local Ollama service URL"))?;
    if provider == "ollama" && (v.api_key.is_some() || v.remove_key) {
        return Err(ApiError::validation(
            "Local Ollama does not use a provider API key",
        ));
    }
    let mut encrypted_key = old.encrypted_key.clone();
    let mut encrypted_openrouter_key = old.encrypted_openrouter_key.clone();
    let selected = if provider == "openrouter" {
        &mut encrypted_openrouter_key
    } else {
        &mut encrypted_key
    };
    if v.remove_key {
        *selected = None;
    } else if let Some(key) = &v.api_key {
        let context = if provider == "openrouter" {
            format!("ai:openrouter-key:{}", u.id)
        } else {
            format!("ai:key:{}", u.id)
        };
        *selected = Some(seal(&s, &context, key)?);
    }
    if v.enabled
        && ((provider != "ollama" && auth_mode == "api_key" && selected.is_none())
            || (auth_mode == "login" && old.active_account_id.is_none()))
    {
        return Err(ApiError::validation(
            "Connect the selected provider before enabling AI",
        ));
    }
    let changed = old.ollama_url != ollama_url
        || old.model != v.model
        || old.enabled != v.enabled
        || old.permissions.0 != v.permissions
        || old.provider != provider
        || old.auth_mode != auth_mode
        || v.api_key.is_some()
        || v.remove_key;
    let revision = old.revision + i64::from(changed);
    sqlx::query("UPDATE app.ai_settings SET model=$2,enabled=$3,permissions=$4,encrypted_key=$5,revision=$6,updated_at=now(),provider=$7,auth_mode=$8,encrypted_openrouter_key=$9,ollama_url=$10 WHERE user_id=$1")
        .bind(u.id).bind(&v.model).bind(v.enabled).bind(DbJson(&v.permissions)).bind(&encrypted_key).bind(revision).bind(provider).bind(auth_mode).bind(&encrypted_openrouter_key).bind(&ollama_url).execute(&mut *tx).await?;
    if changed {
        invalidate(&mut tx, u.id).await?;
    }
    tx.commit().await?;
    Ok(Json(
        Config {
            model: v.model,
            enabled: v.enabled,
            permissions: DbJson(v.permissions),
            encrypted_key,
            encrypted_openrouter_key,
            ollama_url,
            provider: provider.to_owned(),
            auth_mode: auth_mode.to_owned(),
            active_account_id: old.active_account_id,
            revision,
        }
        .view(&s),
    ))
}

pub(super) async fn ollama_models(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Value>, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, u.id).await?;
    tx.commit().await?;
    let url = crate::modules::ai::providers::ollama::endpoint(&c.ollama_url)
        .map_err(|_| ApiError::validation("Invalid Ollama address"))?;
    let response = crate::modules::ai::providers::ollama::client(5)
        .map_err(|_| ApiError::unavailable())?
        .get(format!("{url}/api/tags"))
        .send()
        .await
        .map_err(|_| ApiError::unavailable())?;
    if !response.status().is_success() {
        return Err(ApiError::unavailable());
    }
    let data = ai_provider::bounded_json_limit(response, 1024 * 1024)
        .await
        .map_err(|_| ApiError::unavailable())?;
    let models = data["models"]
        .as_array()
        .ok_or_else(ApiError::unavailable)?
        .iter()
        .filter_map(|item| item["name"].as_str())
        .filter(|name| valid_model(name, "ollama"))
        .take(500)
        .collect::<Vec<_>>();
    Ok(Json(json!({"models":models})))
}
