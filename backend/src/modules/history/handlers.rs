use super::models::{Feed, FeedItem, FeedQuery};
use crate::{
    infrastructure::state::AppState, shared::auth::CurrentUser, shared::domain,
    shared::errors::ApiError,
};
use axum::{
    extract::{Path, State},
    http::StatusCode,
};
use uuid::Uuid;

pub(super) async fn remove(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((kind, key)): Path<(String, String)>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    remove_one(&mut tx, u.id, &kind, &key).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BulkItem {
    kind: String,
    item_key: String,
}
#[derive(serde::Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BulkRemove {
    items: Vec<BulkItem>,
    confirmed: bool,
}
pub(super) async fn remove_bulk(
    State(s): State<AppState>,
    u: CurrentUser,
    crate::shared::errors::ApiJson(v): crate::shared::errors::ApiJson<BulkRemove>,
) -> Result<StatusCode, ApiError> {
    if !v.confirmed || v.items.is_empty() || v.items.len() > 500 {
        return Err(ApiError::validation("Confirm 1 to 500 history entries"));
    }
    let mut seen = std::collections::BTreeSet::new();
    let mut tx = s.database.begin().await?;
    for item in v.items {
        if !seen.insert((item.kind.clone(), item.item_key.clone())) {
            return Err(ApiError::validation("History entries must be distinct"));
        }
        remove_one(&mut tx, u.id, &item.kind, &item.item_key).await?;
    }
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn remove_one(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    kind: &str,
    key: &str,
) -> Result<(), ApiError> {
    let (raw, date) = key
        .split_once(':')
        .map_or((key, None), |(id, date)| (id, Some(date)));
    let id =
        Uuid::parse_str(raw).map_err(|_| ApiError::validation("Invalid history identifier"))?;
    let sql = match kind {
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
    if ["task", "habit"].contains(&kind)
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
        .bind(user)
        .bind(id)
        .bind(date)
        .fetch_one(&mut *db)
        .await?;
    if !owned {
        return Err(domain::not_found());
    }
    sqlx::query("INSERT INTO app.history_removals(user_id,kind,item_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING").bind(user).bind(kind).bind(key).execute(&mut *db).await?;
    Ok(())
}

pub(super) async fn feed(
    State(s): State<AppState>,
    u: CurrentUser,
    axum::extract::Query(q): axum::extract::Query<FeedQuery>,
) -> Result<axum::Json<Feed>, ApiError> {
    if q.to < q.from || (q.to - q.from).num_days() > 365 {
        return Err(ApiError::validation("Choose at most 366 dates"));
    }
    let zone = domain::settings(&s, u.id).await?.timezone;
    let mut rows:Vec<FeedItem>=sqlx::query_as("SELECT id,section,operation,entity_key,occurred_at FROM app.user_action_history a WHERE user_id=$1 AND (occurred_at AT TIME ZONE $2)::date BETWEEN $3 AND $4 AND ($5::timestamptz IS NULL OR (occurred_at,id)<($5,coalesce($6,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid))) AND ($7::text IS NULL OR section=$7) AND ($8::text IS NULL OR operation=$8) AND ($9::text IS NULL OR strpos(lower(section||' '||operation||' '||entity_key),lower($9))>0) AND NOT EXISTS(SELECT 1 FROM app.history_removals h WHERE h.user_id=$1 AND h.kind='activity' AND h.item_key=a.id::text) ORDER BY occurred_at DESC,id DESC LIMIT 51").bind(u.id).bind(zone).bind(q.from).bind(q.to).bind(q.before).bind(q.before_id).bind(q.section.filter(|s|!s.is_empty())).bind(q.operation.filter(|s|!s.is_empty())).bind(q.text.filter(|s|!s.is_empty())).fetch_all(&s.database).await?;
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
