use super::dto::HabitInput;
use crate::{
    infrastructure::state::AppState,
    modules::tasks::{self, Task},
    shared::domain,
    shared::errors::ApiError,
};
use chrono::Utc;
use sqlx::types::Json as DbJson;
use uuid::Uuid;

pub(super) async fn save(
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
        crate::modules::workouts::require_active(&mut tx, user, workout).await?;
    }
    if !create {
        let current: Task = sqlx::query_as(
            "SELECT * FROM app.tasks WHERE id=$1 AND user_id=$2 AND source_kind='habit'",
        )
        .bind(id)
        .bind(user)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
        if current
            .schedule
            .as_ref()
            .is_some_and(|old| old.timezone != v.schedule.timezone)
        {
            return Err(domain::conflict(
                "Habit timezone is fixed; delete and create a new habit to change it",
            ));
        }
    }
    let query = if create {
        "INSERT INTO app.tasks(id,user_id,title,description,tags,color,schedule,source_kind,source_id,habit) VALUES($1,$2,$3,$4,$5,$6,$7,'habit',$1,$8) RETURNING *"
    } else {
        "UPDATE app.tasks SET title=$3,description=$4,tags=$5,color=$6,schedule=$7,habit=$8,updated_at=now() WHERE id=$1 AND user_id=$2 AND source_kind='habit' RETURNING *"
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
