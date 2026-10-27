use std::net::SocketAddr;

use axum::{
    Json, Router,
    extract::{ConnectInfo, FromRequestParts, State},
    http::{HeaderMap, HeaderValue, StatusCode, header, request::Parts},
    response::{IntoResponse, Response},
    routing::{get, post},
};
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use hmac::{Hmac, Mac};
use rand::{Rng, RngCore, rngs::OsRng};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use uuid::Uuid;

use crate::{
    error::{ApiError, ApiJson},
    mail,
    state::AppState,
};

const SESSION_SECONDS: u64 = 30 * 24 * 60 * 60;
const REQUEST_CODE: &str = r#"
local email_count = redis.call('INCR', KEYS[1])
if email_count == 1 then redis.call('EXPIRE', KEYS[1], 3600) end
local client_count = redis.call('INCR', KEYS[2])
if client_count == 1 then redis.call('EXPIRE', KEYS[2], 3600) end
if email_count > 10 or client_count > 100 then
    local email_ttl = email_count > 10 and redis.call('TTL', KEYS[1]) or 0
    local client_ttl = client_count > 100 and redis.call('TTL', KEYS[2]) or 0
    return -math.max(1, email_ttl, client_ttl)
end
if not redis.call('SET', KEYS[3], '1', 'NX', 'EX', 60) then
    return -math.max(1, redis.call('TTL', KEYS[3]))
end
redis.call('SET', KEYS[4], ARGV[1], 'EX', 600)
return 1
"#;
const VERIFY_CODE: &str = r#"
local attempts = redis.call('INCR', KEYS[2])
if attempts == 1 then redis.call('EXPIRE', KEYS[2], 600) end
if attempts > 5 then return 0 end
local actual = redis.call('GET', KEYS[1])
if actual and actual == ARGV[1] then
    redis.call('DEL', KEYS[1])
    return 1
end
return 0
"#;

#[derive(Serialize, sqlx::FromRow, Clone)]
pub struct CurrentUser {
    pub id: Uuid,
    pub email: String,
}

