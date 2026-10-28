use crate::{
    auth::CurrentUser,
    domain::{self, Search},
    error::{ApiError, ApiJson},
    schedule::Schedule,
    state::AppState,
    tasks::{self, Task, TaskOccurrence, TaskOccurrenceResponse},
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
};
use chrono::{DateTime, Duration, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SubHabit {
    pub id: Uuid,
    pub title: String,
    #[serde(default)]
    pub description: String,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct HabitConfig {
    pub icon: String,
    pub sub_habits: Vec<SubHabit>,
    pub reminder_enabled: bool,
    pub reminder_minutes_before: Option<u32>,
    pub workout_id: Option<Uuid>,
}
impl Default for HabitConfig {
    fn default() -> Self {
        Self {
            icon: "🌱".into(),
            sub_habits: vec![],
            reminder_enabled: false,
            reminder_minutes_before: None,
            workout_id: None,
        }
    }
}
impl HabitConfig {
    fn validate(&self, schedule: &Schedule) -> Result<(), ApiError> {
        if self.workout_id.is_some() && !self.sub_habits.is_empty() {
            return Err(ApiError::validation(
                "A workout habit cannot have sub-habits",
            ));
        }
        domain::text(&self.icon, 1, 32)?;
        if self.sub_habits.len() > 50 || self.reminder_minutes_before.is_some_and(|v| v > 1440) {
            return Err(ApiError::validation(
                "At most 50 sub-habits and 1440 reminder minutes are supported",
            ));
        }
        if self.reminder_enabled && schedule.time.is_none() {
            return Err(ApiError::validation("Reminders require a scheduled time"));
        }
        let mut ids = BTreeSet::new();
        for sub in &self.sub_habits {
            domain::text(&sub.title, 1, 200)?;
            domain::text(&sub.description, 0, 20000)?;
            if sub.id.is_nil() || !ids.insert(sub.id) {
                return Err(ApiError::validation("Sub-habit identifiers must be unique"));
            }
        }
        Ok(())
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct HabitInput {
    title: String,
    #[serde(default)]
    description: String,
    #[serde(default)]
    tags: Vec<String>,
    #[serde(default = "domain::default_color")]
    color: String,
    schedule: Schedule,
    #[serde(default)]
    habit: HabitConfig,
}
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HabitStatus {
    #[default]
    Pending,
    Completed,
    Skipped,
    Cancelled,
}
#[derive(Clone, Debug, Default, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct HabitMark {
    pub status: HabitStatus,
    pub completed_sub_habits: Vec<Uuid>,
    pub note: String,
    pub marked_at: Option<DateTime<Utc>>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct MarkInput {
    status: HabitStatus,
    #[serde(default)]
    completed_sub_habits: Vec<Uuid>,
    #[serde(default)]
    note: String,
}
#[derive(Deserialize)]
struct Range {
    from: NaiveDate,
    to: NaiveDate,
}
#[derive(sqlx::FromRow)]
struct Version {
    task_id: Uuid,
    effective_from: NaiveDate,
    snapshot: DbJson<Task>,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/habits", get(list).post(create))
        .route("/api/habits/statistics", get(statistics))
        .route("/api/habits/{id}", get(read).put(update).delete(archive))
        .route("/api/habits/{id}/marks/{date}", post(mark))
        .route("/api/habits/{id}/history", get(history))
        .route("/api/habits/{id}/statistics", get(single_statistics))
        .route("/api/reminders", get(reminders))
        .route("/api/reminders/{id}/{date}/dismiss", post(dismiss))
}
async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Task>>, ApiError> {
    q.validate()?;
    Ok(Json(sqlx::query_as("SELECT * FROM app.tasks WHERE user_id=$1 AND source_kind='habit' AND archived_at IS NULL AND ($2::text IS NULL OR strpos(lower(title||' '||description),lower($2))>0) AND ($3::text IS NULL OR tags ? $3) ORDER BY created_at,id")
        .bind(u.id).bind(q.q).bind(q.tag).fetch_all(&s.database).await?))
}
async fn owned(s: &AppState, user: Uuid, id: Uuid) -> Result<Task, ApiError> {
    sqlx::query_as("SELECT * FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='habit'")
        .bind(id)
        .bind(user)
        .fetch_optional(&s.database)
        .await?
        .ok_or_else(domain::not_found)
}
async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(owned(&s, u.id, id).await?))
}
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<HabitInput>,
) -> Result<(StatusCode, Json<Task>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<HabitInput>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(save(&s, u.id, id, v, false).await?))
}
async fn save(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    v: HabitInput,
    create: bool,
) -> Result<Task, ApiError> {
    domain::text(&v.title, 1, 200)?;
    domain::text(&v.description, 0, 200000)?;
    domain::tags(&v.tags)?;
    domain::color(&v.color)?;
    v.schedule.validate()?;
    v.habit.validate(&v.schedule)?;
    let today = Utc::now()
        .with_timezone(
            &v.schedule
                .timezone
                .parse::<chrono_tz::Tz>()
                .map_err(|_| ApiError::internal())?,
        )
        .date_naive();
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, user).await?;
    if let Some(workout) = v.habit.workout_id {
        crate::workouts::require_active(&mut tx, user, workout).await?;
    }
    if !create {
        let current: Task = sqlx::query_as("SELECT * FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='habit' AND archived_at IS NULL")
            .bind(id).bind(user).fetch_optional(&mut *tx).await?.ok_or_else(domain::not_found)?;
        if current
            .schedule
            .as_ref()
            .is_some_and(|old| old.timezone != v.schedule.timezone)
        {
            return Err(domain::conflict(
                "Habit timezone is fixed; archive and create a new habit to change it",
            ));
        }
    }
    let query = if create {
        "INSERT INTO app.tasks(id,user_id,title,description,tags,color,schedule,source_kind,source_id,habit) VALUES($1,$2,$3,$4,$5,$6,$7,'habit',$1,$8) RETURNING *"
    } else {
        "UPDATE app.tasks SET title=$3,description=$4,tags=$5,color=$6,schedule=$7,habit=$8,updated_at=now() WHERE id=$1 AND user_id=$2 AND source_kind='habit' AND archived_at IS NULL RETURNING *"
    };
    let task: Task = sqlx::query_as(query)
        .bind(id)
        .bind(user)
        .bind(v.title)
        .bind(v.description)
        .bind(DbJson(v.tags))
        .bind(v.color)
        .bind(DbJson(&v.schedule))
        .bind(DbJson(v.habit))
        .fetch_one(&mut *tx)
        .await?;
    let effective = if create {
        v.schedule.start_date.min(today)
    } else {
        today
    };
    sqlx::query("INSERT INTO app.habit_versions(user_id,task_id,effective_from,snapshot) VALUES($1,$2,$3,$4) ON CONFLICT(user_id,task_id,effective_from) DO UPDATE SET snapshot=EXCLUDED.snapshot")
        .bind(user).bind(id).bind(effective).bind(DbJson(&task)).execute(&mut *tx).await?;
    domain::event(
        &mut tx,
        user,
        if create {
            "habit_created"
        } else {
            "habit_updated"
        },
        "habit",
        id,
        serde_json::json!({"effective_from":effective}),
    )
    .await?;
    tx.commit().await?;
    Ok(task)
}
async fn archive(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let count=sqlx::query("UPDATE app.tasks SET archived_at=now(),updated_at=now() WHERE id=$1 AND user_id=$2 AND source_kind='habit' AND archived_at IS NULL")
        .bind(id).bind(u.id).execute(&mut *tx).await?.rows_affected();
    if count == 0 {
        return Err(domain::not_found());
    }
    domain::event(
        &mut tx,
        u.id,
        "habit_archived",
        "habit",
        id,
        serde_json::json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
fn validate_range(from: NaiveDate, to: NaiveDate) -> Result<(), ApiError> {
    if to < from || (to - from).num_days() > 365 {
        return Err(ApiError::validation(
            "Habit range must cover 1 to 366 dates",
        ));
    }
    Ok(())
}
fn task_status(mark: &HabitMark, config: &HabitConfig) -> &'static str {
    match mark.status {
        HabitStatus::Cancelled | HabitStatus::Skipped => "rejected",
        HabitStatus::Completed => "completed",
        HabitStatus::Pending
            if !mark.completed_sub_habits.is_empty() && !config.sub_habits.is_empty() =>
        {
            "in_progress"
        }
        _ => "todo",
    }
}
fn normalize_mark(v: MarkInput, config: &HabitConfig) -> Result<HabitMark, ApiError> {
    domain::text(&v.note, 0, 200000)?;
    let ids: BTreeSet<_> = v.completed_sub_habits.iter().copied().collect();
    if ids.len() != v.completed_sub_habits.len()
        || ids
            .iter()
            .any(|id| !config.sub_habits.iter().any(|sub| sub.id == *id))
    {
        return Err(ApiError::validation(
            "Completed sub-habits must be unique members of this occurrence",
        ));
    }
    let mut status = v.status;
    if !config.sub_habits.is_empty()
        && matches!(status, HabitStatus::Pending | HabitStatus::Completed)
    {
        status = if ids.len() == config.sub_habits.len() {
            HabitStatus::Completed
        } else {
            HabitStatus::Pending
        };
    }
    Ok(HabitMark {
        status,
        completed_sub_habits: ids.into_iter().collect(),
        note: v.note,
        marked_at: None,
    })
}
async fn mark(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, date)): Path<(Uuid, NaiveDate)>,
    ApiJson(v): ApiJson<MarkInput>,
) -> Result<Json<TaskOccurrenceResponse>, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let result = mark_in_transaction(&mut tx, u.id, id, date, v).await?;
    tx.commit().await?;
    Ok(Json(result))
}
async fn mark_in_transaction(
    tx: &mut sqlx::PgConnection,
    user: Uuid,
    id: Uuid,
    date: NaiveDate,
    v: MarkInput,
) -> Result<TaskOccurrenceResponse, ApiError> {
    let (task, saved) = editable_occurrence(tx, user, id, date).await?;
    let schedule = task.schedule.as_ref().ok_or_else(ApiError::internal)?;
    let config = task.habit.as_ref().ok_or_else(ApiError::internal)?;
    let mut mark = normalize_mark(v, config)?;
    if let Some(saved) = &saved {
        let mut old = saved.habit_mark.clone().unwrap_or_default();
        old.marked_at = None;
        if old == mark {
            return Ok(TaskOccurrenceResponse {
                occurrence: saved.clone(),
                editable: true,
            });
        }
    }
    mark.marked_at = Some(Utc::now());
    let status = task_status(&mark, config).to_owned();
    let occurrence = TaskOccurrence {
        starts_at: schedule.occurrence_start(date)?,
        task,
        date,
        status,
        habit_mark: Some(mark),
    };
    sqlx::query("INSERT INTO app.task_occurrences(user_id,task_id,occurrence_date,status,snapshot) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,task_id,occurrence_date) DO UPDATE SET status=EXCLUDED.status,snapshot=EXCLUDED.snapshot,updated_at=now()")
        .bind(user).bind(id).bind(date).bind(&occurrence.status).bind(DbJson(&occurrence)).execute(&mut *tx).await?;
    domain::event(tx,user,"habit_marked","habit",id,serde_json::json!({"date":date,"status":occurrence.habit_mark.as_ref().map(|m|&m.status),"completed_sub_habits":occurrence.habit_mark.as_ref().map(|m|m.completed_sub_habits.len())})).await?;
    Ok(TaskOccurrenceResponse {
        occurrence,
        editable: true,
    })
}

