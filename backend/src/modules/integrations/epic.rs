//! Launcher-compatible, user-initiated Epic code login. Protocol references: Legendary's EGS adapter.
//! The shared launcher client identifies the application; it is not the user's private credential.
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
    response::Redirect,
};
use chrono::{DateTime, Utc};
use rand::RngCore;
use serde::Deserialize;
use serde_json::{Value, json};
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use uuid::Uuid;
const CLIENT_ID: &str = "34a02cf8f4414e29b15921876da36f9a";
const CLIENT_SECRET: &str = "daafbccc737745039dffe53d94fc76cf";
const TOKEN_URL: &str =
    "https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token";
const LIBRARY_URL: &str =
    "https://library-service.live.use1a.on.epicgames.com/library/api/public/items";
fn digest(value: &str) -> String {
    hex::encode(Sha256::digest(value.as_bytes()))
}
fn paused(row: &Row) -> Result<(), ApiError> {
    if let Some(at) = row.retry_at.filter(|at| *at > Utc::now()) {
        return Err(ApiError::rate_limited(
            (at - Utc::now()).num_seconds().max(1) as u64,
        ));
    }
    Ok(())
}
fn invalid() -> ApiError {
    let mut error = ApiError::new(
        StatusCode::BAD_GATEWAY,
        "integration_auth_invalid",
        "Epic authorization code is invalid or expired; start a new login",
    );
    error.retry_after = Some(300);
    error
}
fn login_required() -> ApiError {
    ApiError::new(
        StatusCode::BAD_REQUEST,
        "integration_login_required",
        "Sign in to Epic again",
    )
}
pub fn login_url() -> String {
    let mut destination =
        url::Url::parse("https://www.epicgames.com/id/api/redirect").expect("static Epic URL");
    destination
        .query_pairs_mut()
        .extend_pairs([("clientId", CLIENT_ID), ("responseType", "code")]);
    let mut url = url::Url::parse("https://www.epicgames.com/id/login").expect("static Epic login");
    url.query_pairs_mut()
        .append_pair("redirectUrl", destination.as_str());
    url.into()
}
pub async fn connect(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
) -> Result<Json<Value>, ApiError> {
    let session = session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(service::context(u.id, "epic", "settings"))
        .execute(&mut *tx)
        .await?;
    if let Some(row) = service::row(s, u.id, "epic").await? {
        paused(&row)?;
    }
    let empty = service::encrypt(s, u.id, "epic", "config", &Credentials::default())?;
    sqlx::query("INSERT INTO app.integrations(user_id,provider,encrypted_config) VALUES($1,'epic',$2) ON CONFLICT DO NOTHING").bind(u.id).bind(empty).execute(&mut *tx).await?;
    let (instance, revision): (Uuid, i64) = sqlx::query_as(
        "SELECT instance_id,revision FROM app.integrations WHERE user_id=$1 AND provider='epic'",
    )
    .bind(u.id)
    .fetch_one(&mut *tx)
    .await?;
    sqlx::query("DELETE FROM app.integration_auth_attempts WHERE expires_at<now() OR (user_id=$1 AND provider='epic' AND session_hash=$2)").bind(u.id).bind(digest(session)).execute(&mut *tx).await?;
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
    sqlx::query("INSERT INTO app.integration_auth_attempts(token_hash,user_id,provider,session_hash,expires_at,integration_instance,integration_revision) VALUES($1,$2,'epic',$3,now()+interval '10 minutes',$4,$5)").bind(digest(&state)).bind(u.id).bind(digest(session)).bind(instance).bind(revision).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(json!({"url":login_url(),"state":state})))
}
pub fn code(value: &str) -> Result<String, ApiError> {
    let trimmed = value.trim();
    if trimmed.len() > 4096 {
        return Err(ApiError::validation(
            "Paste the one-time Epic authorization code",
        ));
    }
    let value = if trimmed.starts_with('{') {
        serde_json::from_str::<Value>(trimmed)
            .ok()
            .and_then(|data| data["authorizationCode"].as_str().map(str::to_owned))
            .ok_or_else(|| ApiError::validation("Paste the one-time Epic authorization code"))?
    } else {
        trimmed.trim_matches('"').to_owned()
    };
    if !(16..=512).contains(&value.len())
        || !value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"_.-".contains(&b))
    {
        return Err(ApiError::validation(
            "Paste the one-time Epic authorization code",
        ));
    }
    Ok(value)
}
async fn token(
    endpoint: &str,
    grant: &str,
    value: &str,
) -> Result<(String, EpicSession), ApiError> {
    let key = if grant == "refresh_token" {
        "refresh_token"
    } else {
        "code"
    };
    let response = http::client()?
        .post(endpoint)
        .basic_auth(CLIENT_ID, Some(CLIENT_SECRET))
        .form(&[("grant_type", grant), (key, value), ("token_type", "eg1")])
        .send()
        .await
        .map_err(|_| ApiError::unavailable())?;
    if [400, 401, 403].contains(&response.status().as_u16()) {
        return Err(if grant == "refresh_token" {
            login_required()
        } else {
            invalid()
        });
    }
    let data: Value = serde_json::from_slice(&http::bytes(response, 65536).await?)
        .map_err(|_| ApiError::unavailable())?;
    normalize_session(&data)
}
fn normalize_session(data: &Value) -> Result<(String, EpicSession), ApiError> {
    let account = data["account_id"]
        .as_str()
        .filter(|value| value.len() == 32 && value.bytes().all(|b| b.is_ascii_hexdigit()))
        .ok_or_else(ApiError::unavailable)?
        .to_owned();
    let credential = |name: &str| {
        data[name]
            .as_str()
            .filter(|value| {
                !value.is_empty()
                    && value.len() <= 16384
                    && value.bytes().all(|b| b.is_ascii_graphic())
            })
            .map(str::to_owned)
            .ok_or_else(ApiError::unavailable)
    };
    let expires_at = data["expires_at"]
        .as_str()
        .and_then(|value| value.parse::<DateTime<Utc>>().ok())
        .or_else(|| {
            data["expires_in"]
                .as_i64()
                .filter(|n| *n > 0 && *n <= 86400)
                .map(|seconds| Utc::now() + chrono::Duration::seconds(seconds))
        })
        .filter(|at| *at > Utc::now() && *at < Utc::now() + chrono::Duration::days(30))
        .ok_or_else(ApiError::unavailable)?;
    Ok((
        account,
        EpicSession {
            access_token: credential("access_token")?,
            refresh_token: credential("refresh_token")?,
            expires_at,
            display_name: data["displayName"]
                .as_str()
                .map(|name| name.chars().take(100).collect()),
        },
    ))
}
pub async fn authorize(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    ApiJson(input): ApiJson<CodeInput>,
) -> Result<Json<Vec<Integration>>, ApiError> {
    finish(&s, &u, &headers, input, TOKEN_URL).await?;
    Ok(Json(service::list(&s, u.id).await?))
}
async fn finish(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
    input: CodeInput,
    endpoint: &str,
) -> Result<(), ApiError> {
    let authorization = code(&input.code)?;
    if input.state.len() != 64 || !input.state.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err(ApiError::validation("Invalid authentication state"));
    }
    let session = session_token(headers).ok_or_else(ApiError::unauthenticated)?;
    // Serialize redemptions for this provider; a second state cannot produce parallel token requests.
    let mut lock = s.database.begin().await?;
    let acquired: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended($1,0))")
            .bind(service::context(u.id, "epic", "sync"))
            .fetch_one(&mut *lock)
            .await?;
    if !acquired {
        return Err(ApiError::rate_limited(120));
    }
    let row = service::row(s, u.id, "epic")
        .await?
        .ok_or_else(login_required)?;
    paused(&row)?;
    let consumed=sqlx::query("DELETE FROM app.integration_auth_attempts WHERE token_hash=$1 AND user_id=$2 AND provider='epic' AND session_hash=$3 AND expires_at>now() AND integration_instance=$4 AND integration_revision=$5").bind(digest(&input.state)).bind(u.id).bind(digest(session)).bind(row.instance_id).bind(row.revision).execute(&s.database).await?.rows_affected();
    if consumed != 1 {
        return Err(ApiError::validation(
            "Expired authentication state; start a new login",
        ));
    }
    let result = token(endpoint, "authorization_code", &authorization).await;
    let (account, session) = match result {
        Ok(value) => value,
        Err(error) => {
            service::record_failure(s, u.id, "epic", &row, &error, None).await?;
            return Err(error);
        }
    };
    let mut data = service::credentials(s, u.id, "epic", &row)?;
    let changed = data.account_id.as_ref() != Some(&account);
    data.account_id = Some(account);
    data.epic = None;
    data.api_key = None;
    data.epic_session = Some(session);
    let encrypted = service::encrypt(s, u.id, "epic", "config", &data)?;
    let saved=sqlx::query("UPDATE app.integrations SET encrypted_config=$4,revision=revision+1,encrypted_snapshot=CASE WHEN $5 THEN NULL ELSE encrypted_snapshot END,last_synced_at=CASE WHEN $5 THEN NULL ELSE last_synced_at END,last_error=NULL,failure_count=0,retry_at=NULL,last_attempt_at=NULL,updated_at=now() WHERE user_id=$1 AND provider='epic' AND instance_id=$2 AND revision=$3").bind(u.id).bind(row.instance_id).bind(row.revision).bind(encrypted).bind(changed).execute(&s.database).await?.rows_affected();
    if saved != 1 {
        return Err(domain::conflict(
            "Integration changed during authentication",
        ));
    }
    Ok(())
}
// Old OAuth redirects cannot create a launcher session. Existing saved settings remain removable.
pub async fn callback() -> Redirect {
    Redirect::to("/profile?integration=epic&result=failed#integrations")
}
#[derive(Deserialize)]
struct LibraryPage {
    records: Vec<Value>,
    #[serde(rename = "responseMetadata")]
    metadata: PageMetadata,
}
#[derive(Deserialize)]
struct PageMetadata {
    #[serde(rename = "nextCursor")]
    next: Option<String>,
}
pub async fn library(data: &mut Credentials) -> Result<Snapshot, ApiError> {
    library_with(data, TOKEN_URL, LIBRARY_URL).await
}
async fn library_with(
    data: &mut Credentials,
    token_endpoint: &str,
    library_endpoint: &str,
) -> Result<Snapshot, ApiError> {
    let expected = data.account_id.clone().ok_or_else(login_required)?;
    let session = data.epic_session.as_mut().ok_or_else(login_required)?;
    if session.expires_at <= Utc::now() + chrono::Duration::seconds(60) {
        let (account, renewed) =
            token(token_endpoint, "refresh_token", &session.refresh_token).await?;
        if account != expected {
            return Err(login_required());
        }
        *session = renewed;
    }
    let access = session.access_token.clone();
    let mut cursor = None;
    let mut seen = HashSet::new();
    let mut records = vec![];
    loop {
        let mut request = http::client()?
            .get(library_endpoint)
            .bearer_auth(&access)
            .query(&[("includeMetadata", "true")]);
        if let Some(cursor) = cursor.as_deref() {
            request = request.query(&[("cursor", cursor)]);
        }
        let response = request.send().await.map_err(|_| ApiError::unavailable())?;
        if [401, 403].contains(&response.status().as_u16()) {
            return Err(login_required());
        }
        let page: LibraryPage =
            serde_json::from_slice(&http::bytes(response, 8 * 1024 * 1024).await?)
                .map_err(|_| ApiError::unavailable())?;
        records.extend(page.records);
        if records.len() > 30000 {
            return Err(ApiError::unavailable());
        }
        cursor = page.metadata.next.filter(|value| !value.is_empty());
        let Some(next) = cursor.as_ref() else { break };
        if next.len() > 2048 || !seen.insert(next.clone()) || seen.len() > 100 {
            return Err(ApiError::unavailable());
        }
        // One bounded stream per account, no per-game metadata fan-out.
        tokio::time::sleep(std::time::Duration::from_millis(300)).await;
    }
    normalize_library(records)
}
pub fn normalize_library(records: Vec<Value>) -> Result<Snapshot, ApiError> {
    let mut ids = HashSet::new();
    let mut games = vec![];
    for row in records {
        if row["appName"] == "1" {
            continue;
        }
        let Some(namespace) = row["namespace"]
            .as_str()
            .filter(|value| !value.is_empty() && value.len() < 128)
        else {
            return Err(ApiError::unavailable());
        };
        if namespace == "ue"
            || row["sandboxType"] == "PRIVATE"
            || row["metadata"]["isDlc"] == true
            || row["metadata"]["mainGameItem"].is_object()
        {
            continue;
        }
        let Some(item) = row["catalogItemId"]
            .as_str()
            .filter(|value| !value.is_empty() && value.len() < 128)
        else {
            return Err(ApiError::unavailable());
        };
        let id = format!("{namespace}:{item}");
        if !ids.insert(id.clone()) {
            continue;
        }
        let metadata = &row["metadata"];
        let name = metadata["title"]
            .as_str()
            .or_else(|| metadata["displayName"].as_str())
            .or_else(|| row["title"].as_str())
            .or_else(|| row["sandboxName"].as_str())
            .or_else(|| row["appName"].as_str())
            .filter(|name| !name.trim().is_empty())
            .map(|name| name.chars().take(300).collect::<String>())
            .unwrap_or_else(|| format!("Epic Games · {item}"));
        let slug = metadata["productSlug"]
            .as_str()
            .or_else(|| {
                metadata
                    .pointer("/customAttributes/com.epicgames.app.productSlug/value")
                    .and_then(Value::as_str)
            })
            .filter(|slug| {
                !slug.is_empty()
                    && slug.len() < 300
                    && slug
                        .chars()
                        .all(|c| c.is_ascii_alphanumeric() || "_-/".contains(c))
            });
        let mut url =
            url::Url::parse("https://store.epicgames.com/browse").expect("static store URL");
        if let Some(slug) = slug {
            url.set_path(&format!("/p/{slug}"));
        } else {
            url.query_pairs_mut().append_pair("q", &name);
        }
        let image_url = metadata["keyImages"]
            .as_array()
            .and_then(|images| {
                images
                    .iter()
                    .find(|image| image["type"] == "OfferImageWide")
                    .or_else(|| images.first())
            })
            .and_then(|image| image["url"].as_str())
            .filter(|url| url.len() < 2000)
            .map(str::to_owned);
        games.push(Game {
            provider: "epic".into(),
            id,
            name,
            playtime_minutes: None,
            recent_minutes: None,
            last_played_at: None,
            store_url: url.into(),
            preview: None,
            image_url,
        });
    }
    Ok(Snapshot {
        games,
        recent_available: false,
        playtime_available: false,
    })
}
#[cfg(test)]
pub(crate) async fn finish_for_test(
    s: &AppState,
    u: &CurrentUser,
    headers: &HeaderMap,
    input: CodeInput,
    endpoint: &str,
) -> Result<(), ApiError> {
    finish(s, u, headers, input, endpoint).await
}
#[cfg(test)]
mod tests {
    use super::*;
    use axum::{
        Router,
        extract::Query,
        routing::{get, post},
    };
    use std::sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    };
    #[test]
    fn code_login_accepts_only_one_time_codes_and_fixed_epic_destinations() {
        assert_eq!(
            code("  0123456789abcdef0123456789abcdef  ").unwrap(),
            "0123456789abcdef0123456789abcdef"
        );
        assert_eq!(
            code(r#"{"authorizationCode":"0123456789abcdef0123456789abcdef","sid":"ignored"}"#)
                .unwrap(),
            "0123456789abcdef0123456789abcdef"
        );
        for value in [
            "",
            "https://evil.test/code",
            r#"{"access_token":"not-an-auth-code"}"#,
        ] {
            assert!(code(value).is_err());
        }
        let url = url::Url::parse(&login_url()).unwrap();
        assert_eq!(
            url.origin().ascii_serialization(),
            "https://www.epicgames.com"
        );
        assert_eq!(url.path(), "/id/login");
        let redirect = url
            .query_pairs()
            .find(|(key, _)| key == "redirectUrl")
            .unwrap()
            .1
            .into_owned();
        let redirect = url::Url::parse(&redirect).unwrap();
        assert_eq!(redirect.host_str(), Some("www.epicgames.com"));
        assert_eq!(redirect.path(), "/id/api/redirect");
    }
    #[test]
    fn epic_library_never_invents_playtime_or_merges_ids_across_namespaces() {
        let snapshot = normalize_library(vec![
            json!({"namespace":"one","catalogItemId":"game","appName":"A","metadata":{"title":"Game A"}}),
            json!({"namespace":"two","catalogItemId":"game","appName":"B"}),
            json!({"namespace":"one","catalogItemId":"game","appName":"duplicate"}),
            json!({"namespace":"ue","catalogItemId":"engine"}),
            json!({"namespace":"private","catalogItemId":"test","sandboxType":"PRIVATE"}),
        ]).unwrap();
        assert!(normalize_library(vec![json!({"unexpected":"schema"})]).is_err());
        assert_eq!(snapshot.games.len(), 2);
        assert_eq!(snapshot.games[0].id, "one:game");
        assert!(!snapshot.recent_available && !snapshot.playtime_available);
        assert!(
            snapshot
                .games
                .iter()
                .all(|game| game.playtime_minutes.is_none() && game.recent_minutes.is_none())
        );
        assert_eq!(snapshot.games[0].name, "Game A");
    }
    #[tokio::test]
    async fn epic_refresh_rotation_pagination_and_rate_limits_preserve_session_and_complete_snapshots()
     {
        let calls = Arc::new(AtomicUsize::new(0));
        let calls2 = calls.clone();
        let app=Router::new().route("/token",post(move ||{let calls=calls2.clone();async move{calls.fetch_add(1,Ordering::SeqCst);Json(json!({"account_id":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","access_token":"new-access","refresh_token":"new-refresh","expires_in":3600,"displayName":"Player"}))}}))
   .route("/library",get(|headers:HeaderMap,Query(query):Query<std::collections::HashMap<String,String>>|async move{assert_eq!(headers["authorization"],"Bearer new-access");assert_eq!(query.get("includeMetadata").unwrap(),"true");if query.contains_key("cursor"){Json(json!({"records":[{"namespace":"second","catalogItemId":"b","appName":"B"}],"responseMetadata":{}}))}else{Json(json!({"records":[{"namespace":"first","catalogItemId":"a","appName":"A"}],"responseMetadata":{"nextCursor":"page-2"}}))}}))
   .route("/limited",get(||async{(StatusCode::TOO_MANY_REQUESTS,[("retry-after","900")],"limited")}));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let endpoint = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move {
            axum::serve(listener, app).await.unwrap();
        });
        let mut data = Credentials {
            account_id: Some("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa".into()),
            epic_session: Some(EpicSession {
                access_token: "old-access".into(),
                refresh_token: "old-refresh".into(),
                expires_at: Utc::now() - chrono::Duration::minutes(1),
                display_name: None,
            }),
            ..Default::default()
        };
        let snapshot = library_with(
            &mut data,
            &format!("{endpoint}/token"),
            &format!("{endpoint}/library"),
        )
        .await
        .unwrap();
        assert_eq!(snapshot.games.len(), 2);
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(
            data.epic_session.as_ref().unwrap().refresh_token,
            "new-refresh"
        );
        let error = library_with(
            &mut data,
            &format!("{endpoint}/token"),
            &format!("{endpoint}/limited"),
        )
        .await
        .err()
        .unwrap();
        assert_eq!(error.retry_after, Some(900));
        assert_eq!(calls.load(Ordering::SeqCst), 1);
        assert_eq!(
            data.epic_session.as_ref().unwrap().refresh_token,
            "new-refresh"
        );
        server.abort();
    }
}
