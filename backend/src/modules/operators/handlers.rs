use super::models::{Lookup, Preferences, ProviderData, ResultData, Status};
use super::service::{digits, fingerprint};
use crate::{
    infrastructure::state::AppState,
    shared::auth::CurrentUser,
    shared::errors::{ApiError, ApiJson},
};
use axum::{Json, extract::State};

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Status>, ApiError> {
    let row: Option<(bool, bool)> = sqlx::query_as(
        "SELECT enabled,encrypted_key IS NOT NULL FROM app.operator_preferences WHERE user_id=$1",
    )
    .bind(u.id)
    .fetch_optional(&s.database)
    .await?;
    let (enabled, configured) = row.unwrap_or((true, false));
    Ok(Json(Status {
        enabled,
        configured,
    }))
}

pub(super) async fn save(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Preferences>,
) -> Result<Json<Status>, ApiError> {
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("operator-settings:{}", u.id))
        .execute(&mut *tx)
        .await?;
    let old: Option<(Option<Vec<u8>>,)> = sqlx::query_as(
        "SELECT encrypted_key FROM app.operator_preferences WHERE user_id=$1 FOR UPDATE",
    )
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?;
    let mut key = old.and_then(|v| v.0);
    if v.remove_key {
        key = None;
    } else if let Some(input) = v.api_key.filter(|s| !s.trim().is_empty()) {
        if input.len() > 512 || input.chars().any(char::is_control) {
            return Err(ApiError::validation("Invalid provider key"));
        }
        key = Some(s.cipher.encrypt(
            input.trim().as_bytes(),
            format!("operator-key:{}", u.id).as_bytes(),
        )?);
    }
    sqlx::query("INSERT INTO app.operator_preferences(user_id,enabled,encrypted_key) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET enabled=$2,encrypted_key=$3").bind(u.id).bind(v.enabled).bind(&key).execute(&mut *tx).await?;
    sqlx::query("DELETE FROM app.operator_cache WHERE user_id=$1")
        .bind(u.id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(Json(Status {
        enabled: v.enabled,
        configured: key.is_some(),
    }))
}

pub(super) async fn lookup(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Lookup>,
) -> Result<Json<Option<ResultData>>, ApiError> {
    let phone = digits(&v.phone)?;
    let pref: Option<(bool, Option<Vec<u8>>)> = sqlx::query_as(
        "SELECT enabled,encrypted_key FROM app.operator_preferences WHERE user_id=$1",
    )
    .bind(u.id)
    .fetch_optional(&s.database)
    .await?;
    let Some((true, Some(encrypted_key))) = pref else {
        return Ok(Json(None));
    };
    let number_key = fingerprint(&s, u.id, &phone);
    let context = format!("operator-cache:{}:{number_key}", u.id);
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(&context)
        .execute(&mut *tx)
        .await?;
    if let Some(bytes) = sqlx::query_scalar::<_, Vec<u8>>("SELECT encrypted_data FROM app.operator_cache WHERE user_id=$1 AND number_key=$2 AND expires_at>now()")
        .bind(u.id).bind(&number_key).fetch_optional(&mut *tx).await? {
        let mut result:Option<ResultData> = serde_json::from_slice(&s.cipher.decrypt(&bytes,context.as_bytes())?).map_err(|_|ApiError::internal())?;
        if let Some(item)=&mut result {item.source="cache".into();}
        return Ok(Json(result));
    }
    let key = String::from_utf8(
        s.cipher
            .decrypt(&encrypted_key, format!("operator-key:{}", u.id).as_bytes())?,
    )
    .map_err(|_| ApiError::internal())?;
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| ApiError::unavailable())?;
    let response = client
        .get("https://num7.ru/v1/lookup")
        .query(&[("phone", phone.as_str())])
        .header("X-API-Key", key)
        .send()
        .await
        .map_err(|_| ApiError::unavailable())?;
    if !response.status().is_success() {
        return Err(ApiError::unavailable());
    }
    if response.content_length().is_some_and(|size| size > 16384) {
        return Err(ApiError::unavailable());
    }
    let mut bytes = Vec::new();
    let mut response = response;
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| ApiError::unavailable())?
    {
        if bytes.len() + chunk.len() > 16384 {
            return Err(ApiError::unavailable());
        }
        bytes.extend_from_slice(&chunk);
    }
    let body: ProviderData = serde_json::from_slice(&bytes).map_err(|_| ApiError::unavailable())?;
    let result = body
        .operator
        .filter(|name| {
            body.found
                && !name.trim().is_empty()
                && name.len() < 200
                && !name.chars().any(char::is_control)
        })
        .map(|operator| ResultData {
            operator,
            ported: body.mnp_ported,
            source: "online".into(),
            checked_at: chrono::Utc::now(),
        });
    let ttl_seconds: i32 = if result.is_some() {
        24 * 60 * 60
    } else {
        60 * 60
    };
    let bytes = s.cipher.encrypt(
        &serde_json::to_vec(&result).map_err(|_| ApiError::internal())?,
        context.as_bytes(),
    )?;
    sqlx::query("INSERT INTO app.operator_cache(user_id,number_key,encrypted_data,expires_at) VALUES($1,$2,$3,now()+($4::int*interval '1 second')) ON CONFLICT(user_id,number_key) DO UPDATE SET encrypted_data=$3,checked_at=now(),expires_at=now()+($4::int*interval '1 second')").bind(u.id).bind(number_key).bind(bytes).bind(ttl_seconds).execute(&mut *tx).await?;
    sqlx::query(
        "DELETE FROM app.operator_cache WHERE user_id=$1 AND expires_at<now()-interval '7 days'",
    )
    .bind(u.id)
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok(Json(result))
}
