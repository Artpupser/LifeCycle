use super::models::{Offer, platforms};
use crate::{modules::integrations::http, shared::errors::ApiError};
use chrono::{DateTime, Utc};
use serde::Deserialize;

pub const SOURCES: [&str; 3] = ["gamerpower", "steam", "epic"];

pub fn safe_offer_url(value: &str) -> Option<String> {
    let url = url::Url::parse(value).ok()?;
    if url.scheme() != "https"
        || !url.username().is_empty()
        || url.password().is_some()
        || url.port().is_some()
    {
        return None;
    }
    let host = url.host_str()?;
    let known = platforms().iter().any(|p| {
        p.hosts
            .iter()
            .any(|h| host == h || (h == "itch.io" && host.ends_with(".itch.io")))
    });
    known.then(|| url.into())
}
/// Only official product pages qualify; account, gift and key redemption links do not.
pub fn official_offer(offer: &Offer) -> bool {
    let Some(url) = safe_offer_url(&offer.url).and_then(|u| url::Url::parse(&u).ok()) else {
        return false;
    };
    let Some(claim) = safe_offer_url(&offer.claim_url) else {
        return false;
    };
    let host = url.host_str().unwrap_or("");
    let belongs = platforms().iter().any(|p| {
        p.id == offer.platform
            && p.hosts
                .iter()
                .any(|h| host == h || (h == "itch.io" && host.ends_with(".itch.io")))
    });
    let path = url.path().to_ascii_lowercase();
    let product = match offer.platform.as_str() {
        "steam" => {
            host == "store.steampowered.com"
                && path
                    .strip_prefix("/app/")
                    .and_then(|rest| rest.split('/').next())
                    .is_some_and(|id| {
                        !id.is_empty() && id.bytes().all(|byte| byte.is_ascii_digit())
                    })
        }
        "epic" => {
            host == "store.epicgames.com" && (path.starts_with("/p/") || path == "/free-games")
        }
        "gog" => path.starts_with("/game/"),
        "itchio" => host.ends_with(".itch.io") && path != "/",
        "battlenet" => path.contains("/product/"),
        "xbox" => path.contains("/games/store/") || path.contains("/p/"),
        "playstation" => path.contains("/product/") || path.contains("/concept/"),
        _ => false,
    };
    let key_or_gift = offer
        .title
        .to_ascii_lowercase()
        .split(|c: char| !c.is_alphanumeric())
        .any(|word| ["key", "keys", "gift", "gifts"].contains(&word));
    belongs && product && !key_or_gift && claim == offer.url
}
pub fn steam_discounts(data: &serde_json::Value) -> Vec<Offer> {
    data.pointer("/specials/items")
        .and_then(serde_json::Value::as_array)
        .into_iter()
        .flatten()
        .take(100)
        .filter_map(|row| {
            let id = row["id"].as_u64()?.to_string();
            let title = row["name"].as_str()?.to_owned();
            if title.len() > 600 || row["type"].as_u64() != Some(0) {
                return None;
            }
            let initial = row["original_price"].as_u64()?;
            let final_price = row["final_price"].as_u64()?;
            if initial == 0 || final_price >= initial || initial > 1_000_000_000_000 {
                return None;
            }
            let decimal = |value: u64| format!("{}.{:02}", value / 100, value % 100);
            let url = format!("https://store.steampowered.com/app/{id}/");
            Some(Offer {
                id: format!("steam:{id}"),
                platform: "steam".into(),
                title,
                app_id: Some(id),
                price: decimal(final_price),
                regular_price: Some(decimal(initial)),
                currency: row["currency"].as_str()?.into(),
                discount_basis_points: ((initial - final_price) * 10000 / initial) as u32,
                free: final_price == 0,
                url: url.clone(),
                claim_url: url,
                source: "steam".into(),
                ends_at: None,
                ownership: "unknown".into(),
                ownership_ids: vec![],
                image_url: row["header_image"].as_str().map(str::to_owned),
                preview: None,
                price_country: Some("US".into()),
                price_unavailable: false,
            })
        })
        .collect()
}
pub async fn discounts() -> Result<Vec<Offer>, ApiError> {
    let data: serde_json::Value = http::json(
        http::client()?
            .get("https://store.steampowered.com/api/featuredcategories")
            .query(&[("cc", "US"), ("l", "english")]),
        2 * 1024 * 1024,
    )
    .await?;
    if !data
        .pointer("/specials/items")
        .is_some_and(serde_json::Value::is_array)
    {
        return Err(ApiError::unavailable());
    }
    Ok(steam_discounts(&data))
}

