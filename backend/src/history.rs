use crate::{auth::CurrentUser, domain, error::ApiError, state::AppState};
use axum::{
    Router,
    extract::{Path, State},
    http::StatusCode,
};
use uuid::Uuid;
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/history", axum::routing::get(feed))
        .route("/api/history/{kind}/{key}", axum::routing::delete(remove))
}
async fn remove(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((kind, key)): Path<(String, String)>,
) -> Result<StatusCode, ApiError> {
    let (raw, date) = key
        .split_once(':')
        .map_or((key.as_str(), None), |(id, date)| (id, Some(date)));
    let id =
        Uuid::parse_str(raw).map_err(|_| ApiError::validation("Invalid history identifier"))?;
    let sql = match kind.as_str() {
        "task" | "habit" => {
            "SELECT EXISTS(SELECT 1 FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND occurrence_date=$3::text::date)"
        }
        "pomodoro" => {
            "SELECT EXISTS(SELECT 1 FROM app.pomodoro_sessions WHERE user_id=$1 AND id=$2 AND status IN ('completed','cancelled') AND $3::text IS NULL)"
        }
        "workout" => {
            "SELECT EXISTS(SELECT 1 FROM app.workout_sessions WHERE user_id=$1 AND id=$2 AND status NOT IN ('running','paused') AND $3::text IS NULL)"
        }
        "ai" => {
            "SELECT EXISTS(SELECT 1 FROM app.ai_actions WHERE user_id=$1 AND id=$2 AND $3::text IS NULL)"
        }
        "activity" => {
            "SELECT EXISTS(SELECT 1 FROM app.user_action_history WHERE user_id=$1 AND id=$2 AND $3::text IS NULL)"
        }
        _ => return Err(ApiError::validation("Unsupported history kind")),
    };
    if ["task", "habit"].contains(&kind.as_str())
        && date
            .and_then(|d| d.parse::<chrono::NaiveDate>().ok())
            .is_none()
    {
        return Err(ApiError::validation("A history date is required"));
    }
    let key = if let Some(date) = date {
        format!(
            "{id}:{}",
            date.parse::<chrono::NaiveDate>()
                .map_err(|_| ApiError::validation("Invalid history date"))?
        )
    } else {
        id.to_string()
    };
    let owned: bool = sqlx::query_scalar(sql)
        .bind(u.id)
        .bind(id)
        .bind(date)
        .fetch_one(&s.database)
        .await?;
    if !owned {
        return Err(domain::not_found());
    }
    sqlx::query("INSERT INTO app.history_removals(user_id,kind,item_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING").bind(u.id).bind(kind).bind(key).execute(&s.database).await?;
    Ok(StatusCode::NO_CONTENT)
}

#[derive(serde::Deserialize)]
struct FeedQuery {
    from: chrono::NaiveDate,
    to: chrono::NaiveDate,
    before: Option<chrono::DateTime<chrono::Utc>>,
    before_id: Option<Uuid>,
    section: Option<String>,
    operation: Option<String>,
}
#[derive(serde::Serialize, sqlx::FromRow)]
struct FeedItem {
    id: Uuid,
    section: String,
    operation: String,
    entity_key: String,
    occurred_at: chrono::DateTime<chrono::Utc>,
}
#[derive(serde::Serialize)]
struct Feed {
    items: Vec<FeedItem>,
    next_before: Option<chrono::DateTime<chrono::Utc>>,
    next_id: Option<Uuid>,
}
async fn feed(
    State(s): State<AppState>,
    u: CurrentUser,
    axum::extract::Query(q): axum::extract::Query<FeedQuery>,
) -> Result<axum::Json<Feed>, ApiError> {
    if q.to < q.from || (q.to - q.from).num_days() > 365 {
        return Err(ApiError::validation("Choose at most 366 dates"));
    }
    let zone = domain::settings(&s, u.id).await?.timezone;
    let mut rows:Vec<FeedItem>=sqlx::query_as("SELECT id,section,operation,entity_key,occurred_at FROM app.user_action_history a WHERE user_id=$1 AND (occurred_at AT TIME ZONE $2)::date BETWEEN $3 AND $4 AND ($5::timestamptz IS NULL OR (occurred_at,id)<($5,coalesce($6,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))) AND ($7::text IS NULL OR section=$7) AND ($8::text IS NULL OR operation=$8) AND NOT EXISTS(SELECT 1 FROM app.history_removals h WHERE h.user_id=$1 AND h.kind='activity' AND h.item_key=a.id::text) ORDER BY occurred_at DESC,id DESC LIMIT 51").bind(u.id).bind(zone).bind(q.from).bind(q.to).bind(q.before).bind(q.before_id).bind(q.section.filter(|s|!s.is_empty())).bind(q.operation.filter(|s|!s.is_empty())).fetch_all(&s.database).await?;
    let more = rows.len() > 50;
    rows.truncate(50);
    let next_before = if more {
        rows.last().map(|r| r.occurred_at)
    } else {
        None
    };
    let next_id = if more {
        rows.last().map(|r| r.id)
    } else {
        None
    };
    Ok(axum::Json(Feed {
        items: rows,
        next_before,
        next_id,
    }))
}
/// Record successful authenticated mutations without storing request payloads or personal names.
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
