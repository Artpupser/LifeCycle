use super::{
    http,
    models::{Credentials, Game, Snapshot},
};
use crate::shared::errors::ApiError;
use axum::http::StatusCode;
use serde::Deserialize;
use std::collections::{BTreeMap, HashMap};

pub const ENDPOINT: &str = "https://steamcommunity.com/openid/login";
pub fn account_id(claimed: &str) -> Result<String, ApiError> {
    let url =
        url::Url::parse(claimed).map_err(|_| ApiError::validation("Invalid Steam identity"))?;
    let id = url.path().strip_prefix("/openid/id/").unwrap_or("");
    if !["http", "https"].contains(&url.scheme())
        || url.host_str() != Some("steamcommunity.com")
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.query().is_some()
        || url.fragment().is_some()
        || id.len() != 17
        || !id.bytes().all(|b| b.is_ascii_digit())
    {
        return Err(ApiError::validation("Invalid Steam identity"));
    }
    let numeric = id
        .parse::<u64>()
        .map_err(|_| ApiError::validation("Invalid Steam identity"))?;
    if numeric >> 56 != 1 || (numeric >> 52) & 15 != 1 || (numeric >> 32) & 0xfffff != 1 {
        return Err(ApiError::validation("Invalid Steam identity"));
    }
    Ok(id.to_owned())
}
pub fn validate_assertion(
    params: &BTreeMap<String, String>,
    return_to: &str,
) -> Result<String, ApiError> {
    let get = |key: &str| params.get(key).map(String::as_str).unwrap_or("");
    if get("openid.ns") != "http://specs.openid.net/auth/2.0"
        || get("openid.mode") != "id_res"
        || get("openid.op_endpoint") != ENDPOINT
        || get("openid.return_to") != return_to
        || get("openid.claimed_id") != get("openid.identity")
    {
        return Err(ApiError::validation(
            "Invalid Steam authentication response",
        ));
    }
    let signed: Vec<_> = get("openid.signed").split(',').collect();
    if [
        "op_endpoint",
        "claimed_id",
        "identity",
        "return_to",
        "response_nonce",
        "assoc_handle",
    ]
    .iter()
    .any(|key| !signed.contains(key))
    {
        return Err(ApiError::validation("Unsigned Steam authentication fields"));
    }
    let nonce = get("openid.response_nonce");
    let stamp = nonce
        .get(..20)
        .and_then(|v| chrono::DateTime::parse_from_rfc3339(v).ok())
        .ok_or_else(|| ApiError::validation("Invalid Steam nonce"))?;
    if (chrono::Utc::now() - stamp.with_timezone(&chrono::Utc))
        .num_seconds()
        .abs()
        > 300
    {
        return Err(ApiError::validation(
            "Expired Steam authentication response",
        ));
    }
    account_id(get("openid.claimed_id"))
}
#[derive(Deserialize, Default)]
struct SteamGame {
    appid: u32,
    #[serde(default)]
    name: String,
    #[serde(default)]
    playtime_forever: u64,
    #[serde(default)]
    playtime_2weeks: u64,
    rtime_last_played: Option<i64>,
}
#[derive(Deserialize)]
struct GamesResponse {
    response: GamesData,
}
#[derive(Deserialize)]
struct GamesData {
    game_count: Option<usize>,
    total_count: Option<usize>,
    games: Option<Vec<SteamGame>>,
}
pub async fn library(credentials: &Credentials) -> Result<Snapshot, ApiError> {
    let id = credentials
        .account_id
        .as_deref()
        .ok_or_else(|| ApiError::validation("Connect Steam first"))?;
    let key = credentials.api_key.as_deref().ok_or_else(|| {
        ApiError::new(
            StatusCode::BAD_REQUEST,
            "integration_key_required",
            "Steam Web API key required",
        )
    })?;
    let client = http::client()?;
    let owned_input =
        serde_json::json!({"steamid":id,"include_appinfo":true,"include_played_free_games":true})
            .to_string();
    let recent_input = serde_json::json!({"steamid":id,"count":0}).to_string();
    let owned = http::json::<GamesResponse>(
        client
            .get("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/")
            .query(&[("key", key), ("input_json", &owned_input)]),
        8 * 1024 * 1024,
    );
    let recent = http::json::<GamesResponse>(
        client
            .get("https://api.steampowered.com/IPlayerService/GetRecentlyPlayedGames/v1/")
            .query(&[("key", key), ("input_json", &recent_input)]),
        4 * 1024 * 1024,
    );
    let (owned, recent) = tokio::join!(owned, recent);
    normalize(owned?.response, recent.ok().map(|result| result.response))
}
fn normalize(owned: GamesData, recent: Option<GamesData>) -> Result<Snapshot, ApiError> {
    if owned.game_count.is_none() {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "integration_library_private",
            "Game details are private or unavailable",
        ));
    }
    if owned
        .game_count
        .is_some_and(|count| count > 30000 || (count > 0 && owned.games.is_none()))
    {
        return Err(ApiError::unavailable());
    }
    let recent_available = recent.as_ref().is_some_and(|v| v.total_count.is_some());
    let recent: HashMap<u32, u64> = recent
        .and_then(|v| v.games)
        .unwrap_or_default()
        .into_iter()
        .map(|g| (g.appid, g.playtime_2weeks))
        .collect();
    let mut games = vec![];
    for game in owned.games.unwrap_or_default().into_iter().take(30000) {
        if game.appid == 0 {
            continue;
        }
        games.push(Game {
            ownership_verified: true,
            preview: None,
            image_url: None,
            provider: "steam".into(),
            id: game.appid.to_string(),
            name: if game.name.trim().is_empty() {
                format!("Steam #{}", game.appid)
            } else {
                game.name.chars().take(300).collect()
            },
            playtime_minutes: Some(game.playtime_forever),
            recent_minutes: recent_available.then(|| {
                recent
                    .get(&game.appid)
                    .copied()
                    .unwrap_or(game.playtime_2weeks)
            }),
            last_played_at: game
                .rtime_last_played
                .filter(|n| *n > 0)
                .and_then(|n| chrono::DateTime::from_timestamp(n, 0)),
            store_url: format!("https://store.steampowered.com/app/{}/", game.appid),
        });
    }
    games.sort_by(|a, b| {
        b.playtime_minutes
            .cmp(&a.playtime_minutes)
            .then(a.id.cmp(&b.id))
    });
    games.dedup_by(|a, b| a.id == b.id);
    Ok(Snapshot {
        games,
        recent_available,
        playtime_available: true,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn integration_private_library_is_not_an_empty_library() {
        let private: GamesData = serde_json::from_value(serde_json::json!({})).unwrap();
        assert_eq!(
            normalize(private, None).err().unwrap().code,
            "integration_library_private"
        );
        let empty: GamesData = serde_json::from_value(serde_json::json!({"game_count":0})).unwrap();
        let snapshot = normalize(empty, None).unwrap();
        assert!(snapshot.games.is_empty());
        assert!(!snapshot.recent_available);
    }
    #[test]
    fn integration_normalizes_playtime_and_preserves_unavailable_recent_data() {
        let owned = serde_json::json!({"game_count":2,"games":[{"appid":10,"name":"A","playtime_forever":120},{"appid":20,"name":"B","playtime_forever":240,"rtime_last_played":1700000000}]});
        let recent = serde_json::from_value(
            serde_json::json!({"total_count":1,"games":[{"appid":10,"playtime_2weeks":30}]}),
        )
        .unwrap();
        let snapshot =
            normalize(serde_json::from_value(owned.clone()).unwrap(), Some(recent)).unwrap();
        assert!(snapshot.recent_available);
        assert_eq!(snapshot.games[0].id, "20");
        assert_eq!(snapshot.games[1].recent_minutes, Some(30));
        assert_eq!(snapshot.games[0].provider, "steam");
        assert!(
            !normalize(serde_json::from_value(owned).unwrap(), None)
                .unwrap()
                .recent_available
        );
    }
}