async fn editable_occurrence(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    id: Uuid,
    date: NaiveDate,
) -> Result<(Task, Option<TaskOccurrence>), ApiError> {
    let active: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND id=$2 AND source_kind='habit' AND archived_at IS NULL)").bind(user).bind(id).fetch_one(&mut *db).await?;
    if !active {
        return Err(domain::not_found());
    }
    let saved = sqlx::query_scalar::<_, DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND occurrence_date=$3").bind(user).bind(id).bind(date).fetch_optional(&mut *db).await?;
    let task = if let Some(saved) = &saved {
        saved.task.clone()
    } else {
        sqlx::query_scalar::<_, DbJson<Task>>("SELECT snapshot FROM app.habit_versions WHERE user_id=$1 AND task_id=$2 AND effective_from<=$3 ORDER BY effective_from DESC LIMIT 1").bind(user).bind(id).bind(date).fetch_optional(&mut *db).await?.ok_or_else(domain::not_found)?.0
    };
    let schedule = task.schedule.as_ref().ok_or_else(ApiError::internal)?;
    let today = Utc::now()
        .with_timezone(
            &schedule
                .timezone
                .parse::<chrono_tz::Tz>()
                .map_err(|_| ApiError::internal())?,
        )
        .date_naive();
    if date > today || !schedule.occurs_on(date) {
        return Err(ApiError::validation(
            "Select a current or past scheduled occurrence",
        ));
    }
    Ok((task, saved.map(|row| row.0)))
}

