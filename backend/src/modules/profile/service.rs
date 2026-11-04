use super::models::Profile;
use crate::{infrastructure::state::AppState, shared::errors::ApiError};
use uuid::Uuid;

pub(crate) async fn load(state: &AppState, user: uuid::Uuid) -> Result<Profile, ApiError> {
    let row = sqlx::query_as::<_, (Vec<u8>, i64)>(
        "SELECT encrypted_data,revision FROM app.profiles WHERE user_id=$1",
    )
    .bind(user)
    .fetch_optional(&state.database)
    .await?;
    decode(state, user, row)
}

pub(super) fn decode(
    state: &AppState,
    user: Uuid,
    row: Option<(Vec<u8>, i64)>,
) -> Result<Profile, ApiError> {
    let Some((encrypted, revision)) = row else {
        return Ok(Profile::default());
    };
    let bytes = state
        .cipher
        .decrypt(&encrypted, format!("profile:{user}").as_bytes())?;
    let mut profile: Profile = serde_json::from_slice(&bytes).map_err(|_| ApiError::internal())?;
    profile.revision = revision;
    Ok(profile)
}

pub(super) fn merge(base: &mut serde_json::Value, patch: serde_json::Value) {
    match (base, patch) {
        (serde_json::Value::Object(base), serde_json::Value::Object(patch)) => {
            for (key, value) in patch {
                merge(base.entry(key).or_insert(serde_json::Value::Null), value);
            }
        }
        (base, patch) => *base = patch,
    }
}
