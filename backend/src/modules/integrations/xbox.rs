//! Microsoft browser session -> Xbox Live. No Microsoft password is collected.
use super::{
    http,
    models::{Credentials, Game, SessionTokens, Snapshot},
    session,
};
use crate::shared::errors::ApiError;
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::HashSet;
const CLIENT: &str = "000000004C12AE6F";
const SCOPE: &str = "service::user.auth.xboxlive.com::MBI_SSL";
const DESKTOP: &str = "https://login.live.com/oauth20_desktop.srf";
const TOKEN: &str = "https://login.live.com/oauth20_token.srf";
pub fn login_url(state: &str) -> String {
    let mut url = url::Url::parse("https://login.live.com/oauth20_authorize.srf")
        .expect("Microsoft OAuth URL");
    url.query_pairs_mut().extend_pairs([
        ("client_id", CLIENT),
        ("redirect_uri", DESKTOP),
        ("response_type", "token"),
        ("scope", SCOPE),
        ("state", state),
        ("prompt", "select_account"),
    ]);
    url.into()
}
pub fn browser_session(input: &str, state: &str) -> Result<SessionTokens, ApiError> {
    if input.len() > 16384 {
        return Err(ApiError::validation("Invalid Microsoft redirect"));
    }
    let url = url::Url::parse(input.trim())
        .map_err(|_| ApiError::validation("Paste the complete Microsoft redirect URL"))?;
    if url.origin().ascii_serialization() != "https://login.live.com"
        || url.path() != "/oauth20_desktop.srf"
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(ApiError::validation("Invalid Microsoft redirect"));
    }
    let pairs: Vec<_> =
        url::form_urlencoded::parse(url.fragment().unwrap_or("").as_bytes()).collect();
    let get = |key: &str| -> Result<String, ApiError> {
        let values: Vec<_> = pairs.iter().filter(|(name, _)| name == key).collect();
        if values.len() != 1 {
            return Err(ApiError::validation(
                "Missing or repeated Microsoft redirect field",
            ));
        }
        Ok(values[0].1.to_string())
    };
    if get("state")? != state {
        return Err(ApiError::validation(
            "Microsoft login does not match this attempt",
        ));
    }
    let access_token = session::secret(&get("access_token")?)?;
    let seconds = get("expires_in")?
        .parse::<i64>()
        .ok()
        .filter(|seconds| (1..=604800).contains(seconds))
        .ok_or_else(|| ApiError::validation("Invalid Microsoft session expiry"))?;
    let refresh_token = pairs
        .iter()
        .find(|(key, _)| key == "refresh_token")
        .map(|(_, value)| session::secret(value))
        .transpose()?
        .unwrap_or_default();
    Ok(SessionTokens {
        access_token,
        refresh_token,
        expires_at: Utc::now() + chrono::Duration::seconds(seconds.min(86400)),
        display_name: None,
    })
}
struct Authorization {
    header: String,
    account: String,
    name: Option<String>,
}
async fn authorization(tokens: &SessionTokens) -> Result<Authorization, ApiError> {
    let client = http::client()?;
    let user:Value=session::json_response(client.post("https://user.auth.xboxlive.com/user/authenticate").header("x-xbl-contract-version","1").json(&json!({"RelyingParty":"http://auth.xboxlive.com","TokenType":"JWT","Properties":{"AuthMethod":"RPS","SiteName":"user.auth.xboxlive.com","RpsTicket":tokens.access_token}})),32768).await?;
    let user_token = session::secret(user["Token"].as_str().ok_or_else(session::required)?)?;
    let xsts:Value=session::json_response(client.post("https://xsts.auth.xboxlive.com/xsts/authorize").header("x-xbl-contract-version","1").json(&json!({"RelyingParty":"http://xboxlive.com","TokenType":"JWT","Properties":{"UserTokens":[user_token],"SandboxId":"RETAIL"}})),65536).await?;
    let token = session::secret(xsts["Token"].as_str().ok_or_else(session::required)?)?;
    let hash = xsts
        .pointer("/DisplayClaims/xui/0/uhs")
        .and_then(Value::as_str)
        .filter(|value| {
            !value.is_empty()
                && value.len() < 128
                && value.bytes().all(|byte| byte.is_ascii_alphanumeric())
        })
        .ok_or_else(session::required)?;
    let header = format!("XBL3.0 x={hash};{token}");
    let profile: Value = session::json_response(
        client
            .get("https://profile.xboxlive.com/users/me/profile/settings")
            .query(&[("settings", "Gamertag")])
            .header("Authorization", &header)
            .header("x-xbl-contract-version", "2"),
        65536,
    )
    .await?;
    let row = profile
        .pointer("/profileUsers/0")
        .ok_or_else(session::required)?;
    let account = row["id"]
        .as_str()
        .filter(|id| {
            !id.is_empty() && id.len() <= 20 && id.bytes().all(|byte| byte.is_ascii_digit())
        })
        .ok_or_else(session::required)?
        .to_owned();
    let name = row["settings"]
        .as_array()
        .and_then(|settings| settings.iter().find(|field| field["id"] == "Gamertag"))
        .and_then(|field| field["value"].as_str())
        .map(|name| name.chars().take(100).collect());
    Ok(Authorization {
        header,
        account,
        name,
    })
}
pub async fn login(input: &str, state: &str) -> Result<(String, SessionTokens), ApiError> {
    let mut tokens = browser_session(input, state)?;
    let user = authorization(&tokens).await?;
    tokens.display_name = user.name;
    Ok((user.account, tokens))
}
async fn refresh(tokens: &mut SessionTokens) -> Result<(), ApiError> {
    if tokens.expires_at > Utc::now() + chrono::Duration::seconds(60) {
        return Ok(());
    }
    if tokens.refresh_token.is_empty() {
        return Err(session::required());
    }
    #[derive(Deserialize)]
    struct Refresh {
        access_token: String,
        refresh_token: Option<String>,
        expires_in: i64,
    }
    let response: Refresh = session::json_response(
        http::client()?.post(TOKEN).form(&[
            ("grant_type", "refresh_token"),
            ("client_id", CLIENT),
            ("scope", SCOPE),
            ("refresh_token", &tokens.refresh_token),
        ]),
        32768,
    )
    .await?;
    if !(1..=604800).contains(&response.expires_in) {
        return Err(ApiError::unavailable());
    }
    tokens.access_token = session::secret(&response.access_token)?;
    if let Some(value) = response.refresh_token {
        tokens.refresh_token = session::secret(&value)?;
    }
    tokens.expires_at = Utc::now() + chrono::Duration::seconds(response.expires_in);
    Ok(())
}
pub fn history(data: &Value) -> Result<Vec<Game>, ApiError> {
    let rows = data["titles"]
        .as_array()
        .ok_or_else(ApiError::unavailable)?;
    let mut games = vec![];
    for row in rows {
        if row["type"]
            .as_str()
            .is_some_and(|kind| !kind.eq_ignore_ascii_case("Game"))
        {
            continue;
        }
        let id = row["titleId"]
            .as_str()
            .filter(|id| {
                !id.is_empty() && id.len() < 128 && id.bytes().all(|byte| byte.is_ascii_digit())
            })
            .ok_or_else(ApiError::unavailable)?;
        let name = row["name"]
            .as_str()
            .filter(|name| !name.trim().is_empty() && name.len() <= 1200)
            .ok_or_else(ApiError::unavailable)?;
        let product = row["productId"]
            .as_str()
            .filter(|id| id.len() == 12 && id.bytes().all(|byte| byte.is_ascii_alphanumeric()));
        let mut url = url::Url::parse("https://www.xbox.com/search").expect("Xbox search URL");
        if let Some(product) = product {
            url.set_path(&format!("/games/store/-/{product}"));
        } else {
            url.query_pairs_mut().append_pair("q", name);
        }
        let wide = row["images"]
            .as_array()
            .into_iter()
            .flatten()
            .filter(|image| image["type"] == "WideHeroArtwork" || image["type"] == "SuperHeroArt")
            .filter_map(|image| image["url"].as_str());
        let image = crate::modules::media::provider::catalog_image(
            wide.chain(row["displayImage"].as_str()),
        );
        games.push(Game {
            provider: "xbox".into(),
            ownership_verified: false,
            id: product.unwrap_or(id).into(),
            name: name.chars().take(300).collect(),
            playtime_minutes: None,
            recent_minutes: None,
            last_played_at: row
                .pointer("/titleHistory/lastTimePlayed")
                .and_then(Value::as_str)
                .and_then(|value| value.parse::<DateTime<Utc>>().ok()),
            store_url: url.into(),
            preview: None,
            image_url: image,
        });
    }
    Ok(games)
}
pub async fn library(data: &mut Credentials) -> Result<Snapshot, ApiError> {
    let tokens = data
        .sessions
        .get_mut("xbox")
        .ok_or_else(session::required)?;
    refresh(tokens).await?;
    let user = authorization(tokens).await?;
    if data.account_id.as_deref() != Some(user.account.as_str()) {
        return Err(session::required());
    }
    tokens.display_name = user.name;
    let client = http::client()?;
    let mut next: Option<String> = None;
    let mut cursors = HashSet::new();
    let mut games = vec![];
    for _ in 0..30 {
        let url = format!(
            "https://titlehub.xboxlive.com/users/xuid({})/titles/titlehistory/decoration/image,detail,productId",
            user.account
        );
        let mut request = client
            .get(url)
            .query(&[("maxItems", "1000")])
            .header("Authorization", &user.header)
            .header("x-xbl-contract-version", "2")
            .header("x-xbl-client-name", "XboxApp")
            .header("x-xbl-client-type", "UWA")
            .header("Accept-Language", "en-US");
        if let Some(token) = &next {
            request = request.query(&[("continuationToken", token)]);
        }
        let page: Value = session::json_response(request, 4 * 1024 * 1024).await?;
        games.extend(history(&page)?);
        if games.len() > 30000 {
            return Err(ApiError::unavailable());
        }
        next = page
            .pointer("/pagingInfo/continuationToken")
            .or_else(|| page.get("continuationToken"))
            .and_then(Value::as_str)
            .filter(|value| !value.is_empty())
            .map(str::to_owned);
        if let Some(token) = &next {
            if token.len() > 4096 || !cursors.insert(token.clone()) {
                return Err(ApiError::unavailable());
            }
        } else {
            if page
                .pointer("/pagingInfo/totalRecords")
                .and_then(Value::as_u64)
                .is_some_and(|total| total > games.len() as u64)
            {
                return Err(ApiError::unavailable());
            }
            let mut ids = HashSet::new();
            games.retain(|game| ids.insert(game.id.clone()));
            return Ok(Snapshot {
                games,
                recent_available: false,
                playtime_available: false,
            });
        }
    }
    Err(ApiError::unavailable())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn microsoft_redirect_is_bound_to_the_attempt_and_never_accepts_arbitrary_urls() {
        let valid = "https://login.live.com/oauth20_desktop.srf#access_token=secret&expires_in=3600&state=attempt";
        assert_eq!(
            browser_session(valid, "attempt").unwrap().access_token,
            "secret"
        );
        assert!(browser_session(valid, "other").is_err());
        assert!(browser_session(&valid.replace("login.live.com", "evil.test"), "attempt").is_err());
        assert!(browser_session(&(valid.to_owned() + "&access_token=other"), "attempt").is_err());
    }
    #[test]
    fn history_is_not_purchase_proof_and_unknown_playtime_is_preserved() {
        let page = json!({"titles":[{"titleId":"123","name":"Game","type":"Game","displayImage":"https://store-images.s-microsoft.com/test.png","titleHistory":{"lastTimePlayed":"2026-11-10T12:00:00Z"}}]});
        let games = history(&page).unwrap();
        assert_eq!(games.len(), 1);
        assert!(!games[0].ownership_verified);
        assert_eq!(games[0].playtime_minutes, None);
        assert!(games[0].last_played_at.is_some());
        assert!(history(&json!({"error":"private"})).is_err());
    }
}