pub async fn workout_occurrence(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    id: Uuid,
    date: NaiveDate,
    workout: Uuid,
) -> Result<TaskOccurrence, ApiError> {
    let (task, saved) = editable_occurrence(db, user, id, date).await?;
    let schedule = task.schedule.as_ref().ok_or_else(ApiError::internal)?;
    if task
        .habit
        .as_ref()
        .is_none_or(|h| h.workout_id != Some(workout) || !h.sub_habits.is_empty())
    {
        return Err(domain::conflict(
            "This occurrence is not linked to the selected workout",
        ));
    }
    if let Some(saved) = saved {
        return Ok(saved);
    }
    Ok(TaskOccurrence {
        starts_at: schedule.occurrence_start(date)?,
        task,
        date,
        status: "todo".into(),
        habit_mark: None,
    })
}
pub async fn complete_workout(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    original: &TaskOccurrence,
    workout: Uuid,
) -> Result<bool, ApiError> {
    let current = match workout_occurrence(db, user, original.task.id, original.date, workout).await
    {
        Ok(value) => value,
        Err(error)
            if error.status == StatusCode::NOT_FOUND
                || error.status == StatusCode::CONFLICT
                || error.status == StatusCode::BAD_REQUEST =>
        {
            return Ok(false);
        }
        Err(error) => return Err(error),
    };
    let mark = current.habit_mark.unwrap_or_default();
    if mark.status == HabitStatus::Completed {
        return Ok(true);
    }
    if matches!(mark.status, HabitStatus::Skipped | HabitStatus::Cancelled) {
        return Ok(false);
    }
    mark_in_transaction(
        db,
        user,
        original.task.id,
        original.date,
        MarkInput {
            status: HabitStatus::Completed,
            completed_sub_habits: vec![],
            note: mark.note,
        },
    )
    .await?;
    Ok(true)
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
    let versions=sqlx::query_as::<_,Version>("SELECT task_id,effective_from,snapshot FROM app.habit_versions WHERE user_id=$1 ORDER BY task_id,effective_from")
        .bind(user).fetch_all(&s.database).await?;
    let archived: BTreeMap<Uuid, Option<DateTime<Utc>>> = sqlx::query_as(
        "SELECT id,archived_at FROM app.tasks WHERE user_id=$1 AND source_kind='habit'",
    )
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
            let ended = archived.get(&task.id).copied().flatten();
            let local_today = Utc::now()
                .with_timezone(
                    &schedule
                        .timezone
                        .parse::<chrono_tz::Tz>()
                        .map_err(|_| ApiError::internal())?,
                )
                .date_naive();
            if ended.is_some_and(|end| {
                starts_at.map_or_else(
                    || {
                        date >= end
                            .with_timezone(&schedule.timezone.parse::<chrono_tz::Tz>().unwrap())
                            .date_naive()
                    },
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
                    editable: ended.is_none() && date <= local_today,
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
    let saved=sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT o.snapshot FROM app.task_occurrences o JOIN app.tasks t ON t.user_id=o.user_id AND t.id=o.task_id WHERE o.user_id=$1 AND t.source_kind='habit' AND o.occurrence_date BETWEEN $2 AND $3")
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
                    editable: archived.get(&occurrence.task.id) == Some(&None),
                    occurrence,
                },
            );
        }
    }
    Ok(output.into_values().collect())
}
async fn history(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<TaskOccurrenceResponse>>, ApiError> {
    owned(&s, u.id, id).await?;
    let active: bool =
        sqlx::query_scalar("SELECT archived_at IS NULL FROM app.tasks WHERE user_id=$1 AND id=$2")
            .bind(u.id)
            .bind(id)
            .fetch_one(&s.database)
            .await?;
    let rows=sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 ORDER BY occurrence_date DESC")
        .bind(u.id).bind(id).fetch_all(&s.database).await?;
    Ok(Json(
        rows.into_iter()
            .map(|v| TaskOccurrenceResponse {
                occurrence: v.0,
                editable: active,
            })
            .collect(),
    ))
}

#[derive(Serialize, Default, Debug)]
pub struct HabitStatistics {
    id: Uuid,
    title: String,
    expected: u32,
    completed: u32,
    skipped: u32,
    cancelled: u32,
    missed: u32,
    pending: u32,
    completed_sub_habits: u32,
    total_sub_habits: u32,
    completion_rate: f64,
    current_streak: u32,
    best_streak: u32,
    longest_missed_streak: u32,
    shortest_missed_streak: u32,
    last_missed_streak: u32,
}
fn summarize(task: &Task, rows: &[TaskOccurrenceResponse], now: DateTime<Utc>) -> HabitStatistics {
    let mut result = HabitStatistics {
        id: task.id,
        title: task.title.clone(),
        ..Default::default()
    };
    let mut success = 0;
    let mut missing = 0;
    let mut missing_runs = vec![];
    let mut relevant: Vec<_> = rows
        .iter()
        .filter(|row| row.occurrence.task.id == task.id)
        .collect();
    relevant.sort_by_key(|row| row.occurrence.date);
    for row in relevant {
        let occurrence = &row.occurrence;
        let schedule = occurrence.task.schedule.as_ref().unwrap();
        let today = now
            .with_timezone(&schedule.timezone.parse::<chrono_tz::Tz>().unwrap())
            .date_naive();
        if occurrence.date > today {
            continue;
        }
        let config = occurrence.task.habit.as_ref().unwrap();
        let mark = occurrence.habit_mark.clone().unwrap_or_default();
        result.expected += 1;
        result.completed_sub_habits += mark.completed_sub_habits.len() as u32;
        result.total_sub_habits += config.sub_habits.len() as u32;
        match mark.status {
            HabitStatus::Cancelled => {
                result.cancelled += 1;
                continue;
            }
            HabitStatus::Completed => {
                result.completed += 1;
                success += 1;
                result.best_streak = result.best_streak.max(success);
                if missing > 0 {
                    missing_runs.push(missing);
                    missing = 0;
                }
            }
            HabitStatus::Skipped => {
                result.skipped += 1;
                success = 0;
                missing += 1;
            }
            HabitStatus::Pending => {
                let expired = occurrence.date < today
                    || occurrence.starts_at.is_some_and(|start| {
                        start + Duration::minutes(i64::from(schedule.duration_minutes)) <= now
                    });
                if expired {
                    result.missed += 1;
                    success = 0;
                    missing += 1;
                } else {
                    result.pending += 1;
                }
            }
        }
    }
    if missing > 0 {
        missing_runs.push(missing);
    }
    result.current_streak = success;
    result.longest_missed_streak = missing_runs.iter().copied().max().unwrap_or(0);
    result.shortest_missed_streak = missing_runs.iter().copied().min().unwrap_or(0);
    result.last_missed_streak = missing_runs.last().copied().unwrap_or(0);
    let counted = result.completed + result.skipped + result.missed;
    result.completion_rate = if counted == 0 {
        0.0
    } else {
        f64::from(result.completed) * 100.0 / f64::from(counted)
    };
    result
}
async fn statistics(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Range>,
) -> Result<Json<Vec<HabitStatistics>>, ApiError> {
    validate_range(q.from, q.to)?;
    let settings = domain::settings(&s, u.id).await?;
    let rows = occurrences(&s, u.id, q.from, q.to, &settings.timezone).await?;
    let tasks = sqlx::query_as::<_, Task>(
        "SELECT * FROM app.tasks WHERE user_id=$1 AND source_kind='habit' ORDER BY created_at,id",
    )
    .bind(u.id)
    .fetch_all(&s.database)
    .await?;
    let now = Utc::now();
    let mut stats: Vec<_> = tasks
        .iter()
        .map(|task| summarize(task, &rows, now))
        .collect();
    stats.sort_by(|a, b| {
        b.completion_rate
            .total_cmp(&a.completion_rate)
            .then(b.completed.cmp(&a.completed))
            .then(a.title.cmp(&b.title))
    });
    Ok(Json(stats))
}
async fn single_statistics(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    Query(q): Query<Range>,
) -> Result<Json<HabitStatistics>, ApiError> {
    let task = owned(&s, u.id, id).await?;
    let settings = domain::settings(&s, u.id).await?;
    let rows = occurrences(&s, u.id, q.from, q.to, &settings.timezone).await?;
    Ok(Json(summarize(&task, &rows, Utc::now())))
}
#[derive(Serialize)]
struct Reminder {
    task_id: Uuid,
    date: NaiveDate,
    title: String,
    starts_at: DateTime<Utc>,
    due_at: DateTime<Utc>,
}
async fn reminders(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Reminder>>, ApiError> {
    let settings = domain::settings(&s, u.id).await?;
    if !settings.reminders_enabled {
        return Ok(Json(vec![]));
    }
    let now = Utc::now();
    let rows = occurrences(
        &s,
        u.id,
        now.date_naive() - Duration::days(2),
        now.date_naive() + Duration::days(2),
        "UTC",
    )
    .await?;
    let receipts:BTreeSet<(Uuid,NaiveDate)>=sqlx::query_as("SELECT task_id,occurrence_date FROM app.habit_reminder_receipts WHERE user_id=$1 AND occurrence_date BETWEEN $2 AND $3")
        .bind(u.id).bind(now.date_naive()-Duration::days(4)).bind(now.date_naive()+Duration::days(4)).fetch_all(&s.database).await?.into_iter().collect();
    let mut output = vec![];
    let current: BTreeMap<Uuid, DbJson<HabitConfig>> = sqlx::query_as("SELECT id,habit FROM app.tasks WHERE user_id=$1 AND source_kind='habit' AND archived_at IS NULL")
        .bind(u.id).fetch_all(&s.database).await?.into_iter().collect();
    for row in rows {
        let o = row.occurrence;
        let Some(config) = current.get(&o.task.id) else {
            continue;
        };
        if !config.reminder_enabled
            || receipts.contains(&(o.task.id, o.date))
            || !["todo", "in_progress"].contains(&o.status.as_str())
        {
            continue;
        }
        let Some(start) = o.starts_at else { continue };
        let due = start
            - Duration::minutes(i64::from(
                config
                    .reminder_minutes_before
                    .unwrap_or(settings.reminder_minutes_before),
            ));
        if due <= now && due > now - Duration::hours(24) {
            output.push(Reminder {
                task_id: o.task.id,
                date: o.date,
                title: o.task.title,
                starts_at: start,
                due_at: due,
            });
        }
    }
    output.sort_by_key(|r| r.due_at);
    Ok(Json(output))
}
async fn dismiss(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, date)): Path<(Uuid, NaiveDate)>,
) -> Result<StatusCode, ApiError> {
    owned(&s, u.id, id).await?;
    let rows = reminders(State(s.clone()), u.clone()).await?.0;
    if rows.iter().any(|r| r.task_id == id && r.date == date) {
        sqlx::query("INSERT INTO app.habit_reminder_receipts(user_id,task_id,occurrence_date) VALUES($1,$2,$3) ON CONFLICT DO NOTHING")
            .bind(u.id).bind(id).bind(date).execute(&s.database).await?;
    }
    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture() -> Task {
        serde_json::from_value(serde_json::json!({
            "id":Uuid::new_v4(),"title":"Read","description":"","status":"todo","tags":[],"color":"#123456","priority":"normal","parent_id":null,"due_at":null,
            "schedule":{"start_date":"2026-01-01","time":null,"timezone":"UTC","duration_minutes":30,"recurrence":"daily","interval_days":1,"weekdays":[],"end_date":null},
            "source_kind":"habit","source_id":null,"created_at":"2026-01-01T00:00:00Z","updated_at":"2026-01-01T00:00:00Z","habit":{"icon":"🌱","sub_habits":[],"reminder_enabled":false,"reminder_minutes_before":null}
        })).unwrap()
    }
    fn row(task: &Task, date: &str, status: HabitStatus) -> TaskOccurrenceResponse {
        TaskOccurrenceResponse {
            editable: true,
            occurrence: TaskOccurrence {
                task: task.clone(),
                date: date.parse().unwrap(),
                starts_at: None,
                status: "todo".into(),
                habit_mark: Some(HabitMark {
                    status,
                    ..Default::default()
                }),
            },
        }
    }
    #[test]
    fn parent_completion_is_the_sum_of_its_children() {
        let ids = [Uuid::new_v4(), Uuid::new_v4()];
        let config = HabitConfig {
            sub_habits: ids
                .iter()
                .map(|id| SubHabit {
                    id: *id,
                    title: "Step".into(),
                    description: String::new(),
                })
                .collect(),
            ..Default::default()
        };
        let partial = normalize_mark(
            MarkInput {
                status: HabitStatus::Completed,
                completed_sub_habits: vec![ids[0]],
                note: String::new(),
            },
            &config,
        )
        .unwrap();
        assert_eq!(partial.status, HabitStatus::Pending);
        assert_eq!(task_status(&partial, &config), "in_progress");
        let complete = normalize_mark(
            MarkInput {
                status: HabitStatus::Pending,
                completed_sub_habits: ids.to_vec(),
                note: String::new(),
            },
            &config,
        )
        .unwrap();
        assert_eq!(complete.status, HabitStatus::Completed);
        assert_eq!(task_status(&complete, &config), "completed");
    }
    #[test]
    fn foreign_or_duplicate_children_are_rejected() {
        let config = HabitConfig::default();
        assert!(
            normalize_mark(
                MarkInput {
                    status: HabitStatus::Pending,
                    completed_sub_habits: vec![Uuid::new_v4()],
                    note: String::new()
                },
                &config
            )
            .is_err()
        );
        let id = Uuid::new_v4();
        let config = HabitConfig {
            sub_habits: vec![SubHabit {
                id,
                title: "step".into(),
                description: String::new(),
            }],
            ..Default::default()
        };
        assert!(
            normalize_mark(
                MarkInput {
                    status: HabitStatus::Completed,
                    completed_sub_habits: vec![id, id],
                    note: String::new()
                },
                &config
            )
            .is_err()
        );
    }
    #[test]
    fn statistics_distinguish_cancellation_skips_missing_and_future() {
        let task = fixture();
        let rows = vec![
            row(&task, "2026-01-01", HabitStatus::Completed),
            row(&task, "2026-01-02", HabitStatus::Cancelled),
            row(&task, "2026-01-03", HabitStatus::Completed),
            row(&task, "2026-01-04", HabitStatus::Skipped),
            row(&task, "2026-01-05", HabitStatus::Pending),
            row(&task, "2026-01-06", HabitStatus::Pending),
            row(&task, "2026-01-07", HabitStatus::Pending),
        ];
        let stats = summarize(&task, &rows, "2026-01-06T12:00:00Z".parse().unwrap());
        assert_eq!(
            (
                stats.expected,
                stats.completed,
                stats.cancelled,
                stats.skipped,
                stats.missed,
                stats.pending
            ),
            (6, 2, 1, 1, 1, 1)
        );
        assert_eq!((stats.best_streak, stats.current_streak), (2, 0));
        assert_eq!(
            (
                stats.longest_missed_streak,
                stats.shortest_missed_streak,
                stats.last_missed_streak
            ),
            (2, 2, 2)
        );
        assert_eq!(stats.completion_rate, 50.0);
    }
    #[test]
    fn current_untimed_pending_does_not_break_a_completed_streak() {
        let task = fixture();
        let rows = vec![
            row(&task, "2026-01-01", HabitStatus::Completed),
            row(&task, "2026-01-02", HabitStatus::Pending),
        ];
        let stats = summarize(&task, &rows, "2026-01-02T23:00:00Z".parse().unwrap());
        assert_eq!(
            (stats.current_streak, stats.pending, stats.missed),
            (1, 1, 0)
        );
    }
    #[test]
    fn reminders_require_time_and_queries_are_bounded() {
        let task = fixture();
        let config = HabitConfig {
            reminder_enabled: true,
            ..Default::default()
        };
        assert!(config.validate(task.schedule.as_ref().unwrap()).is_err());
        assert!(
            validate_range("2026-01-01".parse().unwrap(), "2027-01-02".parse().unwrap()).is_err()
        );
        assert!(
            validate_range("2026-01-02".parse().unwrap(), "2026-01-01".parse().unwrap()).is_err()
        );
    }
}
