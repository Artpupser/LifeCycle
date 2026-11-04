use super::models::Profile;
use super::service::{decode, load, merge};
use crate::{
    infrastructure::state::AppState,
    shared::auth::CurrentUser,
    shared::errors::{ApiError, ApiJson},
};
use axum::{Json, extract::State};

pub(super) async fn read(
    State(state): State<AppState>,
    user: CurrentUser,
) -> Result<Json<Profile>, ApiError> {
    Ok(Json(load(&state, user.id).await?))
}

pub(super) async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(patch): ApiJson<serde_json::Value>,
) -> Result<Json<Profile>, ApiError> {
    let fields = patch
        .as_object()
        .ok_or_else(|| ApiError::validation("Profile must be an object"))?;
    let (today, _) = crate::shared::domain::local_today(&state, user.id).await?;
    let mut tx = state.database.begin().await?;
    let ai = crate::modules::ai::config(&mut tx, user.id).await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,21))")
        .bind(user.id.to_string())
        .execute(&mut *tx)
        .await?;
    let row = sqlx::query_as::<_, (Vec<u8>, i64)>(
        "SELECT encrypted_data,revision FROM app.profiles WHERE user_id=$1 FOR UPDATE",
    )
    .bind(user.id)
    .fetch_optional(&mut *tx)
    .await?;
    let old = decode(&state, user.id, row)?;
    if fields
        .get("revision")
        .is_some_and(|v| v.as_i64() != Some(old.revision))
    {
        return Err(ApiError::new(
            axum::http::StatusCode::CONFLICT,
            "profile_stale",
            "Profile changed; reload before saving",
        ));
    }
    let mut value = serde_json::to_value(&old).map_err(|_| ApiError::internal())?;
    merge(&mut value, patch);
    let mut profile: Profile = serde_json::from_value(value)
        .map_err(|_| ApiError::validation("Expected supported profile fields and values"))?;
    profile.validate_on(today)?;
    profile.revision = old.revision + 1;
    let plain = serde_json::to_vec(&profile).map_err(|_| ApiError::internal())?;
    let encrypted = state
        .cipher
        .encrypt(&plain, format!("profile:{}", user.id).as_bytes())?;
    sqlx::query("INSERT INTO app.profiles(user_id,encrypted_data,revision) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET encrypted_data=EXCLUDED.encrypted_data,revision=EXCLUDED.revision,updated_at=clock_timestamp()")
        .bind(user.id).bind(encrypted).bind(profile.revision).execute(&mut *tx).await?;
    if ai.permissions.profile || ai.permissions.training() {
        sqlx::query(
            "UPDATE app.ai_settings SET revision=revision+1,updated_at=now() WHERE user_id=$1",
        )
        .bind(user.id)
        .execute(&mut *tx)
        .await?;
        crate::modules::ai::invalidate(&mut tx, user.id).await?;
    }
    tx.commit().await?;
    Ok(Json(profile))
}
