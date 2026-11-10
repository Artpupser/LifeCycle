use super::models::*;
use crate::{
    infrastructure::state::AppState,
    shared::{domain, errors::ApiError},
};
use uuid::Uuid;

pub async fn row(s: &AppState, user: Uuid, provider: &str) -> Result<Option<Row>, ApiError> {
    Ok(sqlx::query_as("SELECT authorization_started_at,failure_count,retry_at,instance_id,last_attempt_at,encrypted_config,encrypted_snapshot,revision,last_synced_at,last_error FROM app.integrations WHERE user_id=$1 AND provider=$2").bind(user).bind(provider).fetch_optional(&s.database).await?)
}
pub fn context(user: Uuid, provider: &str, kind: &str) -> String {
    format!("integration:{user}:{provider}:{kind}")
}
pub fn credentials(
    s: &AppState,
    user: Uuid,
    provider: &str,
    row: &Row,
) -> Result<Credentials, ApiError> {
    serde_json::from_slice(&s.cipher.decrypt(
        &row.encrypted_config,
        context(user, provider, "config").as_bytes(),
    )?)
    .map_err(|_| ApiError::internal())
}
pub fn encrypt<T: serde::Serialize>(
    s: &AppState,
    user: Uuid,
    provider: &str,
    kind: &str,
    value: &T,
) -> Result<Vec<u8>, ApiError> {
    s.cipher.encrypt(
        &serde_json::to_vec(value).map_err(|_| ApiError::internal())?,
        context(user, provider, kind).as_bytes(),
    )
}
pub fn validate_key(value: &str) -> Result<String, ApiError> {
    let key = value.trim();
    if key.len() != 32 || !key.bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err(ApiError::validation("Invalid Steam Web API key"));
    }
    Ok(key.to_owned())
}
pub async fn list(s: &AppState, user: Uuid) -> Result<Vec<Integration>, ApiError> {
    let mut result = vec![];
    for provider in providers() {
        let row = row(s, user, &provider.id).await?;
        let data = match &row {
            Some(row) => credentials(s, user, &provider.id, row)?,
            None => Credentials::default(),
        };
        result.push(Integration {
            instance_id: row.as_ref().map(|v| v.instance_id),
            connected: data.account_id.is_some()
                && (provider.id != "epic" || data.epic_session.is_some())
                && (!["xbox", "playstation"].contains(&provider.id.as_str())
                    || data.sessions.contains_key(&provider.id)),
            configured: if ["xbox", "playstation"].contains(&provider.id.as_str()) {
                data.sessions.contains_key(&provider.id)
            } else if provider.id == "battlenet" {
                data.battlenet.is_some()
            } else if provider.id == "epic" {
                data.epic_session.is_some()
            } else {
                data.api_key.is_some()
            },
            display_name: data
                .epic_session
                .as_ref()
                .and_then(|session| session.display_name.clone())
                .or_else(|| data.battle_tag.clone())
                .or_else(|| {
                    data.sessions
                        .get(&provider.id)
                        .and_then(|session| session.display_name.clone())
                }),
            retry_at: row.as_ref().and_then(|row| row.retry_at),
            authorizing: row.as_ref().is_some_and(|row| {
                row.authorization_started_at
                    .is_some_and(|at| at > chrono::Utc::now() - chrono::Duration::minutes(3))
            }),
            syncing: row.as_ref().is_some_and(|row| {
                row.last_error.is_none()
                    && row.last_attempt_at.is_some_and(|at| {
                        at > chrono::Utc::now() - chrono::Duration::minutes(3)
                            && row.last_synced_at.is_none_or(|synced| synced < at)
                    })
            }),
            client_id: data
                .epic
                .as_ref()
                .or(data.battlenet.as_ref())
                .map(|client| client.client_id.clone()),
            account_id: data.account_id,
            revision: row.as_ref().map_or(0, |v| v.revision),
            last_synced_at: row.as_ref().and_then(|v| v.last_synced_at),
            last_error: row.and_then(|v| v.last_error),
            provider,
        });
    }
    Ok(result)
}
pub async fn save_key(
    s: &AppState,
    user: Uuid,
    provider: &str,
    input: KeyInput,
) -> Result<(), ApiError> {
    if !["steam", "epic", "battlenet"].contains(&provider) {
        return Err(domain::not_found());
    }
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(context(user, provider, "settings"))
        .execute(&mut *tx)
        .await?;
    let old:Option<Row>=sqlx::query_as("SELECT failure_count,retry_at,instance_id,last_attempt_at,encrypted_config,encrypted_snapshot,revision,last_synced_at,last_error FROM app.integrations WHERE user_id=$1 AND provider=$2 FOR UPDATE").bind(user).bind(provider).fetch_optional(&mut *tx).await?;
    if old.as_ref().map_or(0, |v| v.revision) != input.revision
        || old.as_ref().map(|v| v.instance_id) != input.instance_id
    {
        return Err(domain::conflict(
            "Integration changed; refresh before retrying",
        ));
    }
    let mut data = old
        .as_ref()
        .map(|v| credentials(s, user, provider, v))
        .transpose()?
        .unwrap_or_default();
    if ["epic", "battlenet"].contains(&provider) {
        data.epic_session = None;
        data.battle_tag = None;
        if input.remove_key {
            if provider == "battlenet" {
                data.battlenet = None;
            } else {
                data.epic = None;
            }
        } else {
            let client_id = input.client_id.unwrap_or_default().trim().to_owned();
            let secret = input.api_key.unwrap_or_default().trim().to_owned();
            if !(8..=128).contains(&client_id.len())
                || !client_id
                    .bytes()
                    .all(|c| c.is_ascii_alphanumeric() || b"_-".contains(&c))
                || !(8..=512).contains(&secret.len())
                || !secret.bytes().all(|c| c.is_ascii_graphic())
            {
                return Err(ApiError::validation("Invalid OAuth client credentials"));
            }
            let client = Some(EpicCredentials {
                client_id,
                client_secret: secret,
            });
            if provider == "battlenet" {
                data.battlenet = client;
            } else {
                data.epic = client;
            }
        }
        data.account_id = None;
        sqlx::query("DELETE FROM app.integration_auth_attempts WHERE user_id=$1 AND provider=$2")
            .bind(user)
            .bind(provider)
            .execute(&mut *tx)
            .await?;
    } else if input.remove_key {
        data.api_key = None;
    } else if let Some(key) = input.api_key {
        data.api_key = Some(validate_key(&key)?);
    }

    let encrypted = encrypt(s, user, provider, "config", &data)?;
    sqlx::query("INSERT INTO app.integrations(user_id,provider,encrypted_config) VALUES($1,$2,$3) ON CONFLICT(user_id,provider) DO UPDATE SET encrypted_config=$3,revision=app.integrations.revision+1,encrypted_snapshot=CASE WHEN $4 THEN NULL ELSE app.integrations.encrypted_snapshot END,last_synced_at=CASE WHEN $4 THEN NULL ELSE app.integrations.last_synced_at END,last_error=NULL,last_attempt_at=NULL,updated_at=now()")
 .bind(user).bind(provider).bind(encrypted).bind(provider!="steam").execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
pub async fn snapshots(s: &AppState, user: Uuid) -> Result<Vec<Snapshot>, ApiError> {
    let rows:Vec<(String,Vec<u8>)>=sqlx::query_as("SELECT provider,encrypted_snapshot FROM app.integrations WHERE user_id=$1 AND encrypted_snapshot IS NOT NULL").bind(user).fetch_all(&s.database).await?;
    rows.into_iter()
        .map(|(provider, bytes)| {
            serde_json::from_slice(
                &s.cipher
                    .decrypt(&bytes, context(user, &provider, "snapshot").as_bytes())?,
            )
            .map_err(|_| ApiError::internal())
        })
        .collect()
}
pub async fn sync(s: &AppState, user: Uuid, provider: &str) -> Result<(), ApiError> {
    if !["steam", "epic", "xbox", "playstation"].contains(&provider) {
        return Err(domain::not_found());
    }
    let mut lock = s.database.begin().await?;
    let acquired: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended($1,0))")
            .bind(context(user, provider, "sync"))
            .fetch_one(&mut *lock)
            .await?;
    if !acquired {
        return Err(ApiError::rate_limited(120));
    }
    let Some(row) = row(s, user, provider).await? else {
        return Err(ApiError::validation("Connect Steam first"));
    };
    if let Some(retry) = row.retry_at.filter(|at| *at > chrono::Utc::now()) {
        return Err(ApiError::rate_limited(
            (retry - chrono::Utc::now()).num_seconds().max(1) as u64,
        ));
    }
    if row
        .last_attempt_at
        .is_some_and(|at| at > chrono::Utc::now() - chrono::Duration::minutes(2))
    {
        return Err(ApiError::rate_limited(120));
    }
    let mut data = credentials(s, user, provider, &row)?;
    sqlx::query("UPDATE app.integrations SET last_attempt_at=now(),last_error=NULL WHERE user_id=$1 AND provider=$2 AND instance_id=$3").bind(user).bind(provider).bind(row.instance_id).execute(&s.database).await?;
    let action = async {
        if provider == "epic" {
            super::epic::library(&mut data).await
        } else if provider == "xbox" {
            super::xbox::library(&mut data).await
        } else if provider == "playstation" {
            super::playstation::library(&mut data).await
        } else {
            super::steam::library(&data).await
        }
    };
    let result = tokio::time::timeout(std::time::Duration::from_secs(90), action)
        .await
        .unwrap_or_else(|_| Err(ApiError::unavailable()));
    let config = encrypt(s, user, provider, "config", &data)?;
    match result {
        Ok(snapshot) => {
            let encrypted = encrypt(s, user, provider, "snapshot", &snapshot)?;
            let count=sqlx::query("UPDATE app.integrations SET encrypted_snapshot=$4,encrypted_config=$6,last_synced_at=now(),last_error=NULL,failure_count=0,retry_at=NULL WHERE user_id=$1 AND provider=$2 AND revision=$3 AND instance_id=$5").bind(user).bind(provider).bind(row.revision).bind(encrypted).bind(row.instance_id).bind(&config).execute(&s.database).await?.rows_affected();
            if count == 0 {
                return Err(domain::conflict(
                    "Integration changed during synchronization",
                ));
            }
        }
        Err(error) => {
            record_failure(s, user, provider, &row, &error, Some(&config)).await?;
            return Err(error);
        }
    }
    Ok(())
}
pub async fn record_failure(
    s: &AppState,
    user: Uuid,
    provider: &str,
    row: &Row,
    error: &ApiError,
    config: Option<&[u8]>,
) -> Result<(), ApiError> {
    let count = row.failure_count.saturating_add(1).min(32);
    let retry = chrono::Utc::now()
        + chrono::Duration::seconds(super::http::retry_delay(count, error.retry_after));
    sqlx::query("UPDATE app.integrations SET authorization_started_at=NULL,last_error=$4,updated_at=now(),failure_count=$6,retry_at=$7,encrypted_config=COALESCE($8,encrypted_config) WHERE user_id=$1 AND provider=$2 AND revision=$3 AND instance_id=$5").bind(user).bind(provider).bind(row.revision).bind(error.code).bind(row.instance_id).bind(count).bind(retry).bind(config).execute(&s.database).await?;
    Ok(())
}
pub async fn sync_due(s: &AppState) -> Result<(), ApiError> {
    let enabled: Vec<String> = providers()
        .into_iter()
        .filter(|provider| {
            provider.kind == "gaming"
                && provider
                    .capabilities
                    .iter()
                    .any(|capability| capability == "library")
        })
        .map(|provider| provider.id)
        .collect();
    let rows:Vec<(Uuid,String)>=sqlx::query_as("SELECT user_id,provider FROM app.integrations WHERE provider=ANY($1) AND (provider NOT IN ('epic','xbox','playstation') OR encrypted_snapshot IS NOT NULL) AND (last_synced_at IS NULL OR last_synced_at<now()-interval '6 hours') AND (last_attempt_at IS NULL OR last_attempt_at<now()-interval '15 minutes') AND (retry_at IS NULL OR retry_at<=now()) ORDER BY last_synced_at NULLS FIRST LIMIT 30").bind(enabled).fetch_all(&s.database).await?;
    for (user, provider) in rows {
        let _ = sync(s, user, &provider).await;
    }
    Ok(())
}

