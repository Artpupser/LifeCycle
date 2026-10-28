use crate::{
    ai::Permissions, analytics, domain, error::ApiError, intimacy, profile, state::AppState, tasks,
};
use chrono::{Datelike, NaiveDate};
use serde_json::{Value, json};
use uuid::Uuid;

pub fn validate_range(from: NaiveDate, to: NaiveDate) -> Result<(), ApiError> {
    if !(0..366).contains(&(to - from).num_days())
        || !(1900..=9998).contains(&from.year())
        || !(1900..=9998).contains(&to.year())
    {
        return Err(ApiError::validation(
            "AI context supports 1 to 366 inclusive dates between 1900 and 9998",
        ));
    }
    Ok(())
}

fn clip(value: &str, max: usize) -> Value {
    json!({"text": value.chars().take(max).collect::<String>(), "truncated": value.chars().count() > max})
}

pub async fn build(
    s: &AppState,
    user: Uuid,
    p: &Permissions,
    from: NaiveDate,
    to: NaiveDate,
) -> Result<Value, ApiError> {
    validate_range(from, to)?;
    let settings = domain::settings(s, user).await?;
    let mut data =
        json!({"from":from,"to":to,"timezone":settings.timezone,"generated_at":chrono::Utc::now()});
    if p.analytics || p.habits || p.workouts {
        let mut report = analytics::ai_report(s, user, from, to).await?;
        if p.habits {
            data["habits"] = report["habits"].clone();
        }
        report["habits"].as_object_mut().unwrap().remove("ranking");
        if p.workouts {
            data["workouts"] = report["workouts"].clone();
        }
        if p.analytics {
            data["analytics"] = json!({"events":report["event_count"],"active_days":report["active_days"],"event_types":report["event_types"],"tasks":report["tasks"],"habits":report["habits"],"workouts":report["workouts"],"pomodoro":report["pomodoro"],"days":report["days"]});
        }
    }
    if p.tasks {
        let rows = tasks::occurrences(s, user, from, to, &settings.timezone).await?;
        let manual: Vec<_> = rows
            .iter()
            .filter(|row| row.occurrence.task.source_kind == "manual")
            .collect();
        let items:Vec<_> = manual.iter().take(100).map(|row| {
            let o = &row.occurrence;
            json!({"id":o.task.id,"title":o.task.title,"description":clip(&o.task.description,4000),"date":o.date,"starts_at":o.starts_at,"status":o.status,"schedule":o.task.schedule,"due_at":o.task.due_at,"tags":o.task.tags,"priority":o.task.priority})
        }).collect();
        let unscheduled: Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'title',title,'description',left(description,4000),'description_truncated',length(description)>4000,'status',status,'due_at',due_at,'tags',tags,'priority',priority) FROM app.tasks WHERE user_id=$1 AND source_kind='manual' AND schedule IS NULL ORDER BY updated_at DESC,id LIMIT 51").bind(user).fetch_all(&s.database).await?;
        data["tasks"] = json!({"occurrences":items,"total_occurrences":manual.len(),"occurrences_truncated":manual.len()>100,"unscheduled":unscheduled.iter().take(50).collect::<Vec<_>>(),"unscheduled_truncated":unscheduled.len()>50});
    }
    if p.notes {
        let rows:Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'title',title,'markdown',left(content,4000),'truncated',length(content)>4000,'tags',tags) FROM app.notes WHERE user_id=$1 ORDER BY updated_at DESC,id LIMIT 31").bind(user).fetch_all(&s.database).await?;
        data["notes"] = json!({"items":rows.iter().take(30).collect::<Vec<_>>(),"truncated":rows.len()>30,"selection":"latest updated; at most 30 notes and 4000 characters each; images are not downloaded"});
    }
    if p.profile {
        data["profile"] = serde_json::to_value(profile::load(s, user).await?)
            .map_err(|_| ApiError::internal())?;
    }
    if p.intimacy {
        data["intimacy"] = serde_json::to_value(
            intimacy::analytics_summary(s, user, from, to, &settings.timezone).await?,
        )
        .map_err(|_| ApiError::internal())?;
    }
    if serde_json::to_vec(&data)
        .map_err(|_| ApiError::internal())?
        .len()
        > 128 * 1024
    {
        return Err(ApiError::new(
            axum::http::StatusCode::PAYLOAD_TOO_LARGE,
            "ai_context_too_large",
            "Narrow the date range or data permissions",
        ));
    }
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn ranges_and_unicode_limits_are_explicit() {
        let from: NaiveDate = "2026-01-01".parse().unwrap();
        assert!(validate_range(from, from + chrono::Duration::days(365)).is_ok());
        assert!(validate_range(from, from + chrono::Duration::days(366)).is_err());
        assert!(validate_range(from, from - chrono::Duration::days(1)).is_err());
        assert_eq!(clip("Ж🙂я", 2), json!({"text":"Ж🙂","truncated":true}));
    }
}
