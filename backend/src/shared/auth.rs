use axum::{
    extract::FromRequestParts,
    http::{HeaderMap, HeaderValue, header, request::Parts},
};

use serde::Serialize;

use sha2::{Digest, Sha256};

use uuid::Uuid;

use crate::{infrastructure::state::AppState, shared::errors::ApiError};

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

pub(crate) fn session_token(headers: &HeaderMap) -> Option<&str> {
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

pub(crate) fn session_cookie(
    state: &AppState,
    token: &str,
    max_age: u64,
) -> Result<HeaderValue, ApiError> {
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
