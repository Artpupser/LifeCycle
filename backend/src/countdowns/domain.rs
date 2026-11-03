use super::model::{Countdown, Row};
use crate::{error::ApiError, schedule::resolve_local_start};
use chrono::{DateTime, Datelike, Duration, NaiveDate, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use uuid::Uuid;

pub(super) const MIN_EVENT_YEAR: i32 = 1900;
pub(super) const MAX_EVENT_YEAR: i32 = 9998;
const MAX_OCCURRENCE_YEAR: i32 = 9999;

#[derive(Clone, Copy, PartialEq, Eq, Serialize, Deserialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub(super) enum Recurrence {
    Once,
    Daily,
    Monthly,
    Yearly,
}

impl std::str::FromStr for Recurrence {
    type Err = ApiError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "once" => Ok(Self::Once),
            "daily" => Ok(Self::Daily),
            "monthly" => Ok(Self::Monthly),
            "yearly" => Ok(Self::Yearly),
            _ => Err(ApiError::validation("Unsupported event recurrence")),
        }
    }
}

pub(super) enum ContactBinding {
    Independent,
    Linked(Uuid),
    Birthday(Uuid),
}

impl TryFrom<(Option<Uuid>, bool)> for ContactBinding {
    type Error = ApiError;

    fn try_from((contact_id, birthday): (Option<Uuid>, bool)) -> Result<Self, Self::Error> {
        match (contact_id, birthday) {
            (Some(id), true) => Ok(Self::Birthday(id)),
            (Some(id), false) => Ok(Self::Linked(id)),
            (None, false) => Ok(Self::Independent),
            (None, true) => Err(ApiError::validation("A birthday needs a contact")),
        }
    }
}

impl ContactBinding {
    pub(super) fn contact_id(&self) -> Option<Uuid> {
        match self {
            Self::Independent => None,
            Self::Linked(id) | Self::Birthday(id) => Some(*id),
        }
    }
}

fn clamped(year: i32, month: u32, day: u32) -> Option<NaiveDate> {
    (1..=day)
        .rev()
        .find_map(|candidate_day| NaiveDate::from_ymd_opt(year, month, candidate_day))
}
pub(super) fn at_index(target: NaiveDate, rule: &str, index: i64) -> Result<NaiveDate, ApiError> {
    let date = match rule.parse().unwrap_or(Recurrence::Once) {
        Recurrence::Daily => target.checked_add_signed(Duration::days(index)),
        Recurrence::Monthly => {
            let months = i64::from(target.year()) * 12 + i64::from(target.month0()) + index;
            i32::try_from(months.div_euclid(12))
                .ok()
                .filter(|year| (MIN_EVENT_YEAR..=MAX_OCCURRENCE_YEAR).contains(year))
                .and_then(|year| clamped(year, months.rem_euclid(12) as u32 + 1, target.day()))
        }
        Recurrence::Yearly => i32::try_from(i64::from(target.year()) + index)
            .ok()
            .filter(|year| (MIN_EVENT_YEAR..=MAX_OCCURRENCE_YEAR).contains(year))
            .and_then(|year| clamped(year, target.month(), target.day())),
        Recurrence::Once => Some(target),
    };
    date.ok_or_else(|| ApiError::validation("Event date is outside the supported calendar"))
}
pub(super) fn index_near(target: NaiveDate, rule: &str, date: NaiveDate) -> i64 {
    match rule.parse().unwrap_or(Recurrence::Once) {
        Recurrence::Daily => (date - target).num_days(),
        Recurrence::Monthly => {
            i64::from(date.year() - target.year()) * 12 + i64::from(date.month())
                - i64::from(target.month())
        }
        Recurrence::Yearly => i64::from(date.year() - target.year()),
        Recurrence::Once => 0,
    }
    .max(0)
}
pub(super) fn instant(row: &Row, date: NaiveDate, zone: &str) -> Result<DateTime<Utc>, ApiError> {
    resolve_local_start(date, row.target_time.unwrap_or_default(), zone)
}
pub(super) fn computed(
    row: Row,
    now: DateTime<Utc>,
    fallback: &str,
) -> Result<Countdown, ApiError> {
    let zone = row.timezone.as_deref().unwrap_or(fallback);
    let tz = zone.parse::<Tz>().map_err(|_| ApiError::internal())?;
    let today = now.with_timezone(&tz).date_naive();
    let mut index = index_near(row.target_date, &row.recurrence, today);
    let candidate = at_index(row.target_date, &row.recurrence, index)?;
    if row.recurrence != "once"
        && (candidate < today
            || (row.target_time.is_some() && instant(&row, candidate, zone)? < now))
    {
        index += 1;
    }
    let next_date = at_index(row.target_date, &row.recurrence, index)?;
    let next_at = instant(&row, next_date, zone)?;
    let original_at = instant(&row, row.target_date, zone)?;
    let mut repetitions = index_near(row.target_date, &row.recurrence, today);
    if repetitions > 0
        && instant(
            &row,
            at_index(row.target_date, &row.recurrence, repetitions)?,
            zone,
        )? > now
    {
        repetitions -= 1;
    }
    let full_years = if original_at > now {
        None
    } else {
        let mut years = today.year() - row.target_date.year();
        if instant(
            &row,
            clamped(today.year(), row.target_date.month(), row.target_date.day())
                .ok_or_else(ApiError::internal)?,
            zone,
        )? > now
        {
            years -= 1;
        }
        Some(years.max(0))
    };
    let timezone = zone.to_owned();
    let repeat_yearly = row.recurrence == "yearly";
    Ok(Countdown {
        id: row.id,
        title: row.title,
        category: row.category,
        tags: row.tags.0,
        icon: row.icon,
        target_date: (!row.suspended).then_some(row.target_date),
        repeat_yearly,
        recurrence: row.recurrence,
        target_time: row.target_time,
        timezone,
        description: row.description,
        details: row.details.0,
        display: row.display.0,
        next_date: (!row.suspended).then_some(next_date),
        days_remaining: (!row.suspended).then_some((next_date - today).num_days()),
        next_at: (!row.suspended).then_some(next_at),
        original_at: (!row.suspended).then_some(original_at),
        seconds_remaining: (!row.suspended).then_some((next_at - now).num_seconds().max(0)),
        seconds_elapsed: (!row.suspended).then_some((now - original_at).num_seconds().max(0)),
        full_years: if row.suspended { None } else { full_years },
        repetitions: if row.suspended { 0 } else { repetitions },
        computed_at: now,
        created_at: row.created_at,
        updated_at: row.updated_at,
        contact_id: row.contact_id,
        contact_name: row.contact_name,
        contact_birthday: row.contact_birthday,
        suspended: row.suspended,
    })
}

pub(super) fn category(value: &str) -> Result<String, ApiError> {
    if let Some(id) = value.strip_prefix("custom:") {
        let id = uuid::Uuid::parse_str(id).map_err(|_| ApiError::validation("Invalid category"))?;
        return Ok(format!("custom:{id}"));
    }
    let result = match value.trim().to_lowercase().as_str() {
        "birthday" | "день рождения" | "др" => Ok("birthday"),
        "anniversary" | "годовщина" => Ok("anniversary"),
        "holiday" | "праздник" => Ok("holiday"),
        "personal" | "личное" => Ok("personal"),
        "work" | "работа" => Ok("work"),
        "other" | "событие" => Ok("other"),
        _ => Err(ApiError::validation("Choose an event category")),
    };
    result.map(str::to_owned)
}
