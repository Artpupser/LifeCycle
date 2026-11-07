use super::service::validate_list;
use crate::{shared::domain, shared::errors::ApiError};
use axum::http::StatusCode;
use chrono::{DateTime, LocalResult, NaiveDate, NaiveDateTime, TimeZone, Timelike, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(super) enum Kind {
    Sex,
    Masturbation,
}

#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub(super) enum TimeOccurrence {
    #[default]
    Earlier,
    Later,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(default, deny_unknown_fields)]
pub(super) struct PartnerDetails {
    pub(super) protection_used: Option<bool>,
    pub(super) gender: String,
    pub(super) name: String,
    pub(super) positions: Vec<String>,
    pub(super) sex_types: Vec<String>,
}

#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(default, deny_unknown_fields)]
pub(super) struct SoloDetails {
    pub(super) porn_sources: Vec<String>,
    #[serde(rename = "feelings_after", skip_serializing)]
    pub(super) legacy_feelings_after: String,
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub(super) struct EntryData {
    #[serde(default, rename = "feelings_after", skip_serializing)]
    pub(super) legacy_feelings_after: Vec<String>,
    #[serde(default)]
    pub(super) satisfaction_level: Option<u8>,
    #[serde(default)]
    pub(super) lubricants: Vec<String>,
    #[serde(default)]
    pub(super) contraception: Vec<String>,
    #[serde(default)]
    pub(super) emotions_before: Vec<String>,
    #[serde(default)]
    pub(super) libido_level: Option<u8>,
    #[serde(default)]
    pub(super) planned: Option<bool>,
    pub(super) kind: Kind,
    pub(super) local_start: NaiveDateTime,
    pub(super) timezone: String,
    #[serde(default)]
    pub(super) time_occurrence: TimeOccurrence,
    pub(super) duration_minutes: Option<u32>,
    #[serde(default, skip_serializing)]
    pub(super) ejaculation_count: Option<u32>,
    #[serde(default)]
    pub(super) toys: Vec<String>,
    pub(super) lubricant_used: Option<bool>,
    #[serde(default)]
    pub(super) setting: String,
    pub(super) was_clothed: Option<bool>,
    #[serde(default, alias = "emotions")]
    pub(super) emotions_after: Vec<String>,
    pub(super) repeat_desired: Option<bool>,
    #[serde(default)]
    pub(super) note: String,
    pub(super) partner: Option<PartnerDetails>,
    pub(super) solo: Option<SoloDetails>,
}

impl EntryData {
    /// Retire old fields without losing private observations from existing ciphertext.
    pub(super) fn retire_legacy_fields(&mut self) {
        let mut notes = std::mem::take(&mut self.legacy_feelings_after);
        if let Some(solo) = self.solo.as_mut() {
            let text = std::mem::take(&mut solo.legacy_feelings_after);
            if !text.is_empty() {
                notes.push(text);
            }
        }
        for text in notes {
            if !self.note.is_empty() {
                self.note.push_str("\n\n");
            }
            self.note.push_str(&text);
        }
    }

