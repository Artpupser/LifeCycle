use super::models::{
    Day, HabitMetrics, Privacy, ProfileMetrics, Range, Report, TaskMetrics, TimerMetrics,
    WorkoutMetrics,
};
use crate::{
    infrastructure::state::AppState,
    modules::habits::{self, HabitStatistics, HabitStatus},
    modules::intimacy,
    modules::profile,
    modules::tasks::{self, TaskOccurrenceResponse},
    shared::domain,
    shared::errors::ApiError,
};
use chrono::{DateTime, Duration, NaiveDate, Utc};
use std::collections::BTreeMap;
use uuid::Uuid;

pub(super) async fn privacy(s: &AppState, user: Uuid) -> Result<Privacy, ApiError> {
    Ok(sqlx::query_as(
        "SELECT include_profile,include_intimacy FROM app.analytics_privacy WHERE user_id=$1",
    )
    .bind(user)
    .fetch_optional(&s.database)
    .await?
    .unwrap_or_default())
}

pub(super) fn percent(completed: u64, counted: u64) -> Option<f64> {
    (counted > 0).then(|| completed as f64 * 100.0 / counted as f64)
}

pub(super) fn task_metrics(
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

pub(super) fn habit_metrics(mut stats: Vec<HabitStatistics>) -> HabitMetrics {
    let mut m = HabitMetrics::default();
    for s in &stats {
        m.expected += u64::from(s.expected);
        m.completed += u64::from(s.completed);
        m.skipped += u64::from(s.skipped);
        m.cancelled += u64::from(s.cancelled);
        m.missed += u64::from(s.missed);
        m.pending += u64::from(s.pending);
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

pub(super) fn profile_metrics(p: profile::Profile, today: NaiveDate) -> ProfileMetrics {
    ProfileMetrics {
        age_years: p.birth_date.and_then(|d| today.years_since(d)),
        height_cm: p.height_cm,
        weight_kg: p.weight_kg,
    }
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

pub(super) async fn build_report(
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
    crate::modules::pomodoro::programs::lock(&mut guard, user).await?;
    let timer = crate::modules::pomodoro::programs::sync(&mut guard, user).await?;
    if timer
        .as_ref()
        .and_then(|t| t.program.as_ref())
        .is_some_and(|p| p.history_pending > 0)
    {
        guard.commit().await?;
        return Err(ApiError::new(
            axum::http::StatusCode::CONFLICT,
            "pomodoro_history_pending",
            "Timer history is synchronizing; retry the report",
        ));
    }
    // Publish timer history before the report's existing pooled reads.
    guard.commit().await?;
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
        let shared_tasks: Vec<Uuid> =
            sqlx::query_scalar("SELECT id FROM app.tasks WHERE user_id=$1 AND ai_shared")
                .bind(user)
                .fetch_all(&s.database)
                .await?;
        let visible = |t: &tasks::Task| {
            shared_tasks.contains(&t.id)
                && t.habit
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
    let events:Vec<(NaiveDate,String,i64)>=sqlx::query_as("SELECT (occurred_at AT TIME ZONE $2)::date,event_type,count(*) FROM app.activity_events ev WHERE user_id=$1 AND (NOT $5 OR CASE entity_type WHEN 'note' THEN EXISTS(SELECT 1 FROM app.notes n WHERE n.user_id=ev.user_id AND n.id=ev.entity_id AND n.ai_shared) WHEN 'workout' THEN EXISTS(SELECT 1 FROM app.workouts w WHERE w.user_id=ev.user_id AND w.id=ev.entity_id AND w.ai_shared) WHEN 'workout_session' THEN EXISTS(SELECT 1 FROM app.workout_sessions ws JOIN app.workouts w ON w.id=ws.workout_id AND w.user_id=ws.user_id WHERE ws.user_id=ev.user_id AND ws.id=ev.entity_id AND w.ai_shared) WHEN 'exercise' THEN EXISTS(SELECT 1 FROM app.exercises x WHERE x.user_id=ev.user_id AND x.id=ev.entity_id AND x.ai_shared) WHEN 'task' THEN EXISTS(SELECT 1 FROM app.tasks t WHERE t.user_id=ev.user_id AND t.id=ev.entity_id AND t.ai_shared) WHEN 'habit' THEN EXISTS(SELECT 1 FROM app.tasks t WHERE t.user_id=ev.user_id AND t.id=ev.entity_id AND t.ai_shared) WHEN 'folder' THEN false WHEN 'countdown' THEN false ELSE true END) AND (occurred_at AT TIME ZONE $2)::date BETWEEN $3 AND $4 AND entity_type IN ('note','folder','task','habit','exercise','workout','workout_session','countdown','pomodoro') GROUP BY 1,2")
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
