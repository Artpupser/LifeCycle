use super::models::{AnalyticsSummary, Entry, EntryData, Row, Statistics};
use crate::{infrastructure::state::AppState, shared::domain, shared::errors::ApiError};
use axum::http::StatusCode;
use chrono::NaiveDate;
use chrono_tz::Tz;
use std::collections::BTreeSet;
use uuid::Uuid;

pub(super) fn validate_list(values: &[String]) -> Result<(), ApiError> {
    if values.len() > 30 {
        return Err(ApiError::validation("At most 30 list items are supported"));
    }
    let mut seen = BTreeSet::new();
    for value in values {
        domain::text(value, 1, 500)?;
        if value != value.trim() || !seen.insert(value.to_lowercase()) {
            return Err(ApiError::validation(
                "List items must be trimmed and distinct",
            ));
        }
    }
    Ok(())
}

pub(super) fn context(user: Uuid, id: Uuid) -> String {
    format!("intimacy:v1:{user}:{id}")
}

pub(super) fn decode(s: &AppState, user: Uuid, row: Row) -> Result<Entry, ApiError> {
    let bytes = s
        .cipher
        .decrypt(&row.encrypted_data, context(user, row.id).as_bytes())?;
    let data: EntryData = serde_json::from_slice(&bytes).map_err(|_| ApiError::internal())?;
    if data.start()? != row.started_at {
        return Err(ApiError::internal());
    }
    Ok(Entry {
        id: row.id,
        started_at: row.started_at,
        data,
        revision: row.revision,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}

pub(crate) async fn analytics_summary(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    timezone: &str,
) -> Result<AnalyticsSummary, ApiError> {
    summary(s, user, from, to, timezone, false).await
}
pub(crate) async fn analytics_summary_shared(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    timezone: &str,
) -> Result<AnalyticsSummary, ApiError> {
    summary(s, user, from, to, timezone, true).await
}
async fn summary(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    timezone: &str,
    shared_only: bool,
) -> Result<AnalyticsSummary, ApiError> {
    let zone = timezone.parse::<Tz>().map_err(|_| ApiError::internal())?;
    let rows = sqlx::query_as::<_, Row>("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 AND (started_at AT TIME ZONE $2)::date BETWEEN $3 AND $4 AND (NOT $5 OR ai_shared)")
        .bind(user).bind(timezone).bind(from).bind(to).bind(shared_only).fetch_all(&s.database).await?;
    let mut stats = Statistics::default();
    for row in rows {
        let entry = decode(s, user, row)?;
        stats.add(&entry.data, entry.started_at, zone);
    }
    Ok(AnalyticsSummary {
        total: stats.total,
        sex: stats.sex,
        masturbation: stats.masturbation,
        active_days: stats.active_days,
        duration_minutes: stats.duration_minutes,
        duration_answers: stats.duration_answers,
        average_duration_minutes: stats.average_duration_minutes,
    })
}

pub(super) fn stale() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "stale_intimacy",
        "Entry has changed; reload before editing or deleting",
    )
}

pub(crate) async fn rename_collection(
    s: &AppState,
    db: &mut sqlx::PgConnection,
    user: Uuid,
    kind: &str,
    old: &str,
    replacement: Option<&str>,
) -> Result<(), ApiError> {
    let rows:Vec<Row>=sqlx::query_as("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 FOR UPDATE").bind(user).fetch_all(&mut *db).await?;
    for row in rows {
        let mut entry = decode(s, user, row)?;
        let mut changed = false;
        if kind == "setting" {
            if entry.data.setting.to_lowercase() == old.to_lowercase() {
                entry.data.setting = replacement.unwrap_or("").into();
                changed = true;
            }
        } else {
            let values = if kind == "toy" {
                &mut entry.data.toys
            } else {
                &mut entry.data.emotions
            };
            for value in values.iter_mut() {
                if value.to_lowercase() == old.to_lowercase() {
                    *value = replacement.unwrap_or("").into();
                    changed = true;
                }
            }
            values.retain(|value| !value.is_empty());
        }
        if changed {
            let encrypted = s.cipher.encrypt(
                &serde_json::to_vec(&entry.data).map_err(|_| ApiError::internal())?,
                context(user, entry.id).as_bytes(),
            )?;
            sqlx::query("UPDATE app.intimacy_entries SET encrypted_data=$3,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2").bind(user).bind(entry.id).bind(encrypted).execute(&mut *db).await?;
        }
    }
    Ok(())
}