    pub(super) fn start(&self) -> Result<DateTime<Utc>, ApiError> {
        let zone = self.timezone.parse::<Tz>().map_err(|_| {
            ApiError::validation("Event timezone must be a supported IANA timezone")
        })?;
        if self.local_start.second() != 0 || self.local_start.nanosecond() != 0 {
            return Err(ApiError::validation(
                "Event time must have minute precision",
            ));
        }
        let instant = match zone.from_local_datetime(&self.local_start) {
            LocalResult::Single(value) => value,
            LocalResult::Ambiguous(a, b) => match self.time_occurrence {
                TimeOccurrence::Earlier => a.min(b),
                TimeOccurrence::Later => a.max(b),
            },
            LocalResult::None => {
                return Err(ApiError::new(
                    StatusCode::BAD_REQUEST,
                    "nonexistent_local_time",
                    "This local time does not exist in the selected timezone",
                ));
            }
        };
        Ok(instant.with_timezone(&Utc))
    }
    pub(super) fn validate(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, ApiError> {
        let start = self.start()?;
        if self.local_start.date() < NaiveDate::from_ymd_opt(1900, 1, 1).unwrap() || start > now {
            return Err(ApiError::validation(
                "Only past or current events since 1900 are supported",
            ));
        }
        if self
            .duration_minutes
            .is_some_and(|v| !(1..=1440).contains(&v))
        {
            return Err(ApiError::validation(
                "Event measurement is outside the supported range",
            ));
        }
        domain::text(&self.setting, 0, 1000)?;
        domain::text(&self.note, 0, 200_000)?;
        validate_list(&self.toys)?;
        validate_list(&self.emotions_before)?;
        validate_list(&self.emotions_after)?;
        validate_list(&self.lubricants)?;
        validate_list(&self.contraception)?;
        if [self.libido_level, self.satisfaction_level]
            .into_iter()
            .flatten()
            .any(|value| value > 10)
        {
            return Err(ApiError::validation(
                "Journal ratings must be between 0 and 10",
            ));
        }
        match self.kind {
            Kind::Sex => {
                if self.solo.is_some() {
                    return Err(ApiError::validation(
                        "Solo details do not belong to a sex entry",
                    ));
                }
                if let Some(partner) = &self.partner {
                    if !["", "unspecified", "female", "male", "other"]
                        .contains(&partner.gender.as_str())
                    {
                        return Err(ApiError::validation("Unsupported partner gender"));
                    }
                    domain::text(&partner.name, 0, 200)?;
                    validate_list(&partner.positions)?;
                    validate_list(&partner.sex_types)?;
                    if partner
                        .sex_types
                        .iter()
                        .any(|v| !crate::modules::labels::fixed_collection_value("sex_type", v))
                    {
                        return Err(ApiError::validation("Unsupported sex type"));
                    }
                }
            }
            Kind::Masturbation => {
                if self.partner.is_some() {
                    return Err(ApiError::validation(
                        "Partner details do not belong to a solo entry",
                    ));
                }
                if let Some(solo) = &self.solo {
                    validate_list(&solo.porn_sources)?;
                }
            }
        }
        Ok(start)
    }
}

#[derive(sqlx::FromRow)]
pub(super) struct Row {
    pub(super) id: Uuid,
    pub(super) started_at: DateTime<Utc>,
    pub(super) encrypted_data: Vec<u8>,
    pub(super) revision: i64,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Serialize)]
pub(super) struct Entry {
    pub(super) id: Uuid,
    pub(super) started_at: DateTime<Utc>,
    pub(super) data: EntryData,
    pub(super) revision: i64,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Update {
    pub(super) revision: i64,
    pub(super) data: EntryData,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Revision {
    pub(super) revision: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Range {
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
    pub(super) kind: Option<Kind>,
    #[serde(default)]
    pub(super) offset: usize,
}

impl Range {
    pub(super) fn validate(&self) -> Result<(), ApiError> {
        if !(0..366).contains(&self.to.signed_duration_since(self.from).num_days())
            || self.offset > 1_000_000
        {
            return Err(ApiError::validation(
                "Journal queries support 1 to 366 dates and offset up to 1000000",
            ));
        }
        Ok(())
    }
}

#[derive(Default, Serialize)]
pub(super) struct Answers {
    pub(super) yes: u64,
    pub(super) no: u64,
    pub(super) unknown: u64,
}

impl Answers {
    pub(super) fn add(&mut self, value: Option<bool>) {
        match value {
            Some(true) => self.yes += 1,
            Some(false) => self.no += 1,
            None => self.unknown += 1,
        }
    }
}

#[derive(Default, Serialize)]
pub(super) struct Day {
    pub(super) sex: u64,
    pub(super) masturbation: u64,
}

#[derive(Default, Serialize)]
pub(super) struct Statistics {
    pub(super) total: u64,
    pub(super) sex: u64,
    pub(super) masturbation: u64,
    pub(super) active_days: usize,
    pub(super) duration_minutes: u64,
    pub(super) duration_answers: u64,
    pub(super) average_duration_minutes: Option<f64>,
    pub(super) ejaculations: u64,
    pub(super) ejaculation_answers: u64,
    pub(super) with_toys: u64,
    pub(super) repeat_desired: Answers,
    pub(super) lubricant_used: Answers,
    pub(super) protection_used: Answers,
    pub(super) emotions: BTreeMap<String, u64>,
    pub(super) emotions_before: BTreeMap<String, u64>,
    pub(super) days: BTreeMap<NaiveDate, Day>,
}

impl Statistics {
    pub(super) fn add(&mut self, data: &EntryData, start: DateTime<Utc>, zone: Tz) {
        self.total += 1;
        let day = self
            .days
            .entry(start.with_timezone(&zone).date_naive())
            .or_default();
        match data.kind {
            Kind::Sex => {
                self.sex += 1;
                day.sex += 1;
                self.protection_used
                    .add(data.partner.as_ref().and_then(|p| p.protection_used));
            }
            Kind::Masturbation => {
                self.masturbation += 1;
                day.masturbation += 1;
            }
        }
        if let Some(minutes) = data.duration_minutes {
            self.duration_minutes += u64::from(minutes);
            self.duration_answers += 1;
        }
        self.ejaculations += 1;
        self.ejaculation_answers += 1;
        if !data.toys.is_empty() {
            self.with_toys += 1;
        }
        self.repeat_desired.add(data.repeat_desired);
        self.lubricant_used.add(data.lubricant_used);
        for emotion in &data.emotions_after {
            *self.emotions.entry(emotion.to_lowercase()).or_default() += 1;
        }
        for emotion in &data.emotions_before {
            *self
                .emotions_before
                .entry(emotion.to_lowercase())
                .or_default() += 1;
        }
        self.active_days = self.days.len();
        self.average_duration_minutes = (self.duration_answers > 0)
            .then(|| self.duration_minutes as f64 / self.duration_answers as f64);
    }
}

#[derive(Serialize)]
pub(super) struct Journal {
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
    pub(super) timezone: String,
    pub(super) offset: usize,
    pub(super) limit: usize,
    pub(super) total: u64,
    pub(super) entries: Vec<Entry>,
    pub(super) statistics: Statistics,
}

#[derive(Default, Serialize)]
pub(crate) struct AnalyticsSummary {
    pub(super) total: u64,
    pub(super) sex: u64,
    pub(super) masturbation: u64,
    pub(super) active_days: usize,
    pub(super) duration_minutes: u64,
    pub(super) duration_answers: u64,
    pub(super) average_duration_minutes: Option<f64>,
}