impl FromRequestParts<AppState> for CurrentUser {
    type Rejection = ApiError;
    async fn from_request_parts(parts: &mut Parts, state: &AppState) -> Result<Self, ApiError> {
        authenticate(state, &parts.headers).await
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EmailRequest {
    email: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct VerifyRequest {
    email: String,
    code: String,
}
#[derive(Serialize)]
struct UserResponse {
    user: CurrentUser,
}
#[derive(Serialize)]
struct MessageResponse {
    message: &'static str,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/auth/request-code", post(request_code))
        .route("/api/auth/verify-code", post(verify_code))
        .route("/api/auth/me", get(me))
        .route("/api/auth/logout", post(logout))
}

async fn request_code(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    ApiJson(body): ApiJson<EmailRequest>,
) -> Result<impl IntoResponse, ApiError> {
    let email = normalize_email(&body.email)?;
    let email_key = identifier(&state, &email);
    let client = identifier(&state, &client_address(&state, &headers, peer));
    let code = format!("{:06}", OsRng.gen_range(0..1_000_000));
    let hash = code_hash(&state, &email, &code);
    let code_key = format!("auth:code:{email_key}");
    let cooldown_key = format!("auth:cooldown:{email_key}");
    let mut connection = state.redis.get_multiplexed_async_connection().await?;
    let permitted: i32 = redis::Script::new(REQUEST_CODE)
        .key(format!("auth:request:email:{email_key}"))
        .key(format!("auth:request:client:{client}"))
        .key(&cooldown_key)
        .key(&code_key)
        .arg(&hash)
        .invoke_async(&mut connection)
        .await?;
    if permitted != 1 {
        return Err(ApiError::rate_limited((-permitted).max(1) as u64));
    }
    if let Err(error) = mail::send_code(&state.mailer, &state.config, &email, &code).await {
        let cleanup = r#"
            if redis.call('GET', KEYS[1]) == ARGV[1] then
                redis.call('DEL', KEYS[1], KEYS[2])
                return 1
            end
            return 0
        "#;
        let _: Result<i32, _> = redis::Script::new(cleanup)
            .key(&code_key)
            .key(&cooldown_key)
            .arg(&hash)
            .invoke_async(&mut connection)
            .await;
        return Err(error);
    }
    Ok((
        StatusCode::ACCEPTED,
        Json(MessageResponse {
            message: "Verification code sent",
        }),
    ))
}

async fn verify_code(
    State(state): State<AppState>,
    ConnectInfo(peer): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    ApiJson(body): ApiJson<VerifyRequest>,
) -> Result<Response, ApiError> {
    let email = normalize_email(&body.email)?;
    if body.code.len() != 6 || !body.code.bytes().all(|c| c.is_ascii_digit()) {
        return Err(ApiError::validation("Code must contain exactly six digits"));
    }
    let email_key = identifier(&state, &email);
    let client = identifier(&state, &client_address(&state, &headers, peer));
    let mut connection = state.redis.get_multiplexed_async_connection().await?;
    let client_limit = r#"
        local n = redis.call('INCR', KEYS[1])
        if n == 1 then redis.call('EXPIRE', KEYS[1], 3600) end
        return {n, redis.call('TTL', KEYS[1])}
    "#;
    let (client_count, client_ttl): (i32, i32) = redis::Script::new(client_limit)
        .key(format!("auth:verify:client:{client}"))
        .invoke_async(&mut connection)
        .await?;
    if client_count > 100 {
        return Err(ApiError::rate_limited(client_ttl.max(1) as u64));
    }
    let verified: i32 = redis::Script::new(VERIFY_CODE)
        .key(format!("auth:code:{email_key}"))
        .key(format!("auth:attempts:{email_key}"))
        .arg(code_hash(&state, &email, &body.code))
        .invoke_async(&mut connection)
        .await?;
    if verified != 1 {
        return Err(ApiError {
            status: StatusCode::UNAUTHORIZED,
            code: "invalid_code",
            message: "Code is invalid or expired",
            retry_after: None,
        });
    }
    let mut token_bytes = [0u8; 32];
    OsRng.fill_bytes(&mut token_bytes);
    let token = URL_SAFE_NO_PAD.encode(token_bytes);
    let token_hash = hex::encode(Sha256::digest(token.as_bytes()));
    let mut transaction = state.database.begin().await?;
    let user = sqlx::query_as::<_, CurrentUser>(
        "INSERT INTO app.users (id,email) VALUES ($1,$2)
         ON CONFLICT (email) DO UPDATE SET email=EXCLUDED.email
         RETURNING id,email",
    )
    .bind(Uuid::new_v4())
    .bind(&email)
    .fetch_one(&mut *transaction)
    .await?;
    sqlx::query("DELETE FROM app.sessions WHERE expires_at <= now() AND user_id = $1")
        .bind(user.id)
        .execute(&mut *transaction)
        .await?;
    sqlx::query(
        "INSERT INTO app.sessions (token_hash,user_id,expires_at)
         VALUES ($1,$2,now()+interval '30 days')",
    )
    .bind(token_hash)
    .bind(user.id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;
    let mut response = Json(UserResponse { user }).into_response();
    response.headers_mut().insert(
        header::SET_COOKIE,
        session_cookie(&state, &token, SESSION_SECONDS)?,
    );
    Ok(response)
}

async fn me(user: CurrentUser) -> Json<UserResponse> {
    Json(UserResponse { user })
}

async fn logout(State(state): State<AppState>, headers: HeaderMap) -> Result<Response, ApiError> {
    if let Some(token) = session_token(&headers) {
        sqlx::query("DELETE FROM app.sessions WHERE token_hash=$1")
            .bind(hex::encode(Sha256::digest(token.as_bytes())))
            .execute(&state.database)
            .await?;
    }
    let mut response = StatusCode::NO_CONTENT.into_response();
    response
        .headers_mut()
        .insert(header::SET_COOKIE, session_cookie(&state, "", 0)?);
    Ok(response)
}

pub async fn authenticate(state: &AppState, headers: &HeaderMap) -> Result<CurrentUser, ApiError> {
    let token = session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    sqlx::query_as::<_, CurrentUser>(
        "SELECT u.id,u.email FROM app.sessions s
         JOIN app.users u ON u.id=s.user_id
         WHERE s.token_hash=$1 AND s.expires_at>now()",
    )
    .bind(hex::encode(Sha256::digest(token.as_bytes())))
    .fetch_optional(&state.database)
    .await?
    .ok_or_else(ApiError::unauthenticated)
}

fn session_token(headers: &HeaderMap) -> Option<&str> {
    headers
        .get(header::COOKIE)?
        .to_str()
        .ok()?
        .split(';')
        .filter_map(|piece| piece.trim().split_once('='))
        .find_map(|(name, value)| {
            (name == "lifecycle_session"
                && value.len() == 43
                && value
                    .bytes()
                    .all(|b| b.is_ascii_alphanumeric() || b == b'_' || b == b'-'))
            .then_some(value)
        })
}

fn session_cookie(state: &AppState, token: &str, max_age: u64) -> Result<HeaderValue, ApiError> {
    let secure = if state.config.public_url.scheme() == "https" {
        "; Secure"
    } else {
        ""
    };
    HeaderValue::from_str(&format!(
        "lifecycle_session={token}; Path=/; HttpOnly; SameSite=Lax; Max-Age={max_age}{secure}"
    ))
    .map_err(|_| ApiError::internal())
}

fn normalize_email(email: &str) -> Result<String, ApiError> {
    let normalized = email.trim().to_ascii_lowercase();
    if normalized.len() > 254
        || !normalized.is_ascii()
        || normalized.parse::<lettre::Address>().is_err()
    {
        return Err(ApiError::validation("Invalid email address"));
    }
    Ok(normalized)
}

fn client_address(state: &AppState, headers: &HeaderMap, peer: SocketAddr) -> String {
    if state.config.trust_proxy
        && let Some(ip) = headers
            .get("x-real-ip")
            .and_then(|v| v.to_str().ok())
            .and_then(|v| v.parse::<std::net::IpAddr>().ok())
    {
        return ip.to_string();
    }
    peer.ip().to_string()
}

fn identifier(state: &AppState, value: &str) -> String {
    keyed_hash(&state.config.auth_code_secret, value)
}
fn code_hash(state: &AppState, email: &str, code: &str) -> String {
    keyed_hash(&state.config.auth_code_secret, &format!("{email}:{code}"))
}
fn keyed_hash(key: &str, value: &str) -> String {
    let mut mac = <Hmac<Sha256> as Mac>::new_from_slice(key.as_bytes())
        .expect("HMAC accepts all key lengths");
    mac.update(value.as_bytes());
    hex::encode(mac.finalize().into_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn emails_are_validated_and_canonicalized_without_display_name_injection() {
        assert_eq!(
            normalize_email(" Person@Example.org ").ok().unwrap(),
            "person@example.org"
        );
        assert!(normalize_email("Person <person@example.org>").is_err());
        assert!(normalize_email("person@example.org\r\nBcc: victim@example.org").is_err());
    }
    #[test]
    fn session_parser_rejects_malformed_tokens() {
        let mut headers = HeaderMap::new();
        headers.insert(header::COOKIE, "lifecycle_session=short".parse().unwrap());
        assert!(session_token(&headers).is_none());
        let value = format!("other=value; lifecycle_session={}; foo=bar", "a".repeat(43));
        headers.insert(header::COOKIE, value.parse().unwrap());
        assert_eq!(session_token(&headers), Some("a".repeat(43).as_str()));
    }
}
