mod ai;
mod ai_context;
mod ai_login;
mod ai_provider;
mod analytics;
pub mod auth;
pub mod config;
mod countdowns;
pub mod crypto;
mod csrf;
pub mod domain;
pub mod error;
pub mod habits;
mod health;
mod intimacy;
mod mail;
mod media;
mod notes;
mod pomodoro;
pub mod profile;
pub mod schedule;
pub mod settings;
pub mod state;
pub mod tasks;
mod workout_plan;
mod workout_sessions;
pub mod workouts;

use std::time::Duration;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{HeaderName, HeaderValue, StatusCode, header},
    routing::get,
};
use tower_http::{set_header::SetResponseHeaderLayer, timeout::TimeoutLayer, trace::TraceLayer};

use state::AppState;

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/health/live", get(health::live))
        .route("/api/health/ready", get(health::ready))
        .merge(auth::routes())
        .merge(profile::routes())
        .merge(settings::routes())
        .merge(notes::routes())
        .merge(tasks::routes())
        .merge(habits::routes())
        .merge(media::routes())
        .merge(countdowns::routes())
        .merge(pomodoro::routes())
        .merge(workouts::routes())
        .merge(workout_sessions::routes())
        .merge(intimacy::routes())
        .merge(analytics::routes())
        .merge(ai::routes())
        .merge(ai_login::routes())
        .fallback(error::not_found)
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            csrf::guard,
        ))
        .layer(DefaultBodyLimit::max(1024 * 1024))
        .layer(TimeoutLayer::with_status_code(
            StatusCode::REQUEST_TIMEOUT,
            Duration::from_secs(10),
        ))
        .layer(TraceLayer::new_for_http().make_span_with(|request: &axum::http::Request<axum::body::Body>| tracing::info_span!("http", method = %request.method(), path = request.uri().path())))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::CACHE_CONTROL,
            HeaderValue::from_static("no-store"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            HeaderName::from_static("referrer-policy"),
            HeaderValue::from_static("no-referrer"),
        ))
        .with_state(state)
}
