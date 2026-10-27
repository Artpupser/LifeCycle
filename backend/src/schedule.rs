use axum::http::StatusCode;
use chrono::{
    DateTime, Datelike, Duration, LocalResult, NaiveDate, NaiveTime, TimeZone, Timelike, Utc,
};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};

use crate::error::ApiError;

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Schedule {
    pub start_date: NaiveDate,
    #[serde(default, with = "optional_time")]
    pub time: Option<NaiveTime>,
    pub timezone: String,
    pub duration_minutes: u32,
    pub recurrence: String,
    #[serde(default = "default_interval")]
    pub interval_days: u32,
    #[serde(default)]
    pub weekdays: Vec<u32>,
    pub end_date: Option<NaiveDate>,
}

fn default_interval() -> u32 {
    1
}

impl Schedule {
    pub fn validate(&self) -> Result<(), ApiError> {
        if self.timezone.parse::<Tz>().is_err() {
            return Err(ApiError::validation(
                "Schedule timezone must be an IANA timezone",
            ));
        }
        if !(1..=1440).contains(&self.duration_minutes) {
            return Err(ApiError::validation(
                "Duration must be between 1 and 1440 minutes",
            ));
        }
        if self
            .time
            .is_some_and(|time| time.second() != 0 || time.nanosecond() != 0)
        {
            return Err(ApiError::validation(
                "Schedule time must have minute precision",
            ));
        }
        if !["once", "daily", "weekly", "interval"].contains(&self.recurrence.as_str()) {
            return Err(ApiError::validation("Unsupported recurrence"));
        }
        if !(1..=3650).contains(&self.interval_days) {
            return Err(ApiError::validation(
                "Interval must be between 1 and 3650 calendar days",
            ));
        }
        if self.end_date.is_some_and(|end| end < self.start_date) {
            return Err(ApiError::validation(
                "Schedule end cannot precede its start",
            ));
        }
        if self.weekdays.len() > 7
            || self.weekdays.iter().any(|day| !(1..=7).contains(day))
            || (self.recurrence == "weekly" && self.weekdays.is_empty())
        {
            return Err(ApiError::validation(
                "Weekly schedules require weekdays from 1 (Monday) to 7 (Sunday)",
            ));
        }
        let mut days = self.weekdays.clone();
        days.sort_unstable();
        days.dedup();
        if days.len() != self.weekdays.len() {
            return Err(ApiError::validation("Schedule weekdays must be unique"));
        }
        Ok(())
    }

    pub fn occurs_on(&self, date: NaiveDate) -> bool {
        if date < self.start_date || self.end_date.is_some_and(|end| date > end) {
            return false;
        }
        let elapsed = date.signed_duration_since(self.start_date).num_days();
        match self.recurrence.as_str() {
            "once" => date == self.start_date,
            "daily" => true,
            "weekly" => self.weekdays.contains(&date.weekday().number_from_monday()),
            "interval" => self.interval_days > 0 && elapsed % i64::from(self.interval_days) == 0,
            _ => false,
        }
    }

    pub fn occurrence_start(&self, date: NaiveDate) -> Result<Option<DateTime<Utc>>, ApiError> {
        self.validate()?;
        if !self.occurs_on(date) {
            return Ok(None);
        }
        let Some(time) = self.time else {
            return Ok(None);
        };
        let zone = self
            .timezone
            .parse::<Tz>()
            .map_err(|_| ApiError::validation("Invalid timezone"))?;
        let requested = date.and_time(time);
        for shift in 0..=1560 {
            let candidate = requested
                .checked_add_signed(Duration::minutes(shift))
                .ok_or_else(|| ApiError::validation("Schedule date is out of range"))?;
            let local = match zone.from_local_datetime(&candidate) {
                LocalResult::Single(value) => value,
                LocalResult::Ambiguous(first, second) => first.min(second),
                LocalResult::None => continue,
            };
            return Ok(Some(local.with_timezone(&Utc)));
        }
        Err(ApiError::new(
            StatusCode::BAD_REQUEST,
            "invalid_schedule",
            "Local time cannot be resolved in the selected timezone",
        ))
    }

    pub fn occurrences(
        &self,
        from: NaiveDate,
        through: NaiveDate,
    ) -> Result<Vec<NaiveDate>, ApiError> {
        self.validate()?;
        let length = through.signed_duration_since(from).num_days();
        if !(0..366).contains(&length) {
            return Err(ApiError::validation(
                "Schedule queries support 1 to 366 inclusive dates",
            ));
        }
        Ok((0..=length)
            .filter_map(|offset| from.checked_add_signed(Duration::days(offset)))
            .filter(|date| self.occurs_on(*date))
            .collect())
    }
}

mod optional_time {
    use chrono::{NaiveTime, Timelike};
    use serde::{Deserialize, Deserializer, Serializer, de::Error};

