use super::{http, models::*, service, steam};
use crate::{
    infrastructure::state::AppState,
    shared::{
        auth::{CurrentUser, session_token},
        domain,
        errors::{ApiError, ApiJson},
    },
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::Redirect,
    routing::{get, post},
};
use rand::RngCore;
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/integrations", get(list))
        .route(
            "/api/integrations/{provider}",
            axum::routing::put(save).delete(disconnect),
        )
        .route("/api/integrations/{provider}/connect", post(connect))
        .route("/api/integrations/{provider}/sync", post(sync))
        .route(
            "/api/integrations/xbox/authorize",
            post(super::session::authorize_xbox),
        )
        .route(
            "/api/integrations/playstation/authorize",
            post(super::session::authorize_playstation),
        )
        .route(
            "/api/integrations/epic/authorize",
            post(super::epic::authorize),
        )
        .route("/api/integrations/steam/callback", get(callback))
        .route(
            "/api/integrations/battlenet/callback",
            get(super::battlenet::callback),
        )
        .route(
            "/api/integrations/epic/callback",
            get(super::epic::callback),
        )
}
async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Integration>>, ApiError> {
    Ok(Json(service::list(&s, u.id).await?))
}
async fn save(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(provider): Path<String>,
    ApiJson(input): ApiJson<KeyInput>,
) -> Result<Json<Vec<Integration>>, ApiError> {
    service::save_key(&s, u.id, &provider, input).await?;
    Ok(Json(service::list(&s, u.id).await?))
}
async fn sync(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(provider): Path<String>,
) -> Result<(StatusCode, Json<serde_json::Value>), ApiError> {
    let mut job = tokio::spawn(async move { service::sync(&s, u.id, &provider).await });
    match tokio::time::timeout(std::time::Duration::from_secs(7), &mut job).await {
        Ok(result) => {
            result.map_err(|_| ApiError::internal())??;
            Ok((StatusCode::OK, Json(serde_json::json!({"pending":false}))))
        }
        Err(_) => Ok((
            StatusCode::ACCEPTED,
            Json(serde_json::json!({"pending":true})),
        )),
    }
}
async fn disconnect(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(provider): Path<String>,
    ApiJson(input): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    if !["steam", "epic", "battlenet", "xbox", "playstation"].contains(&provider.as_str()) {
        return Err(domain::not_found());
    }
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(service::context(u.id, &provider, "settings"))
        .execute(&mut *tx)
        .await?;
    let count=sqlx::query("DELETE FROM app.integrations WHERE user_id=$1 AND provider=$2 AND revision=$3 AND instance_id=$4").bind(u.id).bind(&provider).bind(input.revision).bind(input.instance_id).execute(&mut *tx).await?.rows_affected();
    if count == 0 {
        return Err(domain::conflict(
            "Integration changed; refresh before retrying",
        ));
    }
    sqlx::query("DELETE FROM app.integration_auth_attempts WHERE user_id=$1 AND provider=$2")
        .bind(u.id)
        .bind(&provider)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
fn digest(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
fn return_url(s: &AppState, state: &str) -> String {
    let mut url = s
        .config
        .public_url
        .join("api/integrations/steam/callback")
        .expect("static callback path");
    url.query_pairs_mut().append_pair("state", state);
    url.into()
}
async fn connect(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    Path(provider): Path<String>,
) -> Result<Json<serde_json::Value>, ApiError> {
    if ["xbox", "playstation"].contains(&provider.as_str()) {
        return super::session::connect(&s, &u, &headers, &provider).await;
    }
    if provider == "battlenet" {
        return super::battlenet::connect(&s, &u, &headers).await;
    }
    if provider == "epic" {
        return super::epic::connect(&s, &u, &headers).await;
    }
    if provider != "steam" {
        return Err(domain::not_found());
    }
    let session = session_token(&headers).ok_or_else(ApiError::unauthenticated)?;
    let mut random = [0u8; 32];
    rand::rngs::OsRng.fill_bytes(&mut random);
    let state = hex::encode(random);
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("integration-auth:{}", u.id))
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM app.integration_auth_attempts WHERE expires_at<now()")
        .execute(&mut *tx)
        .await?;
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM app.integration_auth_attempts WHERE user_id=$1")
            .bind(u.id)
            .fetch_one(&mut *tx)
            .await?;
    if count >= 3 {
        return Err(ApiError::rate_limited(600));
    }
    sqlx::query("INSERT INTO app.integration_auth_attempts(token_hash,user_id,provider,session_hash,expires_at) VALUES($1,$2,$3,$4,now()+interval '10 minutes')").bind(digest(&state)).bind(u.id).bind(&provider).bind(digest(session)).execute(&mut *tx).await?;
    tx.commit().await?;
    let mut url = url::Url::parse(steam::ENDPOINT).map_err(|_| ApiError::internal())?;
    url.query_pairs_mut().extend_pairs([
        ("openid.ns", "http://specs.openid.net/auth/2.0"),
        ("openid.mode", "checkid_setup"),
        ("openid.return_to", &return_url(&s, &state)),
        ("openid.realm", s.config.public_url.as_str()),
        (
            "openid.identity",
            "http://specs.openid.net/auth/2.0/identifier_select",
        ),
        (
            "openid.claimed_id",
            "http://specs.openid.net/auth/2.0/identifier_select",
        ),
    ]);
    Ok(Json(serde_json::json!({"url":url.as_str()})))
}
async fn finish(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
    params: BTreeMap<String, String>,
) -> Result<(), ApiError> {
    let token = params
        .get("state")
        .filter(|v| v.len() == 64 && v.bytes().all(|c| c.is_ascii_hexdigit()))
        .ok_or_else(|| ApiError::validation("Invalid authentication state"))?;
    let session = session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    let valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.integration_auth_attempts WHERE token_hash=$1 AND user_id=$2 AND provider='steam' AND session_hash=$3 AND expires_at>now())").bind(digest(token)).bind(u.id).bind(digest(session)).fetch_one(&s.database).await?;
    if !valid {
        return Err(ApiError::validation("Expired authentication state"));
    }
    let account_id = steam::validate_assertion(&params, &return_url(s, token))?;
    let mut check: BTreeMap<String, String> = params
        .iter()
        .filter(|(k, _)| k.starts_with("openid."))
        .map(|(k, v)| (k.clone(), v.clone()))
        .collect();
    check.insert("openid.mode".into(), "check_authentication".into());
    let response = http::client()?
        .post(steam::ENDPOINT)
        .form(&check)
        .send()
        .await
        .map_err(|_| ApiError::unavailable())?;
    let bytes = http::bytes(response, 16384).await?;
    if !String::from_utf8_lossy(&bytes)
        .lines()
        .any(|line| line.trim() == "is_valid:true")
    {
        return Err(ApiError::validation("Steam identity could not be verified"));
    }
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(service::context(u.id, "steam", "settings"))
        .execute(&mut *tx)
        .await?;
    let consumed=sqlx::query("DELETE FROM app.integration_auth_attempts WHERE token_hash=$1 AND user_id=$2 AND session_hash=$3 AND expires_at>now()").bind(digest(token)).bind(u.id).bind(digest(session)).execute(&mut *tx).await?.rows_affected();
    if consumed != 1 {
        return Err(ApiError::validation(
            "Authentication state already consumed",
        ));
    }
    let old:Option<Row>=sqlx::query_as("SELECT failure_count,retry_at,instance_id,last_attempt_at,encrypted_config,encrypted_snapshot,revision,last_synced_at,last_error FROM app.integrations WHERE user_id=$1 AND provider='steam' FOR UPDATE").bind(u.id).fetch_optional(&mut *tx).await?;
    let mut data = old
        .as_ref()
        .map(|row| service::credentials(s, u.id, "steam", row))
        .transpose()?
        .unwrap_or_default();
    let changed = data.account_id.as_ref() != Some(&account_id);
    data.account_id = Some(account_id);
    let encrypted = service::encrypt(s, u.id, "steam", "config", &data)?;
    sqlx::query("INSERT INTO app.integrations(user_id,provider,encrypted_config) VALUES($1,'steam',$2) ON CONFLICT(user_id,provider) DO UPDATE SET encrypted_config=$2,revision=app.integrations.revision+1,encrypted_snapshot=CASE WHEN $3 THEN NULL ELSE app.integrations.encrypted_snapshot END,last_synced_at=CASE WHEN $3 THEN NULL ELSE app.integrations.last_synced_at END,last_error=NULL,last_attempt_at=NULL,updated_at=now()")
 .bind(u.id).bind(encrypted).bind(changed).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
async fn callback(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    Query(params): Query<BTreeMap<String, String>>,
) -> Redirect {
    let result = if finish(&s, &u, &headers, params).await.is_ok() {
        "connected"
    } else {
        "failed"
    };
    Redirect::to(&format!(
        "/profile?integration=steam&result={result}#integrations"
    ))
}
