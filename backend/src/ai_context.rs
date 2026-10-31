use crate::{
    ai::Permissions, analytics, domain, error::ApiError, intimacy, profile, state::AppState, tasks,
    workout_preferences,
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
    search: Option<&str>,
) -> Result<Value, ApiError> {
    validate_range(from, to)?;
    let settings = domain::settings(s, user).await?;
    let mut data =
        json!({"from":from,"to":to,"timezone":settings.timezone,"generated_at":chrono::Utc::now()});
    if p.analytics || p.habits || p.training() {
        let mut report = analytics::ai_report(s, user, from, to).await?;
        if p.habits {
            data["habits"] = report["habits"].clone();
        }
        report["habits"].as_object_mut().unwrap().remove("ranking");
        if p.training() {
            data["workouts"] = report["workouts"].clone();
        }
        if p.analytics {
            data["analytics"] = json!({"events":report["event_count"],"active_days":report["active_days"],"event_types":report["event_types"],"tasks":report["tasks"],"habits":report["habits"],"workouts":report["workouts"],"pomodoro":report["pomodoro"],"days":report["days"]});
        }
    }
    if p.training() {
        let exercises:Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'updated_at',updated_at,'data',(data-'images') || jsonb_build_object('description',left(data->>'description',4000)),'description_truncated',length(data->>'description')>4000) FROM app.exercises x WHERE user_id=$1 AND ai_shared AND ($2::text IS NULL OR strpos(lower((data->>'title')||' '||(data->>'description')),lower($2))>0) ORDER BY updated_at DESC,id LIMIT 101").bind(user).bind(search).fetch_all(&s.database).await?;
        let plans:Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'updated_at',updated_at,'data',data || jsonb_build_object('description',left(data->>'description',4000)),'description_truncated',length(data->>'description')>4000) FROM app.workouts WHERE user_id=$1 AND ai_shared AND ($2::text IS NULL OR strpos(lower((data->>'title')||' '||(data->>'description')),lower($2))>0) ORDER BY updated_at DESC,id LIMIT 51").bind(user).bind(search).fetch_all(&s.database).await?;
        let sessions:Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'workout_id',workout_id,'date',snapshot->>'date','status',status,'results',results,'started_at',started_at,'ended_at',ended_at,'planned_loads',(SELECT jsonb_agg(jsonb_build_object('entry_id',e->'entry_id','repetitions',e->'repetitions','duration_seconds',e->'duration_seconds')) FROM jsonb_array_elements(snapshot->'steps') e WHERE e->'exercise' <> 'null'::jsonb)) FROM app.workout_sessions ws WHERE user_id=$1 AND EXISTS(SELECT 1 FROM app.workouts w WHERE w.user_id=ws.user_id AND w.id=ws.workout_id AND w.ai_shared) AND (snapshot->>'date')::date BETWEEN $2 AND $3 ORDER BY started_at DESC,id LIMIT 51").bind(user).bind(from).bind(to).fetch_all(&s.database).await?;
        let library = json!({"query":search,"exercises":exercises.iter().take(100).collect::<Vec<_>>(),"exercises_truncated":exercises.len()>100,"plans":plans.iter().take(50).collect::<Vec<_>>(),"plans_truncated":plans.len()>50,"sessions":sessions.iter().take(50).collect::<Vec<_>>(),"sessions_truncated":sessions.len()>50,"selection":"Only independently owner-shared exercises and workouts; a shared plan does not grant access to its exercises. Sessions within the selected dates; no images or session notes. Reuse existing exercise IDs. Missing records are unknown, not zero."});
        if let Some(fields) = library.as_object() {
            for (key, value) in fields {
                data["workouts"][key] = value.clone();
            }
        }
        data["workouts"]["preferences"] =
            serde_json::to_value(workout_preferences::load(s, user).await?)
                .map_err(|_| ApiError::internal())?;
        if p.habits {
            let occurrences = tasks::occurrences(s, user, from, to, &settings.timezone).await?;
            let planned:Vec<Value>=occurrences.iter().filter_map(|row| {
                let o=&row.occurrence;
                let workout=o.task.habit.as_ref()?.workout_id?;
                if !plans.iter().take(50).any(|p|p["id"].as_str()==Some(&workout.to_string())) {return None;}
                Some(json!({"habit_id":o.task.id,"workout_id":workout,"date":o.date,"starts_at":o.starts_at,"status":o.status,"mark_status":o.habit_mark.as_ref().map(|m| &m.status)}))
            }).collect();
            data["workouts"]["planned_occurrences"] =
                json!(planned.iter().take(100).collect::<Vec<_>>());
            data["workouts"]["planned_occurrences_truncated"] = json!(planned.len() > 100);
            data["workouts"]["planning_rule"] = json!(
                "Linked habit appearances use existing history and timezone rules. skipped/cancelled are explicit marks. No session or mark is unknown execution, not proof of a missed workout. Habit notes are excluded."
            );
        }
    }
    if p.tasks {
        let rows = tasks::occurrences(s, user, from, to, &settings.timezone).await?;
        let manual: Vec<_> = rows
            .iter()
            .filter(|row| {
                row.occurrence.task.source_kind == "manual"
                    && search.is_none_or(|q| {
                        format!(
                            "{} {}",
                            row.occurrence.task.title, row.occurrence.task.description
                        )
                        .to_lowercase()
                        .contains(&q.to_lowercase())
                    })
            })
            .collect();
        let items:Vec<_> = manual.iter().take(100).map(|row| {
            let o = &row.occurrence;
            json!({"id":o.task.id,"title":o.task.title,"description":clip(&o.task.description,4000),"date":o.date,"starts_at":o.starts_at,"status":o.status,"schedule":o.task.schedule,"due_at":o.task.due_at,"tags":o.task.tags,"priority":o.task.priority,"updated_at":o.task.updated_at,"editable":row.editable})
        }).collect();
        let unscheduled: Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'updated_at',updated_at,'title',title,'description',left(description,4000),'description_truncated',length(description)>4000,'status',status,'due_at',due_at,'tags',tags,'priority',priority) FROM app.tasks WHERE user_id=$1 AND source_kind='manual' AND schedule IS NULL AND ($2::text IS NULL OR strpos(lower(title||' '||description),lower($2))>0) ORDER BY updated_at DESC,id LIMIT 51").bind(user).bind(search).fetch_all(&s.database).await?;
        let mut template_ids: Vec<Uuid> = manual
            .iter()
            .take(100)
            .map(|r| r.occurrence.task.id)
            .collect();
        template_ids.extend(
            unscheduled
                .iter()
                .take(50)
                .filter_map(|v| v["id"].as_str().and_then(|id| id.parse::<Uuid>().ok())),
        );
        let templates:Vec<Value>=sqlx::query_scalar("SELECT jsonb_build_object('id',id,'updated_at',updated_at,'title',title,'description',left(description,4000),'description_truncated',length(description)>4000,'status',status,'tags',tags,'color',color,'priority',priority,'parent_id',parent_id,'due_at',due_at,'schedule',schedule) FROM app.tasks WHERE user_id=$1 AND source_kind='manual' AND id=ANY($2) ORDER BY updated_at DESC,id LIMIT 101").bind(user).bind(&template_ids).fetch_all(&s.database).await?;
        data["tasks"] = json!({"query":search,"occurrences":items,"total_occurrences":manual.len(),"occurrences_truncated":manual.len()>100,"unscheduled":unscheduled.iter().take(50).collect::<Vec<_>>(),"unscheduled_truncated":unscheduled.len()>50,"templates":templates.iter().take(100).collect::<Vec<_>>(),"templates_truncated":templates.len()>100});
    }
    if p.notes {
        let rows:Vec<Value> = sqlx::query_scalar("SELECT jsonb_build_object('id',id,'updated_at',updated_at,'title',title,'color',color,'folder_id',folder_id,'markdown',left(content,4000),'truncated',length(content)>4000,'tags',tags) FROM app.notes WHERE user_id=$1 AND ai_shared AND ($2::text IS NULL OR strpos(lower(title||' '||content),lower($2))>0) ORDER BY updated_at DESC,id LIMIT 31").bind(user).bind(search).fetch_all(&s.database).await?;
        data["notes"] = json!({"query":search,"items":rows.iter().take(30).collect::<Vec<_>>(),"truncated":rows.len()>30,"selection":"only owner-shared notes, latest updated; at most 30 notes and 4000 characters each; images are not downloaded"});
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