#[derive(Deserialize)]
struct Giveaway {
    image: Option<String>,
    thumbnail: Option<String>,
    id: u64,
    title: String,
    #[serde(default)]
    platforms: String,
    open_giveaway_url: String,

    end_date: String,
    #[serde(default)]
    status: String,
    #[serde(rename = "type")]
    kind: String,
}
pub async fn giveaways() -> Result<Vec<Offer>, ApiError> {
    let response = http::client()?
        .get("https://www.gamerpower.com/api/giveaways")
        .query(&[("type", "game"), ("sort-by", "date")])
        .send()
        .await
        .map_err(|_| ApiError::unavailable())?;
    if response.status().as_u16() == 201 {
        return Ok(vec![]);
    }
    let rows: Vec<Giveaway> =
        serde_json::from_slice(&http::bytes(response, 2 * 1024 * 1024).await?)
            .map_err(|_| ApiError::unavailable())?;
    let platforms = platforms();
    Ok(rows
        .into_iter()
        .filter_map(|row| {
            if row.kind != "Game" || row.status != "Active" || row.title.len() > 600 {
                return None;
            }
            let platform = platforms.iter().find(|p| {
                row.platforms.split(',').any(|name| {
                    name.trim().eq_ignore_ascii_case(&p.giveaway_name)
                        || p.giveaway_aliases
                            .iter()
                            .any(|alias| name.trim().eq_ignore_ascii_case(alias))
                })
            })?;
            let claim = safe_offer_url(&row.open_giveaway_url)?;
            let host = url::Url::parse(&claim).ok()?.host_str()?.to_owned();
            if !platform
                .hosts
                .iter()
                .any(|h| host == *h || (h == "itch.io" && host.ends_with(".itch.io")))
                || row
                    .title
                    .to_ascii_lowercase()
                    .split(|c: char| !c.is_alphanumeric())
                    .any(|word| ["key", "keys", "gift", "gifts"].contains(&word))
            {
                return None;
            }
            // GamerPower timestamps do not declare a timezone; do not invent an expiry instant.
            // Only accept explicit offsets. Other offers are revalidated by the source on each refresh.
            let ends_at = DateTime::parse_from_rfc3339(&row.end_date)
                .ok()
                .map(|date| date.with_timezone(&Utc));
            if ends_at.is_some_and(|date| date <= Utc::now()) {
                return None;
            }
            let app_id = store_app_id(&platform.id, &claim);
            Some(Offer {
                id: format!("gamerpower:{}", row.id),
                platform: platform.id.clone(),
                title: row.title,
                app_id,
                price: "0.00".into(),
                regular_price: None,
                currency: "USD".into(),
                discount_basis_points: 10000,
                free: true,
                url: claim.clone(),
                claim_url: claim,
                source: "gamerpower".into(),
                ends_at,
                ownership: "unknown".into(),
                ownership_ids: vec![],
                image_url: row.image.or(row.thumbnail),
                preview: None,
                price_country: None,
                price_unavailable: false,
            })
        })
        .collect())
}

/// Store identity is extracted only after the shared official URL validation.
pub fn store_app_id(platform: &str, value: &str) -> Option<String> {
    let url = url::Url::parse(&safe_offer_url(value)?).ok()?;
    let parts: Vec<_> = url
        .path_segments()?
        .filter(|part| !part.is_empty())
        .collect();
    match platform {
        "steam"
            if url.host_str() == Some("store.steampowered.com")
                && parts.first() == Some(&"app") =>
        {
            parts
                .get(1)
                .filter(|id| !id.is_empty() && id.bytes().all(|byte| byte.is_ascii_digit()))
                .map(|id| (*id).to_owned())
        }
        "playstation" if url.host_str() == Some("store.playstation.com") => parts
            .iter()
            .position(|part| *part == "product")
            .and_then(|index| parts.get(index + 1))
            .filter(|id| {
                id.len() < 200
                    && id
                        .bytes()
                        .all(|byte| byte.is_ascii_alphanumeric() || b"_-".contains(&byte))
            })
            .map(|id| (*id).to_owned()),
        "xbox"
            if url.host_str() == Some("www.xbox.com")
                || url.host_str() == Some("www.microsoft.com") =>
        {
            parts
                .last()
                .filter(|id| id.len() == 12 && id.bytes().all(|byte| byte.is_ascii_alphanumeric()))
                .map(|id| (*id).to_owned())
        }
        _ => None,
    }
}
