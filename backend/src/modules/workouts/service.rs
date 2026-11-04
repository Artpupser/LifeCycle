use super::models::Record;
use super::repository::{active_exercises, exercise_referenced};
use crate::{
    infrastructure::state::AppState,
    modules::tasks,
    modules::workouts::plan::{Exercise, Workout},
    shared::domain,
    shared::errors::ApiError,
};
use sqlx::{PgConnection, types::Json as DbJson};
use uuid::Uuid;

pub(super) async fn save_exercise(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    v: Exercise,
    create: bool,
) -> Result<Record<Exercise>, ApiError> {
    let mut tx = s.database.begin().await?;
    let row = save_exercise_in(&mut tx, user, id, v, create).await?;
    tx.commit().await?;
    Ok(row)
}

pub(crate) async fn save_exercise_in(
    tx: &mut PgConnection,
    user: Uuid,
    id: Uuid,
    v: Exercise,
    create: bool,
) -> Result<Record<Exercise>, ApiError> {
    v.validate()?;
    tasks::lock_tasks(tx, user).await?;
    for image in &v.images {
        let exists: bool =
            sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.media WHERE user_id=$1 AND id=$2)")
                .bind(user)
                .bind(image)
                .fetch_one(&mut *tx)
                .await?;
        if !exists {
            return Err(ApiError::validation("Select an owned uploaded image"));
        }
    }
    if !create {
        let old: DbJson<Exercise> =
            sqlx::query_scalar("SELECT data FROM app.exercises WHERE user_id=$1 AND id=$2")
                .bind(user)
                .bind(id)
                .fetch_optional(&mut *tx)
                .await?
                .ok_or_else(domain::not_found)?;
        if old.kind != v.kind && exercise_referenced(tx, user, id).await? {
            return Err(domain::conflict(
                "Remove exercise from active plans before changing its kind",
            ));
        }
    }
    let query = if create {
        "INSERT INTO app.exercises(id,user_id,data) VALUES($1,$2,$3) RETURNING *"
    } else {
        "UPDATE app.exercises SET data=$3,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *"
    };
    let row = sqlx::query_as(query)
        .bind(id)
        .bind(user)
        .bind(DbJson(v))
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    domain::event(
        tx,
        user,
        if create {
            "exercise_created"
        } else {
            "exercise_updated"
        },
        "exercise",
        id,
        serde_json::json!({}),
    )
    .await?;
    Ok(row)
}

pub(crate) async fn delete_exercise_in(
    tx: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<(), ApiError> {
    tasks::lock_tasks(tx, user).await?;
    if exercise_referenced(tx, user, id).await? {
        return Err(domain::conflict(
            "Remove exercise from active plans before deleting",
        ));
    }
    if sqlx::query("DELETE FROM app.exercises WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .execute(&mut *tx)
        .await?
        .rows_affected()
        == 0
    {
        return Err(domain::not_found());
    }
    domain::event(
        tx,
        user,
        "exercise_deleted",
        "exercise",
        id,
        serde_json::json!({}),
    )
    .await?;
    Ok(())
}

pub(super) async fn save_workout(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    v: Workout,
    create: bool,
) -> Result<Record<Workout>, ApiError> {
    let mut tx = s.database.begin().await?;
    let row = save_workout_in(&mut tx, user, id, v, create).await?;
    tx.commit().await?;
    Ok(row)
}

pub(crate) async fn save_workout_in(
    tx: &mut PgConnection,
    user: Uuid,
    id: Uuid,
    v: Workout,
    create: bool,
) -> Result<Record<Workout>, ApiError> {
    tasks::lock_tasks(tx, user).await?;
    v.validate(&active_exercises(tx, user).await?)?;
    let query = if create {
        "INSERT INTO app.workouts(id,user_id,data) VALUES($1,$2,$3) RETURNING *"
    } else {
        "UPDATE app.workouts SET data=$3,updated_at=now() WHERE user_id=$2 AND id=$1 RETURNING *"
    };
    let row = sqlx::query_as(query)
        .bind(id)
        .bind(user)
        .bind(DbJson(v))
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    domain::event(
        tx,
        user,
        if create {
            "workout_created"
        } else {
            "workout_updated"
        },
        "workout",
        id,
        serde_json::json!({}),
    )
    .await?;
    Ok(row)
}

pub(crate) async fn delete_workout_in(
    tx: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<(), ApiError> {
    tasks::lock_tasks(tx, user).await?;
    let linked: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND source_kind='habit' AND habit->>'workout_id'=$2)").bind(user).bind(id.to_string()).fetch_one(&mut *tx).await?;
    if linked {
        return Err(domain::conflict(
            "Unlink or delete connected habits before deleting a workout",
        ));
    }
    if sqlx::query("DELETE FROM app.workouts WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .execute(&mut *tx)
        .await?
        .rows_affected()
        == 0
    {
        return Err(domain::not_found());
    }
    domain::event(
        tx,
        user,
        "workout_deleted",
        "workout",
        id,
        serde_json::json!({}),
    )
    .await?;
    Ok(())
}
