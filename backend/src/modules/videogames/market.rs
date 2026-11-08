use super::{
    cache,
    models::{Offer, Sale, sales},
};
use crate::{
    infrastructure::state::AppState, modules::integrations::http, shared::errors::ApiError,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde_json::{Value, json};
use std::collections::{BTreeMap, HashSet};
const STEAM_SALES: &str = "https://partner.steamgames.com/doc/marketing/upcoming_events";
fn metadata() -> &'static Value {
    static DATA: std::sync::OnceLock<Value> = std::sync::OnceLock::new();
    DATA.get_or_init(|| {
        serde_json::from_str(include_str!("../../../../shared/country-currencies.json"))
            .expect("country currencies")
    })
}
pub fn country(value: &str) -> Option<String> {
    let value = value.trim().to_lowercase();
    metadata()["countries"]
        .as_object()?
        .iter()
        .find(|(code, data)| {
            code.to_lowercase() == value
                || data["ru"]
                    .as_str()
                    .is_some_and(|n| n.to_lowercase() == value)
                || data["en"]
                    .as_str()
                    .is_some_and(|n| n.to_lowercase() == value)
        })
        .map(|(code, _)| code.clone())
}
fn decimal(value: u64, digits: u32) -> String {
    let scale = 10u64.pow(digits);
    if digits == 0 {
        value.to_string()
    } else {
        format!(
            "{}.{:0width$}",
            value / scale,
            value % scale,
            width = digits as usize
        )
    }
}
pub fn price(value: &Value) -> Option<(String, String, String, u32)> {
    let currency = value["currency"].as_str()?;
    metadata()["currencies"].get(currency)?;
    // appdetails uses hundredths for every currency, including JPY and KWD.
    // ISO fractional digits are presentation metadata, not this provider's wire scale.
    let digits = 2;
    let initial = value["initial"].as_u64()?;
    let final_price = value["final"].as_u64()?;
    if final_price > initial || initial > 1_000_000_000_000 {
        return None;
    }
    Some((
        decimal(final_price, digits),
        decimal(initial, digits),
        currency.to_owned(),
        if initial > 0 {
            ((initial - final_price) * 10000 / initial) as u32
        } else {
            0
        },
    ))
}
async fn steam_prices(country: &str, ids: &[String]) -> Result<Value, ApiError> {
    if ids.is_empty() {
        return Ok(json!({}));
    }
    http::json(
        http::client()?
            .get("https://store.steampowered.com/api/appdetails")
            .query(&[
                ("appids", ids.join(",")),
                ("filters", "price_overview".into()),
                ("cc", country.into()),
                ("l", "english".into()),
            ]),
        2 * 1024 * 1024,
    )
    .await
}
pub async fn epic_catalog(country: &str) -> Result<Value, ApiError> {
    http::json(
        http::client()?
            .get("https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions")
            .query(&[
                ("locale", "en-US"),
                ("country", country),
                ("allowCountries", country),
            ]),
        4 * 1024 * 1024,
    )
    .await
    .and_then(|data: Value| {
        if data
            .pointer("/data/Catalog/searchStore/elements")
            .is_some_and(Value::is_array)
        {
            Ok(data)
        } else {
            Err(ApiError::unavailable())
        }
    })
}
fn epic_url(row: &Value) -> String {
    let slug = row
        .pointer("/catalogNs/mappings/0/pageSlug")
        .or_else(|| row.get("productSlug"))
        .and_then(Value::as_str)
        .filter(|slug| {
            !slug.is_empty()
                && slug.len() < 300
                && slug
                    .chars()
                    .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_' || c == '/')
        });
    slug.map_or("https://store.epicgames.com/free-games".into(), |slug| {
        format!("https://store.epicgames.com/p/{slug}")
    })
}
pub fn epic(data: &Value, country: &str) -> (Vec<Offer>, Vec<Sale>) {
    let mut offers = vec![];
    let mut events = BTreeMap::new();
    let now = Utc::now();
    for row in data
        .pointer("/data/Catalog/searchStore/elements")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .take(500)
    {
        let Some(id) = row["id"].as_str().filter(|id| id.len() < 128) else {
            continue;
        };
        let Some(title) = row["title"].as_str().filter(|title| title.len() < 600) else {
            continue;
        };
        for group in ["promotionalOffers", "upcomingPromotionalOffers"] {
            for promotion in row
                .pointer(&format!("/promotions/{group}"))
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .flat_map(|group| group["promotionalOffers"].as_array().into_iter().flatten())
            {
                let (Some(start), Some(end)) = (
                    promotion["startDate"]
                        .as_str()
                        .and_then(|v| v.parse::<DateTime<Utc>>().ok()),
                    promotion["endDate"]
                        .as_str()
                        .and_then(|v| v.parse::<DateTime<Utc>>().ok()),
                ) else {
                    continue;
                };
                if start >= end
                    || end <= now
                    || promotion
                        .pointer("/discountSetting/discountPercentage")
                        .and_then(Value::as_u64)
                        != Some(0)
                {
                    continue;
                }
                let source = epic_url(row);
                let key = format!("epic-giveaway-{}-{}", start.timestamp(), end.timestamp());
                events.entry(key.clone()).or_insert(Sale {
                    id: key,
                    platform: "epic".into(),
                    title: "Бесплатные игры Epic Games".into(),
                    title_en: "Epic Games free games".into(),
                    starts_at: start,
                    ends_at: end,
                    source: "https://store.epicgames.com/free-games".into(),
                    verified_on: now.date_naive().to_string(),
                    all_day: false,
                    stale: false,
                    kind: "giveaway".into(),
                });
                let total = &row["price"]["totalPrice"];
                if start <= now && total["discountPrice"].as_u64() == Some(0) {
                    offers.push(Offer {
                        id: format!("epic:{id}"),
                        platform: "epic".into(),
                        title: title.into(),
                        app_id: Some(id.into()),
                        price: "0".into(),
                        regular_price: None,
                        currency: total["currencyCode"].as_str().unwrap_or("").into(),
                        discount_basis_points: 10000,
                        free: true,
                        url: source.clone(),
                        claim_url: source,
                        source: "epic".into(),
                        ends_at: Some(end),
                        ownership: "unknown".into(),
                        ownership_ids: row["items"]
                            .as_array()
                            .into_iter()
                            .flatten()
                            .filter_map(|item| {
                                Some(format!(
                                    "{}:{}",
                                    item["namespace"].as_str()?,
                                    item["id"].as_str()?
                                ))
                            })
                            .collect(),
                        image_url: row["keyImages"]
                            .as_array()
                            .and_then(|images| {
                                images
                                    .iter()
                                    .find(|im| im["type"] == "OfferImageWide")
                                    .or_else(|| images.first())
                            })
                            .and_then(|im| im["url"].as_str())
                            .map(str::to_owned),
                        preview: None,
                        price_country: Some(country.into()),
                        price_unavailable: false,
                    });
                }
            }
        }
    }
    (offers, events.into_values().collect())
}
/// Parse announced civil dates. Unknown/TBD dates never produce guessed events.
pub fn steam_sales(html: &str) -> Vec<Sale> {
    let mut text = String::new();
    let mut tag = false;
    for c in html.chars() {
        match c {
            '<' => {
                tag = true;
                text.push(' ');
            }
            '>' => {
                tag = false;
                text.push(' ');
            }
            _ if !tag => text.push(c),
            _ => {}
        }
    }
    let words = text.split_whitespace().collect::<Vec<_>>().join(" ");
    let Some(section) = words.split("Seasonal Sales").last() else {
        return vec![];
    };
    let section = section
        .split("Themed Sale Events")
        .next()
        .unwrap_or(section);
    let mut result = vec![];
    for (season, ru) in [
        ("Winter", "Зимняя"),
        ("Spring", "Весенняя"),
        ("Summer", "Летняя"),
        ("Autumn", "Осенняя"),
    ] {
        let marker = format!("{season} Sale ");
        let mut rest = section;
        while let Some((_, after)) = rest.split_once(&marker) {
            rest = after;
            let Some((year, dates)) = after.split_once(" | ") else {
                continue;
            };
            if year.len() != 4 {
                continue;
            }
            let Some((start, tail)) = dates.split_once(" - ") else {
                continue;
            };
            let end = tail
                .split_whitespace()
                .take(3)
                .collect::<Vec<_>>()
                .join(" ");
            let (Ok(start), Ok(end)) = (
                NaiveDate::parse_from_str(start, "%e %B, %Y"),
                NaiveDate::parse_from_str(&end, "%e %B, %Y"),
            ) else {
                continue;
            };
            if start >= end {
                continue;
            }
            result.push(Sale {
                id: format!("steam-{}-{year}", season.to_lowercase()),
                platform: "steam".into(),
                title: format!("{ru} распродажа Steam {year}"),
                title_en: format!("Steam {season} Sale {year}"),
                starts_at: start.and_hms_opt(0, 0, 0).unwrap().and_utc(),
                ends_at: end.and_hms_opt(0, 0, 0).unwrap().and_utc(),
                source: STEAM_SALES.into(),
                verified_on: Utc::now().date_naive().to_string(),
                all_day: true,
                stale: false,
                kind: "seasonal".into(),
            });
        }
    }
    result
}
async fn steam_announcements() -> Result<Vec<Sale>, ApiError> {
    let response = http::client()?
        .get(STEAM_SALES)
        .query(&[("l", "english")])
        .send()
        .await
        .map_err(|_| ApiError::unavailable())?;
    let bytes = http::bytes(response, 1024 * 1024).await?;
    let rows = steam_sales(&String::from_utf8_lossy(&bytes));
    if rows.is_empty() {
        Err(ApiError::unavailable())
    } else {
        Ok(rows)
    }
}
pub async fn sales_catalog(
    s: &AppState,
    include_epic: bool,
) -> Result<(Vec<Sale>, Vec<String>), ApiError> {
    let providers = crate::modules::integrations::providers()
        .into_iter()
        .filter(|p| p.kind == "gaming")
        .map(|p| p.id)
        .collect::<HashSet<_>>();
    let steam = async {
        if providers.contains("steam") {
            cache::load(
                s,
                "steam-sales",
                "steam-sales",
                21600,
                steam_announcements(),
            )
            .await
        } else {
            Ok((None, false))
        }
    };
    let epic_data = async {
        if include_epic && providers.contains("epic") {
            cache::load(s, "epic:US", "epic:", 900, epic_catalog("US")).await
        } else {
            Ok((None, false))
        }
    };
    let (steam, epic_data) = tokio::join!(steam, epic_data);
    let (steam, steam_stale) = steam?;
    let (epic_data, epic_stale) = epic_data?;
    let mut unavailable = vec![];
    if steam_stale {
        unavailable.push("steam".into());
    }
    if epic_stale {
        unavailable.push("epic".into());
    }
    let mut result = if providers.contains("steam") {
        steam.unwrap_or_else(|| {
            sales()
                .into_iter()
                .map(|mut sale| {
                    sale.all_day = true;
                    sale.stale = true;
                    sale
                })
                .collect()
        })
    } else {
        vec![]
    };
    for sale in &mut result {
        sale.stale |= steam_stale;
    }
    if let Some(data) = epic_data {
        result.extend(epic(&data, "US").1.into_iter().map(|mut sale| {
            sale.stale |= epic_stale;
            sale
        }));
    }
    for id in providers {
        if !["steam", "epic"].contains(&id.as_str()) {
            unavailable.push(id);
        }
    }
    result.retain(|sale| sale.ends_at > Utc::now());
    result.sort_by_key(|sale| sale.starts_at);
    Ok((result, unavailable))
}
pub async fn regionalize(
    s: &AppState,
    country: Option<&str>,
    offers: &mut Vec<Offer>,
) -> Result<(Vec<Sale>, Vec<String>), ApiError> {
    let ids: Vec<String> = offers
        .iter()
        .filter(|o| o.platform == "steam" && !o.free)
        .filter_map(|o| o.app_id.clone())
        .collect::<HashSet<_>>()
        .into_iter()
        .take(60)
        .collect();
    let Some(country) = country else {
        for offer in offers {
            if !offer.free {
                offer.price_unavailable = true;
                offer.currency.clear();
            }
        }
        return Ok((vec![], vec![]));
    };
    offers.retain(|offer| offer.source != "epic");
    let steam_key = format!("steam-prices:{country}");
    let epic_key = format!("epic:{country}");
    let (prices, epic_data) = tokio::join!(
        cache::load(
            s,
            &steam_key,
            "steam-prices",
            3600,
            steam_prices(country, &ids)
        ),
        cache::load(s, &epic_key, "epic:", 900, epic_catalog(country))
    );
    let (prices, stale) = prices?;
    let (epic_data, epic_stale) = epic_data?;
    for offer in offers.iter_mut() {
        if offer.free {
            continue;
        }
        offer.price_unavailable = true;
        if !stale && offer.platform == "steam" {
            if let Some((price, regular, currency, discount)) = prices
                .as_ref()
                .and_then(|data| data.get(offer.app_id.as_deref()?))
                .and_then(|data| price(&data["data"]["price_overview"]))
            {
                offer.free = price.bytes().all(|b| b == b'0' || b == b'.');
                offer.price = price;
                offer.regular_price = Some(regular);
                offer.currency = currency;
                offer.discount_basis_points = discount;
                offer.price_country = Some(country.into());
                offer.price_unavailable = false;
            }
        }
        if offer.price_unavailable {
            offer.currency.clear();
            offer.regular_price = None;
        }
    }
    // Recheck the actual regional discount. Unavailable regions remain identifiable with no misleading price.
    offers.retain(|offer| {
        offer.free
            || offer.price_unavailable
            || offer.regular_price.as_ref().is_some_and(|regular| {
                let units = |value: &str| value.replace('.', "").parse::<u64>().ok();
                units(&offer.price)
                    .zip(units(regular))
                    .is_some_and(|(sale, normal)| {
                        sale.checked_mul(10).is_some_and(|sale| sale < normal)
                    })
            })
    });
    let mut sales = vec![];
    if let Some(data) = epic_data {
        let (new, mut events) = epic(&data, country);
        if !epic_stale {
            offers.retain(|offer| {
                offer.platform != "epic"
                    || !new
                        .iter()
                        .any(|e| e.title.eq_ignore_ascii_case(&offer.title))
            });
            offers.extend(new);
        }
        for sale in &mut events {
            sale.stale |= epic_stale;
        }
        sales = events;
    }
    let mut errors = vec![];
    if stale && !ids.is_empty() {
        errors.push("steam-prices".into());
    }
    if epic_stale {
        errors.push("epic".into());
    }
    Ok((sales, errors))
}
