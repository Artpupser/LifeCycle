//! Web Push is a delivery adapter of the durable feedback queue.
use super::*;
use crate::{modules::integrations::http, shared::auth::session_token};
use axum::http::HeaderMap;
use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use sha2::{Digest, Sha256};
use web_push::{ContentEncoding, SubscriptionInfo, VapidSignatureBuilder, WebPushMessageBuilder};

#[derive(Deserialize, Serialize)]
pub(super) struct Subscription {
    endpoint: String,
    keys: web_push::SubscriptionKeys,
}
#[derive(Deserialize)]
pub(super) struct Endpoint {
    endpoint: String,
}

fn endpoint(value: &str) -> Result<url::Url, ApiError> {
    let url = url::Url::parse(value).map_err(|_| ApiError::validation("Invalid push endpoint"))?;
    let host = url.host_str().unwrap_or("");
    // Never use a browser supplied endpoint as an unrestricted server-side URL.
    let allowed = [
        "fcm.googleapis.com",
        "updates.push.services.mozilla.com",
        "web.push.apple.com",
    ]
    .contains(&host)
        || host.ends_with(".notify.windows.com");
    if !allowed
        || url.scheme() != "https"
        || url.port().is_some()
        || !url.username().is_empty()
        || url.password().is_some()
        || url.fragment().is_some()
        || value.len() > 2048
    {
        return Err(ApiError::validation("Unsupported push endpoint"));
    }
    Ok(url)
}
fn push_message(
    key: &str,
    subject: &str,
    subscription: &SubscriptionInfo,
    payload: &[u8],
) -> Result<web_push::WebPushMessage, ApiError> {
    let mut signature =
        VapidSignatureBuilder::from_base64(key, subscription).map_err(|_| ApiError::internal())?;
    signature.add_claim("sub", subject);
    let mut builder = WebPushMessageBuilder::new(subscription);
    builder.set_payload(ContentEncoding::Aes128Gcm, payload);
    builder.set_ttl(3600);
    builder.set_vapid_signature(signature.build().map_err(|_| ApiError::internal())?);
    builder
        .build()
        .map_err(|_| ApiError::validation("Invalid push subscription"))
}
pub(super) async fn configuration(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
) -> Result<Json<serde_json::Value>, ApiError> {
    let public = s
        .config
        .web_push_private_key
        .as_deref()
        .map(|key| {
            VapidSignatureBuilder::from_base64_no_sub(key)
                .map(|builder| URL_SAFE_NO_PAD.encode(builder.get_public_key()))
        })
        .transpose()
        .map_err(|_| ApiError::internal())?;
    let session = session_token(&headers).ok_or_else(ApiError::unauthenticated)?;
    let subscriptions:Vec<String>=sqlx::query_scalar("SELECT endpoint_hash FROM app.feedback_push_subscriptions WHERE user_id=$1 AND session_hash=$2").bind(u.id).bind(hex::encode(Sha256::digest(session.as_bytes()))).fetch_all(&s.database).await?;
    Ok(Json(
        serde_json::json!({"public_key":public,"subscriptions":subscriptions}),
    ))
}
pub(super) async fn subscribe(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    crate::shared::errors::ApiJson(input): crate::shared::errors::ApiJson<Subscription>,
) -> Result<StatusCode, ApiError> {
    if s.config.web_push_private_key.is_none() {
        return Err(ApiError::unavailable());
    }
    endpoint(&input.endpoint)?;
    let public = URL_SAFE_NO_PAD
        .decode(&input.keys.p256dh)
        .map_err(|_| ApiError::validation("Invalid push key"))?;
    let auth = URL_SAFE_NO_PAD
        .decode(&input.keys.auth)
        .map_err(|_| ApiError::validation("Invalid push auth"))?;
    if public.len() != 65 || public[0] != 4 || auth.len() != 16 {
        return Err(ApiError::validation("Invalid push keys"));
    }
    let info = SubscriptionInfo {
        endpoint: input.endpoint.clone(),
        keys: input.keys.clone(),
    };
    push_message(
        s.config
            .web_push_private_key
            .as_deref()
            .ok_or_else(ApiError::unavailable)?,
        s.config.public_url.as_str(),
        &info,
        b"{}",
    )?;
    let session = session_token(&headers).ok_or_else(ApiError::unauthenticated)?;
    let hash = hex::encode(Sha256::digest(input.endpoint.as_bytes()));
    let mut bytes = [0; 16];
    bytes.copy_from_slice(&Sha256::digest(input.endpoint.as_bytes())[..16]);
    let id = Uuid::from_bytes(bytes);
    let data = s.cipher.encrypt(
        &serde_json::to_vec(&input).map_err(|_| ApiError::internal())?,
        format!("push:{}:{id}", u.id).as_bytes(),
    )?;
    let mut tx = s.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("push:{}", u.id))
        .execute(&mut *tx)
        .await?;
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM app.feedback_push_subscriptions WHERE user_id=$1 AND endpoint_hash<>$2").bind(u.id).bind(&hash).fetch_one(&mut *tx).await?;
    if count >= 20 {
        return Err(ApiError::validation("Push device limit reached"));
    }
    // A reused browser endpoint replaces the previous account/session binding.
    sqlx::query("DELETE FROM app.feedback_push_subscriptions WHERE endpoint_hash=$1 AND (user_id<>$2 OR session_hash<>$3)").bind(&hash).bind(u.id).bind(hex::encode(Sha256::digest(session.as_bytes()))).execute(&mut *tx).await?;
    sqlx::query("INSERT INTO app.feedback_push_subscriptions(id,user_id,session_hash,endpoint_hash,encrypted_data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(endpoint_hash) DO UPDATE SET encrypted_data=$5,failure_count=0,retry_at=NULL").bind(id).bind(u.id).bind(hex::encode(Sha256::digest(session.as_bytes()))).bind(hash).bind(data).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
