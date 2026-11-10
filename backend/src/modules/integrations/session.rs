//! User-session adapters share the existing integration attempt and persistence lifecycle.
use super::{http, models::*, service};
use crate::{
    infrastructure::state::AppState,
    shared::{
        auth::{CurrentUser, session_token},
        domain,
        errors::{ApiError, ApiJson},
    },
};
use axum::{
    Json,
    extract::State,
    http::{HeaderMap, StatusCode},
};
use chrono::Utc;
use serde::de::DeserializeOwned;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

pub fn required() -> ApiError {
    ApiError::new(
        StatusCode::BAD_REQUEST,
        "integration_session_required",
        "Sign in to the game platform again",
    )
}
pub fn secret(value: &str) -> Result<String, ApiError> {
    if value.is_empty() || value.len() > 16384 || !value.bytes().all(|byte| byte.is_ascii_graphic())
    {
        return Err(ApiError::validation("Invalid session credential"));
    }
    Ok(value.to_owned())
}
/// Provider authentication failures must never expire the LifeCycle session.
pub async fn json_response<T: DeserializeOwned>(
    request: reqwest::RequestBuilder,
    limit: usize,
) -> Result<T, ApiError> {
    let response = request.send().await.map_err(|_| ApiError::unavailable())?;
    if response.status() == reqwest::StatusCode::UNAUTHORIZED {
        return Err(required());
    }
    if response.status() == reqwest::StatusCode::FORBIDDEN {
        return Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "integration_access_denied",
            "The platform denied access to this data",
        ));
    }
    serde_json::from_slice(&http::bytes(response, limit).await?)
        .map_err(|_| ApiError::unavailable())
}
pub async fn connect(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
    provider: &str,
) -> Result<Json<Value>, ApiError> {
    let state = service::authorization_attempt(s, u, headers, provider).await?;
    let url = match provider {
        "xbox" => super::xbox::login_url(&state),
        "playstation" => "https://www.playstation.com/".into(),
        _ => return Err(domain::not_found()),
    };
    Ok(Json(json!({"url":url,"state":state})))
}
pub async fn authorize_xbox(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    ApiJson(input): ApiJson<CodeInput>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    authorize(s, u, headers, input, "xbox").await
}
pub async fn authorize_playstation(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    ApiJson(input): ApiJson<CodeInput>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    authorize(s, u, headers, input, "playstation").await
}
async fn authorize(
    s: AppState,
    u: CurrentUser,
    headers: HeaderMap,
    input: CodeInput,
    provider: &'static str,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    // The same bounded continuation used by library sync keeps slow provider exchanges alive.
    let mut job = tokio::spawn(async move { finish(&s, &u, &headers, input, provider).await });
    match tokio::time::timeout(std::time::Duration::from_secs(7), &mut job).await {
        Ok(result) => {
            result.map_err(|_| ApiError::internal())??;
            Ok((StatusCode::OK, Json(json!({"pending":false}))))
        }
        Err(_) => Ok((StatusCode::ACCEPTED, Json(json!({"pending":true})))),
    }
}
async fn finish(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
    input: CodeInput,
    provider: &str,
) -> Result<(), ApiError> {
    if input.code.len() > 16384 || input.code.trim().is_empty() {
        return Err(ApiError::validation("Enter the platform session"));
    }
    match provider {
        "xbox" => {
            super::xbox::browser_session(&input.code, &input.state)?;
        }
        "playstation" => {
            super::playstation::npsso(&input.code)?;
        }
        _ => return Err(domain::not_found()),
    }
    let mut guard = s.database.begin().await?;
    let acquired: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended($1,0))")
            .bind(service::context(u.id, provider, "sync"))
            .fetch_one(&mut *guard)
            .await?;
    if !acquired {
        return Err(ApiError::rate_limited(120));
    }
    let row = service::row(s, u.id, provider)
        .await?
        .ok_or_else(required)?;
    if let Some(at) = row.retry_at.filter(|at| *at > Utc::now()) {
        return Err(ApiError::rate_limited(
            (at - Utc::now()).num_seconds().max(1) as u64,
        ));
    }
    service::consume_authorization(s, u, headers, provider, &row, &input.state).await?;
    sqlx::query("UPDATE app.integrations SET authorization_started_at=now(),last_attempt_at=NULL,last_error=NULL WHERE user_id=$1 AND provider=$2 AND instance_id=$3 AND revision=$4").bind(u.id).bind(provider).bind(row.instance_id).bind(row.revision).execute(&s.database).await?;
    let action = async {
        match provider {
            "xbox" => super::xbox::login(&input.code, &input.state).await,
            "playstation" => super::playstation::login(&input.code).await,
            _ => Err(domain::not_found()),
        }
    };
    let result = tokio::time::timeout(std::time::Duration::from_secs(90), action)
        .await
        .unwrap_or_else(|_| Err(ApiError::unavailable()));
    let (account, tokens) = match result {
        Ok(session) => session,
        Err(error) => {
            service::record_failure(s, u.id, provider, &row, &error, None).await?;
            return Err(error);
        }
    };
    // Logging out in the initiating browser also cancels a still-running login job.
    let browser_session = session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    let active:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.sessions WHERE token_hash=$1 AND user_id=$2 AND expires_at>now())").bind(hex::encode(Sha256::digest(browser_session.as_bytes()))).bind(u.id).fetch_one(&s.database).await?;
    if !active {
        sqlx::query("UPDATE app.integrations SET authorization_started_at=NULL WHERE user_id=$1 AND provider=$2 AND instance_id=$3 AND revision=$4").bind(u.id).bind(provider).bind(row.instance_id).bind(row.revision).execute(&s.database).await?;
        return Err(ApiError::unauthenticated());
    }
    let mut data = service::credentials(s, u.id, provider, &row)?;
    let changed = data.account_id.as_ref() != Some(&account);
    data.account_id = Some(account);
    data.sessions.insert(provider.into(), tokens);
    let encrypted = service::encrypt(s, u.id, provider, "config", &data)?;
    let saved=sqlx::query("UPDATE app.integrations SET encrypted_config=$4,revision=revision+1,encrypted_snapshot=CASE WHEN $5 THEN NULL ELSE encrypted_snapshot END,last_synced_at=CASE WHEN $5 THEN NULL ELSE last_synced_at END,authorization_started_at=NULL,last_attempt_at=NULL,last_error=NULL,failure_count=0,retry_at=NULL,updated_at=now() WHERE user_id=$1 AND provider=$2 AND instance_id=$3 AND revision=$6").bind(u.id).bind(provider).bind(row.instance_id).bind(encrypted).bind(changed).bind(row.revision).execute(&s.database).await?.rows_affected();
    if saved != 1 {
        return Err(domain::conflict("Integration changed during authorization"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[tokio::test]
    async fn platform_session_failures_preserve_the_application_login_and_retry_after() {
        use axum::{Router, routing::get};
        let app = Router::new()
            .route("/expired", get(|| async { StatusCode::UNAUTHORIZED }))
            .route("/private", get(|| async { StatusCode::FORBIDDEN }))
            .route(
                "/limited",
                get(|| async {
                    (
                        StatusCode::TOO_MANY_REQUESTS,
                        [("retry-after", "900")],
                        "limited",
                    )
                }),
            );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let client = http::client().unwrap();
        let error = json_response::<Value>(client.get(format!("{base}/expired")), 1024)
            .await
            .unwrap_err();
        assert_eq!(error.status, StatusCode::BAD_REQUEST);
        assert_eq!(error.code, "integration_session_required");
        let error = json_response::<Value>(client.get(format!("{base}/private")), 1024)
            .await
            .unwrap_err();
        assert_eq!(error.status, StatusCode::BAD_REQUEST);
        assert_eq!(error.code, "integration_access_denied");
        let error = json_response::<Value>(client.get(format!("{base}/limited")), 1024)
            .await
            .unwrap_err();
        assert_eq!(error.status, StatusCode::TOO_MANY_REQUESTS);
        assert_eq!(error.retry_after, Some(900));
        server.abort();
    }
}
