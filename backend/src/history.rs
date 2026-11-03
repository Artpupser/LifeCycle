use crate::{auth::CurrentUser, domain, error::ApiError, state::AppState};
use axum::{
    Router,
    extract::{Path, State},
    http::StatusCode,
};
use uuid::Uuid;
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/history/{kind}/{key}", axum::routing::delete(remove))
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
            "SELECT EXISTS(SELECT 1 FROM app.activity_events WHERE user_id=$1 AND id=$2 AND $3::text IS NULL)"
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
