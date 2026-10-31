use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    habits::{self, HabitStatistics, HabitStatus},
    intimacy, profile,
    state::AppState,
    tasks::{self, TaskOccurrenceResponse},
};
use axum::{
    Json, Router,
    extract::{Query, State, rejection::QueryRejection},
    routing::get,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uuid::Uuid;

#[derive(Clone, Default, Deserialize, Serialize, sqlx::FromRow)]
#[serde(deny_unknown_fields)]
struct Privacy {
    include_profile: bool,
    include_intimacy: bool,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Range {
    from: NaiveDate,
    to: NaiveDate,
}
impl Range {
    fn validate(&self) -> Result<(), ApiError> {
        if !(0..366).contains(&(self.to - self.from).num_days())
            || !(1900..=9998).contains(&self.from.year())
            || !(1900..=9998).contains(&self.to.year())
        {
            return Err(ApiError::validation(
                "Analytics supports 1 to 366 inclusive dates between 1900 and 9998",
            ));
        }
        Ok(())
    }
}
#[derive(Default, Serialize)]
struct TaskMetrics {
    scheduled: u64,
    completed: u64,
    rejected: u64,
    in_progress: u64,
    pending: u64,
    missed: u64,
    future: u64,
    planned_minutes: u64,
    completion_rate: Option<f64>,
}
#[derive(Default, Serialize)]
struct HabitMetrics {
    expected: u64,
    completed: u64,
    skipped: u64,
    cancelled: u64,
    missed: u64,
    pending: u64,
    completed_sub_habits: u64,
    total_sub_habits: u64,
    completion_rate: Option<f64>,
    ranking: Vec<HabitStatistics>,
}
#[derive(Default, Serialize, sqlx::FromRow)]
struct TimerMetrics {
    completed: i64,
    cancelled: i64,
    seconds: i64,
}
#[derive(Default, Serialize, sqlx::FromRow)]
struct WorkoutMetrics {
    completed: i64,
    partial: i64,
    cancelled: i64,
    exercise_steps: i64,
    repetitions: i64,
    seconds: i64,
}
#[derive(Default, Serialize)]
struct Day {
    date: NaiveDate,
    events: i64,
    tasks_completed: u64,
    habits_completed: u64,
    focus_seconds: i64,
    workouts_completed: i64,
}
#[derive(Serialize)]
struct ProfileMetrics {
    age_years: Option<u32>,
    height_cm: Option<f64>,
    weight_kg: Option<f64>,
}
#[derive(Serialize)]
pub(crate) struct Report {
    from: NaiveDate,
    to: NaiveDate,
    timezone: String,
    generated_at: DateTime<Utc>,
    privacy: Privacy,
    event_count: i64,
    active_days: usize,
    event_types: BTreeMap<String, i64>,
    tasks: TaskMetrics,
    habits: HabitMetrics,
    pomodoro: TimerMetrics,
    workouts: WorkoutMetrics,
    days: Vec<Day>,
    #[serde(skip_serializing_if = "Option::is_none")]
    profile: Option<ProfileMetrics>,
    #[serde(skip_serializing_if = "Option::is_none")]
    intimacy: Option<intimacy::AnalyticsSummary>,
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/analytics", get(report)).route(
        "/api/analytics/privacy",
        get(read_privacy).put(update_privacy),
    )
}
async fn privacy(s: &AppState, user: Uuid) -> Result<Privacy, ApiError> {
    Ok(sqlx::query_as(
        "SELECT include_profile,include_intimacy FROM app.analytics_privacy WHERE user_id=$1",
    )
    .bind(user)
    .fetch_optional(&s.database)
    .await?
    .unwrap_or_default())
}
async fn read_privacy(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Privacy>, ApiError> {
    Ok(Json(privacy(&s, u.id).await?))
}
async fn update_privacy(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Privacy>,
) -> Result<Json<Privacy>, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    sqlx::query("INSERT INTO app.analytics_privacy(user_id,include_profile,include_intimacy) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET include_profile=EXCLUDED.include_profile,include_intimacy=EXCLUDED.include_intimacy,updated_at=now()")
        .bind(u.id).bind(v.include_profile).bind(v.include_intimacy).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(v))
}
fn percent(completed: u64, counted: u64) -> Option<f64> {
    (counted > 0).then(|| completed as f64 * 100.0 / counted as f64)
}
fn task_metrics(
    rows: &[TaskOccurrenceResponse],
    zone: chrono_tz::Tz,
    now: DateTime<Utc>,
) -> TaskMetrics {
    let mut m = TaskMetrics::default();
    let today = now.with_timezone(&zone).date_naive();
    for row in rows
        .iter()
        .filter(|r| r.occurrence.task.source_kind == "manual")
    {
        let o = &row.occurrence;
        m.scheduled += 1;
        m.planned_minutes += o
            .task
            .schedule
            .as_ref()
            .map_or(0, |s| u64::from(s.duration_minutes));
        if tasks::calendar_date(o, &zone) > today {
            m.future += 1;
            continue;
        }
        match o.status.as_str() {
            "completed" => m.completed += 1,
            "rejected" => m.rejected += 1,
            _ => {
                let expired = tasks::calendar_date(o, &zone) < today
                    || o.starts_at.is_some_and(|start| {
                        start
                            + Duration::minutes(
                                o.task
                                    .schedule
                                    .as_ref()
                                    .map_or(0, |s| i64::from(s.duration_minutes)),
                            )
                            <= now
                    });
                if expired {
                    m.missed += 1;
                } else if o.status == "in_progress" {
                    m.in_progress += 1;
                } else {
                    m.pending += 1;
                }
            }
        }
    }
    m.completion_rate = percent(m.completed, m.completed + m.rejected + m.missed);
    m
}
fn habit_metrics(mut stats: Vec<HabitStatistics>) -> HabitMetrics {
    let mut m = HabitMetrics::default();
    for s in &stats {
        m.expected += u64::from(s.expected);
        m.completed += u64::from(s.completed);
        m.skipped += u64::from(s.skipped);
        m.cancelled += u64::from(s.cancelled);
        m.missed += u64::from(s.missed);
        m.pending += u64::from(s.pending);
        m.completed_sub_habits += u64::from(s.completed_sub_habits);
        m.total_sub_habits += u64::from(s.total_sub_habits);
    }
    m.completion_rate = percent(m.completed, m.completed + m.skipped + m.missed);
    stats.retain(|s| s.expected > 0);
    stats.sort_by(|a, b| {
        b.completion_rate
            .total_cmp(&a.completion_rate)
            .then(b.completed.cmp(&a.completed))
            .then(a.title.cmp(&b.title))
    });
    stats.truncate(10);
    m.ranking = stats;
    m
}
fn profile_metrics(p: profile::Profile, today: NaiveDate) -> ProfileMetrics {
    ProfileMetrics {
        age_years: p.birth_date.and_then(|d| today.years_since(d)),
        height_cm: p.height_cm,
        weight_kg: p.weight_kg,
    }
}
async fn report(
    State(s): State<AppState>,
    u: CurrentUser,
    query: Result<Query<Range>, QueryRejection>,
) -> Result<Json<Report>, ApiError> {
    let Query(q) = query.map_err(|_| ApiError::validation("Invalid analytics range"))?;
    q.validate()?;
    Ok(Json(build_report(&s, u.id, q.from, q.to, None).await?))
}
pub(crate) async fn ai_report(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
) -> Result<serde_json::Value, ApiError> {
    let report = build_report(s, user, from, to, Some(Privacy::default())).await?;
    serde_json::to_value(report).map_err(|_| ApiError::internal())
}
async fn build_report(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    allowed: Option<Privacy>,
) -> Result<Report, ApiError> {
    let q = Range { from, to };
    q.validate()?;
    let settings = domain::settings(s, user).await?;
    let zone = settings
        .timezone
        .parse::<chrono_tz::Tz>()
        .map_err(|_| ApiError::internal())?;
    let now = Utc::now();
    let mut guard = s.database.begin().await?;
    tasks::lock_tasks(&mut guard, user).await?;
    let ai_mode = allowed.is_some();
    let allowed = match allowed {
        Some(value) => value,
        None => privacy(s, user).await?,
    };
    let mut rows = tasks::occurrences(s, user, q.from, q.to, &settings.timezone).await?;
    let mut templates = habits::historical_tasks(s, user).await?;
    if ai_mode {
        let shared: Vec<Uuid> =
            sqlx::query_scalar("SELECT id FROM app.workouts WHERE user_id=$1 AND ai_shared")
                .bind(user)
                .fetch_all(&s.database)
                .await?;
        let visible = |t: &tasks::Task| {
            t.habit
                .as_ref()
                .and_then(|h| h.workout_id)
                .is_none_or(|id| shared.contains(&id))
        };
        rows.retain(|r| visible(&r.occurrence.task));
        templates.retain(&visible);
    }
    let stats = templates
        .iter()
        .map(|task| habits::summarize(task, &rows, now))
        .collect();
    let mut days: BTreeMap<NaiveDate, Day> = (0..=(q.to - q.from).num_days())
        .map(|n| {
            let date = q.from + Duration::days(n);
            (
                date,
                Day {
                    date,
                    ..Default::default()
                },
            )
        })
        .collect();
    for row in &rows {
        let o = &row.occurrence;
        if let Some(day) = days.get_mut(&tasks::calendar_date(o, &zone)) {
            if o.task.source_kind == "manual"
                && o.status == "completed"
                && day.date <= now.with_timezone(&zone).date_naive()
            {
                day.tasks_completed += 1;
            }
            if o.habit_mark
                .as_ref()
                .is_some_and(|m| m.status == HabitStatus::Completed)
            {
                day.habits_completed += 1;
            }
        }
    }
    let events:Vec<(NaiveDate,String,i64)>=sqlx::query_as("SELECT (occurred_at AT TIME ZONE $2)::date,event_type,count(*) FROM app.activity_events ev WHERE user_id=$1 AND (NOT $5 OR CASE entity_type WHEN 'note' THEN EXISTS(SELECT 1 FROM app.notes n WHERE n.user_id=ev.user_id AND n.id=ev.entity_id AND n.ai_shared) WHEN 'workout' THEN EXISTS(SELECT 1 FROM app.workouts w WHERE w.user_id=ev.user_id AND w.id=ev.entity_id AND w.ai_shared) WHEN 'workout_session' THEN EXISTS(SELECT 1 FROM app.workout_sessions ws JOIN app.workouts w ON w.id=ws.workout_id AND w.user_id=ws.user_id WHERE ws.user_id=ev.user_id AND ws.id=ev.entity_id AND w.ai_shared) WHEN 'exercise' THEN EXISTS(SELECT 1 FROM app.exercises x WHERE x.user_id=ev.user_id AND x.id=ev.entity_id AND x.ai_shared) WHEN 'folder' THEN false ELSE true END) AND (occurred_at AT TIME ZONE $2)::date BETWEEN $3 AND $4 AND entity_type IN ('note','folder','task','habit','exercise','workout','workout_session','countdown','pomodoro') GROUP BY 1,2")
        .bind(user).bind(&settings.timezone).bind(q.from).bind(q.to).bind(ai_mode).fetch_all(&s.database).await?;
    let mut event_types = BTreeMap::new();
    for (date, kind, count) in events {
        if let Some(day) = days.get_mut(&date) {
            day.events += count;
        }
        *event_types.entry(kind).or_insert(0) += count;
    }
    let focus:Vec<(NaiveDate,i64,i64,i64)>=sqlx::query_as("SELECT (ended_at AT TIME ZONE $2)::date,count(*) FILTER(WHERE status='completed'),count(*) FILTER(WHERE status='cancelled'),coalesce(sum(elapsed_seconds) FILTER(WHERE status='completed'),0)::bigint FROM app.pomodoro_sessions WHERE user_id=$1 AND phase='work' AND status IN ('completed','cancelled') AND (ended_at AT TIME ZONE $2)::date BETWEEN $3 AND $4 GROUP BY 1")
        .bind(user).bind(&settings.timezone).bind(q.from).bind(q.to).fetch_all(&s.database).await?;
    let mut pomodoro = TimerMetrics::default();
    for (date, completed, cancelled, seconds) in focus {
        pomodoro.completed += completed;
        pomodoro.cancelled += cancelled;
        pomodoro.seconds += seconds;
        if let Some(day) = days.get_mut(&date) {
            day.focus_seconds = seconds;
        }
    }
    let sessions:Vec<(NaiveDate,String,i64,i64,i64)>=sqlx::query_as("SELECT (s.ended_at AT TIME ZONE $2)::date,s.status,coalesce((SELECT sum((r->>'elapsed_seconds')::bigint) FROM jsonb_array_elements(s.results) r),0)::bigint+s.elapsed_seconds,(SELECT count(*) FROM jsonb_array_elements(s.results) r WHERE r->>'status'='completed' AND s.snapshot->'steps'->((r->>'step_index')::integer)->'exercise'<>'null'::jsonb),coalesce((SELECT sum((r->>'actual_repetitions')::bigint) FROM jsonb_array_elements(s.results) r WHERE r->>'status'='completed'),0)::bigint FROM app.workout_sessions s WHERE s.user_id=$1 AND (NOT $5 OR EXISTS(SELECT 1 FROM app.workouts w WHERE w.id=s.workout_id AND w.user_id=s.user_id AND w.ai_shared)) AND s.status IN ('completed','partial','cancelled') AND (s.ended_at AT TIME ZONE $2)::date BETWEEN $3 AND $4")
        .bind(user).bind(&settings.timezone).bind(q.from).bind(q.to).bind(ai_mode).fetch_all(&s.database).await?;
    let mut workouts = WorkoutMetrics::default();
    for (date, status, seconds, steps, repetitions) in sessions {
        match status.as_str() {
            "completed" => {
                workouts.completed += 1;
                if let Some(day) = days.get_mut(&date) {
                    day.workouts_completed += 1;
                }
            }
            "partial" => workouts.partial += 1,
            _ => workouts.cancelled += 1,
        };
        workouts.seconds += seconds;
        workouts.exercise_steps += steps;
        workouts.repetitions += repetitions;
    }
    let profile = if allowed.include_profile {
        Some(profile_metrics(
            profile::load(s, user).await?,
            now.with_timezone(&zone).date_naive(),
        ))
    } else {
        None
    };
    let intimacy = if allowed.include_intimacy {
        Some(intimacy::analytics_summary(s, user, q.from, q.to, &settings.timezone).await?)
    } else {
        None
    };
    let result = Report {
        from: q.from,
        to: q.to,
        timezone: settings.timezone,
        generated_at: now,
        privacy: allowed,
        event_count: event_types.values().sum(),
        active_days: days.values().filter(|d| d.events > 0).count(),
        event_types,
        tasks: task_metrics(&rows, zone, now),
        habits: habit_metrics(stats),
        pomodoro,
        workouts,
        days: days.into_values().collect(),
        profile,
        intimacy,
    };
    guard.commit().await?;
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn bounded_ranges_and_unknown_percent_are_explicit() {
        let d: NaiveDate = "2026-01-01".parse().unwrap();
        assert!(
            Range {
                from: d,
                to: d + Duration::days(365)
            }
            .validate()
            .is_ok()
        );
        assert!(
            Range {
                from: d,
                to: d + Duration::days(366)
            }
            .validate()
            .is_err()
        );
        assert!(
            Range {
                from: d,
                to: d - Duration::days(1)
            }
            .validate()
            .is_err()
        );
        assert_eq!(percent(0, 0), None);
        assert_eq!(percent(1, 4), Some(25.0));
    }
    #[test]
    fn profile_summary_does_not_serialize_identity_or_medical_details() {
        let p = profile::Profile {
            name: "Secret".into(),
            conditions: vec!["Secret".into()],
            birth_date: Some("2000-10-29".parse().unwrap()),
            height_cm: Some(180.0),
            ..Default::default()
        };
        let summary =
            serde_json::to_value(profile_metrics(p, "2026-10-28".parse().unwrap())).unwrap();
        assert_eq!(summary["age_years"], 25);
        assert_eq!(summary.as_object().unwrap().len(), 3);
        assert!(!summary.to_string().contains("Secret"));
        assert!(!Privacy::default().include_profile && !Privacy::default().include_intimacy);
    }
    #[test]
    fn habit_rollup_weights_results_and_excludes_cancellations_and_pending() {
        let stats = vec![
            HabitStatistics {
                expected: 4,
                completed: 1,
                skipped: 1,
                cancelled: 1,
                pending: 1,
                completion_rate: 50.0,
                ..Default::default()
            },
            HabitStatistics {
                expected: 8,
                completed: 6,
                missed: 2,
                completion_rate: 75.0,
                ..Default::default()
            },
        ];
        let result = habit_metrics(stats);
        assert_eq!(
            (result.completed, result.cancelled, result.pending),
            (7, 1, 1)
        );
        assert_eq!(result.completion_rate, Some(70.0));
    }
    #[test]
    fn task_metrics_use_profile_dates_and_do_not_count_future_or_pending_as_missed() {
        let o:tasks::TaskOccurrence=serde_json::from_value(serde_json::json!({
            "task":{"id":Uuid::new_v4(),"title":"Task","description":"","status":"todo","tags":[],"color":"#123456","priority":"normal","parent_id":null,"due_at":null,"schedule":null,"source_kind":"manual","source_id":null,"habit":null,"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z"},
            "date":"2026-01-02","starts_at":"2026-01-01T15:30:00Z","status":"completed"
        })).unwrap();
        let now: DateTime<Utc> = "2026-01-01T16:00:00Z".parse().unwrap();
        let rows = vec![TaskOccurrenceResponse {
            occurrence: o.clone(),
            editable: false,
        }];
        let utc = task_metrics(&rows, chrono_tz::UTC, now);
        assert_eq!((utc.completed, utc.future), (1, 0));
        let mut future = o.clone();
        future.starts_at = None;
        future.date = "2026-01-03".parse().unwrap();
        let mut pending = o.clone();
        pending.starts_at = None;
        pending.date = "2026-01-01".parse().unwrap();
        pending.status = "todo".into();
        let mut missed = pending.clone();
        missed.date = "2025-12-31".parse().unwrap();
        let rows = [o, future, pending, missed]
            .into_iter()
            .map(|occurrence| TaskOccurrenceResponse {
                occurrence,
                editable: false,
            })
            .collect::<Vec<_>>();
        let result = task_metrics(&rows, chrono_tz::UTC, now);
        assert_eq!(
            (
                result.completed,
                result.future,
                result.pending,
                result.missed
            ),
            (1, 1, 1, 1)
        );
        assert_eq!(result.completion_rate, Some(50.0));
    }
}
