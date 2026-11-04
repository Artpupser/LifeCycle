use super::domain::{MAX_EVENT_YEAR, MIN_EVENT_YEAR, Recurrence};
use super::model::{Details, Display};
use crate::{domain, error::ApiError};
use chrono::Datelike;
use chrono::{DateTime, NaiveDate, NaiveTime, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Deserializer};
use uuid::Uuid;

fn nullable<'de, D: Deserializer<'de>>(display: D) -> Result<Option<Option<NaiveTime>>, D::Error> {
    Ok(Some(Option::<NaiveTime>::deserialize(display)?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct CountdownInput {
    pub(super) title: String,
    pub(super) category: String,
    pub(super) tags: Option<Vec<String>>,
    pub(super) icon: String,
    pub(super) target_date: NaiveDate,
    pub(super) repeat_yearly: Option<bool>,
    pub(super) recurrence: Option<String>,
    #[serde(default, deserialize_with = "nullable")]
    pub(super) target_time: Option<Option<NaiveTime>>,
    pub(super) timezone: Option<String>,
    pub(super) description: Option<String>,
    pub(super) details: Option<Details>,
    pub(super) display: Option<Display>,
    pub(super) expected_updated_at: Option<DateTime<Utc>>,
    #[serde(default, deserialize_with = "nullable_id")]
    pub(super) contact_id: Option<Option<Uuid>>,
    pub(super) contact_birthday: Option<bool>,
}
fn nullable_id<'de, D: Deserializer<'de>>(display: D) -> Result<Option<Option<Uuid>>, D::Error> {
    Ok(Some(Option::<Uuid>::deserialize(display)?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Unlink {
    pub(super) expected_updated_at: DateTime<Utc>,
}

impl CountdownInput {
    pub(super) fn validate(&self) -> Result<Option<Recurrence>, ApiError> {
        domain::text(&self.title, 1, 200)?;
        super::domain::category(&self.category)?;
        if let Some(tags) = &self.tags {
            domain::tags(tags)?;
        }
        domain::text(&self.icon, 0, 128)?;
        if !(MIN_EVENT_YEAR..=MAX_EVENT_YEAR).contains(&self.target_date.year()) {
            return Err(ApiError::validation(
                "Countdown date must be between years 1900 and 9998",
            ));
        }
        if let Some(ref text) = self.description {
            domain::text(text, 0, 200_000)?;
        }
        if let Some(ref details) = self.details {
            domain::text(&details.full_name, 0, 602)?;
            domain::text(&details.phone, 0, 2000)?;
            domain::text(&details.occupation, 0, 405)?;
            domain::text(&details.relationship, 0, 200)?;
            domain::text(&details.notes, 0, 8000)?;
        }
        if self.display.as_ref().is_some_and(|display| {
            !["both", "remaining", "elapsed"].contains(&display.clock.as_str())
                || !["days", "seconds", "minutes", "weeks", "months"]
                    .contains(&display.unit.as_str())
        }) {
            return Err(ApiError::validation("Unsupported countdown display"));
        }
        let recurrence = self
            .recurrence
            .as_deref()
            .map(str::parse::<Recurrence>)
            .transpose()?
            .or(self.repeat_yearly.map(|yearly| {
                if yearly {
                    Recurrence::Yearly
                } else {
                    Recurrence::Once
                }
            }));
        if self
            .timezone
            .as_ref()
            .is_some_and(|zone_name| zone_name.parse::<Tz>().is_err())
        {
            return Err(ApiError::validation("Invalid timezone"));
        }
        Ok(recurrence)
    }
}