/// One state/session/revision lifecycle for OAuth and code-login adapters.
pub async fn authorization_attempt(
    s: &AppState,
    u: &crate::shared::auth::CurrentUser,
    headers: &axum::http::HeaderMap,
    provider: &str,
) -> Result<String, ApiError> {
    use rand::RngCore;
    use sha2::{Digest, Sha256};
    let hash = |value: &str| hex::encode(Sha256::digest(value.as_bytes()));
    let session =
        crate::shared::auth::session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(context(u.id, provider, "settings"))
        .execute(&mut *tx)
        .await?;
    if let Some(row) = row(s, u.id, provider).await? {
        if row
            .authorization_started_at
            .is_some_and(|at| at > chrono::Utc::now() - chrono::Duration::minutes(3))
        {
            return Err(ApiError::rate_limited(120));
        }
        if let Some(retry) = row.retry_at.filter(|at| *at > chrono::Utc::now()) {
            return Err(ApiError::rate_limited(
                (retry - chrono::Utc::now()).num_seconds().max(1) as u64,
            ));
        }
    }
    let empty = encrypt(s, u.id, provider, "config", &Credentials::default())?;
    sqlx::query("INSERT INTO app.integrations(user_id,provider,encrypted_config) VALUES($1,$2,$3) ON CONFLICT DO NOTHING").bind(u.id).bind(provider).bind(empty).execute(&mut *tx).await?;
    let (instance, revision): (Uuid, i64) = sqlx::query_as(
        "SELECT instance_id,revision FROM app.integrations WHERE user_id=$1 AND provider=$2",
    )
    .bind(u.id)
    .bind(provider)
    .fetch_one(&mut *tx)
    .await?;
    sqlx::query("DELETE FROM app.integration_auth_attempts WHERE expires_at<now() OR (user_id=$1 AND provider=$2 AND session_hash=$3)").bind(u.id).bind(provider).bind(hash(session)).execute(&mut *tx).await?;
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM app.integration_auth_attempts WHERE user_id=$1")
            .bind(u.id)
            .fetch_one(&mut *tx)
            .await?;
    if count >= 3 {
        return Err(ApiError::rate_limited(600));
    }
    let mut random = [0; 32];
    rand::rngs::OsRng.fill_bytes(&mut random);
    let state = hex::encode(random);
    sqlx::query("INSERT INTO app.integration_auth_attempts(token_hash,user_id,provider,session_hash,expires_at,integration_instance,integration_revision) VALUES($1,$2,$3,$4,now()+interval '10 minutes',$5,$6)").bind(hash(&state)).bind(u.id).bind(provider).bind(hash(session)).bind(instance).bind(revision).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(state)
}

/// A single redemption policy for code and session-based logins.
pub async fn consume_authorization(
    s: &AppState,
    u: &crate::shared::auth::CurrentUser,
    headers: &axum::http::HeaderMap,
    provider: &str,
    row: &Row,
    state: &str,
) -> Result<(), ApiError> {
    use sha2::{Digest, Sha256};
    if state.len() != 64 || !state.bytes().all(|byte| byte.is_ascii_hexdigit()) {
        return Err(ApiError::validation("Invalid authentication state"));
    }
    let session =
        crate::shared::auth::session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    let digest = |value: &str| hex::encode(Sha256::digest(value.as_bytes()));
    let consumed=sqlx::query("DELETE FROM app.integration_auth_attempts WHERE token_hash=$1 AND user_id=$2 AND provider=$3 AND session_hash=$4 AND expires_at>now() AND integration_instance=$5 AND integration_revision=$6").bind(digest(state)).bind(u.id).bind(provider).bind(digest(session)).bind(row.instance_id).bind(row.revision).execute(&s.database).await?.rows_affected();
    if consumed != 1 {
        return Err(ApiError::validation(
            "Expired authentication state; start a new login",
        ));
    }
    Ok(())
}
