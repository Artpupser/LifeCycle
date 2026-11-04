use super::dto::TaskInput;
use super::models::{Task, TaskOccurrence, TaskOccurrenceResponse};
use super::planning::{calendar_date, schedule_in_profile_range};
use super::repository::lock_tasks;
use crate::{infrastructure::state::AppState, shared::domain, shared::errors::ApiError};
use chrono::NaiveDate;
use sqlx::{PgConnection, types::Json as DbJson};
use std::collections::BTreeMap;
use uuid::Uuid;

pub(super) async fn save(
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
        schedule.validate_task()?;
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
    crate::modules::labels::register(s, tx, user, &v.tags).await?;
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
    sqlx::query("UPDATE app.task_boards SET revision=revision+1 WHERE user_id=$1 AND id IN (SELECT board_id FROM app.board_items WHERE user_id=$1 AND task_id=$2)")
        .bind(user).bind(id).execute(&mut *tx).await?;
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
    let single_ids: std::collections::BTreeSet<_> = active
        .iter()
        .filter(|task| {
            task.schedule
                .as_ref()
                .is_none_or(|schedule| schedule.recurrence == "once")
        })
        .map(|task| task.id)
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
    let saved=sqlx::query_scalar::<_,DbJson<TaskOccurrence>>("SELECT snapshot FROM app.task_occurrences WHERE user_id=$1 AND snapshot->'task'->>'source_kind'='manual' AND (occurrence_date BETWEEN $2 AND $3 OR snapshot->'task'->'schedule'->>'recurrence'='once')").bind(user).bind(expanded_from).bind(expanded_to).fetch_all(&s.database).await?;
    for value in saved {
        let occurrence = value.0;
        if single_ids.contains(&occurrence.task.id) {
            continue;
        }
        let key = (occurrence.date, occurrence.task.id);
        if matches!(occurrence.status.as_str(), "completed" | "rejected") {
            output.remove(&key);
            let date = calendar_date(&occurrence, &zone);
            let overlaps = occurrence
                .task
                .schedule
                .as_ref()
                .filter(|rule| rule.recurrence == "once")
                .map_or(date >= from && date <= to, |rule| {
                    schedule_in_profile_range(rule, from, to, &zone)
                        .is_ok_and(|rows| !rows.is_empty())
                });
            if overlaps {
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
    result.extend(crate::modules::habits::occurrences(s, user, from, to, timezone).await?);
    result.sort_by_key(|row| {
        (
            calendar_date(&row.occurrence, &zone),
            row.occurrence.starts_at,
            row.occurrence.task.title.clone(),
        )
    });
    Ok(result)
}

pub(super) fn valid_status(status: &str) -> Result<(), ApiError> {
    if !["todo", "in_progress", "completed", "rejected"].contains(&status) {
        return Err(ApiError::validation("Unsupported task status"));
    }
    Ok(())
}
