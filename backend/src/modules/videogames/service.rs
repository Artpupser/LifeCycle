use super::{models::*, providers};
use crate::{
    infrastructure::state::AppState,
    modules::integrations,
    shared::{domain, errors::ApiError, feedback},
};
use chrono::{DateTime, Utc};
use serde_json::json;
use sha2::{Digest, Sha256};
use sqlx::types::Json as DbJson;
use std::collections::HashSet;
use uuid::Uuid;

pub async fn refresh(s: &AppState, manual: bool) -> Result<(), ApiError> {
    let mut tx = s.database.begin().await?;
    let locked: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended('game-feeds',0))")
            .fetch_one(&mut *tx)
            .await?;
    if !locked {
        return Ok(());
    }
    let states: Vec<(String, DateTime<Utc>, i32, Option<DateTime<Utc>>)> =
        sqlx::query_as("SELECT id,checked_at,failure_count,retry_at FROM app.game_feeds")
            .fetch_all(&mut *tx)
            .await?;
    let now = Utc::now();
    let due = |source: &str| {
        states.iter().find(|row| row.0 == source).is_none_or(|row| {
            row.1 <= now - chrono::Duration::minutes(if manual { 1 } else { 5 })
                && row.3.is_none_or(|retry| retry <= now)
        })
    };
    let free = async {
        if due("gamerpower") {
            Some(providers::giveaways().await)
        } else {
            None
        }
    };
    let discount = async {
        if due("steam") {
            Some(providers::discounts().await)
        } else {
            None
        }
    };
    let (free, discount) = tokio::join!(free, discount);
    for (id, result) in [("gamerpower", free), ("steam", discount)] {
        let Some(result) = result else {
            continue;
        };
        match result {
            Ok(offers) => {
                sqlx::query("INSERT INTO app.game_feeds(id,data) VALUES($1,$2) ON CONFLICT(id) DO UPDATE SET data=$2,checked_at=now(),last_error=false,failure_count=0,retry_at=NULL").bind(id).bind(DbJson(offers)).execute(&mut *tx).await?;
            }
            Err(error) => {
                let count = states
                    .iter()
                    .find(|row| row.0 == id)
                    .map_or(1, |row| row.2.saturating_add(1).min(32));
                let retry = Utc::now()
                    + chrono::Duration::seconds(integrations::http::retry_delay(
                        count,
                        error.retry_after,
                    ));
                sqlx::query("INSERT INTO app.game_feeds(id,data,last_error,failure_count,retry_at) VALUES($1,'[]',true,$2,$3) ON CONFLICT(id) DO UPDATE SET last_error=true,checked_at=now(),failure_count=$2,retry_at=$3").bind(id).bind(count).bind(retry).execute(&mut *tx).await?;
            }
        }
    }
    tx.commit().await?;
    Ok(())
}
pub async fn feed(
    s: &AppState,
) -> Result<(Vec<Offer>, Option<DateTime<Utc>>, Vec<String>), ApiError> {
    let rows: Vec<(String, DbJson<Vec<Offer>>, DateTime<Utc>, bool)> = sqlx::query_as(
        "SELECT id,data,checked_at,last_error FROM app.game_feeds WHERE kind='offers'",
    )
    .fetch_all(&s.database)
    .await?;
    let mut offers = vec![];
    let mut checked = None;
    let mut errors = vec![];
    for (id, data, at, error) in rows {
        if !providers::SOURCES.contains(&id.as_str()) {
            continue;
        }
        if error || at < Utc::now() - chrono::Duration::minutes(30) {
            errors.push(id);
        }
        checked = Some(checked.map_or(at, |old: DateTime<Utc>| old.min(at)));
        offers.extend(data.0.into_iter().filter(|offer| {
            providers::official_offer(offer) && offer.ends_at.is_none_or(|end| end > Utc::now())
        }));
    }
    if checked.is_none() {
        errors = providers::SOURCES.into_iter().map(str::to_owned).collect();
    }
    let epic:Option<(DbJson<serde_json::Value>,bool,DateTime<Utc>)>=sqlx::query_as("SELECT data,last_error,checked_at FROM app.game_feeds WHERE id='epic:US' AND kind='metadata'").fetch_optional(&s.database).await?;
    if let Some((data, error, at)) = epic {
        offers.extend(super::market::epic(&data.0, "US").0);
        if error || at < Utc::now() - chrono::Duration::minutes(30) {
            errors.push("epic".into());
        }
    } else if !errors.iter().any(|source| source == "epic") {
        errors.push("epic".into());
    }
    offers.sort_by(|a, b| {
        b.free
            .cmp(&a.free)
            .then(b.discount_basis_points.cmp(&a.discount_basis_points))
            .then(a.title.cmp(&b.title))
            .then(a.id.cmp(&b.id))
    });
    let mut ids = HashSet::new();
    offers.retain(|offer| {
        ids.insert((
            offer.platform.clone(),
            offer.app_id.clone().unwrap_or_else(|| offer.url.clone()),
        ))
    });
    Ok((offers, checked, errors))
}
async fn baseline(
    s: &AppState,
    user: Uuid,
    offers: &[Offer],
    errors: &[String],
) -> Result<(), ApiError> {
    let mut tx = s.database.begin().await?;
    let initialized: DbJson<Vec<String>> = sqlx::query_scalar(
        "SELECT initialized_sources FROM app.gaming_preferences WHERE user_id=$1 FOR UPDATE",
    )
    .bind(user)
    .fetch_one(&mut *tx)
    .await?;
    let mut sources = initialized.0;
    for source in providers::SOURCES {
        if errors.iter().any(|error| error == source) || sources.iter().any(|value| value == source)
        {
            continue;
        }
        for offer in offers.iter().filter(|o| o.free && o.source == source) {
            sqlx::query("INSERT INTO app.game_offer_seen(user_id,offer_id) VALUES($1,$2) ON CONFLICT DO NOTHING").bind(user).bind(&offer.id).execute(&mut *tx).await?;
        }
        sources.push(source.to_owned());
    }
    sqlx::query("UPDATE app.gaming_preferences SET initialized_at=now(),initialized_sources=$2 WHERE user_id=$1").bind(user).bind(DbJson(sources)).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
pub async fn catalog(s: &AppState, user: Uuid, manual: bool) -> Result<Catalog, ApiError> {
    let has_feed: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.game_feeds)")
        .fetch_one(&s.database)
        .await?;
    if !has_feed {
        refresh(s, manual).await?;
    }
    sqlx::query("INSERT INTO app.gaming_preferences(user_id) VALUES($1) ON CONFLICT DO NOTHING")
        .bind(user)
        .execute(&s.database)
        .await?;
    let (mut offers, checked_at, mut unavailable_sources) = feed(s).await?;
    let profile = crate::modules::profile::load(s, user).await?;
    let country = super::market::country(&profile.residence_country);
    let (regional, sale_catalog) = tokio::join!(
        super::market::regionalize(s, country.as_deref(), &mut offers, manual),
        super::market::sales_catalog(s, country.is_none())
    );
    let (mut regional_sales, regional_errors) = regional?;
    let (mut all_sales, mut unavailable_sales) = sale_catalog?;
    if regional_errors.iter().any(|source| source == "epic")
        && !unavailable_sales.contains(&"epic".to_owned())
    {
        unavailable_sales.push("epic".into());
    }
    unavailable_sources.extend(regional_errors);
    if country.is_some() {
        all_sales.retain(|sale| sale.platform != "epic");
        all_sales.append(&mut regional_sales);
    }
    all_sales.sort_by_key(|sale| sale.starts_at);
    let connected_platforms = integrations::list(s, user)
        .await?
        .into_iter()
        .filter(|p| p.connected && p.provider.kind == "gaming")
        .map(|p| p.provider.id)
        .collect();
    baseline(s, user, &offers, &unavailable_sources).await?;
    let snapshots = integrations::snapshots(s, user).await?;
    let available = !snapshots.is_empty();
    let playtime_available =
        available && snapshots.iter().all(|snapshot| snapshot.playtime_available);
    let recent_available = !snapshots.is_empty() && snapshots.iter().all(|v| v.recent_available);
    let mut library: Vec<_> = snapshots.into_iter().flat_map(|v| v.games).collect();
    library.sort_by(|a, b| {
        b.playtime_minutes
            .cmp(&a.playtime_minutes)
            .then(a.name.cmp(&b.name))
    });
    let mut unique = HashSet::new();
    library.retain(|game| unique.insert((game.provider.clone(), game.id.clone())));
    let steam_image = |id: &str| {
        format!(
            "https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/{id}/header.jpg"
        )
    };
    let image_for_game = |game: &crate::modules::integrations::Game| {
        game.image_url
            .as_ref()
            .filter(|url| crate::modules::media::provider::trusted(url).is_some())
            .cloned()
            .or_else(|| (game.provider == "steam").then(|| steam_image(&game.id)))
    };
    let image_for_offer = |offer: &Offer| {
        offer
            .image_url
            .as_ref()
            .filter(|url| crate::modules::media::provider::trusted(url).is_some())
            .cloned()
            .or_else(|| {
                offer
                    .app_id
                    .as_ref()
                    .filter(|_| offer.platform == "steam")
                    .map(|id| steam_image(id))
            })
    };
    let images = crate::modules::media::register_providers(
        s,
        user,
        library
            .iter()
            .filter_map(image_for_game)
            .chain(offers.iter().filter_map(image_for_offer))
            .collect(),
    )
    .await?;
    for game in &mut library {
        game.preview = image_for_game(game).and_then(|url| images.get(&url).cloned());
        game.image_url = None;
    }
    for offer in &mut offers {
        offer.preview = image_for_offer(offer).and_then(|url| images.get(&url).cloned());
        offer.image_url = None;
    }
    let owned: HashSet<_> = library
        .iter()
        .filter(|game| game.ownership_verified)
        .map(|game| (game.provider.as_str(), game.id.as_str()))
        .collect();
    let known: HashSet<String> = sqlx::query_scalar(
        "SELECT provider FROM app.integrations WHERE user_id=$1 AND encrypted_snapshot IS NOT NULL AND provider NOT IN ('xbox','playstation')",
    )
    .bind(user)
    .fetch_all(&s.database)
    .await?
    .into_iter()
    .collect();
    let marked: HashSet<String> =
        sqlx::query_scalar("SELECT offer_id FROM app.game_offer_marks WHERE user_id=$1")
            .bind(user)
            .fetch_all(&s.database)
            .await?
            .into_iter()
            .collect();
    for offer in &mut offers {
        offer.ownership = if offer
            .ownership_ids
            .iter()
            .any(|id| owned.contains(&(offer.platform.as_str(), id.as_str())))
            || offer
                .app_id
                .as_ref()
                .is_some_and(|id| owned.contains(&(offer.platform.as_str(), id.as_str())))
        {
            "verified"
        } else if marked.contains(&offer.id) {
            "marked"
        } else if known.contains(&offer.platform)
            && ((offer.platform == "steam" && offer.app_id.is_some())
                || !offer.ownership_ids.is_empty())
        {
            "absent"
        } else {
            "unknown"
        }
        .into();
    }
    let stats = Stats {
        available,
        games: library.len(),
        played: playtime_available.then(|| {
            library
                .iter()
                .filter(|game| game.playtime_minutes.is_some_and(|minutes| minutes > 0))
                .count()
        }),
        playtime_minutes: playtime_available.then(|| {
            library
                .iter()
                .filter_map(|game| game.playtime_minutes)
                .sum()
        }),
        recent_minutes: recent_available
            .then(|| library.iter().filter_map(|game| game.recent_minutes).sum()),
    };
    let mut calendar_sales = vec![];
    for sale in &all_sales {
        let exists = crate::modules::countdowns::external_event_exists(
            s,
            user,
            &format!("gaming:{}:start", sale.id),
        )
        .await?;
        if exists {
            calendar_sales.push(sale.id.clone());
        }
    }
    let notify_free =
        sqlx::query_scalar("SELECT notify_free FROM app.gaming_preferences WHERE user_id=$1")
            .bind(user)
            .fetch_one(&s.database)
            .await?;
    Ok(Catalog {
        country,
        connected_platforms,
        unavailable_sales,
        offers,
        library,
        stats,
        sales: all_sales,
        calendar_sales,
        notify_free,
        checked_at,
        unavailable_sources,
    })
}
pub async fn preferences(s: &AppState, user: Uuid, input: Preferences) -> Result<(), ApiError> {
    sqlx::query("INSERT INTO app.gaming_preferences(user_id,notify_free) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET notify_free=$2,initialized_at=CASE WHEN app.gaming_preferences.notify_free<>$2 THEN NULL ELSE app.gaming_preferences.initialized_at END,initialized_sources=CASE WHEN app.gaming_preferences.notify_free<>$2 THEN '[]'::jsonb ELSE app.gaming_preferences.initialized_sources END").bind(user).bind(input.notify_free).execute(&s.database).await?;
    let (offers, _, errors) = feed(s).await?;
    if input.notify_free {
        baseline(s, user, &offers, &errors).await?;
    }
    Ok(())
}
pub async fn mark(s: &AppState, user: Uuid, input: Mark) -> Result<(), ApiError> {
    if input.offer_id.len() > 300 {
        return Err(ApiError::validation("Invalid game offer"));
    }
    if !input.acquired {
        sqlx::query("DELETE FROM app.game_offer_marks WHERE user_id=$1 AND offer_id=$2")
            .bind(user)
            .bind(input.offer_id)
            .execute(&s.database)
            .await?;
        return Ok(());
    }
    let (offers, _, _) = feed(s).await?;
    let mut valid = offers.iter().any(|o| o.id == input.offer_id);
    if !valid && input.offer_id.starts_with("epic:") {
        let profile = crate::modules::profile::load(s, user).await?;
        if let Some(country) = super::market::country(&profile.residence_country) {
            let data: Option<DbJson<serde_json::Value>> = sqlx::query_scalar(
                "SELECT data FROM app.game_feeds WHERE id=$1 AND kind='metadata'",
            )
            .bind(format!("epic:{country}"))
            .fetch_optional(&s.database)
            .await?;
            valid = data.is_some_and(|data| {
                super::market::epic(&data.0, &country)
                    .0
                    .iter()
                    .any(|offer| offer.id == input.offer_id)
            });
        }
    }
    if !valid {
        return Err(domain::not_found());
    }
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("game-marks:{user}"))
        .execute(&mut *tx)
        .await?;
    let count: i64 =
        sqlx::query_scalar("SELECT count(*) FROM app.game_offer_marks WHERE user_id=$1")
            .bind(user)
            .fetch_one(&mut *tx)
            .await?;
    if count >= 5000 {
        return Err(ApiError::validation("Game mark limit reached"));
    }
    sqlx::query(
        "INSERT INTO app.game_offer_marks(user_id,offer_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    )
    .bind(user)
    .bind(input.offer_id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(())
}
pub async fn add_sale(s: &AppState, user: Uuid, id: &str) -> Result<Vec<Uuid>, ApiError> {
    let (mut all_sales, _) = super::market::sales_catalog(s, true).await?;
    let profile = crate::modules::profile::load(s, user).await?;
    if let Some(country) = super::market::country(&profile.residence_country) {
        let data: Option<DbJson<serde_json::Value>> =
            sqlx::query_scalar("SELECT data FROM app.game_feeds WHERE id=$1 AND kind='metadata'")
                .bind(format!("epic:{country}"))
                .fetch_optional(&s.database)
                .await?;
        if let Some(data) = data {
            all_sales.extend(super::market::epic(&data.0, &country).1);
        }
    }
    let sale = all_sales
        .into_iter()
        .find(|sale| sale.id == id && sale.ends_at > Utc::now())
        .ok_or_else(domain::not_found)?;
    let language = domain::settings(s, user).await?.language;
    let title = if language == "en" {
        sale.title_en.as_str()
    } else {
        sale.title.as_str()
    };
    let mut ids = vec![];
    for (kind, at) in [("start", sale.starts_at), ("end", sale.ends_at)] {
        let label = match (language.as_str(), kind) {
            ("en", "start") => "Begins",
            ("en", _) => "Ends",
            (_, "start") => "Начало",
            _ => "Окончание",
        };
        ids.push(
            crate::modules::countdowns::import_external_event(
                s,
                user,
                &format!("gaming:{}:{kind}", sale.id),
                &format!("{title} · {label}"),
                at,
                &sale.source,
                sale.all_day,
            )
            .await?,
        );
    }
    Ok(ids)
}
pub async fn notify_subscribers(s: &AppState) -> Result<(), ApiError> {
    let (offers, _, errors) = feed(s).await?;
    if errors.len() >= providers::SOURCES.len() {
        return Ok(());
    }
    let free: Vec<_> = offers
        .iter()
        .filter(|offer| offer.free && !errors.contains(&offer.source))
        .collect();
    let users: Vec<Uuid> =
        sqlx::query_scalar("SELECT user_id FROM app.gaming_preferences WHERE notify_free")
            .fetch_all(&s.database)
            .await?;
    for user in users {
        let mut tx = s.database.begin().await?;
        let row:Option<(bool,DbJson<Vec<String>>)>=sqlx::query_as("SELECT notify_free,initialized_sources FROM app.gaming_preferences WHERE user_id=$1 FOR UPDATE").bind(user).fetch_optional(&mut *tx).await?;
        let Some((true, initialized)) = row else {
            continue;
        };
        let mut new = vec![];
        for offer in &free {
            let inserted=sqlx::query("INSERT INTO app.game_offer_seen(user_id,offer_id) VALUES($1,$2) ON CONFLICT DO NOTHING").bind(user).bind(&offer.id).execute(&mut *tx).await?.rows_affected();
            if inserted > 0 && initialized.0.contains(&offer.source) {
                new.push(offer.id.as_str());
            }
        }
        let mut sources = initialized.0;
        for source in providers::SOURCES {
            if !errors.iter().any(|error| error == source)
                && !sources.iter().any(|value| value == source)
            {
                sources.push(source.to_owned());
            }
        }
        sqlx::query("UPDATE app.gaming_preferences SET initialized_at=now(),initialized_sources=$2 WHERE user_id=$1").bind(user).bind(DbJson(sources)).execute(&mut *tx).await?;
        if !new.is_empty() {
            new.sort();
            let key = format!(
                "new-free-games:{}",
                hex::encode(Sha256::digest(new.join("|").as_bytes()))
            );
            feedback::enqueue(
                s,
                &mut tx,
                user,
                &key,
                feedback::Message {
                    message: "Новые бесплатные игры: {count}".into(),
                    parameters: json!({"count":new.len()}),
                    href: "/videogames".into(),
                },
            )
            .await?;
        }
        tx.commit().await?;
    }
    sqlx::query("DELETE FROM app.game_offer_seen WHERE seen_at<now()-interval '365 days'")
        .execute(&s.database)
        .await?;
    Ok(())
}
