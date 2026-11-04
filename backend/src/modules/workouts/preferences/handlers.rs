use super::models::{Conditions, Input, Preferences};
use super::service::load;
use crate::{
    infrastructure::state::AppState,
    modules::ai,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::errors::{ApiError, ApiJson},
};
use axum::{Json, extract::State, http::StatusCode};

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Preferences>, ApiError> {
    Ok(Json(load(&s, u.id).await?))
}

pub(super) async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Preferences>, ApiError> {
    let data = v.data.normalize()?;
    let mut tx = s.database.begin().await?;
    ai::config(&mut tx, u.id).await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    let row: Option<(i64, Vec<u8>)> = sqlx::query_as(
        "SELECT revision,encrypted_data FROM app.workout_preferences WHERE user_id=$1 FOR UPDATE",
    )
    .bind(u.id)
    .fetch_optional(&mut *tx)
    .await?;
    let context = format!("workout-preferences:{}", u.id);
    let (revision, old) = match row {
        None => (0, Conditions::default()),
        Some((revision, bytes)) => (revision, ai::open::<Conditions>(&s, &context, &bytes)?),
    };
    if v.revision != revision {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "workout_preferences_stale",
            "Training conditions changed; reload before saving",
        ));
    }
    let result = Preferences {
        revision: revision + i64::from(data != old),
        data,
    };
    if result.data != old {
        let encrypted = ai::seal(&s, &context, &result.data)?;
        sqlx::query("INSERT INTO app.workout_preferences(user_id,revision,encrypted_data) VALUES($1,$2,$3) ON CONFLICT(user_id) DO UPDATE SET revision=EXCLUDED.revision,encrypted_data=EXCLUDED.encrypted_data,updated_at=now()")
            .bind(u.id).bind(result.revision).bind(encrypted).execute(&mut *tx).await?;
        sqlx::query(
            "UPDATE app.ai_settings SET revision=revision+1,updated_at=now() WHERE user_id=$1",
        )
        .bind(u.id)
        .execute(&mut *tx)
        .await?;
        ai::invalidate(&mut tx, u.id).await?;
    }
    tx.commit().await?;
    Ok(Json(result))
}
