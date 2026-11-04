use crate::shared::errors::ApiError;
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
    pub(super) fn validate_on(&self, today: NaiveDate) -> Result<(), ApiError> {
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
            crate::shared::domain::text(value, 0, 100)?;
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
            crate::shared::domain::text(language, 1, 80)?;
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
            crate::shared::domain::text(text, 0, 2000)?;
        }
        if self.harmful_habits.len() > 30 {
            return Err(ApiError::validation("At most 30 habits are supported"));
        }
        let mut ids = std::collections::HashSet::new();
        for habit in &self.harmful_habits {
            crate::shared::domain::text(&habit.name, 1, 80)?;
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
                crate::shared::domain::text(&period.note, 0, 2000)?;
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
