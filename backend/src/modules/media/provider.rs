//! Trusted catalog assets reuse private media validation, storage and display.
use crate::{
    infrastructure::state::AppState,
    modules::integrations::http,
    shared::{auth::CurrentUser, domain, errors::ApiError},
};
use axum::{
    body::Bytes,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, header},
    response::Response,
};
use sha2::{Digest, Sha256};
use std::collections::HashMap;
use uuid::Uuid;
pub fn trusted(value: &str) -> Option<url::Url> {
    let url = url::Url::parse(value).ok()?;
    let host = url.host_str()?;
    if url.scheme() != "https"
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || ![
            "shared.fastly.steamstatic.com",
            "cdn.akamai.steamstatic.com",
            "cdn.cloudflare.steamstatic.com",
            "images.gog-statics.com",
            "www.gamerpower.com",
            "gamerpower.com",
            "cdn1.epicgames.com",
            "cdn2.unrealengine.com",
            "cdn1.unrealengine.com",
            "shared.akamai.steamstatic.com",
        ]
        .contains(&host)
    {
        return None;
    }
    Some(url)
}
pub async fn register_providers(
    s: &AppState,
    user: Uuid,
    urls: Vec<String>,
) -> Result<HashMap<String, String>, ApiError> {
    let mut result = HashMap::new();
    let mut ids = vec![];
    let mut sources = vec![];
    for source in urls.into_iter().take(31000) {
        if source.len() > 2000 || trusted(&source).is_none() || result.contains_key(&source) {
            continue;
        }
        let hash = Sha256::digest(format!("{user}:{source}").as_bytes());
        let mut bytes = [0; 16];
        bytes.copy_from_slice(&hash[..16]);
        let id = Uuid::from_bytes(bytes);
        ids.push(id);
        sources.push(source.clone());
        result.insert(source, format!("/api/media/providers/{id}"));
    }
    if !ids.is_empty() {
        sqlx::query("INSERT INTO app.provider_media(user_id,id,source_url) SELECT $1,id,source FROM unnest($2::uuid[],$3::text[]) AS assets(id,source) ON CONFLICT DO NOTHING").bind(user).bind(ids).bind(sources).execute(&s.database).await?;
    }
    Ok(result)
}
pub async fn download(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Response, ApiError> {
    let mut tx = s.database.begin().await?;
    let locked: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended($1,0))")
            .bind(format!("provider-media:{}:{id}", u.id))
            .fetch_one(&mut *tx)
            .await?;
    let (source,cached,count):(String,Option<Uuid>,i32)=sqlx::query_as("SELECT source_url,media_id,failure_count FROM app.provider_media WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).fetch_optional(&mut *tx).await?.ok_or_else(domain::not_found)?;
    if let Some(cached) = cached {
        return super::handlers::download(State(s), u, Path(cached)).await;
    }
    if !locked {
        return Err(ApiError::rate_limited(30));
    }
    let url = trusted(&source).ok_or_else(domain::not_found)?;
    let prefix = format!("{}/%", url.origin().ascii_serialization());
    let paused:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.provider_media WHERE source_url LIKE $1 AND retry_at>now())").bind(prefix).fetch_one(&mut *tx).await?;
    if paused {
        return Err(ApiError::rate_limited(300));
    }
    let result = async {
        let response = http::client()?
            .get(url)
            .send()
            .await
            .map_err(|_| ApiError::unavailable())?;
        let mime = response
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|v| v.to_str().ok())
            .unwrap_or("")
            .split(';')
            .next()
            .unwrap_or("")
            .to_owned();
        let bytes = http::bytes(response, super::models::MAX_BYTES).await?;
        super::service::verify_image(&mime, &bytes)?;
        let mut headers = HeaderMap::new();
        headers.insert(
            header::CONTENT_TYPE,
            HeaderValue::from_str(&mime).map_err(|_| ApiError::internal())?,
        );
        // Same upload implementation: validation, owned S3 key and metadata.
        let (_, axum::Json(media)) = super::handlers::upload(
            State(s.clone()),
            CurrentUser {
                id: u.id,
                email: u.email.clone(),
            },
            headers,
            Bytes::from(bytes),
        )
        .await?;
        Ok::<Uuid, ApiError>(media.id)
    }
    .await;
    match result {
        Ok(media) => {
            sqlx::query("UPDATE app.provider_media SET media_id=$3,failure_count=0,retry_at=NULL WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).bind(media).execute(&mut *tx).await?;
            tx.commit().await?;
            super::handlers::download(State(s), u, Path(media)).await
        }
        Err(error) => {
            let count = count.saturating_add(1).min(32);
            let retry = chrono::Utc::now()
                + chrono::Duration::seconds(http::retry_delay(count, error.retry_after));
            sqlx::query("UPDATE app.provider_media SET failure_count=$3,retry_at=$4 WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).bind(count).bind(retry).execute(&mut *tx).await?;
            tx.commit().await?;
            Err(error)
        }
    }
}
