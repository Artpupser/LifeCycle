//! Battle.net identity uses the official OAuth discovery endpoints.
use super::{http, service};
use crate::{
    infrastructure::state::AppState,
    shared::{
        auth::{CurrentUser, session_token},
        domain,
        errors::ApiError,
    },
};
use axum::{
    Json,
    extract::{Query, State},
    http::HeaderMap,
    response::Redirect,
};
use serde::Deserialize;
use sha2::{Digest, Sha256};
use uuid::Uuid;
fn digest(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
fn redirect_uri(s: &AppState) -> String {
    s.config
        .public_url
        .join("api/integrations/battlenet/callback")
        .expect("static callback")
        .into()
}
pub async fn connect(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let row = service::row(s, u.id, "battlenet")
        .await?
        .ok_or_else(|| ApiError::validation("Configure Battle.net OAuth client first"))?;
    let data = service::credentials(s, u.id, "battlenet", &row)?;
    let client = data
        .battlenet
        .ok_or_else(|| ApiError::validation("Configure Battle.net OAuth client first"))?;
    let state = service::authorization_attempt(s, u, headers, "battlenet").await?;
    let mut url =
        url::Url::parse("https://oauth.battle.net/authorize").expect("official OAuth endpoint");
    url.query_pairs_mut().extend_pairs([
        ("client_id", client.client_id.as_str()),
        ("redirect_uri", redirect_uri(s).as_str()),
        ("response_type", "code"),
        ("scope", "openid"),
        ("state", state.as_str()),
    ]);
    Ok(Json(serde_json::json!({"url":url.as_str()})))
}
#[derive(Deserialize)]
pub struct Callback {
    state: Option<String>,
    code: Option<String>,
}
#[derive(Deserialize)]
struct Token {
    access_token: String,
}
#[derive(Deserialize)]
struct Identity {
    id: u64,
    battletag: Option<String>,
}
async fn finish(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
    input: Callback,
) -> Result<(), ApiError> {
    let state = input
        .state
        .filter(|v| v.len() == 64 && v.bytes().all(|b| b.is_ascii_hexdigit()))
        .ok_or_else(|| ApiError::validation("Invalid OAuth state"))?;
    let code = input
        .code
        .filter(|v| !v.is_empty() && v.len() <= 2048)
        .ok_or_else(|| ApiError::validation("Missing authorization code"))?;
    let session = session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    // Consume once, bound to this session, then compare the integration revision before writing.
    let attempt:Option<(Uuid,i64)>=sqlx::query_as("DELETE FROM app.integration_auth_attempts WHERE token_hash=$1 AND user_id=$2 AND provider='battlenet' AND session_hash=$3 AND expires_at>now() RETURNING integration_instance,integration_revision").bind(digest(&state)).bind(u.id).bind(digest(session)).fetch_optional(&s.database).await?;
    let (instance, revision) =
        attempt.ok_or_else(|| ApiError::validation("Expired OAuth state"))?;
    let row = service::row(s, u.id, "battlenet")
        .await?
        .ok_or_else(domain::not_found)?;
    if row.instance_id != instance || row.revision != revision {
        return Err(domain::conflict("Integration changed during authorization"));
    }
    let mut data = service::credentials(s, u.id, "battlenet", &row)?;
    let client = data
        .battlenet
        .as_ref()
        .ok_or_else(|| ApiError::validation("Missing OAuth client"))?;
    let result = async {
        let token: Token = http::json(
            http::client()?
                .post("https://oauth.battle.net/token")
                .basic_auth(&client.client_id, Some(&client.client_secret))
                .form(&[
                    ("grant_type", "authorization_code"),
                    ("code", &code),
                    ("redirect_uri", &redirect_uri(s)),
                ]),
            16384,
        )
        .await?;
        if token.access_token.len() > 8192 {
            return Err(ApiError::unavailable());
        }
        let identity: Identity = http::json(
            http::client()?
                .get("https://oauth.battle.net/userinfo")
                .bearer_auth(token.access_token),
            16384,
        )
        .await?;
        if identity.id == 0 {
            return Err(ApiError::unavailable());
        }
        Ok::<_, ApiError>(identity)
    }
    .await;
    let identity = match result {
        Ok(identity) => identity,
        Err(error) => {
            service::record_failure(s, u.id, "battlenet", &row, &error, None).await?;
            return Err(error);
        }
    };
    data.account_id = Some(identity.id.to_string());
    data.battle_tag = identity.battletag.map(|v| v.chars().take(128).collect());
    let bytes = service::encrypt(s, u.id, "battlenet", "config", &data)?;
    let updated=sqlx::query("UPDATE app.integrations SET encrypted_config=$4,revision=revision+1,last_error=NULL,failure_count=0,retry_at=NULL,updated_at=now() WHERE user_id=$1 AND provider='battlenet' AND instance_id=$2 AND revision=$3").bind(u.id).bind(instance).bind(revision).bind(bytes).execute(&s.database).await?.rows_affected();
    if updated == 0 {
        return Err(domain::conflict("Integration changed during authorization"));
    }
    Ok(())
}
pub async fn callback(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    Query(input): Query<Callback>,
) -> Redirect {
    let result = if finish(&s, &u, &headers, input).await.is_ok() {
        "connected"
    } else {
        "failed"
    };
    Redirect::to(&format!(
        "/profile?integration=battlenet&result={result}#integrations"
    ))
}
