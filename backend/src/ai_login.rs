use crate::{
    ai, ai_provider,
    auth::{self, CurrentUser},
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::Redirect,
    routing::{get, post},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header, jwk::JwkSet};
use rand::{RngCore, rngs::OsRng};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use sqlx::PgConnection;
use url::Url;
use uuid::Uuid;

const ISSUER: &str = "https://auth.openai.com";
const TOKEN_URL: &str = "https://auth.openai.com/api/accounts/oauth/token";
const RESOURCE: &str = "https://api.openai.com/v1";
const PLAN_SCOPE: &str = "chatgpt.tokens.use.direct";

#[derive(Serialize, Deserialize, Clone)]
struct Credentials {
    access_token: String,
    refresh_token: String,
    id_token: String,
    scope: String,
    expires_at: DateTime<Utc>,
}
#[derive(Serialize, Deserialize, Clone)]
struct Account {
    client_id: String,
    subject: String,
    email: Option<String>,
    credentials: Option<Credentials>,
}
#[derive(Serialize, Deserialize)]
struct Pending {
    state: String,
    nonce: String,
    verifier: String,
    session_hash: String,
    redirect_uri: String,
    host_id: String,
    account_id: Option<Uuid>,
    account: Option<Account>,
    result: Option<Account>,
    #[serde(default)]
    registered_client: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct StartInput {
    revision: i64,
    account_id: Option<Uuid>,
}
#[derive(Deserialize)]
struct AttemptQuery {
    id: Uuid,
}
#[derive(Deserialize)]
struct Callback {
    state: String,
    code: Option<String>,
    client_id: Option<String>,
    error: Option<String>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Revision {
    revision: i64,
}
#[derive(Deserialize)]
struct Claims {
    iat: u64,
    sub: String,
    nonce: Option<String>,
    email: Option<String>,
}
#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    id_token: Option<String>,
    token_type: String,
    expires_in: i64,
    scope: Option<String>,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/ai/login/start", post(start))
        .route("/api/ai/login/authorize", get(authorize))
        .route("/api/ai/login/callback", get(callback))
        .route("/api/ai/login/complete", get(complete))
        .route("/api/ai/accounts", get(accounts))
        .route("/api/ai/accounts/{id}", post(select).delete(disconnect))
        .route("/api/ai/models", get(models))
}
fn failure(code: &'static str) -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        code,
        "ChatGPT connection could not be completed",
    )
}
fn random() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}
fn hash(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
fn session_hash(headers: &HeaderMap) -> Result<String, ApiError> {
    auth::session_token(headers)
        .map(hash)
        .ok_or_else(ApiError::unauthenticated)
}
pub fn available(s: &AppState) -> bool {
    let url = &s.config.public_url;
    url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1"))
}
fn redirect_uri(s: &AppState) -> String {
    let mut url = s.config.public_url.clone();
    url.set_host(Some("127.0.0.1")).unwrap();
    url.set_path("/api/ai/login/callback");
    url.to_string()
}
fn account_context(user: Uuid, id: Uuid) -> String {
    format!("ai:account:{user}:{id}")
}
fn pending_context(user: Uuid, id: Uuid) -> String {
    format!("ai:login:{user}:{id}")
}
async fn account(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<Account, ApiError> {
    let bytes: Vec<u8> = sqlx::query_scalar(
        "SELECT encrypted_data FROM app.ai_accounts WHERE user_id=$1 AND id=$2 FOR UPDATE",
    )
    .bind(user)
    .bind(id)
    .fetch_optional(db)
    .await?
    .ok_or_else(crate::domain::not_found)?;
    ai::open(s, &account_context(user, id), &bytes)
}
async fn store_account(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
    a: &Account,
) -> Result<(), ApiError> {
    sqlx::query("INSERT INTO app.ai_accounts(id,user_id,encrypted_data) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET encrypted_data=EXCLUDED.encrypted_data WHERE app.ai_accounts.user_id=EXCLUDED.user_id")
        .bind(id).bind(user).bind(ai::seal(s,&account_context(user,id),a)?).execute(db).await?;
    Ok(())
}
async fn start(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    ApiJson(v): ApiJson<StartInput>,
) -> Result<Json<Value>, ApiError> {
    if !available(&s) {
        return Err(failure("ai_login_local_only"));
    }
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(ai::stale());
    }
    let old = if let Some(id) = v.account_id {
        Some(account(&s, &mut tx, u.id, id).await?)
    } else {
        None
    };
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM app.ai_accounts WHERE user_id=$1")
        .bind(u.id)
        .fetch_one(&mut *tx)
        .await?;
    if old.is_none() && count >= 10 {
        return Err(failure("ai_account_limit"));
    }
    sqlx::query(
        "INSERT INTO app.ai_runtime(singleton,host_id) VALUES(true,$1) ON CONFLICT DO NOTHING",
    )
    .bind(Uuid::new_v4())
    .execute(&mut *tx)
    .await?;
    let host: Uuid = sqlx::query_scalar("SELECT host_id FROM app.ai_runtime WHERE singleton")
        .fetch_one(&mut *tx)
        .await?;
    let id = Uuid::new_v4();
    let pending = Pending {
        state: random(),
        nonce: random(),
        verifier: random(),
        session_hash: session_hash(&headers)?,
        redirect_uri: redirect_uri(&s),
        host_id: format!("urn:uuid:{host}"),
        account_id: v.account_id,
        account: old,
        result: None,
        registered_client: None,
    };
    sqlx::query("DELETE FROM app.ai_login_attempts WHERE user_id=$1 OR expires_at<=now()")
        .bind(u.id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO app.ai_login_attempts(id,user_id,config_revision,state_hash,encrypted_data,phase) VALUES($1,$2,$3,$4,$5,'created')")
        .bind(id).bind(u.id).bind(c.revision).bind(hash(&pending.state)).bind(ai::seal(&s,&pending_context(u.id,id),&pending)?).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(
        json!({"url":format!("/api/ai/login/authorize?id={id}")}),
    ))
}
fn authorization_url(p: &Pending) -> Url {
    let mut url = Url::parse("https://auth.openai.com/api/accounts/authorize").unwrap();
    let client = p
        .account
        .as_ref()
        .map(|a| a.client_id.as_str())
        .unwrap_or("dynamic_agent_client");
    url.query_pairs_mut().extend_pairs([
        ("client_id", client),
        ("ext_agent_host_id", &p.host_id),
        ("response_type", "code"),
        ("redirect_uri", &p.redirect_uri),
        (
            "scope",
            "openid profile email offline_access resource.invoke chatgpt.tokens.use.direct",
        ),
        ("resource", RESOURCE),
        ("state", &p.state),
        ("nonce", &p.nonce),
        ("code_challenge_method", "S256"),
        (
            "code_challenge",
            &URL_SAFE_NO_PAD.encode(Sha256::digest(p.verifier.as_bytes())),
        ),
    ]);
    if let Some(a) = &p.account {
        if let Some(c) = &a.credentials {
            url.query_pairs_mut()
                .append_pair("id_token_hint", &c.id_token);
        }
    } else {
        url.query_pairs_mut()
            .append_pair("agent_name_hint", "LifeCycle");
    }
    url
}
async fn authorize(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    Query(q): Query<AttemptQuery>,
) -> Result<Redirect, ApiError> {
    let bytes:Vec<u8>=sqlx::query_scalar("UPDATE app.ai_login_attempts SET phase='launched' WHERE id=$1 AND user_id=$2 AND phase='created' AND expires_at>now() RETURNING encrypted_data")
        .bind(q.id).bind(u.id).fetch_optional(&s.database).await?.ok_or_else(|| failure("ai_login_expired"))?;
    let p: Pending = ai::open(&s, &pending_context(u.id, q.id), &bytes)?;
    if p.session_hash != session_hash(&headers)? {
        return Err(failure("ai_login_expired"));
    }
    Ok(Redirect::to(authorization_url(&p).as_str()))
}
async fn verify_identity(
    token: &str,
    client: &str,
    nonce: Option<&str>,
    jwks: &JwkSet,
) -> Result<Claims, &'static str> {
    let header = decode_header(token).map_err(|_| "ai_login_invalid")?;
    if !matches!(header.alg, Algorithm::RS256 | Algorithm::ES256) {
        return Err("ai_login_invalid");
    }
    let jwk = jwks
        .find(header.kid.as_deref().ok_or("ai_login_invalid")?)
        .ok_or("ai_login_invalid")?;
    let key = DecodingKey::from_jwk(jwk).map_err(|_| "ai_login_invalid")?;
    let mut validation = Validation::new(header.alg);
    validation.set_audience(&[client]);
    validation.set_issuer(&[ISSUER]);
    validation.set_required_spec_claims(&["iss", "aud", "exp", "iat", "sub"]);
    validation.validate_nbf = true;
    validation.leeway = 5;
    let claims = decode::<Claims>(token, &key, &validation)
        .map_err(|_| "ai_login_invalid")?
        .claims;
    if claims.iat > (Utc::now().timestamp() + 5) as u64
        || claims.sub.is_empty()
        || nonce.is_some_and(|n| claims.nonce.as_deref() != Some(n))
    {
        return Err("ai_login_invalid");
    }
    Ok(claims)
}
async fn identity(token: &str, client: &str, nonce: Option<&str>) -> Result<Claims, &'static str> {
    let response = ai_provider::client(4)?
        .get("https://auth.openai.com/.well-known/jwks.json")
        .send()
        .await
        .map_err(|_| "ai_login_unavailable")?;
    if !response.status().is_success() {
        return Err("ai_login_unavailable");
    }
    let jwks: JwkSet = serde_json::from_value(ai_provider::bounded_json(response).await?)
        .map_err(|_| "ai_login_invalid")?;
    verify_identity(token, client, nonce, &jwks).await
}
async fn tokens(form: &[(&str, &str)]) -> Result<TokenResponse, &'static str> {
    let response = ai_provider::client(4)?
        .post(TOKEN_URL)
        .form(form)
        .send()
        .await
        .map_err(|_| "ai_login_unavailable")?;
    if !response.status().is_success() {
        return Err("ai_login_required");
    }
    let t: TokenResponse = serde_json::from_value(ai_provider::bounded_json(response).await?)
        .map_err(|_| "ai_login_invalid")?;
    if !t.token_type.eq_ignore_ascii_case("bearer")
        || !(1..=86400).contains(&t.expires_in)
        || t.access_token.is_empty()
        || t.access_token.len() > 16384
    {
        return Err("ai_login_invalid");
    }
    Ok(t)
}
fn has_scope(scope: &str) -> bool {
    scope.split_ascii_whitespace().any(|s| s == PLAN_SCOPE)
}
async fn exchange(p: &mut Pending, q: &Callback) -> Result<Account, &'static str> {
    if q.error.is_some() {
        return Err("ai_login_denied");
    }
    let client = match &p.account {
        Some(a) if q.client_id.as_ref().is_none_or(|c| *c == a.client_id) => a.client_id.clone(),
        Some(_) => return Err("ai_login_invalid"),
        None => q
            .client_id
            .clone()
            .filter(|id| id.starts_with("oaiapp_") && id.len() <= 512)
            .ok_or("ai_login_invalid")?,
    };
    let code = q
        .code
        .as_deref()
        .filter(|c| !c.is_empty() && c.len() <= 8192)
        .ok_or("ai_login_invalid")?;
    p.registered_client = Some(client.clone());
    let t = tokens(&[
        ("grant_type", "authorization_code"),
        ("client_id", &client),
        ("code", code),
        ("code_verifier", &p.verifier),
        ("redirect_uri", &p.redirect_uri),
        ("resource", RESOURCE),
    ])
    .await?;
    let id_token = t.id_token.ok_or("ai_login_invalid")?;
    let claims = identity(&id_token, &client, Some(&p.nonce)).await?;
    if p.account
        .as_ref()
        .is_some_and(|a| !a.subject.is_empty() && a.subject != claims.sub)
    {
        return Err("ai_login_invalid");
    }
    let scope = t.scope.ok_or("ai_plan_permission")?;
    if !has_scope(&scope) {
        return Err("ai_plan_permission");
    }
    Ok(Account {
        client_id: client,
        subject: claims.sub,
        email: claims.email,
        credentials: Some(Credentials {
            access_token: t.access_token,
            refresh_token: t.refresh_token.ok_or("ai_login_invalid")?,
            id_token,
            scope,
            expires_at: Utc::now() + chrono::Duration::seconds(t.expires_in),
        }),
    })
}
async fn callback(
    State(s): State<AppState>,
    Query(q): Query<Callback>,
) -> Result<Redirect, ApiError> {
    if q.state.len() != 43 {
        return Err(failure("ai_login_invalid"));
    }
    let row:Option<(Uuid,Uuid,Vec<u8>)>=sqlx::query_as("UPDATE app.ai_login_attempts SET phase='exchanging' WHERE state_hash=$1 AND phase='launched' AND expires_at>now() RETURNING id,user_id,encrypted_data")
        .bind(hash(&q.state)).fetch_optional(&s.database).await?;
    let (id, user, bytes) = row.ok_or_else(|| failure("ai_login_expired"))?;
    let mut p: Pending = ai::open(&s, &pending_context(user, id), &bytes)?;
    let result = exchange(&mut p, &q).await;
    let error = result.as_ref().err().copied();
    p.result = result.ok();
    sqlx::query("UPDATE app.ai_login_attempts SET encrypted_data=$2,phase=$3,error_code=$4 WHERE id=$1 AND phase='exchanging'")
        .bind(id).bind(ai::seal(&s,&pending_context(user,id),&p)?).bind(if error.is_some(){"failed"}else{"ready"}).bind(error).execute(&s.database).await?;
    Ok(Redirect::to(
        s.config
            .public_url
            .join(&format!("api/ai/login/complete?id={id}"))
            .unwrap()
            .as_str(),
    ))
}
async fn complete(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    Query(q): Query<AttemptQuery>,
) -> Result<Redirect, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    let row:Option<(Vec<u8>,i64,Option<String>)>=sqlx::query_as("DELETE FROM app.ai_login_attempts WHERE id=$1 AND user_id=$2 AND phase IN ('ready','failed') AND expires_at>now() RETURNING encrypted_data,config_revision,error_code")
        .bind(q.id).bind(u.id).fetch_optional(&mut *tx).await?;
    let (bytes, revision, error) = row.ok_or_else(|| failure("ai_login_expired"))?;
    let p: Pending = ai::open(&s, &pending_context(u.id, q.id), &bytes)?;
    if p.session_hash != session_hash(&headers)? || revision != c.revision {
        return Err(ai::stale());
    }
    if let Some(code) = error {
        if p.account_id.is_none()
            && let Some(client_id) = p.registered_client
        {
            let registration = Account {
                client_id,
                subject: String::new(),
                email: None,
                credentials: None,
            };
            store_account(&s, &mut tx, u.id, q.id, &registration).await?;
        }
        tx.commit().await?;
        return Ok(Redirect::to(&format!("/ai?login_error={code}")));
    }
    let result = p.result.ok_or_else(|| failure("ai_login_invalid"))?;
    let id = p.account_id.unwrap_or_else(Uuid::new_v4);
    store_account(&s, &mut tx, u.id, id, &result).await?;
    sqlx::query("UPDATE app.ai_settings SET active_account_id=$2,provider='openai',auth_mode='login',enabled=false,revision=revision+1,updated_at=now() WHERE user_id=$1").bind(u.id).bind(id).execute(&mut *tx).await?;
    ai::invalidate(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(Redirect::to("/ai?login=connected"))
}
async fn accounts(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Value>, ApiError> {
    let rows: Vec<(Uuid, Vec<u8>)> = sqlx::query_as(
        "SELECT id,encrypted_data FROM app.ai_accounts WHERE user_id=$1 ORDER BY id",
    )
    .bind(u.id)
    .fetch_all(&s.database)
    .await?;
    let mut items = Vec::new();
    for (id, bytes) in rows {
        let a: Account = ai::open(&s, &account_context(u.id, id), &bytes)?;
        items.push(json!({"id":id,"email":a.email,"label":format!("ChatGPT · {}",&id.to_string()[..8]),"connected":a.credentials.is_some()}));
    }
    Ok(Json(json!(items)))
}
async fn select(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(ai::stale());
    }
    let a = account(&s, &mut tx, u.id, id).await?;
    if a.credentials.is_none() {
        return Err(failure("ai_login_required"));
    }
    sqlx::query("UPDATE app.ai_settings SET active_account_id=$2,provider='openai',auth_mode='login',enabled=false,revision=revision+1,updated_at=now() WHERE user_id=$1").bind(u.id).bind(id).execute(&mut *tx).await?;
    ai::invalidate(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn revoke(client: &str, refresh: &str) -> Result<(), &'static str> {
    let response = ai_provider::client(4)?
        .get("https://auth.openai.com/.well-known/openid-configuration")
        .send()
        .await
        .map_err(|_| "ai_login_unavailable")?;
    if !response.status().is_success() {
        return Err("ai_login_unavailable");
    }
    let discovery = ai_provider::bounded_json(response).await?;
    let url = Url::parse(
        discovery["revocation_endpoint"]
            .as_str()
            .ok_or("ai_login_unavailable")?,
    )
    .map_err(|_| "ai_login_unavailable")?;
    if url.scheme() != "https"
        || url.host_str() != Some("auth.openai.com")
        || url.port_or_known_default() != Some(443)
        || !url.username().is_empty()
        || url.password().is_some()
        || discovery["issuer"] != ISSUER
    {
        return Err("ai_login_unavailable");
    }
    let response = ai_provider::client(4)?
        .post(url)
        .form(&[
            ("token", refresh),
            ("token_type_hint", "refresh_token"),
            ("client_id", client),
        ])
        .send()
        .await
        .map_err(|_| "ai_login_unavailable")?;
    if response.status() == reqwest::StatusCode::OK {
        Ok(())
    } else {
        Err("ai_login_unavailable")
    }
}
async fn disconnect(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<Json<Value>, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(ai::stale());
    }
    let mut a = account(&s, &mut tx, u.id, id).await?;
    let credentials = a.credentials.take();
    store_account(&s, &mut tx, u.id, id, &a).await?;
    sqlx::query("UPDATE app.ai_settings SET enabled=CASE WHEN active_account_id=$2 AND auth_mode='login' THEN false ELSE enabled END,active_account_id=CASE WHEN active_account_id=$2 THEN NULL ELSE active_account_id END,revision=revision+1,updated_at=now() WHERE user_id=$1").bind(u.id).bind(id).execute(&mut *tx).await?;
    ai::invalidate(&mut tx, u.id).await?;
    tx.commit().await?;
    let confirmed = if let Some(token) = credentials {
        revoke(&a.client_id, &token.refresh_token).await.is_ok()
    } else {
        true
    };
    Ok(Json(json!({"remote_revoked":confirmed})))
}
pub async fn access(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<String, &'static str> {
    let mut a = account(s, db, user, id)
        .await
        .map_err(|_| "ai_login_required")?;
    let mut c = a.credentials.take().ok_or("ai_login_required")?;
    if !has_scope(&c.scope) {
        return Err("ai_plan_permission");
    }
    if c.expires_at > Utc::now() + chrono::Duration::seconds(60) {
        return Ok(c.access_token);
    }
    let result = tokens(&[
        ("grant_type", "refresh_token"),
        ("client_id", &a.client_id),
        ("refresh_token", &c.refresh_token),
        ("resource", RESOURCE),
    ])
    .await;
    let result = match result {
        Ok(t) => {
            if let Some(id_token) = &t.id_token {
                match identity(id_token, &a.client_id, None).await {
                    Ok(claims) if claims.sub == a.subject => {}
                    _ => {
                        store_account(s, db, user, id, &a)
                            .await
                            .map_err(|_| "ai_login_required")?;
                        return Err("ai_login_required");
                    }
                }
            }
            if let Some(scope) = t.scope {
                c.scope = scope;
            }
            if !has_scope(&c.scope) {
                Err("ai_plan_permission")
            } else if let Some(refresh) = t.refresh_token {
                c.access_token = t.access_token;
                c.refresh_token = refresh;
                if let Some(id_token) = t.id_token {
                    c.id_token = id_token;
                }
                c.expires_at = Utc::now() + chrono::Duration::seconds(t.expires_in);
                let key = c.access_token.clone();
                a.credentials = Some(c);
                Ok(key)
            } else {
                Err("ai_login_required")
            }
        }
        Err(_) => Err("ai_login_required"),
    };
    store_account(s, db, user, id, &a)
        .await
        .map_err(|_| "ai_login_required")?;
    result
}
async fn models(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Value>, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    let id = c
        .active_account_id
        .ok_or_else(|| failure("ai_login_required"))?;
    let token = access(&s, &mut tx, u.id, id).await;
    tx.commit().await?;
    let token = token.map_err(failure)?;
    let response = ai_provider::client(4)
        .map_err(failure)?
        .get("https://api.openai.com/v1/models")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|_| failure("ai_login_unavailable"))?;
    if !response.status().is_success() {
        return Err(failure("ai_login_required"));
    }
    let value = ai_provider::bounded_json_limit(response, 2 * 1024 * 1024)
        .await
        .map_err(failure)?;
    let models: Vec<_> = value["models"]
        .as_array()
        .ok_or_else(|| failure("ai_invalid_response"))?
        .iter()
        .filter(|m| m["visibility"] == "list")
        .filter_map(|m| Some(json!({"id":m["slug"].as_str()?,"name":m["display_name"].as_str()?})))
        .collect();
    Ok(Json(json!(models)))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn registration_and_reauthorization_preserve_host_client_and_pkce() {
        let mut p = Pending {
            state: random(),
            nonce: random(),
            verifier: random(),
            session_hash: random(),
            redirect_uri: "http://127.0.0.1:8081/api/ai/login/callback".into(),
            host_id: format!("urn:uuid:{}", Uuid::new_v4()),
            account_id: None,
            account: None,
            result: None,
            registered_client: None,
        };
        let url = authorization_url(&p);
        let params: std::collections::HashMap<_, _> = url.query_pairs().collect();
        assert_eq!(params["client_id"], "dynamic_agent_client");
        assert_eq!(params["agent_name_hint"], "LifeCycle");
        assert_eq!(
            params["code_challenge"],
            URL_SAFE_NO_PAD.encode(Sha256::digest(p.verifier.as_bytes()))
        );
        assert!(has_scope(&params["scope"]));
        p.account = Some(Account {
            client_id: "oaiapp_saved".into(),
            subject: "subject".into(),
            email: None,
            credentials: None,
        });
        let url = authorization_url(&p);
        let params: std::collections::HashMap<_, _> = url.query_pairs().collect();
        assert_eq!(params["client_id"], "oaiapp_saved");
        assert!(!params.contains_key("agent_name_hint"));
        assert_eq!(params["ext_agent_host_id"], p.host_id);
        assert!(!has_scope(
            "openid resource.invoke chatgpt.tokens.use.direct.extra"
        ));
    }
    #[tokio::test]
    async fn signed_identity_requires_matching_issuer_audience_nonce_expiry_and_key() {
        use jsonwebtoken::{EncodingKey, Header, encode};
        use rsa::{RsaPrivateKey, pkcs1::EncodeRsaPrivateKey, traits::PublicKeyParts};
        let key = RsaPrivateKey::new(&mut OsRng, 2048).unwrap();
        let jwks:JwkSet=serde_json::from_value(json!({"keys":[{"kty":"RSA","kid":"test","alg":"RS256","use":"sig","n":URL_SAFE_NO_PAD.encode(key.n().to_bytes_be()),"e":URL_SAFE_NO_PAD.encode(key.e().to_bytes_be())}]})).unwrap();
        let encoding = EncodingKey::from_rsa_der(key.to_pkcs1_der().unwrap().as_bytes());
        let mut header = Header::new(Algorithm::RS256);
        header.kid = Some("test".into());
        let now = Utc::now().timestamp();
        let claims = json!({"iss":ISSUER,"aud":["oaiapp_test"],"sub":"user","iat":now,"exp":now+3600,"nonce":"nonce"});
        let token = encode(&header, &claims, &encoding).unwrap();
        assert_eq!(
            verify_identity(&token, "oaiapp_test", Some("nonce"), &jwks)
                .await
                .unwrap()
                .sub,
            "user"
        );
        assert!(
            verify_identity(&token, "wrong", Some("nonce"), &jwks)
                .await
                .is_err()
        );
        assert!(
            verify_identity(&token, "oaiapp_test", Some("wrong"), &jwks)
                .await
                .is_err()
        );
        for (field, value) in [
            ("iss", json!("https://attacker.example")),
            ("exp", json!(now - 30)),
            ("iat", json!(now + 1000)),
            ("sub", json!("")),
        ] {
            let mut bad = claims.clone();
            bad[field] = value;
            let token = encode(&header, &bad, &encoding).unwrap();
            assert!(
                verify_identity(&token, "oaiapp_test", Some("nonce"), &jwks)
                    .await
                    .is_err()
            );
        }
        let empty = JwkSet { keys: vec![] };
        assert!(
            verify_identity(&token, "oaiapp_test", Some("nonce"), &empty)
                .await
                .is_err()
        );
    }
    #[tokio::test]
    async fn identity_rejects_unsigned_and_wrong_algorithm_tokens() {
        let jwks = JwkSet { keys: vec![] };
        assert!(
            verify_identity("eyJhbGciOiJub25lIn0.e30.", "client", Some("nonce"), &jwks)
                .await
                .is_err()
        );
        assert!(
            verify_identity(
                "eyJhbGciOiJIUzI1NiJ9.e30.signature",
                "client",
                Some("nonce"),
                &jwks
            )
            .await
            .is_err()
        );
    }
}
