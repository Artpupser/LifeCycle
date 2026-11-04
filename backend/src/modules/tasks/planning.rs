use super::models::TaskOccurrence;
use crate::{shared::errors::ApiError, shared::schedule::Schedule};
use chrono::{DateTime, NaiveDate, Utc};

pub(super) type PlannedStart = (NaiveDate, Option<DateTime<Utc>>);

pub(super) fn schedule_intersects(
    schedule: &Schedule,
    from: Option<NaiveDate>,
    to: Option<NaiveDate>,
) -> bool {
    let start = from.unwrap_or(schedule.start_date).max(schedule.start_date);
    next_schedule_date(schedule, start).is_some_and(|date| to.is_none_or(|end| date <= end))
}

pub(super) fn next_schedule_date(schedule: &Schedule, from: NaiveDate) -> Option<NaiveDate> {
    let start = from.max(schedule.start_date);
    let next = match schedule.recurrence.as_str() {
        "once" => Some(schedule.start_date),
        "daily" => Some(start),
        "weekly" => (0..7)
            .filter_map(|offset| start.checked_add_signed(chrono::Duration::days(offset)))
            .find(|date| schedule.occurs_on(*date)),
        "interval" if schedule.interval_days > 0 => {
            let period = i64::from(schedule.interval_days);
            let elapsed = (start - schedule.start_date).num_days();
            let offset = (period - elapsed % period) % period;
            start.checked_add_signed(chrono::Duration::days(offset))
        }
        _ => None,
    };
    next.filter(|date| *date >= start && schedule.end_date.is_none_or(|end| *date <= end))
}

pub(super) fn schedule_matches_profile_dates(
    schedule: &Schedule,
    from: Option<NaiveDate>,
    to: Option<NaiveDate>,
    zone: &chrono_tz::Tz,
) -> bool {
    if schedule.recurrence == "once" {
        return schedule_in_profile_range(
            schedule,
            from.unwrap_or(NaiveDate::MIN),
            to.unwrap_or(NaiveDate::MAX),
            zone,
        )
        .is_ok_and(|rows| !rows.is_empty());
    }
    if schedule.time.is_none() {
        return schedule_intersects(schedule, from, to);
    }
    let mut candidate = from
        .map(|date| {
            date.checked_sub_signed(chrono::Duration::days(3))
                .unwrap_or(NaiveDate::MIN)
        })
        .unwrap_or(schedule.start_date);
    for _ in 0..8 {
        let Some(date) = next_schedule_date(schedule, candidate) else {
            return false;
        };
        let Ok(Some(instant)) = schedule.occurrence_start(date) else {
            return false;
        };
        let local = instant.with_timezone(zone).date_naive();
        if from.is_none_or(|from| local >= from) {
            return to.is_none_or(|to| local <= to);
        }
        let Some(next) = date.succ_opt() else {
            return false;
        };
        candidate = next;
    }
    false
}

pub(crate) fn calendar_date(occurrence: &TaskOccurrence, zone: &chrono_tz::Tz) -> NaiveDate {
    occurrence.starts_at.map_or(occurrence.date, |instant| {
        instant.with_timezone(zone).date_naive()
    })
}

pub(crate) fn schedule_in_profile_range(
    schedule: &Schedule,
    from: NaiveDate,
    to: NaiveDate,
    zone: &chrono_tz::Tz,
) -> Result<Vec<PlannedStart>, ApiError> {
    schedule.validate_task()?;
    if schedule.recurrence == "once" {
        let date = schedule.start_date;
        let starts_at = schedule.occurrence_start(date)?;
        let start_day = starts_at.map_or(date, |start| start.with_timezone(zone).date_naive());
        let end_day = starts_at.map_or(
            date + chrono::Duration::days(i64::from(
                schedule.duration_minutes.div_ceil(1440).saturating_sub(1),
            )),
            |start| {
                (start + chrono::Duration::minutes(i64::from(schedule.duration_minutes))
                    - chrono::Duration::seconds(1))
                .with_timezone(zone)
                .date_naive()
            },
        );
        return Ok(if start_day <= to && end_day >= from {
            vec![(date, starts_at)]
        } else {
            vec![]
        });
    }
    let first = from
        .checked_sub_signed(chrono::Duration::days(3))
        .unwrap_or(NaiveDate::MIN);
    let last = to
        .checked_add_signed(chrono::Duration::days(3))
        .unwrap_or(NaiveDate::MAX);
    let mut result = vec![];
    for offset in 0..=(last - first).num_days() {
        let Some(date) = first.checked_add_signed(chrono::Duration::days(offset)) else {
            continue;
        };
        if !schedule.occurs_on(date) {
            continue;
        }
        let starts_at = schedule.occurrence_start(date)?;
        let local = starts_at.map_or(date, |instant| instant.with_timezone(zone).date_naive());
        if local >= from && local <= to {
            result.push((date, starts_at));
        }
    }
    Ok(result)
}

pub(super) fn replanned(
    mut schedule: Schedule,
    starts_at: DateTime<Utc>,
    duration: u32,
    occurrence_date: Option<NaiveDate>,
) -> Result<Schedule, ApiError> {
    use chrono::Timelike;
    if starts_at.second() != 0 || starts_at.nanosecond() != 0 {
        return Err(ApiError::validation("Use minute precision"));
    }
    let zone = schedule
        .timezone
        .parse::<chrono_tz::Tz>()
        .map_err(|_| ApiError::validation("Invalid timezone"))?;
    let local = starts_at.with_timezone(&zone);
    let original_date = occurrence_date.unwrap_or(schedule.start_date);
    if !schedule.occurs_on(original_date) {
        return Err(ApiError::validation(
            "Occurrence no longer belongs to this schedule",
        ));
    }
    let shift = local.date_naive().signed_duration_since(original_date);
    schedule.start_date = schedule
        .start_date
        .checked_add_signed(shift)
        .ok_or_else(|| ApiError::validation("Date outside supported range"))?;
    schedule.end_date = schedule
        .end_date
        .map(|date| {
            date.checked_add_signed(shift)
                .ok_or_else(|| ApiError::validation("Date outside supported range"))
        })
        .transpose()?;
    if schedule.recurrence == "weekly" {
        for day in &mut schedule.weekdays {
            *day = ((i64::from(*day) - 1 + shift.num_days()).rem_euclid(7) + 1) as u32;
        }
        schedule.weekdays.sort_unstable();
    }
    schedule.time = Some(local.time());
    schedule.duration_minutes = duration;
    schedule.validate_task()?;
    if schedule.occurrence_start(local.date_naive())? != Some(starts_at)
        || !schedule.occurs_on(local.date_naive())
    {
        return Err(ApiError::validation(
            "Start must match recurrence and the earliest instant during a repeated local minute",
        ));
    }
    Ok(schedule)
}
