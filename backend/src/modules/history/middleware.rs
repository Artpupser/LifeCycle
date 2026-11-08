use crate::{infrastructure::state::AppState, shared::auth::CurrentUser};
use axum::extract::State;
use uuid::Uuid;

pub async fn audit(
    State(s): State<AppState>,
    request: axum::extract::Request,
    next: axum::middleware::Next,
) -> axum::response::Response {
    use axum::extract::FromRequestParts;
    let path = request.uri().path().to_owned();
    let method = request.method().clone();
    let section = path
        .strip_prefix("/api/")
        .unwrap_or("")
        .split('/')
        .next()
        .unwrap_or("")
        .to_owned();
    if matches!(
        method,
        axum::http::Method::GET | axum::http::Method::HEAD | axum::http::Method::OPTIONS
    ) || !matches!(
        section.as_str(),
        "tasks"
            | "habits"
            | "notes"
            | "boards"
            | "contacts"
            | "countdowns"
            | "sex"
            | "exercises"
            | "workouts"
            | "workout-sessions"
            | "pomodoro"
            | "profile"
            | "settings"
            | "navigation"
            | "labels"
            | "task-tags"
            | "ai"
            | "operators"
            | "integrations"
            | "videogames"
    ) || path.ends_with("/preview")
        || path == "/api/operators/lookup"
    {
        return next.run(request).await;
    }
    let (mut parts, body) = request.into_parts();
    let user = CurrentUser::from_request_parts(&mut parts, &s).await.ok();
    let response = next
        .run(axum::extract::Request::from_parts(parts, body))
        .await;
    if response.status().is_success()
        && let Some(user) = user
    {
        let entity = path
            .split('/')
            .find_map(|piece| Uuid::parse_str(piece).ok())
            .map(|id| id.to_string())
            .unwrap_or_default();
        let operation = match method {
            axum::http::Method::DELETE => "deleted",
            axum::http::Method::PUT => "updated",
            _ => {
                if path.split('/').count() == 3 {
                    "created"
                } else {
                    "changed"
                }
            }
        };
        if sqlx::query("INSERT INTO app.user_action_history(id,user_id,section,operation,entity_key) VALUES($1,$2,$3,$4,$5)").bind(Uuid::new_v4()).bind(user.id).bind(section).bind(operation).bind(entity).execute(&s.database).await.is_err(){tracing::warn!("Unable to persist action history");}
    }
    response
}
