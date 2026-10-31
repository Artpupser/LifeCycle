use crate::{
    auth::CurrentUser,
    domain::{self, Search},
    error::{ApiError, ApiJson},
    state::AppState,
    tasks,
    workout_plan::{Exercise, Workout},
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::{PgConnection, types::Json as DbJson};
use std::collections::BTreeMap;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Record<T> {
    pub id: Uuid,
    pub data: DbJson<T>,
    #[serde(default)]
    #[sqlx(default)]
    pub ai_shared: bool,
    #[serde(default)]
    #[sqlx(default)]
    pub ai_access_revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/exercises", get(exercises).post(create_exercise))
        .route(
            "/api/exercises/{id}",
            get(read_exercise)
                .put(update_exercise)
                .delete(delete_exercise),
        )
        .route("/api/workouts", get(workouts).post(create_workout))
        .route(
            "/api/workouts/{id}",
            get(read_workout).put(update_workout).delete(delete_workout),
        )
}
async fn exercises(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Record<Exercise>>>, ApiError> {
    q.validate()?;
    Ok(Json(sqlx::query_as("SELECT * FROM app.exercises WHERE user_id=$1 AND ($2::text IS NULL OR strpos(lower((data->>'title')||' '||(data->>'description')),lower($2))>0) ORDER BY created_at,id").bind(u.id).bind(q.q).fetch_all(&s.database).await?))
}
async fn workouts(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(q): Query<Search>,
) -> Result<Json<Vec<Record<Workout>>>, ApiError> {
    q.validate()?;
    Ok(Json(sqlx::query_as("SELECT * FROM app.workouts WHERE user_id=$1 AND ($2::text IS NULL OR strpos(lower((data->>'title')||' '||(data->>'description')),lower($2))>0) AND ($3::text IS NULL OR (data->'tags') ? $3) ORDER BY created_at,id").bind(u.id).bind(q.q).bind(q.tag).fetch_all(&s.database).await?))
}
async fn read_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Record<Exercise>>, ApiError> {
    Ok(Json(
        sqlx::query_as("SELECT * FROM app.exercises WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .fetch_optional(&s.database)
            .await?
            .ok_or_else(domain::not_found)?,
    ))
}
async fn read_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Record<Workout>>, ApiError> {
    Ok(Json(
        sqlx::query_as("SELECT * FROM app.workouts WHERE id=$1 AND user_id=$2")
            .bind(id)
            .bind(u.id)
            .fetch_optional(&s.database)
            .await?
            .ok_or_else(domain::not_found)?,
    ))
}
async fn create_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Exercise>,
) -> Result<(StatusCode, Json<Record<Exercise>>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_exercise(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}
async fn update_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Exercise>,
) -> Result<Json<Record<Exercise>>, ApiError> {
    Ok(Json(save_exercise(&s, u.id, id, v, false).await?))
}
async fn save_exercise(
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
async fn exercise_referenced(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<bool, ApiError> {
    Ok(sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.workouts w, jsonb_array_elements(w.data->'rounds') r, jsonb_array_elements(r->'exercises') e WHERE w.user_id=$1 AND e->>'exercise_id'=$2)").bind(user).bind(id.to_string()).fetch_one(db).await?)
}
async fn delete_exercise(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_exercise_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
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
async fn create_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Workout>,
) -> Result<(StatusCode, Json<Record<Workout>>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save_workout(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}
async fn update_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Workout>,
) -> Result<Json<Record<Workout>>, ApiError> {
    Ok(Json(save_workout(&s, u.id, id, v, false).await?))
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
async fn save_workout(
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
async fn delete_workout(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    delete_workout_in(&mut tx, u.id, id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
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
