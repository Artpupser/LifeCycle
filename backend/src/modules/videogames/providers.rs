use super::models::{Offer, platforms};
use crate::{modules::integrations::http, shared::errors::ApiError};
use chrono::{DateTime, Utc};
use serde::Deserialize;

pub const SOURCES: [&str; 3] = ["gamerpower", "cheapshark", "epic"];

pub fn cents(value: &str) -> Option<u64> {
    let mut parts = value.split('.');
    let whole = parts.next()?;
    let decimals = parts.next().unwrap_or("");
    if parts.next().is_some()
        || whole.is_empty()
        || whole.len() > 10
        || !whole.bytes().all(|n| n.is_ascii_digit())
        || decimals.len() > 2
        || !decimals.bytes().all(|n| n.is_ascii_digit())
    {
        return None;
    }
    let fraction = match decimals.len() {
        0 => 0,
        1 => decimals.parse::<u64>().ok()? * 10,
        _ => decimals.parse::<u64>().ok()?,
    };
    whole
        .parse::<u64>()
        .ok()?
        .checked_mul(100)?
        .checked_add(fraction)
}
pub fn qualifies(price: &str, regular: &str) -> bool {
    match (cents(price), cents(regular)) {
        (Some(0), _) => true,
        (Some(sale), Some(normal)) => sale
            .checked_mul(100)
            .zip(normal.checked_mul(10))
            .is_some_and(|(a, b)| a < b),
        _ => false,
    }
}
fn discount(price: &str, regular: &str) -> u32 {
    match (cents(price), cents(regular)) {
        (Some(sale), Some(normal)) if normal > 0 && sale <= normal => {
            ((normal - sale) * 10000 / normal) as u32
        }
        _ => 0,
    }
}
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
    (known
        || [
            "www.gamerpower.com",
            "gamerpower.com",
            "www.cheapshark.com",
            "cheapshark.com",
        ]
        .contains(&host))
    .then(|| url.into())
}
#[derive(Deserialize)]
struct Deal {
    thumb: Option<String>,
    #[serde(rename = "dealID")]
    deal_id: String,
    title: String,
    #[serde(rename = "salePrice")]
    sale_price: String,
    #[serde(rename = "normalPrice")]
    normal_price: String,
    #[serde(rename = "steamAppID")]
    steam_id: Option<String>,
}
pub async fn discounts() -> Result<Vec<Offer>, ApiError> {
    let rows: Vec<Deal> = http::json(
        http::client()?
            .get("https://www.cheapshark.com/api/1.0/deals")
            .query(&[
                ("storeID", "1"),
                ("sortBy", "Savings"),
                ("pageSize", "60"),
                ("onSale", "1"),
            ]),
        1024 * 1024,
    )
    .await?;
    Ok(rows
        .into_iter()
        .filter_map(|row| {
            if !qualifies(&row.sale_price, &row.normal_price)
                || row.title.len() > 600
                || row.deal_id.len() > 256
            {
                return None;
            }
            let app_id = row.steam_id.filter(|id| {
                !id.is_empty() && id.len() < 12 && id.bytes().all(|c| c.is_ascii_digit())
            });
            let url = app_id
                .as_ref()
                .map(|id| format!("https://store.steampowered.com/app/{id}/"));
            let mut claim = url::Url::parse("https://www.cheapshark.com/redirect").ok()?;
            claim.query_pairs_mut().append_pair("dealID", &row.deal_id);
            Some(Offer {
                id: format!("cheapshark:{}", row.deal_id),
                platform: "steam".into(),
                title: row.title,
                app_id,
                free: cents(&row.sale_price) == Some(0),
                discount_basis_points: discount(&row.sale_price, &row.normal_price),
                price: row.sale_price,
                regular_price: Some(row.normal_price),
                currency: "USD".into(),
                url: url.unwrap_or_else(|| claim.to_string()),
                claim_url: claim.into(),
                source: "cheapshark".into(),
                ends_at: None,
                ownership: "unknown".into(),
                ownership_ids: vec![],
                image_url: row.thumb,
                preview: None,
                price_country: None,
                price_unavailable: false,
            })
        })
        .collect())
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
    gamerpower_url: String,
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
                row.platforms
                    .split(',')
                    .any(|name| name.trim().eq_ignore_ascii_case(&p.giveaway_name))
            })?;
            let claim = safe_offer_url(&row.open_giveaway_url)?;
            let _source = safe_offer_url(&row.gamerpower_url)?;
            // GamerPower timestamps do not declare a timezone; do not invent an expiry instant.
            // Only accept explicit offsets. Other offers are revalidated by the source on each refresh.
            let ends_at = DateTime::parse_from_rfc3339(&row.end_date)
                .ok()
                .map(|date| date.with_timezone(&Utc));
            if ends_at.is_some_and(|date| date <= Utc::now()) {
                return None;
            }
            let app_id = if platform.id == "steam" {
                url::Url::parse(&claim)
                    .ok()
                    .and_then(|url| {
                        let segments: Vec<_> = url.path_segments()?.collect();
                        (url.host_str() == Some("store.steampowered.com")
                            && segments.first() == Some(&"app"))
                        .then(|| segments.get(1).copied().unwrap_or("").to_owned())
                    })
                    .filter(|id| !id.is_empty() && id.bytes().all(|n| n.is_ascii_digit()))
            } else {
                None
            };
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
