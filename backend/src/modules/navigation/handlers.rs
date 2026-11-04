use super::models::Navigation;
use crate::{
    infrastructure::state::AppState,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::errors::{ApiError, ApiJson},
};
use axum::{Json, extract::State};
use sqlx::types::Json as DbJson;

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Navigation>, ApiError> {
    let value = sqlx::query_as::<_, (DbJson<Vec<String>>, DbJson<Vec<String>>, i64)>(
        "SELECT ordering,pinned,revision FROM app.navigation_preferences WHERE user_id=$1",
    )
    .bind(u.id)
    .fetch_optional(&s.database)
    .await?;
    Ok(Json(value.map_or_else(
        Navigation::default,
        |(order, pins, revision)| Navigation {
            ordering: order.0,
            pinned: pins.0,
            revision,
        },
    )))
}

pub(super) async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(mut value): ApiJson<Navigation>,
) -> Result<Json<Navigation>, ApiError> {
    value.validate()?;
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let revision = sqlx::query_scalar::<_, i64>(
        "SELECT revision FROM app.navigation_preferences WHERE user_id=$1 FOR UPDATE",
    )
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?
    .unwrap_or(0);
    if revision != value.revision {
        return Err(crate::shared::domain::conflict(
            "Navigation changed; refresh before retrying",
        ));
    }
    value.revision += 1;
    sqlx::query("INSERT INTO app.navigation_preferences(user_id,ordering,pinned,revision) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO UPDATE SET ordering=EXCLUDED.ordering,pinned=EXCLUDED.pinned,revision=EXCLUDED.revision").bind(u.id).bind(DbJson(&value.ordering)).bind(DbJson(&value.pinned)).bind(value.revision).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(value))
}
