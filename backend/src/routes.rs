use crate::{
    infrastructure::{health, state::AppState},
    modules::{
        ai::{self, access as ai_access, actions as ai_actions, login as ai_login},
        analytics, auth, boards, contacts, countdowns, habits, history, intimacy, labels, media,
        navigation, notes, operators,
        pomodoro::{self, programs as pomodoro_programs},
        profile, settings, tasks,
        workouts::{self, preferences as workout_preferences, sessions as workout_sessions},
    },
    shared::{csrf, errors as error},
};
use std::time::Duration;

use axum::{
    Router,
    extract::DefaultBodyLimit,
    http::{HeaderName, HeaderValue, StatusCode, header},
    routing::get,
};
use tower_http::{set_header::SetResponseHeaderLayer, timeout::TimeoutLayer, trace::TraceLayer};

pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/api/health/live", get(health::live))
        .route("/api/health/ready", get(health::ready))
        .merge(auth::routes())
        .merge(crate::modules::integrations::routes())
        .merge(crate::modules::videogames::routes())
        .merge(crate::shared::feedback::routes())
        .merge(profile::routes())
        .merge(settings::routes())
        .merge(notes::routes())
        .merge(navigation::routes())
        .merge(tasks::routes())
        .merge(boards::routes())
        .merge(labels::routes())
        .merge(history::routes())
        .merge(operators::routes())
        .merge(habits::routes())
        .merge(media::routes())
        .merge(countdowns::routes())
        .merge(contacts::routes())
        .merge(pomodoro::routes())
        .merge(pomodoro_programs::routes())
        .merge(workouts::routes())
        .merge(workout_preferences::routes())
        .merge(workout_sessions::routes())
        .merge(intimacy::routes())
        .merge(analytics::routes())
        .merge(ai::routes())
        .merge(ai_actions::routes())
        .merge(ai_access::routes())
        .merge(ai_login::routes())
        .fallback(error::not_found)
        .layer(axum::middleware::from_fn_with_state(state.clone(),history::audit))
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
