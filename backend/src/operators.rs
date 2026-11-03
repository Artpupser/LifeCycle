use crate::{
    auth::CurrentUser,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{
    Json, Router,
    extract::State,
    routing::{get, post},
};
use hmac::{Hmac, Mac};
use serde::{Deserialize, Serialize};
use sha2::Sha256;
use uuid::Uuid;
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Lookup {
    phone: String,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Preferences {
    enabled: bool,
    api_key: Option<String>,
    #[serde(default)]
    remove_key: bool,
}
#[derive(Serialize)]
struct Status {
    enabled: bool,
    configured: bool,
}
#[derive(Serialize, Deserialize, Clone)]
struct ResultData {
    operator: String,
    source: String,
    checked_at: chrono::DateTime<chrono::Utc>,
    ported: bool,
}
#[derive(Deserialize)]
struct ProviderData {
    operator: Option<String>,
    #[serde(default)]
    mnp_ported: bool,
    #[serde(default)]
    found: bool,
}
fn digits(phone: &str) -> Result<String, ApiError> {
    let value = phone.trim();
    if value.len() != 12
        || !value.starts_with("+79")
        || !value[1..].bytes().all(|b| b.is_ascii_digit())
    {
        return Err(ApiError::validation("A Russian mobile number is required"));
    }
    Ok(value.into())
}
fn fingerprint(s: &AppState, user: Uuid, phone: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(&s.config.data_encryption_key).expect("HMAC key");
    mac.update(format!("operator:{user}:{phone}").as_bytes());
    mac.finalize()
        .into_bytes()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/operators/settings", get(read).put(save))
        .route("/api/operators/lookup", post(lookup))
}
async fn read(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Status>, ApiError> {
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
async fn save(
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
async fn lookup(
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
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn accepts_only_normalized_russian_numbers() {
        assert!(digits("+79161234567").is_ok());
        for value in [
            "79161234567",
            "+491234567890",
            "+79161234567\nX:1",
            "+7900<script>",
        ] {
            assert!(digits(value).is_err());
        }
    }
}
