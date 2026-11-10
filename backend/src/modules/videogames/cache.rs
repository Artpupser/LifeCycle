//! Typed partitions of the existing durable feed cache; one request per adapter, shared pauses.
use crate::{
    infrastructure::state::AppState, modules::integrations::http, shared::errors::ApiError,
};
use chrono::{DateTime, Utc};
use serde::{Serialize, de::DeserializeOwned};
use sqlx::types::Json;
pub async fn load<T, F>(
    s: &AppState,
    key: &str,
    family: &str,
    ttl: i64,
    request: F,
) -> Result<(Option<T>, bool), ApiError>
where
    T: Serialize + DeserializeOwned,
    F: std::future::Future<Output = Result<T, ApiError>>,
{
    load_with_refresh(s, key, family, ttl, false, request).await
}
pub async fn load_with_refresh<T, F>(
    s: &AppState,
    key: &str,
    family: &str,
    ttl: i64,
    manual: bool,
    request: F,
) -> Result<(Option<T>, bool), ApiError>
where
    T: Serialize + DeserializeOwned,
    F: std::future::Future<Output = Result<T, ApiError>>,
{
    let mut tx = s.database.begin().await?;
    let locked: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended($1,0))")
            .bind(format!("game-metadata:{family}"))
            .fetch_one(&mut *tx)
            .await?;
    let old:Option<(Json<serde_json::Value>,DateTime<Utc>,bool,i32,Option<DateTime<Utc>>)>=sqlx::query_as("SELECT data,checked_at,last_error,failure_count,retry_at FROM app.game_feeds WHERE id=$1 AND kind='metadata'").bind(key).fetch_optional(&mut *tx).await?;
    let cached = old
        .as_ref()
        .and_then(|row| serde_json::from_value(row.0.0.clone()).ok());
    let fresh = old.as_ref().is_some_and(|row| {
        !row.2 && row.1 > Utc::now() - chrono::Duration::seconds(if manual { 60 } else { ttl })
    });
    let paused:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.game_feeds WHERE kind='metadata' AND id LIKE $1 AND retry_at>now())").bind(format!("{family}%")).fetch_one(&mut *tx).await?;
    if fresh || !locked || paused {
        return Ok((cached, !fresh));
    }
    match request.await {
        Ok(data) => {
            sqlx::query("INSERT INTO app.game_feeds(id,kind,data) VALUES($1,'metadata',$2) ON CONFLICT(id) DO UPDATE SET data=$2,checked_at=now(),last_error=false,failure_count=0,retry_at=NULL").bind(key).bind(Json(&data)).execute(&mut *tx).await?;
            tx.commit().await?;
            Ok((Some(data), false))
        }
        Err(error) => {
            let count = old
                .as_ref()
                .map_or(1, |row| row.3.saturating_add(1).min(32));
            let retry =
                Utc::now() + chrono::Duration::seconds(http::retry_delay(count, error.retry_after));
            sqlx::query("INSERT INTO app.game_feeds(id,kind,data,last_error,failure_count,retry_at) VALUES($1,'metadata','null',true,$2,$3) ON CONFLICT(id) DO UPDATE SET checked_at=now(),last_error=true,failure_count=$2,retry_at=$3").bind(key).bind(count).bind(retry).execute(&mut *tx).await?;
            tx.commit().await?;
            Ok((cached, true))
        }
    }
}
