use super::models::{
    Account, Callback, Claims, Credentials, ISSUER, PLAN_SCOPE, Pending, RESOURCE, TOKEN_URL,
    TokenResponse,
};
use crate::{
    infrastructure::state::AppState, modules::ai, modules::ai::providers::responses as ai_provider,
    shared::auth, shared::errors::ApiError,
};
use axum::http::{HeaderMap, StatusCode};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::Utc;
use jsonwebtoken::{Algorithm, DecodingKey, Validation, decode, decode_header, jwk::JwkSet};
use rand::{RngCore, rngs::OsRng};
use sha2::{Digest, Sha256};
use sqlx::PgConnection;
use url::Url;
use uuid::Uuid;

pub(super) fn failure(code: &'static str) -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        code,
        "ChatGPT connection could not be completed",
    )
}

pub(super) fn random() -> String {
    let mut bytes = [0u8; 32];
    OsRng.fill_bytes(&mut bytes);
    URL_SAFE_NO_PAD.encode(bytes)
}

pub(super) fn hash(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}

pub(super) fn session_hash(headers: &HeaderMap) -> Result<String, ApiError> {
    auth::session_token(headers)
        .map(hash)
        .ok_or_else(ApiError::unauthenticated)
}

pub fn available(s: &AppState) -> bool {
    let url = &s.config.public_url;
    url.scheme() == "http" && matches!(url.host_str(), Some("localhost" | "127.0.0.1"))
}

pub(super) fn redirect_uri(s: &AppState) -> String {
    let mut url = s.config.public_url.clone();
    url.set_host(Some("127.0.0.1")).unwrap();
    url.set_path("/api/ai/login/callback");
    url.to_string()
}

pub(super) fn account_context(user: Uuid, id: Uuid) -> String {
    format!("ai:account:{user}:{id}")
}

pub(super) fn pending_context(user: Uuid, id: Uuid) -> String {
    format!("ai:login:{user}:{id}")
}

pub(super) async fn account(
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
    .ok_or_else(crate::shared::domain::not_found)?;
    ai::open(s, &account_context(user, id), &bytes)
}

pub(super) async fn store_account(
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

pub(super) fn authorization_url(p: &Pending) -> Url {
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

pub(super) async fn verify_identity(
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

pub(super) async fn identity(
    token: &str,
    client: &str,
    nonce: Option<&str>,
) -> Result<Claims, &'static str> {
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

pub(super) async fn tokens(form: &[(&str, &str)]) -> Result<TokenResponse, &'static str> {
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

pub(super) fn has_scope(scope: &str) -> bool {
    scope.split_ascii_whitespace().any(|s| s == PLAN_SCOPE)
}

pub(super) async fn exchange(p: &mut Pending, q: &Callback) -> Result<Account, &'static str> {
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

pub(super) async fn revoke(client: &str, refresh: &str) -> Result<(), &'static str> {
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
