use super::models::Version;
use crate::{
    infrastructure::state::AppState,
    modules::tasks::{self, TaskOccurrence, TaskOccurrenceResponse},
    shared::errors::ApiError,
};
use chrono::{Duration, NaiveDate, Utc};
use sqlx::types::Json as DbJson;
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

pub(super) fn validate_range(from: NaiveDate, to: NaiveDate) -> Result<(), ApiError> {
    if to < from || (to - from).num_days() > 365 {
        return Err(ApiError::validation(
            "Habit range must cover 1 to 366 dates",
        ));
    }
    Ok(())
}

pub async fn occurrences(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    timezone: &str,
) -> Result<Vec<TaskOccurrenceResponse>, ApiError> {
    validate_range(from, to)?;
    let zone = timezone
        .parse::<chrono_tz::Tz>()
        .map_err(|_| ApiError::internal())?;
    let versions=sqlx::query_as::<_,Version>("SELECT task_id,effective_from,snapshot,ended_at FROM app.habit_versions WHERE user_id=$1 ORDER BY task_id,effective_from")
        .bind(user).fetch_all(&s.database).await?;
    let active: BTreeSet<Uuid> =
        sqlx::query_scalar("SELECT id FROM app.tasks WHERE user_id=$1 AND source_kind='habit'")
            .bind(user)
            .fetch_all(&s.database)
            .await?
            .into_iter()
            .collect();
    let mut output = BTreeMap::new();
    for (index, version) in versions.iter().enumerate() {
        let task = &version.snapshot.0;
        let Some(schedule) = &task.schedule else {
            continue;
        };
        let next = versions
            .get(index + 1)
            .filter(|next| next.task_id == version.task_id)
            .map(|v| v.effective_from);
        for (date, starts_at) in tasks::schedule_in_profile_range(schedule, from, to, &zone)? {
            if date < version.effective_from || next.is_some_and(|end| date >= end) {
                continue;
            }
            let ended = version.ended_at;
            let now = Utc::now();
            let schedule_zone = schedule
                .timezone
                .parse::<chrono_tz::Tz>()
                .map_err(|_| ApiError::internal())?;
            let local_today = now.with_timezone(&schedule_zone).date_naive();
            if ended.is_some_and(|end| {
                starts_at.map_or_else(
                    || date >= end.with_timezone(&schedule_zone).date_naive(),
                    |start| start >= end,
                )
            }) {
                continue;
            }
            output.insert(
                (task.id, date),
                TaskOccurrenceResponse {
                    occurrence: TaskOccurrence {
                        task: task.clone(),
                        date,
                        starts_at,
                        status: "todo".into(),
                        habit_mark: None,
                    },
                    editable: active.contains(&task.id) && date <= local_today,
                },
            );
        }
    }
    let lower = from
        .checked_sub_signed(Duration::days(3))
        .unwrap_or(NaiveDate::MIN);
    let upper = to
        .checked_add_signed(Duration::days(3))
        .unwrap_or(NaiveDate::MAX);
    let saved=sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND snapshot->'task'->>'source_kind'='habit' AND occurrence_date BETWEEN $2 AND $3")
        .bind(user).bind(lower).bind(upper).fetch_all(&s.database).await?;
    for row in saved {
        let occurrence = row.0;
        let key = (occurrence.task.id, occurrence.date);
        output.remove(&key);
        let local = tasks::calendar_date(&occurrence, &zone);
        if local >= from && local <= to {
            output.insert(
                key,
                TaskOccurrenceResponse {
                    editable: active.contains(&occurrence.task.id),
                    occurrence,
                },
            );
        }
    }
    Ok(output.into_values().collect())
}