    pub fn serialize<S: Serializer>(
        value: &Option<NaiveTime>,
        serializer: S,
    ) -> Result<S::Ok, S::Error> {
        match value {
            Some(time) => serializer.serialize_some(&time.format("%H:%M").to_string()),
            None => serializer.serialize_none(),
        }
    }

    pub fn deserialize<'de, D: Deserializer<'de>>(
        deserializer: D,
    ) -> Result<Option<NaiveTime>, D::Error> {
        let value = Option::<String>::deserialize(deserializer)?;
        value
            .map(|value| {
                let time = NaiveTime::parse_from_str(&value, "%H:%M")
                    .or_else(|_| NaiveTime::parse_from_str(&value, "%H:%M:%S"))
                    .map_err(|_| D::Error::custom("Time must be HH:MM"))?;
                if time.second() != 0 {
                    return Err(D::Error::custom("Time must have minute precision"));
                }
                Ok(time)
            })
            .transpose()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn date(value: &str) -> NaiveDate {
        value.parse().unwrap()
    }

    fn schedule() -> Schedule {
        Schedule {
            start_date: date("2026-03-28"),
            time: Some(NaiveTime::from_hms_opt(2, 30, 0).unwrap()),
            timezone: "Europe/Berlin".into(),
            duration_minutes: 30,
            recurrence: "interval".into(),
            interval_days: 2,
            weekdays: vec![],
            end_date: None,
        }
    }

    #[test]
    fn intervals_count_calendar_days_across_dst_without_drifting() {
        let schedule = schedule();
        assert_eq!(
            schedule
                .occurrences(date("2026-03-28"), date("2026-04-01"))
                .unwrap(),
            vec![date("2026-03-28"), date("2026-03-30"), date("2026-04-01")]
        );
        assert_eq!(
            schedule
                .occurrence_start(date("2026-03-30"))
                .unwrap()
                .unwrap()
                .to_rfc3339(),
            "2026-03-30T00:30:00+00:00"
        );
    }

    #[test]
    fn nonexistent_time_moves_to_next_valid_minute() {
        let schedule = Schedule {
            recurrence: "daily".into(),
            ..schedule()
        };
        assert_eq!(
            schedule
                .occurrence_start(date("2026-03-29"))
                .unwrap()
                .unwrap()
                .to_rfc3339(),
            "2026-03-29T01:00:00+00:00"
        );
    }

    #[test]
    fn repeated_time_chooses_earliest_instant() {
        let schedule = Schedule {
            recurrence: "daily".into(),
            ..schedule()
        };
        assert_eq!(
            schedule
                .occurrence_start(date("2026-10-25"))
                .unwrap()
                .unwrap()
                .to_rfc3339(),
            "2026-10-25T00:30:00+00:00"
        );
    }

    #[test]
    fn missing_calendar_day_is_resolved_without_panicking() {
        let schedule = Schedule {
            start_date: date("2011-12-29"),
            recurrence: "daily".into(),
            timezone: "Pacific/Apia".into(),
            time: Some(NaiveTime::from_hms_opt(0, 0, 0).unwrap()),
            ..schedule()
        };
        assert_eq!(
            schedule
                .occurrence_start(date("2011-12-30"))
                .unwrap()
                .unwrap()
                .to_rfc3339(),
            "2011-12-30T10:00:00+00:00"
        );
    }

    #[test]
    fn weekly_rules_use_iso_weekdays_and_inclusive_end() {
        let schedule = Schedule {
            recurrence: "weekly".into(),
            weekdays: vec![1, 5],
            end_date: Some(date("2026-04-03")),
            ..schedule()
        };
        assert_eq!(
            schedule
                .occurrences(date("2026-03-28"), date("2026-04-10"))
                .unwrap(),
            vec![date("2026-03-30"), date("2026-04-03")]
        );
        assert!(!schedule.occurs_on(date("2026-03-27")));
    }

    #[test]
    fn invalid_rules_and_unbounded_queries_are_rejected() {
        let invalid = Schedule {
            recurrence: "weekly".into(),
            weekdays: vec![1, 1],
            ..schedule()
        };
        assert!(invalid.validate().is_err());
        assert!(
            schedule()
                .occurrences(date("2026-01-01"), date("2027-01-02"))
                .is_err()
        );
        assert!(
            schedule()
                .occurrences(date("2026-04-01"), date("2026-03-01"))
                .is_err()
        );
    }

    #[test]
    fn untimed_tasks_still_occur_and_roundtrip_minute_precision() {
        let schedule = Schedule {
            time: None,
            ..schedule()
        };
        assert!(schedule.occurs_on(date("2026-03-28")));
        assert!(
            schedule
                .occurrence_start(date("2026-03-28"))
                .unwrap()
                .is_none()
        );
        let json = serde_json::to_value(super::tests::schedule()).unwrap();
        assert_eq!(json["time"], "02:30");
        assert_eq!(
            serde_json::from_value::<Schedule>(json).unwrap(),
            super::tests::schedule()
        );
    }
}
