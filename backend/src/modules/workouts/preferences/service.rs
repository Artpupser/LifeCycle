use super::models::Preferences;
use crate::{infrastructure::state::AppState, modules::ai, shared::errors::ApiError};
use uuid::Uuid;

pub(crate) async fn load(s: &AppState, user: Uuid) -> Result<Preferences, ApiError> {
    let row: Option<(i64, Vec<u8>)> = sqlx::query_as(
        "SELECT revision,encrypted_data FROM app.workout_preferences WHERE user_id=$1",
    )
    .bind(user)
    .fetch_optional(&s.database)
    .await?;
    match row {
        None => Ok(Preferences::default()),
        Some((revision, bytes)) => Ok(Preferences {
            revision,
            data: ai::open(s, &format!("workout-preferences:{user}"), &bytes)?,
        }),
    }
}
