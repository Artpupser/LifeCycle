use crate::{error::ApiError, state::AppState};
use axum::{
    extract::{Request, State},
    http::{Method, StatusCode, header},
    middleware::Next,
    response::Response,
};

pub async fn guard(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Result<Response, ApiError> {
    if !matches!(
        *request.method(),
        Method::GET | Method::HEAD | Method::OPTIONS
    ) {
        let expected = state.config.public_url.origin().ascii_serialization();
        let invalid_origin = request
            .headers()
            .get(header::ORIGIN)
            .is_none_or(|origin| origin.to_str().map_or(true, |v| v != expected));
        let cross_site = request
            .headers()
            .get("sec-fetch-site")
            .is_some_and(|v| v == "cross-site");
        if invalid_origin || cross_site {
            return Err(ApiError {
                status: StatusCode::FORBIDDEN,
                code: "csrf_failed",
                message: "Cross-origin mutations are forbidden",
                retry_after: None,
            });
        }
    }
    Ok(next.run(request).await)
}
