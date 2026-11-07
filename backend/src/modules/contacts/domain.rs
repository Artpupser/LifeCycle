use crate::{shared::domain, shared::errors::ApiError};
use chrono::{DateTime, Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(crate) enum Gender {
    #[default]
    Unspecified,
    Female,
    Male,
    Other,
}

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct ContactData {
    pub gender: Gender,
    pub first_name: String,
    pub last_name: String,
    pub middle_name: String,
    pub phones: Vec<String>,
    pub birth_date: Option<NaiveDate>,
    pub description: String,
    pub relationship: String,
    pub profession: String,
    pub activity: String,
    pub categories: Vec<String>,
    pub tags: Vec<String>,
    pub source_keys: Vec<String>,
    pub birthday_enabled: bool,
}
impl ContactData {
    pub fn name(&self) -> String {
        [&self.last_name, &self.first_name, &self.middle_name]
            .into_iter()
            .filter(|name| !name.trim().is_empty())
            .map(String::as_str)
            .collect::<Vec<_>>()
            .join(" ")
    }
    pub(super) fn clean(&mut self, today: NaiveDate) -> Result<(), ApiError> {
        for value in [
            &mut self.first_name,
            &mut self.last_name,
            &mut self.middle_name,
            &mut self.relationship,
            &mut self.profession,
            &mut self.activity,
        ] {
            domain::text(value, 0, 200)?;
            *value = value.trim().to_owned();
        }
        domain::text(&self.name(), 1, 602)?;
        domain::text(&self.description, 0, 8000)?;
        if self
            .birth_date
            .is_some_and(|date| date.year() < 1900 || date > today)
        {
            return Err(ApiError::validation(
                "Birth date must be between 1900 and today",
            ));
        }
        if self.phones.len() > 20 || self.source_keys.len() > 20 {
            return Err(ApiError::validation(
                "At most 20 phone numbers and import identifiers",
            ));
        }
        let mut seen = std::collections::HashSet::new();
        for phone in &mut self.phones {
            domain::text(phone, 1, 80)?;
            *phone = phone.trim().to_owned();
            let key = PhoneKey::from(phone.as_str());
            if !(3..=30).contains(&key.0.len()) || !seen.insert(key) {
                return Err(ApiError::validation("Invalid or repeated phone number"));
            }
        }
        for key in &self.source_keys {
            domain::text(key, 1, 512)?;
        }
        self.source_keys.sort();
        self.source_keys.dedup();
        for labels in [&mut self.categories, &mut self.tags] {
            domain::tags(labels)?;
            for label in labels.iter_mut() {
                *label = label.trim().to_owned();
            }
            let mut seen = std::collections::HashSet::new();
            labels.retain(|label| seen.insert(label.to_lowercase()));
        }
        Ok(())
    }
}
#[derive(PartialEq, Eq, Hash)]
struct PhoneKey(String);

impl From<&str> for PhoneKey {
    fn from(value: &str) -> Self {
        let mut digits: String = value.chars().filter(char::is_ascii_digit).collect();
        if digits.starts_with("00") {
            digits.drain(..2);
        }
        Self(digits)
    }
}
fn normalized(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}
pub(super) fn duplicate(first: &ContactData, second: &ContactData) -> bool {
    first
        .source_keys
        .iter()
        .any(|key| second.source_keys.contains(key))
        || first.phones.iter().any(|phone| {
            let key = PhoneKey::from(phone.as_str());
            second
                .phones
                .iter()
                .any(|other_phone| key == PhoneKey::from(other_phone.as_str()))
        })
        || (normalized(&first.name()) == normalized(&second.name())
            && first.birth_date == second.birth_date)
}
#[derive(Clone, Serialize)]
pub(crate) struct Contact {
    pub id: Uuid,
    pub data: ContactData,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum WriteMode {
    Create,
    Update,
}

#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(super) enum DeleteEvents {
    Keep,
    Delete,
}

impl std::str::FromStr for DeleteEvents {
    type Err = ApiError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "keep" => Ok(Self::Keep),
            "delete" => Ok(Self::Delete),
            _ => Err(ApiError::validation(
                "Choose whether linked events are kept or deleted",
            )),
        }
    }
}

#[derive(Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub(super) enum LabelKind {
    Categories,
    Tags,
}

impl std::str::FromStr for LabelKind {
    type Err = ApiError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "categories" => Ok(Self::Categories),
            "tags" => Ok(Self::Tags),
            _ => Err(ApiError::validation("Unknown contact label kind")),
        }
    }
}
