use super::models::Media;
use super::service::verify_image;
use crate::{
    infrastructure::state::AppState, shared::auth::CurrentUser, shared::domain,
    shared::errors::ApiError,
};
use axum::{
    Json,
    body::Bytes,
    extract::{Path, State},
    http::{HeaderMap, HeaderValue, StatusCode, header},
    response::{IntoResponse, Response},
};
use std::time::Duration;
use uuid::Uuid;

pub(super) async fn upload(
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

pub(super) async fn download(
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
    response.headers_mut().insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("private, no-store"),
    );
    response.headers_mut().insert(
        header::X_CONTENT_TYPE_OPTIONS,
        HeaderValue::from_static("nosniff"),
    );
    Ok(response)
}
