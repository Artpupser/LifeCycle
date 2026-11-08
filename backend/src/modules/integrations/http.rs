use crate::shared::errors::ApiError;
pub fn client() -> Result<reqwest::Client, ApiError> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(4))
        .redirect(reqwest::redirect::Policy::none())
        .user_agent("LifeCycle/0.1 (personal game library)")
        .build()
        .map_err(|_| ApiError::unavailable())
}
pub async fn bytes(mut response: reqwest::Response, limit: usize) -> Result<Vec<u8>, ApiError> {
    if !response.status().is_success() {
        let status = response.status();
        let wait = retry_after(
            response
                .headers()
                .get("retry-after")
                .and_then(|value| value.to_str().ok()),
            chrono::Utc::now(),
        );
        let mut error = if status.as_u16() == 429 {
            ApiError::rate_limited(wait.unwrap_or(300).max(300))
        } else {
            ApiError::unavailable()
        };
        error.retry_after = Some(error.retry_after.unwrap_or(0).max(wait.unwrap_or(300)));
        return Err(error);
    }
    if response.content_length().is_some_and(|n| n > limit as u64) {
        return Err(ApiError::unavailable());
    }
    let mut bytes = vec![];
    while let Some(chunk) = response
        .chunk()
        .await
        .map_err(|_| ApiError::unavailable())?
    {
        if bytes.len() + chunk.len() > limit {
            return Err(ApiError::unavailable());
        }
        bytes.extend_from_slice(&chunk);
    }
    Ok(bytes)
}
pub async fn json<T: serde::de::DeserializeOwned>(
    request: reqwest::RequestBuilder,
    limit: usize,
) -> Result<T, ApiError> {
    let response = request.send().await.map_err(|_| ApiError::unavailable())?;
    serde_json::from_slice(&bytes(response, limit).await?).map_err(|_| ApiError::unavailable())
}

/// Shared provider policy: failed requests wait at least five minutes, then back off to one hour.
pub fn retry_delay(failures: i32, retry_after: Option<u64>) -> i64 {
    let exponential = 300u64.saturating_mul(1u64 << failures.saturating_sub(1).clamp(0, 4));
    exponential
        .min(3600)
        .max(retry_after.unwrap_or(0))
        .min(i32::MAX as u64) as i64
}
pub fn retry_after(value: Option<&str>, now: chrono::DateTime<chrono::Utc>) -> Option<u64> {
    let value = value?.trim();
    if value.bytes().all(|byte| byte.is_ascii_digit()) && !value.is_empty() {
        return value.parse::<u64>().ok();
    }
    chrono::DateTime::parse_from_rfc2822(value)
        .ok()
        .map(|date| {
            (date.with_timezone(&chrono::Utc) - now)
                .num_seconds()
                .max(0) as u64
        })
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn provider_backoff_grows_and_obeys_server_deadlines() {
        assert_eq!(retry_delay(1, None), 300);
        assert_eq!(retry_delay(2, None), 600);
        assert_eq!(retry_delay(30, None), 3600);
        assert_eq!(retry_delay(1, Some(7200)), 7200);
        let now = "2026-11-08T12:00:00Z".parse().unwrap();
        assert_eq!(retry_after(Some("900"), now), Some(900));
        assert_eq!(
            retry_after(Some("Sun, 08 Nov 2026 12:15:00 GMT"), now),
            Some(900)
        );
    }
    #[tokio::test]
    async fn provider_rate_limit_retains_retry_after() {
        let response = reqwest::Response::from(
            axum::http::Response::builder()
                .status(429)
                .header("retry-after", "900")
                .body("limited")
                .unwrap(),
        );
        let error = bytes(response, 1024).await.unwrap_err();
        assert_eq!(error.status.as_u16(), 429);
        assert_eq!(error.retry_after, Some(900));
    }
}
