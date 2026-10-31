use crate::{
    auth::CurrentUser,
    domain::{self, Search},
    error::{ApiError, ApiJson},
    schedule::Schedule,
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgConnection, types::Json as DbJson};
use std::collections::BTreeMap;
use uuid::Uuid;

type PlannedStart = (NaiveDate, Option<DateTime<Utc>>);

#[derive(Clone, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct TaskInput {
    title: String,
    description: String,
    status: String,
    tags: Vec<String>,
    color: String,
    priority: String,
    parent_id: Option<Uuid>,
    due_at: Option<DateTime<Utc>>,
    schedule: Option<Schedule>,
}
impl Default for TaskInput {
    fn default() -> Self {
        Self {
            title: String::new(),
            description: String::new(),
            status: "todo".into(),
            tags: vec![],
            color: domain::default_color(),
            priority: "normal".into(),
            parent_id: None,
            due_at: None,
            schedule: None,
        }
    }
}
#[derive(Serialize, Deserialize, Clone, sqlx::FromRow)]
pub struct Task {
    pub id: Uuid,
    pub title: String,
    pub description: String,
    pub status: String,
    pub tags: DbJson<Vec<String>>,
    pub color: String,
    pub priority: String,
    pub parent_id: Option<Uuid>,
    pub due_at: Option<DateTime<Utc>>,
    pub schedule: Option<DbJson<Schedule>>,
    pub source_kind: String,
    pub source_id: Option<Uuid>,
    #[serde(default)]
    pub habit: Option<DbJson<crate::habits::HabitConfig>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
#[derive(Serialize, Deserialize, Clone)]
pub struct TaskOccurrence {
    pub task: Task,
    pub date: NaiveDate,
    pub starts_at: Option<DateTime<Utc>>,
    pub status: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub habit_mark: Option<crate::habits::HabitMark>,
}
#[derive(Serialize)]
pub struct TaskOccurrenceResponse {
    #[serde(flatten)]
    pub occurrence: TaskOccurrence,
    pub editable: bool,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct OccurrenceInput {
    status: String,
}
#[derive(Deserialize)]
struct TodayQuery {
    date: Option<NaiveDate>,
}
#[derive(Deserialize)]
struct CalendarQuery {
    from: NaiveDate,
    to: NaiveDate,
}
#[derive(Serialize)]
struct TodayResponse {
    date: NaiveDate,
    timezone: String,
    tasks: Vec<TaskOccurrenceResponse>,
}
#[derive(Serialize)]
struct CalendarResponse {
    from: NaiveDate,
    to: NaiveDate,
    timezone: String,
    occurrences: Vec<TaskOccurrenceResponse>,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/tasks", get(list).post(create))
        .route("/api/tasks/{id}", get(read).put(update).delete(delete))
        .route(
            "/api/tasks/{id}/occurrences/{date}",
            axum::routing::post(mark),
        )
        .route("/api/tasks/{id}/history", get(history))
        .route("/api/today", get(today))
        .route("/api/calendar", get(calendar))
}

pub async fn get_active(state: &AppState, user: Uuid, id: Uuid) -> Result<Task, ApiError> {
    sqlx::query_as("SELECT * FROM app.tasks WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .fetch_optional(&state.database)
        .await?
        .ok_or_else(domain::not_found)
}
async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Task>>, ApiError> {
    q.validate()?;
    if let Some(status) = &q.status {
        valid_status(status)?;
    }
    if q.from
        .zip(q.to)
        .is_some_and(|(a, b)| b < a || (b - a).num_days() > 365)
    {
        return Err(ApiError::validation(
            "Date filter must cover at most 366 dates",
        ));
    }
    let tasks = sqlx::query_as::<_, Task>(
        "SELECT * FROM app.tasks WHERE user_id=$1 AND source_kind='manual'
         AND ($2::text IS NULL OR strpos(lower(title||' '||description),lower($2))>0)
         AND ($3::text IS NULL OR status=$3) AND ($4::text IS NULL OR tags ? $4)
         ORDER BY created_at,id",
    )
    .bind(u.id)
    .bind(&q.q)
    .bind(&q.status)
    .bind(&q.tag)
    .fetch_all(&s.database)
    .await?;
    if q.from.is_none() && q.to.is_none() {
        return Ok(Json(tasks));
    }
    let timezone = domain::settings(&s, u.id)
        .await?
        .timezone
        .parse::<chrono_tz::Tz>()
        .map_err(|_| ApiError::internal())?;
    let filtered = tasks
        .into_iter()
        .filter(|task| {
            if let Some(schedule) = &task.schedule {
                schedule_matches_profile_dates(schedule, q.from, q.to, &timezone)
            } else if let Some(due) = task.due_at {
                let date = due.with_timezone(&timezone).date_naive();
                q.from.is_none_or(|from| date >= from) && q.to.is_none_or(|to| date <= to)
            } else {
                false
            }
        })
        .collect();
    Ok(Json(filtered))
}

fn schedule_intersects(
    schedule: &Schedule,
    from: Option<NaiveDate>,
    to: Option<NaiveDate>,
) -> bool {
    let start = from.unwrap_or(schedule.start_date).max(schedule.start_date);
    next_schedule_date(schedule, start).is_some_and(|date| to.is_none_or(|end| date <= end))
}

fn next_schedule_date(schedule: &Schedule, from: NaiveDate) -> Option<NaiveDate> {
    let start = from.max(schedule.start_date);
    let next = match schedule.recurrence.as_str() {
        "once" => Some(schedule.start_date),
        "daily" => Some(start),
        "weekly" => (0..7)
            .filter_map(|offset| start.checked_add_signed(chrono::Duration::days(offset)))
            .find(|date| schedule.occurs_on(*date)),
        "interval" if schedule.interval_days > 0 => {
            let period = i64::from(schedule.interval_days);
            let elapsed = (start - schedule.start_date).num_days();
            let offset = (period - elapsed % period) % period;
            start.checked_add_signed(chrono::Duration::days(offset))
        }
        _ => None,
    };
    next.filter(|date| *date >= start && schedule.end_date.is_none_or(|end| *date <= end))
}

fn schedule_matches_profile_dates(
    schedule: &Schedule,
    from: Option<NaiveDate>,
    to: Option<NaiveDate>,
    zone: &chrono_tz::Tz,
) -> bool {
    if schedule.time.is_none() {
        return schedule_intersects(schedule, from, to);
    }
    let mut candidate = from
        .map(|date| {
            date.checked_sub_signed(chrono::Duration::days(3))
                .unwrap_or(NaiveDate::MIN)
        })
        .unwrap_or(schedule.start_date);
    for _ in 0..8 {
        let Some(date) = next_schedule_date(schedule, candidate) else {
            return false;
        };
        let Ok(Some(instant)) = schedule.occurrence_start(date) else {
            return false;
        };
        let local = instant.with_timezone(zone).date_naive();
        if from.is_none_or(|from| local >= from) {
            return to.is_none_or(|to| local <= to);
        }
        let Some(next) = date.succ_opt() else {
            return false;
        };
        candidate = next;
    }
    false
}

pub(crate) fn calendar_date(occurrence: &TaskOccurrence, zone: &chrono_tz::Tz) -> NaiveDate {
    occurrence.starts_at.map_or(occurrence.date, |instant| {
        instant.with_timezone(zone).date_naive()
    })
}

pub(crate) fn schedule_in_profile_range(
    schedule: &Schedule,
    from: NaiveDate,
    to: NaiveDate,
    zone: &chrono_tz::Tz,
) -> Result<Vec<PlannedStart>, ApiError> {
    schedule.validate()?;
    let first = from
        .checked_sub_signed(chrono::Duration::days(3))
        .unwrap_or(NaiveDate::MIN);
    let last = to
        .checked_add_signed(chrono::Duration::days(3))
        .unwrap_or(NaiveDate::MAX);
    let mut result = vec![];
    for offset in 0..=(last - first).num_days() {
        let Some(date) = first.checked_add_signed(chrono::Duration::days(offset)) else {
            continue;
        };
        if !schedule.occurs_on(date) {
            continue;
        }
        let starts_at = schedule.occurrence_start(date)?;
        let local = starts_at.map_or(date, |instant| instant.with_timezone(zone).date_naive());
        if local >= from && local <= to {
            result.push((date, starts_at));
        }
    }
    Ok(result)
}
async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(get_active(&s, u.id, id).await?))
}
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<TaskInput>,
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
    ApiJson(v): ApiJson<TaskInput>,
) -> Result<Json<Task>, ApiError> {
    Ok(Json(save(&s, u.id, id, v, false).await?))
}
async fn save(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    v: TaskInput,
    create: bool,
) -> Result<Task, ApiError> {
    let mut tx = s.database.begin().await?;
    let task = save_in(s, &mut tx, user, id, v, create).await?;
    tx.commit().await?;
    Ok(task)
}
pub(crate) async fn save_in(
    s: &AppState,
    tx: &mut PgConnection,
    user: Uuid,
    id: Uuid,
    v: TaskInput,
    create: bool,
) -> Result<Task, ApiError> {
    domain::text(&v.title, 1, 200)?;
    domain::text(&v.description, 0, 200000)?;
    domain::tags(&v.tags)?;
    domain::color(&v.color)?;
    valid_status(&v.status)?;
    if !["low", "normal", "high", "urgent"].contains(&v.priority.as_str()) {
        return Err(ApiError::validation("Unsupported task priority"));
    }
    if let Some(schedule) = &v.schedule {
        schedule.validate()?;
        if schedule.recurrence != "once" && v.status != "todo" {
            return Err(ApiError::validation(
                "Recurring tasks use per-date occurrence status",
            ));
        }
    }
    let (today, timezone) = domain::local_today(s, user).await?;
    lock_tasks(tx, user).await?;
    if !create {
        let kind: String =
            sqlx::query_scalar("SELECT source_kind FROM app.tasks WHERE id=$1 AND user_id=$2")
                .bind(id)
                .bind(user)
                .fetch_optional(&mut *tx)
                .await?
                .ok_or_else(domain::not_found)?;
        if kind != "manual" {
            return Err(domain::conflict("Use the source module to edit this task"));
        }
    }
    let previous_status = if create {
        None
    } else {
        Some(
            sqlx::query_scalar::<_, String>(
                "SELECT status FROM app.tasks WHERE id=$1 AND user_id=$2",
            )
            .bind(id)
            .bind(user)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(domain::not_found)?,
        )
    };
    if let Some(parent) = v.parent_id {
        let parent_exists = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='manual'",
        )
        .bind(parent)
        .bind(user)
        .fetch_optional(&mut *tx)
        .await?
        .is_some();
        if !parent_exists || parent == id {
            return Err(ApiError::validation(
                "Task parent must be another active task belonging to the user",
            ));
        }
        let cyclic=sqlx::query_scalar::<_,bool>(
            "WITH RECURSIVE parents AS (
                SELECT id,parent_id FROM app.tasks WHERE id=$1 AND user_id=$2
                UNION ALL SELECT t.id,t.parent_id FROM app.tasks t JOIN parents p ON t.id=p.parent_id WHERE t.user_id=$2
             ) SELECT EXISTS(SELECT 1 FROM parents WHERE id=$3)"
        ).bind(parent).bind(user).bind(id).fetch_one(&mut *tx).await?;
        if cyclic {
            return Err(ApiError::validation("Task hierarchy cannot contain cycles"));
        }
    }
    let query = if create {
        "INSERT INTO app.tasks (id,user_id,title,description,status,tags,color,priority,parent_id,due_at,schedule)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *"
    } else {
        "UPDATE app.tasks SET title=$3,description=$4,status=$5,tags=$6,color=$7,priority=$8,parent_id=$9,due_at=$10,schedule=$11,updated_at=now()
         WHERE id=$1 AND user_id=$2 RETURNING *"
    };
    let task: Task = sqlx::query_as(query)
        .bind(id)
        .bind(user)
        .bind(v.title)
        .bind(v.description)
        .bind(v.status)
        .bind(DbJson(v.tags))
        .bind(v.color)
        .bind(v.priority)
        .bind(v.parent_id)
        .bind(v.due_at)
        .bind(v.schedule.map(DbJson))
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    let one_time = task
        .schedule
        .as_ref()
        .is_none_or(|schedule| schedule.recurrence == "once");
    if matches!(task.status.as_str(), "completed" | "rejected")
        || (one_time
            && previous_status
                .as_ref()
                .is_some_and(|status| status != &task.status))
    {
        let zone = timezone
            .parse::<chrono_tz::Tz>()
            .map_err(|_| ApiError::internal())?;
        let date = task
            .schedule
            .as_ref()
            .map(|v| v.start_date)
            .or_else(|| task.due_at.map(|v| v.with_timezone(&zone).date_naive()))
            .unwrap_or(today);
        let saved = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND occurrence_date=$3)",
        )
        .bind(user)
        .bind(task.id)
        .bind(date)
        .fetch_one(&mut *tx)
        .await?;
        if saved
            || task.schedule.is_some()
            || task.due_at.is_some()
            || matches!(task.status.as_str(), "completed" | "rejected")
        {
            persist_occurrence(tx, user, &task, date, &task.status).await?;
        }
    }
    domain::event(
        tx,
        user,
        if create {
            "task_created"
        } else {
            "task_updated"
        },
        "task",
        id,
        serde_json::json!({"status":task.status}),
    )
    .await?;
    Ok(task)
}
pub async fn lock_tasks(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(user.to_string())
        .execute(db)
        .await?;
    Ok(())
}
async fn delete(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
pub(crate) async fn delete_in(tx: &mut PgConnection, user: Uuid, id: Uuid) -> Result<(), ApiError> {
    lock_tasks(tx, user).await?;
    let kind: String =
        sqlx::query_scalar("SELECT source_kind FROM app.tasks WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(user)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(domain::not_found)?;
    if kind != "manual" {
        return Err(domain::conflict(
            "Use the source module to delete this task",
        ));
    }
    let rows = sqlx::query("DELETE FROM app.tasks WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(user)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if rows == 0 {
        return Err(domain::not_found());
    }
    sqlx::query(
        "UPDATE app.tasks SET parent_id=NULL,updated_at=now() WHERE parent_id=$1 AND user_id=$2",
    )
    .bind(id)
    .bind(user)
    .execute(&mut *tx)
    .await?;
    domain::event(tx, user, "task_deleted", "task", id, serde_json::json!({})).await?;
    Ok(())
}
async fn mark(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((id, date)): Path<(Uuid, NaiveDate)>,
    ApiJson(v): ApiJson<OccurrenceInput>,
) -> Result<Json<TaskOccurrenceResponse>, ApiError> {
    valid_status(&v.status)?;
    let mut tx = s.database.begin().await?;
    lock_tasks(&mut tx, u.id).await?;
    let task: Task = sqlx::query_as("SELECT * FROM app.tasks WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(u.id)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    if task.source_kind != "manual" {
        return Err(domain::conflict("Use habit marks for this occurrence"));
    }
    if task
        .schedule
        .as_ref()
        .is_some_and(|schedule| !schedule.occurs_on(date))
    {
        return Err(ApiError::validation(
            "Task does not occur on the selected date",
        ));
    }
    let occurrence = persist_occurrence(&mut tx, u.id, &task, date, &v.status).await?;
    if task
        .schedule
        .as_ref()
        .is_none_or(|v| v.recurrence == "once")
    {
        sqlx::query("UPDATE app.tasks SET status=$3,updated_at=now() WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .bind(&v.status)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(Json(TaskOccurrenceResponse {
        occurrence,
        editable: true,
    }))
}
pub async fn persist_occurrence(
    db: &mut PgConnection,
    user: Uuid,
    task: &Task,
    date: NaiveDate,
    status: &str,
) -> Result<TaskOccurrence, ApiError> {
    let mut snapshot = task.clone();
    if task
        .schedule
        .as_ref()
        .is_none_or(|schedule| schedule.recurrence == "once")
    {
        snapshot.status = status.to_owned();
    }
    let occurrence = TaskOccurrence {
        task: snapshot,
        date,
        starts_at: match &task.schedule {
            Some(schedule) => schedule.occurrence_start(date)?,
            None => task.due_at,
        },
        status: status.to_owned(),
        habit_mark: None,
    };
    let prior=sqlx::query_scalar::<_,String>("SELECT status FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND occurrence_date=$3").bind(user).bind(task.id).bind(date).fetch_optional(&mut *db).await?;
    if prior.as_deref() == Some(status) {
        return Ok(sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND occurrence_date=$3").bind(user).bind(task.id).bind(date).fetch_one(db).await?.0);
    }
    sqlx::query(
        "INSERT INTO app.task_occurrences(user_id,task_id,occurrence_date,status,snapshot) VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(user_id,task_id,occurrence_date) DO UPDATE SET status=EXCLUDED.status,snapshot=EXCLUDED.snapshot,updated_at=now()"
    ).bind(user).bind(task.id).bind(date).bind(status).bind(DbJson(&occurrence)).execute(&mut *db).await?;
    domain::event(db,user,"task_status_changed","task",task.id,serde_json::json!({"date":date,"status":status,"duration_minutes":task.schedule.as_ref().map(|s|s.duration_minutes)})).await?;
    Ok(occurrence)
}
async fn history(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Vec<TaskOccurrenceResponse>>, ApiError> {
    let rule = sqlx::query_as::<_, (Option<DbJson<Schedule>>,)>(
        "SELECT schedule FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='manual'",
    )
    .bind(id)
    .bind(u.id)
    .fetch_optional(&s.database)
    .await?;
    let rows = sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2 AND snapshot->'task'->>'source_kind'='manual' ORDER BY occurrence_date DESC").bind(u.id).bind(id).fetch_all(&s.database).await?;
    if rule.is_none() && rows.is_empty() {
        return Err(domain::not_found());
    }
    Ok(Json(
        rows.into_iter()
            .map(|row| {
                let occurrence = row.0;
                let editable = rule.as_ref().is_some_and(|(schedule,)| {
                    schedule
                        .as_ref()
                        .is_none_or(|schedule| schedule.occurs_on(occurrence.date))
                });
                TaskOccurrenceResponse {
                    occurrence,
                    editable,
                }
            })
            .collect(),
    ))
}
async fn today(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<TodayQuery>,
) -> Result<Json<TodayResponse>, ApiError> {
    let (local, timezone) = domain::local_today(&s, u.id).await?;
    let date = q.date.unwrap_or(local);
    let tasks = occurrences(&s, u.id, date, date, &timezone).await?;
    Ok(Json(TodayResponse {
        date,
        timezone,
        tasks,
    }))
}
async fn calendar(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<CalendarQuery>,
) -> Result<Json<CalendarResponse>, ApiError> {
    let timezone = domain::settings(&s, u.id).await?.timezone;
    let occurrences = occurrences(&s, u.id, q.from, q.to, &timezone).await?;
    Ok(Json(CalendarResponse {
        from: q.from,
        to: q.to,
        timezone,
        occurrences,
    }))
}
pub async fn occurrences(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    timezone: &str,
) -> Result<Vec<TaskOccurrenceResponse>, ApiError> {
    if to < from || (to - from).num_days() > 365 {
        return Err(ApiError::validation(
            "Calendar range must cover 1 to 366 dates",
        ));
    }
    let zone = timezone
        .parse::<chrono_tz::Tz>()
        .map_err(|_| ApiError::internal())?;
    let active = sqlx::query_as::<_, Task>(
        "SELECT * FROM app.tasks WHERE user_id=$1 AND source_kind='manual'",
    )
    .bind(user)
    .fetch_all(&s.database)
    .await?;
    let edit_rules: BTreeMap<_, _> = active
        .iter()
        .map(|task| (task.id, task.schedule.clone()))
        .collect();
    let mut output = BTreeMap::new();
    for task in active {
        let dates = if let Some(schedule) = &task.schedule {
            schedule_in_profile_range(schedule, from, to, &zone)?
        } else {
            task.due_at
                .map(|v| v.with_timezone(&zone).date_naive())
                .filter(|d| *d >= from && *d <= to)
                .into_iter()
                .map(|date| (date, task.due_at))
                .collect()
        };
        for (date, starts_at) in dates {
            output.insert(
                (date, task.id),
                TaskOccurrence {
                    task: task.clone(),
                    date,
                    starts_at,
                    status: task.status.clone(),
                    habit_mark: None,
                },
            );
        }
    }
    let expanded_from = from
        .checked_sub_signed(chrono::Duration::days(3))
        .unwrap_or(NaiveDate::MIN);
    let expanded_to = to
        .checked_add_signed(chrono::Duration::days(3))
        .unwrap_or(NaiveDate::MAX);
    let saved=sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND snapshot->'task'->>'source_kind'='manual' AND occurrence_date BETWEEN $2 AND $3").bind(user).bind(expanded_from).bind(expanded_to).fetch_all(&s.database).await?;
    for value in saved {
        let occurrence = value.0;
        let key = (occurrence.date, occurrence.task.id);
        if matches!(occurrence.status.as_str(), "completed" | "rejected") {
            output.remove(&key);
            let date = calendar_date(&occurrence, &zone);
            if date >= from && date <= to {
                output.insert(key, occurrence);
            }
        } else if let Some(current) = output.get_mut(&key) {
            current.status = occurrence.status;
            if current
                .task
                .schedule
                .as_ref()
                .is_none_or(|schedule| schedule.recurrence == "once")
            {
                current.task.status = current.status.clone();
            }
        }
    }
    let mut rows: Vec<_> = output.into_values().collect();
    rows.sort_by(|a, b| {
        (calendar_date(a, &zone), a.starts_at, &a.task.title).cmp(&(
            calendar_date(b, &zone),
            b.starts_at,
            &b.task.title,
        ))
    });
    let mut result: Vec<_> = rows
        .into_iter()
        .map(|occurrence| {
            let editable = edit_rules.get(&occurrence.task.id).is_some_and(|schedule| {
                schedule
                    .as_ref()
                    .is_none_or(|schedule| schedule.occurs_on(occurrence.date))
            });
            TaskOccurrenceResponse {
                occurrence,
                editable,
            }
        })
        .collect();
    result.extend(crate::habits::occurrences(s, user, from, to, timezone).await?);
    result.sort_by_key(|row| {
        (
            calendar_date(&row.occurrence, &zone),
            row.occurrence.starts_at,
            row.occurrence.task.title.clone(),
        )
    });
    Ok(result)
}
fn valid_status(status: &str) -> Result<(), ApiError> {
    if !["todo", "in_progress", "completed", "rejected"].contains(&status) {
        return Err(ApiError::validation("Unsupported task status"));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(value: &str) -> NaiveDate {
        value.parse().unwrap()
    }

    fn schedule() -> Schedule {
        Schedule {
            start_date: date("2020-01-01"),
            time: None,
            timezone: "UTC".into(),
            duration_minutes: 30,
            recurrence: "daily".into(),
            interval_days: 1,
            weekdays: vec![],
            end_date: None,
        }
    }

    #[test]
    fn open_date_filters_find_old_and_distant_recurrences() {
        assert!(schedule_intersects(
            &schedule(),
            None,
            Some(date("2026-10-27"))
        ));
        let infrequent = Schedule {
            recurrence: "interval".into(),
            interval_days: 3650,
            ..schedule()
        };
        assert!(schedule_intersects(
            &infrequent,
            Some(date("2026-10-27")),
            None
        ));
        assert!(!schedule_intersects(
            &infrequent,
            Some(date("2026-10-27")),
            Some(date("2026-10-28"))
        ));
    }

    #[test]
    fn date_filters_respect_boundaries_of_once_and_weekly_rules() {
        let once = Schedule {
            recurrence: "once".into(),
            ..schedule()
        };
        assert!(!schedule_intersects(&once, Some(date("2020-01-02")), None));
        let weekly = Schedule {
            recurrence: "weekly".into(),
            weekdays: vec![1],
            end_date: Some(date("2020-01-06")),
            ..schedule()
        };
        assert!(schedule_intersects(
            &weekly,
            Some(date("2020-01-06")),
            Some(date("2020-01-06"))
        ));
        assert!(!schedule_intersects(
            &weekly,
            Some(date("2020-01-07")),
            None
        ));
    }

    #[test]
    fn timed_calendar_and_date_search_use_the_profile_day() {
        let tokyo = Schedule {
            start_date: date("2026-10-28"),
            time: Some(chrono::NaiveTime::from_hms_opt(0, 30, 0).unwrap()),
            timezone: "Asia/Tokyo".into(),
            recurrence: "once".into(),
            ..schedule()
        };
        let utc = chrono_tz::UTC;
        let day = date("2026-10-27");
        let rows = schedule_in_profile_range(&tokyo, day, day, &utc).unwrap();
        assert_eq!(rows.len(), 1);
        assert_eq!(rows[0].0, date("2026-10-28"));
        assert_eq!(rows[0].1.unwrap().to_rfc3339(), "2026-10-27T15:30:00+00:00");
        assert!(schedule_matches_profile_dates(
            &tokyo,
            Some(day),
            Some(day),
            &utc
        ));
        assert!(!schedule_matches_profile_dates(
            &tokyo,
            Some(date("2026-10-28")),
            Some(date("2026-10-28")),
            &utc
        ));
        let untimed = Schedule {
            time: None,
            ..tokyo
        };
        assert!(
            schedule_in_profile_range(&untimed, day, day, &utc)
                .unwrap()
                .is_empty()
        );
        assert_eq!(
            schedule_in_profile_range(&untimed, date("2026-10-28"), date("2026-10-28"), &utc)
                .unwrap()[0],
            (date("2026-10-28"), None)
        );
    }
}
