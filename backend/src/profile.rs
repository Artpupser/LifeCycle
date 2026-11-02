use crate::{
    auth::CurrentUser,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{Json, Router, extract::State, routing::get};
use chrono::{Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Origin {
    pub region: String,
    pub given_name: String,
    pub surname: String,
    pub patronymic: String,
    pub sex: String,
    pub childhood_languages: Vec<String>,
    pub maternal_birth_order: Option<u32>,
    pub multiple_birth_count: Option<u32>,
}
#[derive(Clone, Default, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub struct Firsts {
    pub school_entry_year: Option<i32>,
    pub school_graduation_year: Option<i32>,
    pub education: String,
    pub profession: String,
    pub job: String,
    pub residence_country: String,
    pub foreign_language: String,
    pub achievement: String,
    pub completed_project: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HabitPeriod {
    pub id: Uuid,
    pub start_date: Option<NaiveDate>,
    pub end_date: Option<NaiveDate>,
    pub note: String,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct HarmfulHabit {
    pub id: Uuid,
    pub name: String,
    pub current: Option<bool>,
    pub ever: Option<bool>,
    pub periods: Vec<HabitPeriod>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(default, deny_unknown_fields)]
pub struct Profile {
    pub revision: i64,
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
    pub origin: Origin,
    pub firsts: Firsts,
    pub harmful_habits: Vec<HarmfulHabit>,
}

impl Default for Profile {
    fn default() -> Self {
        Self {
            revision: 0,
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
            origin: Origin::default(),
            firsts: Firsts::default(),
            harmful_habits: vec![],
        }
    }
}

impl Profile {
    pub fn validate(&self) -> Result<(), ApiError> {
        self.validate_on(Utc::now().date_naive())
    }
    fn validate_on(&self, today: NaiveDate) -> Result<(), ApiError> {
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
        if self
            .birth_date
            .is_some_and(|date| date < NaiveDate::from_ymd_opt(1900, 1, 1).unwrap() || date > today)
        {
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
        for value in [
            &self.origin.region,
            &self.origin.given_name,
            &self.origin.surname,
            &self.origin.patronymic,
        ] {
            crate::domain::text(value, 0, 100)?;
        }
        if !["", "unspecified", "female", "male", "intersex", "other"]
            .contains(&self.origin.sex.as_str())
            || self
                .origin
                .maternal_birth_order
                .is_some_and(|v| !(1..=100).contains(&v))
            || self
                .origin
                .multiple_birth_count
                .is_some_and(|v| !(1..=20).contains(&v))
            || self.origin.childhood_languages.len() > 20
        {
            return Err(ApiError::validation("Invalid birth details"));
        }
        for language in &self.origin.childhood_languages {
            crate::domain::text(language, 1, 80)?;
        }
        for year in [
            self.firsts.school_entry_year,
            self.firsts.school_graduation_year,
        ]
        .into_iter()
        .flatten()
        {
            if !(1900..=today.year()).contains(&year)
                || self.birth_date.is_some_and(|d| year < d.year())
            {
                return Err(ApiError::validation(
                    "Life event year is outside the supported range",
                ));
            }
        }
        if self
            .firsts
            .school_entry_year
            .zip(self.firsts.school_graduation_year)
            .is_some_and(|(start, end)| end < start)
        {
            return Err(ApiError::validation(
                "Graduation cannot precede school entry",
            ));
        }
        for text in [
            &self.firsts.education,
            &self.firsts.profession,
            &self.firsts.job,
            &self.firsts.residence_country,
            &self.firsts.foreign_language,
            &self.firsts.achievement,
            &self.firsts.completed_project,
        ] {
            crate::domain::text(text, 0, 2000)?;
        }
        if self.harmful_habits.len() > 30 {
            return Err(ApiError::validation("At most 30 habits are supported"));
        }
        let mut ids = std::collections::HashSet::new();
        for habit in &self.harmful_habits {
            crate::domain::text(&habit.name, 1, 80)?;
            if !ids.insert(habit.id)
                || habit.periods.len() > 100
                || (habit.ever == Some(false)
                    && (habit.current == Some(true) || !habit.periods.is_empty()))
            {
                return Err(ApiError::validation(
                    "Inconsistent habit status, duplicate ID or too many periods",
                ));
            }
            let mut periods = std::collections::HashSet::new();
            for period in &habit.periods {
                crate::domain::text(&period.note, 0, 2000)?;
                if !periods.insert(period.id)
                    || period
                        .start_date
                        .zip(period.end_date)
                        .is_some_and(|(start, end)| end < start)
                    || [period.start_date, period.end_date]
                        .into_iter()
                        .flatten()
                        .any(|d| {
                            d.year() < 1900
                                || d > today
                                || self.birth_date.is_some_and(|birth| d < birth)
                        })
                {
                    return Err(ApiError::validation(
                        "Invalid habit period dates or duplicate ID",
                    ));
                }
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
    let row = sqlx::query_as::<_, (Vec<u8>, i64)>(
        "SELECT encrypted_data,revision FROM app.profiles WHERE user_id=$1",
    )
    .bind(user)
    .fetch_optional(&state.database)
    .await?;
    decode(state, user, row)
}
fn decode(state: &AppState, user: Uuid, row: Option<(Vec<u8>, i64)>) -> Result<Profile, ApiError> {
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
// Omitted fields preserve saved values, including nested historical categories from older clients.
fn merge(base: &mut serde_json::Value, patch: serde_json::Value) {
    match (base, patch) {
        (serde_json::Value::Object(base), serde_json::Value::Object(patch)) => {
            for (key, value) in patch {
                merge(base.entry(key).or_insert(serde_json::Value::Null), value);
            }
        }
        (base, patch) => *base = patch,
    }
}
async fn update(
    State(state): State<AppState>,
    user: CurrentUser,
    ApiJson(patch): ApiJson<serde_json::Value>,
) -> Result<Json<Profile>, ApiError> {
    let fields = patch
        .as_object()
        .ok_or_else(|| ApiError::validation("Profile must be an object"))?;
    let (today, _) = crate::domain::local_today(&state, user.id).await?;
    let mut tx = state.database.begin().await?;
    let ai = crate::ai::config(&mut tx, user.id).await?;
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
        crate::ai::invalidate(&mut tx, user.id).await?;
    }
    tx.commit().await?;
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
    #[test]
    fn partial_current_updates_preserve_origin_and_first_events() {
        let mut value = serde_json::json!({"name":"Current","origin":{"given_name":"Birth name","surname":"Birth surname"},"firsts":{"job":"First job","achievement":"First achievement"}});
        merge(
            &mut value,
            serde_json::json!({"name":"New current","origin":{"region":"New region"},"firsts":{"job":""}}),
        );
        let p: Profile = serde_json::from_value(value).unwrap();
        assert_eq!(p.origin.given_name, "Birth name");
        assert_eq!(p.origin.surname, "Birth surname");
        assert_eq!(p.firsts.job, "");
        assert_eq!(p.firsts.achievement, "First achievement");
        assert!(p.harmful_habits.is_empty());
        assert_eq!(p.origin.maternal_birth_order, None);
    }
    #[test]
    fn historical_years_and_habit_periods_validate_without_inventing_unknowns() {
        let mut p = Profile::default();
        p.firsts.school_entry_year = Some(2010);
        p.firsts.school_graduation_year = Some(2009);
        assert!(p.validate().is_err());
        p.firsts = Firsts::default();
        let mut habit = HarmfulHabit {
            id: Uuid::new_v4(),
            name: "Smoking".into(),
            current: Some(false),
            ever: None,
            periods: vec![],
        };
        p.harmful_habits = vec![habit.clone()];
        assert!(p.validate().is_ok());
        habit.current = Some(true);
        habit.ever = Some(false);
        p.harmful_habits = vec![habit.clone()];
        assert!(p.validate().is_err());
        habit.ever = Some(true);
        habit.periods = vec![HabitPeriod {
            id: Uuid::new_v4(),
            start_date: Some("2020-01-02".parse().unwrap()),
            end_date: Some("2020-01-01".parse().unwrap()),
            note: "".into(),
        }];
        p.harmful_habits = vec![habit];
        assert!(p.validate().is_err());
    }
}
