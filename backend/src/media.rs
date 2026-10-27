use crate::{auth::CurrentUser, domain, error::ApiError, state::AppState};
use axum::{
    Json, Router,
    body::Bytes,
    extract::{DefaultBodyLimit, Path, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
    routing::get,
};
use serde::Serialize;
use std::time::Duration;
use uuid::Uuid;
const MAX_BYTES: usize = 8 * 1024 * 1024;
#[derive(Serialize)]
struct Media {
    id: Uuid,
    url: String,
    content_type: String,
    size: i64,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route(
            "/api/media",
            axum::routing::post(upload).layer(DefaultBodyLimit::max(MAX_BYTES)),
        )
        .route("/api/media/{id}", get(download))
}
async fn upload(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    body: Bytes,
) -> Result<(StatusCode, Json<Media>), ApiError> {
    let mime = headers
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    verify_image(mime, &body)?;
    let id = Uuid::new_v4();
    let key = format!("users/{}/{id}", u.id);
    let response = tokio::time::timeout(
        Duration::from_secs(8),
        s.bucket.put_object_with_content_type(&key, &body, mime),
    )
    .await
    .map_err(|_| ApiError::unavailable())?
    .map_err(|_| ApiError::unavailable())?;
    if ![200, 201, 204].contains(&response.status_code()) {
        return Err(ApiError::unavailable());
    }
    let saved = sqlx::query(
        "INSERT INTO app.media (id,user_id,object_key,content_type,size) VALUES($1,$2,$3,$4,$5)",
    )
    .bind(id)
    .bind(u.id)
    .bind(&key)
    .bind(mime)
    .bind(body.len() as i64)
    .execute(&s.database)
    .await;
    if saved.is_err() {
        let _ = s.bucket.delete_object(&key).await;
        return Err(ApiError::internal());
    }
    Ok((
        StatusCode::CREATED,
        Json(Media {
            id,
            url: format!("/api/media/{id}"),
            content_type: mime.to_owned(),
            size: body.len() as i64,
        }),
    ))
}
async fn download(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Response, ApiError> {
    let (key, mime): (String, String) =
        sqlx::query_as("SELECT object_key,content_type FROM app.media WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .fetch_optional(&s.database)
            .await?
            .ok_or_else(domain::not_found)?;
    let object = tokio::time::timeout(Duration::from_secs(8), s.bucket.get_object(&key))
        .await
        .map_err(|_| ApiError::unavailable())?
        .map_err(|_| ApiError::unavailable())?;
    if object.status_code() != 200 {
        return Err(ApiError::unavailable());
    }
    let mut response = object.bytes().to_vec().into_response();
    response.headers_mut().insert(
        header::CONTENT_TYPE,
        HeaderValue::from_str(&mime).map_err(|_| ApiError::internal())?,
    );
    response.headers_mut().insert(
        header::CONTENT_DISPOSITION,
        HeaderValue::from_static("inline"),
    );
    Ok(response)
}
fn verify_image(mime: &str, bytes: &[u8]) -> Result<(), ApiError> {
    let valid = match mime {
        "image/png" => {
            bytes.len() >= 24
                && bytes.starts_with(b"\x89PNG\r\n\x1a\n")
                && &bytes[12..16] == b"IHDR"
        }
        "image/jpeg" => {
            bytes.len() >= 4
                && bytes.starts_with(&[0xff, 0xd8, 0xff])
                && bytes.ends_with(&[0xff, 0xd9])
        }
        "image/webp" => {
            bytes.len() >= 16
                && bytes.starts_with(b"RIFF")
                && &bytes[8..12] == b"WEBP"
                && [&b"VP8 "[..], &b"VP8L"[..], &b"VP8X"[..]].contains(&&bytes[12..16])
        }
        _ => false,
    };
    if bytes.len() > MAX_BYTES || !valid {
        return Err(ApiError::validation(
            "Upload a PNG, JPEG or WebP image with matching content type, at most 8 MiB",
        ));
    }
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn mime_sniffing_rejects_html_svg_and_mismatched_binary() {
        assert!(verify_image("image/png", b"<script>alert(1)</script>").is_err());
        assert!(verify_image("image/svg+xml", b"<svg></svg>").is_err());
        assert!(verify_image("image/jpeg", b"\x89PNG\r\n\x1a\n").is_err());
    }
}
