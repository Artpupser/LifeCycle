use crate::{
    auth::CurrentUser,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{Json, Router, extract::State, routing::get};
use chrono::{NaiveDate, Utc};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone)]
#[serde(default, deny_unknown_fields)]
pub struct Profile {
    pub nickname: String,
    pub name: String,
    pub gender: String,
    pub birth_date: Option<NaiveDate>,
    pub birth_country: String,
    pub residence_country: String,
    pub height_cm: Option<f64>,
    pub weight_kg: Option<f64>,
    pub arms_count: Option<u32>,
    pub legs_count: Option<u32>,
    pub eye_color: String,
    pub hair_color: String,
    pub skin_color: String,
    pub colleagues_count: Option<u32>,
    pub friends_count: Option<u32>,
    pub acquaintances_count: Option<u32>,
    pub conditions: Vec<String>,
    pub daily_medications: Vec<String>,
    pub past_medications: Vec<String>,
    pub surgeries: Vec<String>,
    pub has_family: Option<bool>,
    pub has_partner: Option<bool>,
    pub penis_length_cm: Option<f64>,
    pub penis_width_cm: Option<f64>,
    pub breast_size: String,
    pub pregnant: Option<bool>,
}

impl Default for Profile {
    fn default() -> Self {
        Self {
            nickname: String::new(),
            name: String::new(),
            gender: "unspecified".to_owned(),
            birth_date: None,
            birth_country: String::new(),
            residence_country: String::new(),
            height_cm: None,
            weight_kg: None,
            arms_count: None,
            legs_count: None,
            eye_color: String::new(),
            hair_color: String::new(),
            skin_color: String::new(),
            colleagues_count: None,
            friends_count: None,
            acquaintances_count: None,
            conditions: vec![],
            daily_medications: vec![],
            past_medications: vec![],
            surgeries: vec![],
            has_family: None,
            has_partner: None,
            penis_length_cm: None,
            penis_width_cm: None,
            breast_size: String::new(),
            pregnant: None,
        }
    }
}

impl Profile {
    pub fn validate(&self) -> Result<(), ApiError> {
        if self.nickname.chars().count() > 80 || self.name.chars().count() > 80 {
            return Err(ApiError::validation(
                "Name and nickname must be at most 80 characters",
            ));
        }
        if !["unspecified", "female", "male", "other"].contains(&self.gender.as_str()) {
            return Err(ApiError::validation("Unsupported gender value"));
        }
        for value in [
            &self.birth_country,
            &self.residence_country,
            &self.eye_color,
            &self.hair_color,
            &self.skin_color,
            &self.breast_size,
        ] {
            if value.chars().count() > 100 {
                return Err(ApiError::validation(
                    "Profile text fields must be at most 100 characters",
                ));
            }
        }
        if self.birth_date.is_some_and(|date| {
            date < NaiveDate::from_ymd_opt(1900, 1, 1).unwrap() || date > Utc::now().date_naive()
        }) {
            return Err(ApiError::validation(
                "Birth date must be between 1900 and today",
            ));
        }
        for (value, min, max) in [
            (self.height_cm, 1.0, 300.0),
            (self.weight_kg, 1.0, 700.0),
            (self.penis_length_cm, 0.0, 100.0),
            (self.penis_width_cm, 0.0, 100.0),
        ] {
            if value.is_some_and(|v| !v.is_finite() || v < min || v > max) {
                return Err(ApiError::validation(
                    "Profile measurement is outside the supported range",
                ));
            }
        }
        for (value, max) in [
            (self.arms_count, 10),
            (self.legs_count, 10),
            (self.colleagues_count, 1_000_000),
            (self.friends_count, 1_000_000),
            (self.acquaintances_count, 1_000_000),
        ] {
            if value.is_some_and(|v| v > max) {
                return Err(ApiError::validation(
                    "Profile count is outside the supported range",
                ));
            }
        }
        for list in [
            &self.conditions,
            &self.daily_medications,
            &self.past_medications,
            &self.surgeries,
        ] {
            if list.len() > 100 || list.iter().any(|v| v.chars().count() > 500) {
                return Err(ApiError::validation(
                    "Medical lists support at most 100 items of 500 characters",
                ));
            }
        }
        Ok(())
    }
}

pub fn routes() -> Router<AppState> {
    Router::new().route("/api/profile", get(read).put(update))
}

async fn read(State(state): State<AppState>, user: CurrentUser) -> Result<Json<Profile>, ApiError> {
    Ok(Json(load(&state, user.id).await?))
}

pub(crate) async fn load(state: &AppState, user: uuid::Uuid) -> Result<Profile, ApiError> {
    let encrypted = sqlx::query_scalar::<_, Vec<u8>>(
        "SELECT encrypted_data FROM app.profiles WHERE user_id=$1",
    )
    .bind(user)
    .fetch_optional(&state.database)
    .await?;
    let profile = match encrypted {
        None => Profile::default(),
        Some(data) => {
            let context = format!("profile:{user}");
            let bytes = state.cipher.decrypt(&data, context.as_bytes())?;
            serde_json::from_slice(&bytes).map_err(|_| ApiError::internal())?
        }
    };
    Ok(profile)
}

async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(profile): ApiJson<Profile>,
) -> Result<Json<Profile>, ApiError> {
    profile.validate()?;
    let plain = serde_json::to_vec(&profile).map_err(|_| ApiError::internal())?;
    let encrypted = state
        .cipher
        .encrypt(&plain, format!("profile:{}", user.id).as_bytes())?;
    sqlx::query("INSERT INTO app.profiles (user_id,encrypted_data) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET encrypted_data=EXCLUDED.encrypted_data,updated_at=now()")
        .bind(user.id).bind(encrypted).execute(&state.database).await?;
    Ok(Json(profile))
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn profile_accepts_optional_fields_without_gender_inference() {
        let p = Profile {
            gender: "female".to_owned(),
            penis_length_cm: Some(12.0),
            pregnant: Some(false),
            ..Profile::default()
        };
        assert!(p.validate().is_ok());
    }
    #[test]
    fn profile_rejects_future_birthdates_and_impossible_measurements() {
        let mut p = Profile {
            birth_date: Some(Utc::now().date_naive() + chrono::Duration::days(1)),
            ..Profile::default()
        };
        assert!(p.validate().is_err());
        p.birth_date = None;
        p.height_cm = Some(-1.0);
        assert!(p.validate().is_err());
    }
}
