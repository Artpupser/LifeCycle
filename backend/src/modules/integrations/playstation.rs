//! PSN user session. NPSSO is exchanged once and is never persisted.
use super::{
    http,
    models::{Credentials, Game, SessionTokens, Snapshot},
    session,
};
use crate::shared::errors::ApiError;
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};
use serde::Deserialize;
use serde_json::{Value, json};
use std::collections::{HashMap, HashSet};
const AUTH: &str = "https://ca.account.sony.com/api/authz/v3/oauth";
const CLIENT: &str = "09515159-7237-4370-9b40-3806e67c0891";
const CLIENT_AUTH: &str =
    "Basic MDk1MTUxNTktNzIzNy00MzcwLTliNDAtMzgwNmU2N2MwODkxOnVjUGprYTV0bnRCMktxc1A=";
const REDIRECT: &str = "com.scee.psxandroid.scecompcall://redirect";
const SCOPE: &str = "psn:mobile.v2.core psn:clientapp";
const PURCHASE_HASH: &str = "827a423f6a8ddca4107ac01395af2ec0eafd8396fc7fa204aaf9b7ed2eefa168";
pub fn npsso(input: &str) -> Result<String, ApiError> {
    if input.len() > 4096 {
        return Err(ApiError::validation("Invalid NPSSO"));
    }
    let parsed = if input.trim().starts_with('{') {
        serde_json::from_str::<Value>(input.trim())
            .ok()
            .and_then(|data| data["npsso"].as_str().map(str::to_owned))
    } else {
        Some(input.trim().to_owned())
    };
    parsed
        .filter(|value| {
            value.len() == 64
                && value
                    .bytes()
                    .all(|byte| byte.is_ascii_alphanumeric() || byte == b'_' || byte == b'-')
        })
        .ok_or_else(|| ApiError::validation("Enter the NPSSO from the PlayStation session page"))
}
#[derive(Deserialize)]
struct Token {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: i64,
    id_token: Option<String>,
}
fn tokens(response: Token, previous_refresh: Option<&str>) -> Result<SessionTokens, ApiError> {
    if !(1..=604800).contains(&response.expires_in) {
        return Err(ApiError::unavailable());
    }
    Ok(SessionTokens {
        access_token: session::secret(&response.access_token)?,
        refresh_token: session::secret(
            response
                .refresh_token
                .as_deref()
                .or(previous_refresh)
                .ok_or_else(session::required)?,
        )?,
        expires_at: Utc::now() + chrono::Duration::seconds(response.expires_in),
        display_name: None,
    })
}
/// This JWT comes directly from Sony's TLS-protected token response, never from user input.
fn subject(id_token: &str) -> Result<String, ApiError> {
    if id_token.len() > 16384 {
        return Err(ApiError::unavailable());
    }
    let payload = id_token
        .split('.')
        .nth(1)
        .ok_or_else(ApiError::unavailable)?;
    let bytes = URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|_| ApiError::unavailable())?;
    let claims: Value = serde_json::from_slice(&bytes).map_err(|_| ApiError::unavailable())?;
    claims["sub"]
        .as_str()
        .filter(|id| {
            !id.is_empty() && id.len() <= 20 && id.bytes().all(|byte| byte.is_ascii_digit())
        })
        .map(str::to_owned)
        .ok_or_else(ApiError::unavailable)
}
pub async fn login(input: &str) -> Result<(String, SessionTokens), ApiError> {
    let npsso = npsso(input)?;
    let client = http::client()?;
    let response = client
        .get(format!("{AUTH}/authorize"))
        .query(&[
            ("access_type", "offline"),
            ("client_id", CLIENT),
            ("redirect_uri", REDIRECT),
            ("response_type", "code"),
            ("scope", SCOPE),
        ])
        .header("Cookie", format!("npsso={npsso}"))
        .send()
        .await
        .map_err(|_| ApiError::unavailable())?;
    if !response.status().is_redirection() {
        let _ = http::bytes(response, 16384).await?;
        return Err(session::required());
    }
    let location = response
        .headers()
        .get("location")
        .and_then(|value| value.to_str().ok())
        .filter(|value| value.len() < 16384)
        .ok_or_else(session::required)?;
    let url = url::Url::parse(location).map_err(|_| session::required())?;
    if url.scheme() != "com.scee.psxandroid.scecompcall"
        || url.host_str() != Some("redirect")
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err(session::required());
    }
    let codes: Vec<_> = url
        .query_pairs()
        .filter(|(key, _)| key == "code")
        .map(|(_, value)| value.into_owned())
        .collect();
    if codes.len() != 1 {
        return Err(session::required());
    }
    let code = session::secret(&codes[0])?;
    let response: Token = session::json_response(
        client
            .post(format!("{AUTH}/token"))
            .header("Authorization", CLIENT_AUTH)
            .form(&[
                ("code", code.as_str()),
                ("redirect_uri", REDIRECT),
                ("grant_type", "authorization_code"),
                ("token_format", "jwt"),
            ]),
        32768,
    )
    .await?;
    let account = subject(
        response
            .id_token
            .as_deref()
            .ok_or_else(ApiError::unavailable)?,
    )?;
    let mut tokens = tokens(response, None)?;
    let profile: Value = session::json_response(
        client
            .get("https://m.np.playstation.com/api/userProfile/v1/internal/users/me/profiles")
            .bearer_auth(&tokens.access_token),
        65536,
    )
    .await?;
    tokens.display_name = profile["onlineId"]
        .as_str()
        .filter(|name| !name.is_empty())
        .map(|name| name.chars().take(100).collect());
    if tokens.display_name.is_none() {
        return Err(ApiError::unavailable());
    }
    Ok((account, tokens))
}
async fn refresh(tokens: &mut SessionTokens, account: &str) -> Result<(), ApiError> {
    if tokens.expires_at > Utc::now() + chrono::Duration::seconds(60) {
        return Ok(());
    }
    let response: Token = session::json_response(
        http::client()?
            .post(format!("{AUTH}/token"))
            .header("Authorization", CLIENT_AUTH)
            .form(&[
                ("grant_type", "refresh_token"),
                ("refresh_token", tokens.refresh_token.as_str()),
                ("token_format", "jwt"),
                ("scope", SCOPE),
            ]),
        32768,
    )
    .await?;
    if let Some(id_token) = &response.id_token {
        if subject(id_token)? != account {
            return Err(session::required());
        }
    }
    let mut updated = self::tokens(response, Some(&tokens.refresh_token))?;
    updated.display_name = tokens.display_name.clone();
    *tokens = updated;
    Ok(())
}
/// Provider wire format; unsupported or malformed durations remain unknown.
pub fn duration_minutes(value: &str) -> Option<u64> {
    let value = value.strip_prefix("PT")?;
    let mut digits = String::new();
    let mut seconds = 0u64;
    let mut previous = 0;
    let mut seen = false;
    for character in value.chars() {
        if character.is_ascii_digit() {
            digits.push(character);
            if digits.len() > 12 {
                return None;
            }
            continue;
        }
        let (rank, multiplier) = match character {
            'H' => (1, 3600),
            'M' => (2, 60),
            'S' => (3, 1),
            _ => return None,
        };
        if rank <= previous || digits.is_empty() {
            return None;
        }
        seconds = seconds.checked_add(digits.parse::<u64>().ok()?.checked_mul(multiplier)?)?;
        digits.clear();
        previous = rank;
        seen = true;
    }
    (seen && digits.is_empty()).then_some(seconds / 60)
}
fn identifier(value: &Value) -> Option<&str> {
    value.as_str().filter(|id| {
        !id.is_empty()
            && id.len() < 200
            && id
                .bytes()
                .all(|byte| byte.is_ascii_alphanumeric() || b"_-".contains(&byte))
    })
}
fn played_game(row: &Value) -> Result<Game, ApiError> {
    let id = identifier(&row["titleId"]).ok_or_else(ApiError::unavailable)?;
    let name = row["localizedName"]
        .as_str()
        .filter(|name| !name.is_empty())
        .or_else(|| row["name"].as_str())
        .filter(|name| !name.trim().is_empty() && name.len() < 1200)
        .ok_or_else(ApiError::unavailable)?;
    let concept = row.pointer("/concept/id").and_then(Value::as_u64);
    let mut url = url::Url::parse("https://store.playstation.com/search").expect("PS Store search");
    if let Some(id) = concept {
        url.set_path(&format!("/concept/{id}"));
    } else {
        url.query_pairs_mut().append_pair("q", name);
    }
    let wide = row
        .pointer("/concept/media/images")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .filter(|image| image["type"] == "FOUR_BY_THREE_BANNER")
        .filter_map(|image| image["url"].as_str());
    let image = crate::modules::media::provider::catalog_image(
        wide.chain(row["localizedImageUrl"].as_str())
            .chain(row["imageUrl"].as_str()),
    );
    Ok(Game {
        provider: "playstation".into(),
        ownership_verified: false,
        id: id.into(),
        name: name.chars().take(300).collect(),
        playtime_minutes: row["playDuration"].as_str().and_then(duration_minutes),
        recent_minutes: None,
        last_played_at: row["lastPlayedDateTime"]
            .as_str()
            .and_then(|value| value.parse::<DateTime<Utc>>().ok()),
        store_url: url.into(),
        preview: None,
        image_url: image,
    })
}
pub fn merge(purchases: &[Value], played: &[Value]) -> Result<Vec<Game>, ApiError> {
    let mut history = HashMap::new();
    for row in played {
        let game = played_game(row)?;
        history.insert(game.id.clone(), game);
    }
    let mut games = vec![];
    let mut ids = HashSet::new();
    for row in purchases {
        if row["isActive"] == false {
            continue;
        }
        let product = identifier(&row["productId"]).ok_or_else(ApiError::unavailable)?;
        if !ids.insert(product.to_owned()) {
            continue;
        }
        let title = identifier(&row["titleId"]).ok_or_else(ApiError::unavailable)?;
        let name = row["name"]
            .as_str()
            .filter(|name| !name.trim().is_empty() && name.len() < 1200)
            .ok_or_else(ApiError::unavailable)?;
        let played = history.remove(title);
        games.push(Game {
            provider: "playstation".into(),
            ownership_verified: true,
            id: product.into(),
            name: name.chars().take(300).collect(),
            playtime_minutes: played.as_ref().and_then(|game| game.playtime_minutes),
            recent_minutes: None,
            last_played_at: played.as_ref().and_then(|game| game.last_played_at),
            store_url: format!("https://store.playstation.com/product/{product}"),
            preview: None,
            image_url: crate::modules::media::provider::catalog_image(
                row.pointer("/image/url").and_then(Value::as_str),
            )
            .or_else(|| played.and_then(|game| game.image_url)),
        });
    }
    games.extend(history.into_values());
    Ok(games)
}
pub async fn library(data: &mut Credentials) -> Result<Snapshot, ApiError> {
    let account = data
        .account_id
        .as_deref()
        .ok_or_else(session::required)?
        .to_owned();
    let tokens = data
        .sessions
        .get_mut("playstation")
        .ok_or_else(session::required)?;
    refresh(tokens, &account).await?;
    let client = http::client()?;
    let mut played = vec![];
    let mut offset = 0u64;
    let mut finished = false;
    for _ in 0..150 {
        let page: Value = session::json_response(
            client
                .get("https://m.np.playstation.com/api/gamelist/v2/users/me/titles")
                .query(&[("limit", "200".to_owned()), ("offset", offset.to_string())])
                .bearer_auth(&tokens.access_token),
            4 * 1024 * 1024,
        )
        .await?;
        let rows = page["titles"]
            .as_array()
            .ok_or_else(ApiError::unavailable)?;
        let total = page["totalItemCount"]
            .as_u64()
            .ok_or_else(ApiError::unavailable)?;
        if total > 30000 {
            return Err(ApiError::unavailable());
        }
        played.extend(rows.iter().cloned());
        if offset + rows.len() as u64 >= total {
            finished = true;
            break;
        }
        let next = page["nextOffset"]
            .as_u64()
            .filter(|next| *next > offset && *next <= total)
            .ok_or_else(ApiError::unavailable)?;
        if rows.is_empty() {
            return Err(ApiError::unavailable());
        }
        offset = next;
    }
    if !finished {
        return Err(ApiError::unavailable());
    }
    let mut purchases = vec![];
    let mut start = 0usize;
    let mut pages = HashSet::new();
    finished = false;
    for _ in 0..300 {
        let variables = json!({"isActive":true,"platform":["ps4","ps5"],"size":100,"start":start,"sortBy":"ACTIVE_DATE","sortDirection":"desc"});
        let extensions = json!({"persistedQuery":{"version":1,"sha256Hash":PURCHASE_HASH}});
        let page: Value = session::json_response(
            client
                .get("https://web.np.playstation.com/api/graphql/v1/op")
                .query(&[
                    ("operationName", "getPurchasedGameList".to_owned()),
                    ("variables", variables.to_string()),
                    ("extensions", extensions.to_string()),
                ])
                .bearer_auth(&tokens.access_token),
            4 * 1024 * 1024,
        )
        .await?;
        if page
            .get("errors")
            .and_then(Value::as_array)
            .is_some_and(|errors| !errors.is_empty())
        {
            return Err(ApiError::unavailable());
        }
        let rows = page
            .pointer("/data/purchasedTitlesRetrieve/games")
            .and_then(Value::as_array)
            .ok_or_else(ApiError::unavailable)?;
        if let Some(first) = rows.first() {
            let key = first["entitlementId"]
                .as_str()
                .or_else(|| first["productId"].as_str())
                .ok_or_else(ApiError::unavailable)?;
            if !pages.insert(key.to_owned()) {
                return Err(ApiError::unavailable());
            }
        }
        purchases.extend(rows.iter().cloned());
        start += rows.len();
        if rows.is_empty() {
            finished = true;
            break;
        }
    }
    if !finished {
        return Err(ApiError::unavailable());
    }
    let games = merge(&purchases, &played)?;
    if games.len() > 30000 {
        return Err(ApiError::unavailable());
    }
    let playtime_available = games.iter().all(|game| game.playtime_minutes.is_some());
    Ok(Snapshot {
        games,
        recent_available: false,
        playtime_available,
    })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn duration_and_npsso_parsing_are_strict_and_keep_unknown_values() {
        assert_eq!(duration_minutes("PT2H3M45S"), Some(123));
        assert_eq!(duration_minutes("PT0S"), Some(0));
        for invalid in ["PT", "PT1S2H", "2:30", "PT-1S"] {
            assert_eq!(duration_minutes(invalid), None);
        }
        assert_eq!(
            npsso(&json!({"npsso":"a".repeat(64)}).to_string()).unwrap(),
            "a".repeat(64)
        );
        assert!(npsso("missing").is_err());
    }
    #[test]
    fn purchases_and_history_keep_distinct_ownership_and_merge_playtime() {
        let owned = json!({"productId":"EP0000-CUSA00000_00-GAME","titleId":"CUSA00000_00","isActive":true,"name":"Owned"});
        let played = json!({"titleId":"CUSA00000_00","name":"Owned","playDuration":"PT2H","lastPlayedDateTime":"2026-11-10T12:00:00Z"});
        let other =
            json!({"titleId":"PPSA00001_00","name":"Played elsewhere","playDuration":"PT30M"});
        let games = merge(&[owned], &[played, other]).unwrap();
        assert_eq!(games.len(), 2);
        assert!(games[0].ownership_verified);
        assert_eq!(games[0].playtime_minutes, Some(120));
        assert!(!games[1].ownership_verified);
    }
}