pub(super) async fn unsubscribe(
    State(s): State<AppState>,
    u: CurrentUser,
    crate::shared::errors::ApiJson(input): crate::shared::errors::ApiJson<Endpoint>,
) -> Result<StatusCode, ApiError> {
    sqlx::query(
        "DELETE FROM app.feedback_push_subscriptions WHERE user_id=$1 AND endpoint_hash=$2",
    )
    .bind(u.id)
    .bind(hex::encode(Sha256::digest(input.endpoint.as_bytes())))
    .execute(&s.database)
    .await?;
    Ok(StatusCode::NO_CONTENT)
}
/// Bounded batches, per-device delivery receipts and independent exponential retry.
pub(crate) async fn deliver(s: &AppState) -> Result<(), ApiError> {
    let Some(key) = s.config.web_push_private_key.as_deref() else {
        return Ok(());
    };
    let mut tx = s.database.begin().await?;
    let locked: bool =
        sqlx::query_scalar("SELECT pg_try_advisory_xact_lock(hashtextextended('feedback-push',0))")
            .fetch_one(&mut *tx)
            .await?;
    if !locked {
        return Ok(());
    }
    sqlx::query("INSERT INTO app.feedback_push_deliveries(notification_id,subscription_id) SELECT n.id,p.id FROM app.feedback_notifications n JOIN app.feedback_push_subscriptions p ON p.user_id=n.user_id JOIN app.sessions session ON session.token_hash=p.session_hash AND session.expires_at>now() WHERE n.read_at IS NULL AND n.created_at>=p.created_at AND n.created_at>now()-interval '1 day' ON CONFLICT DO NOTHING").execute(&mut *tx).await?;
    let rows:Vec<(Uuid,Uuid,Uuid,Vec<u8>,Vec<u8>,i32)>=sqlx::query_as("SELECT d.notification_id,p.id,p.user_id,n.encrypted_data,p.encrypted_data,d.failure_count FROM app.feedback_push_deliveries d JOIN app.feedback_push_subscriptions p ON p.id=d.subscription_id JOIN app.feedback_notifications n ON n.id=d.notification_id JOIN app.sessions session ON session.token_hash=p.session_hash AND session.expires_at>now() WHERE d.sent_at IS NULL AND n.read_at IS NULL AND n.created_at>now()-interval '1 day' AND (d.retry_at IS NULL OR d.retry_at<=now()) AND (p.retry_at IS NULL OR p.retry_at<=now()) ORDER BY n.created_at LIMIT 20").fetch_all(&mut *tx).await?;
    let client = http::client()?;
    for (notification, id, user, message, subscription, failures) in rows {
        let info: Subscription = serde_json::from_slice(
            &s.cipher
                .decrypt(&subscription, format!("push:{user}:{id}").as_bytes())?,
        )
        .map_err(|_| ApiError::internal())?;
        endpoint(&info.endpoint)?;
        let message: Message = serde_json::from_slice(&s.cipher.decrypt(
            &message,
            format!("feedback:{user}:{notification}").as_bytes(),
        )?)
        .map_err(|_| ApiError::internal())?;
        // Keep personal content off lock screens; the shared inbox owns translated content.
        let language = crate::shared::domain::settings(s, user).await?.language;
        let body = if language == "en" {
            "You have new notifications. Open LifeCycle to view them."
        } else {
            "Есть новые уведомления. Откройте LifeCycle, чтобы прочитать их."
        };
        let payload=serde_json::to_vec(&serde_json::json!({"title":"LifeCycle","body":body,"href":message.href,"id":notification,"user_id":user})).map_err(|_|ApiError::internal())?;
        let subscription = SubscriptionInfo {
            endpoint: info.endpoint,
            keys: info.keys,
        };
        let built = match push_message(key, s.config.public_url.as_str(), &subscription, &payload) {
            Ok(message) => message,
            Err(_) => {
                sqlx::query("DELETE FROM app.feedback_push_subscriptions WHERE id=$1")
                    .bind(id)
                    .execute(&mut *tx)
                    .await?;
                continue;
            }
        };
        let request = web_push::request_builder::build_request::<reqwest::Body>(built);
        let (parts, body) = request.into_parts();
        let mut outgoing = client.post(parts.uri.to_string()).body(body);
        for (name, value) in &parts.headers {
            outgoing = outgoing.header(name.as_str(), value.as_bytes());
        }
        let result = outgoing.send().await;
        match result {
            Ok(response) if response.status().is_success() => {
                sqlx::query("UPDATE app.feedback_push_deliveries SET sent_at=now(),failure_count=0,retry_at=NULL WHERE notification_id=$1 AND subscription_id=$2").bind(notification).bind(id).execute(&mut *tx).await?;
            }
            Ok(response) if [404, 410].contains(&response.status().as_u16()) => {
                sqlx::query("DELETE FROM app.feedback_push_subscriptions WHERE id=$1")
                    .bind(id)
                    .execute(&mut *tx)
                    .await?;
            }
            result => {
                let retry_after = result.ok().and_then(|response| {
                    response
                        .headers()
                        .get("Retry-After")
                        .and_then(|value| value.to_str().ok())
                        .and_then(|v| v.parse::<u64>().ok())
                });
                let count = failures.saturating_add(1).min(32);
                let delay = http::retry_delay(count, retry_after);
                sqlx::query("UPDATE app.feedback_push_deliveries SET failure_count=$3,retry_at=now()+make_interval(secs=>$4) WHERE notification_id=$1 AND subscription_id=$2").bind(notification).bind(id).bind(count).bind(delay as f64).execute(&mut *tx).await?;
                sqlx::query("UPDATE app.feedback_push_subscriptions SET retry_at=now()+make_interval(secs=>$2) WHERE id=$1").bind(id).bind(delay as f64).execute(&mut *tx).await?;
            }
        }
    }
    sqlx::query("DELETE FROM app.feedback_push_deliveries WHERE sent_at<now()-interval '7 days'")
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn restricts_push_endpoints_to_browser_services() {
        for value in [
            "https://fcm.googleapis.com/fcm/send/abc",
            "https://web.push.apple.com/a",
            "https://wns2.notify.windows.com/w/?token=abc",
        ] {
            assert!(endpoint(value).is_ok());
        }
        for value in [
            "http://fcm.googleapis.com/a",
            "https://localhost/a",
            "https://fcm.googleapis.com.evil.test/a",
            "https://user@fcm.googleapis.com/a",
            "https://fcm.googleapis.com:444/a",
            "https://fcm.googleapis.com/a#fragment",
        ] {
            assert!(endpoint(value).is_err());
        }
    }
    #[test]
    fn builds_standard_encrypted_web_push_with_vapid() {
        let subscription = SubscriptionInfo::new(
            "https://updates.push.services.mozilla.com/wpush/v1/test",
            "BLMbF9ffKBiWQLCKvTHb6LO8Nb6dcUh6TItC455vu2kElga6PQvUmaFyCdykxY2nOSSL3yKgfbmFLRTUaGv4yV8",
            "xS03Fi5ErfTNH_l9WHE9Ig",
        );
        let message = push_message(
            "IQ9Ur0ykXoHS9gzfYX0aBjy9lvdrjx_PFUXmie9YRcY",
            "https://example.com/",
            &subscription,
            b"private message",
        )
        .unwrap();
        let request = web_push::request_builder::build_request::<reqwest::Body>(message);
        assert_eq!(request.headers()["TTL"], "3600");
        assert_eq!(request.headers()["content-encoding"], "aes128gcm");
        assert!(
            request.headers()["authorization"]
                .to_str()
                .unwrap()
                .starts_with("vapid ")
        );
        let invalid = SubscriptionInfo::new("https://fcm.googleapis.com/a", "invalid", "invalid");
        assert!(
            push_message(
                "IQ9Ur0ykXoHS9gzfYX0aBjy9lvdrjx_PFUXmie9YRcY",
                "https://example.com/",
                &invalid,
                b"test"
            )
            .is_err()
        );
    }
}
