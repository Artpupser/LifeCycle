use crate::{
    modules::workouts::plan::{Exercise, Workout},
    shared::domain,
    shared::errors::ApiError,
};
use sqlx::{PgConnection, types::Json as DbJson};
use std::collections::BTreeMap;
use uuid::Uuid;

pub(super) async fn exercise_referenced(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<bool, ApiError> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.workouts w, jsonb_array_elements(w.data->'rounds') r, jsonb_array_elements(r->'exercises') e WHERE w.user_id=$1 AND e->>'exercise_id'=$2)").bind(user).bind(id.to_string()).fetch_one(db).await?)
}

pub async fn active_exercises(
    db: &mut PgConnection,
    user: Uuid,
) -> Result<BTreeMap<Uuid, Exercise>, ApiError> {
    let rows: Vec<(Uuid, DbJson<Exercise>)> =
        sqlx::query_as("SELECT id,data FROM app.exercises WHERE user_id=$1")
            .bind(user)
            .fetch_all(db)
            .await?;
    Ok(rows.into_iter().map(|(id, data)| (id, data.0)).collect())
}

pub async fn require_active(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<Workout, ApiError> {
    Ok(sqlx::query_scalar::<_, DbJson<Workout>>(
        "SELECT data FROM app.workouts WHERE user_id=$1 AND id=$2",
    )
    .bind(user)
    .bind(id)
    .fetch_optional(db)
    .await?
    .ok_or_else(domain::not_found)?
    .0)
}
