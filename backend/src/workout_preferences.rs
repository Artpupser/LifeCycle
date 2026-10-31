//! Training goals and conditions belong to the workout section, not AI settings.
use crate::{
    ai,
    auth::CurrentUser,
    error::{ApiError, ApiJson},
    state::AppState,
    tasks,
};
use axum::{Json, Router, extract::State, http::StatusCode, routing::get};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Default, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct Conditions {
    pub goals: Option<String>,
    pub equipment: Option<String>,
    pub restrictions: Option<String>,
}
impl Conditions {
    fn normalize(mut self) -> Result<Self, ApiError> {
        for field in [&mut self.goals, &mut self.equipment, &mut self.restrictions] {
            if let Some(text) = field {
                if text.chars().count() > 2000 {
                    return Err(ApiError::validation(
                        "Training fields support at most 2000 characters",
                    ));
                }
                *field = match text.trim() {
                    "" => None,
                    value => Some(value.to_owned()),
                };
            }
        }
        Ok(self)
    }
}
#[derive(Default, Serialize)]
pub(crate) struct Preferences {
    pub revision: i64,
    pub data: Conditions,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    revision: i64,
    data: Conditions,
}
pub fn routes() -> Router<AppState> {
    Router::new().route("/api/workouts/preferences", get(read).put(update))
}
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
async fn read(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Preferences>, ApiError> {
    Ok(Json(load(&s, u.id).await?))
}
async fn update(
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

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn training_conditions_preserve_unknown_and_limit_unicode() {
        let value = Conditions {
            goals: Some("  Выносливость  ".into()),
            equipment: Some("  ".into()),
            restrictions: None,
        }
        .normalize()
        .unwrap();
        assert_eq!(value.goals.as_deref(), Some("Выносливость"));
        assert_eq!(value.equipment, None);
        assert!(
            Conditions {
                goals: Some("🙂".repeat(2000)),
                ..Default::default()
            }
            .normalize()
            .is_ok()
        );
        assert!(
            Conditions {
                goals: Some("я".repeat(2001)),
                ..Default::default()
            }
            .normalize()
            .is_err()
        );
        assert!(
            serde_json::from_str::<Input>(r#"{"revision":0,"data":{"ai_shared":true}}"#).is_err()
        );
    }
}
