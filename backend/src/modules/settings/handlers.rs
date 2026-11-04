use super::models::Settings;
use crate::{
    infrastructure::state::AppState,
    shared::auth::CurrentUser,
    shared::errors::{ApiError, ApiJson},
};
use axum::{Json, extract::State};

pub(super) async fn read(
    State(state): State<AppState>,
    user: CurrentUser,
) -> Result<Json<Settings>, ApiError> {
    let stored = sqlx::query_scalar::<_, sqlx::types::Json<Settings>>(
        "SELECT data FROM app.settings WHERE user_id=$1",
    )
    .bind(user.id)
    .fetch_optional(&state.database)
    .await?;
    Ok(Json(stored.map_or_else(Settings::default, |value| value.0)))
}

pub(super) async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(settings): ApiJson<Settings>,
) -> Result<Json<Settings>, ApiError> {
    settings.validate()?;
    if let Some(id) = settings.background_image {
        let owned = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM app.media WHERE id=$1 AND user_id=$2)",
        )
        .bind(id)
        .bind(user.id)
        .fetch_one(&state.database)
        .await?;
        if !owned {
            return Err(crate::shared::domain::not_found());
        }
    }
    sqlx::query("INSERT INTO app.settings (user_id,data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()")
        .bind(user.id).bind(sqlx::types::Json(&settings)).execute(&state.database).await?;
    Ok(Json(settings))
}
