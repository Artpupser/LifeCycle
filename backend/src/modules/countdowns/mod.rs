mod domain;
mod dto;
mod handlers;
mod model;
mod repository;

pub use handlers::routes;
pub(crate) use model::EventOccurrence;
pub(crate) use repository::detach_contact;

use self::{
    domain::{MAX_EVENT_YEAR, MIN_EVENT_YEAR, at_index, computed, index_near, instant},
    repository::rows,
};
use crate::{infrastructure::state::AppState, shared::errors::ApiError};
use chrono::{Datelike, Duration, NaiveDate, Utc};
use chrono_tz::Tz;
use uuid::Uuid;

#[cfg(test)]
use self::{
    model::{Details, Display, Row},
    repository::apply_contact,
};
#[cfg(test)]
use crate::modules::contacts;
#[cfg(test)]
use chrono::DateTime;
#[cfg(test)]
use sqlx::types::Json as DbJson;

pub(crate) async fn occurrences(
    state: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    profile_zone: &str,
) -> Result<Vec<EventOccurrence>, ApiError> {
    if !(0..366).contains(&(to - from).num_days())
        || !(MIN_EVENT_YEAR..=MAX_EVENT_YEAR).contains(&from.year())
        || !(MIN_EVENT_YEAR..=MAX_EVENT_YEAR).contains(&to.year())
    {
        return Err(ApiError::validation(
            "Events support 1 to 366 dates between 1900 and 9998",
        ));
    }
    let profile_tz = profile_zone
        .parse::<Tz>()
        .map_err(|_| ApiError::internal())?;
    let now = Utc::now();
    let mut events = Vec::new();
    for row in rows(state, user).await? {
        if row.suspended {
            continue;
        }
        let zone = row.timezone.as_deref().unwrap_or(profile_zone);
        for offset in -2..=(to - from).num_days() + 2 {
            let date = from + Duration::days(offset);
            if date < row.target_date {
                continue;
            }
            let index = index_near(row.target_date, &row.recurrence, date);
            if at_index(row.target_date, &row.recurrence, index)? != date {
                continue;
            }
            let event_at = instant(&row, date, zone)?;
            let display_date = if row.target_time.is_none() {
                date
            } else {
                event_at.with_timezone(&profile_tz).date_naive()
            };
            if display_date >= from && display_date <= to {
                events.push(EventOccurrence {
                    date: display_date,
                    event_at,
                    countdown: computed(row.clone(), now, profile_zone)?,
                });
            }
        }
    }
    events.sort_by_key(|event| (event.date, event.event_at, event.countdown.id));
    let mut seen = std::collections::HashSet::new();
    events.retain(|event| seen.insert((event.event_at, event.countdown.id)));
    Ok(events)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn row(date: &str, rule: &str) -> Row {
        Row {
            tags: DbJson(vec![]),
            id: Uuid::new_v4(),
            title: "Event".into(),
            category: "Custom".into(),
            icon: "".into(),
            target_date: date.parse().unwrap(),
            recurrence: rule.into(),
            target_time: None,
            timezone: None,
            description: "".into(),
            details: DbJson(Details::default()),
            display: DbJson(Display::default()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            contact_id: None,
            contact_birthday: false,
            contact_snapshot: None,
            suspended: false,
            contact_name: None,
            birth_year_unknown: false,
        }
    }
    fn now(value: &str) -> DateTime<Utc> {
        value.parse().unwrap()
    }
    #[test]
    fn categories_accept_only_enum_or_canonical_registry_identifiers() {
        assert_eq!(
            super::domain::category("День рождения").unwrap(),
            "birthday"
        );
        assert_eq!(
            super::domain::category("custom:123E4567-E89B-42D3-A456-426614174000").unwrap(),
            "custom:123e4567-e89b-42d3-a456-426614174000"
        );
        assert!(super::domain::category("Arbitrary free text").is_err());
        assert!(super::domain::category("custom:missing").is_err());
    }
    #[test]
    fn recurrence_keeps_anchor_and_does_not_precede_original() {
        assert_eq!(
            at_index("2024-01-31".parse().unwrap(), "monthly", 1)
                .unwrap()
                .to_string(),
            "2024-02-29"
        );
        assert_eq!(
            at_index("2024-01-31".parse().unwrap(), "monthly", 2)
                .unwrap()
                .to_string(),
            "2024-03-31"
        );
        assert_eq!(
            computed(
                row("2030-02-28", "yearly"),
                now("2026-11-02T12:00:00Z"),
                "UTC"
            )
            .unwrap()
            .next_date
            .unwrap()
            .to_string(),
            "2030-02-28"
        );
    }
    #[test]
    fn leap_age_repetitions_and_elapsed_are_calendar_correct() {
        let c = computed(
            row("2000-02-29", "yearly"),
            now("2027-02-28T12:00:00Z"),
            "UTC",
        )
        .unwrap();
        assert_eq!(c.full_years, Some(27));
        assert_eq!(c.repetitions, 27);
        assert_eq!(c.next_date.unwrap().to_string(), "2027-02-28");
        assert!(c.seconds_elapsed.unwrap() > 0);
        let c = computed(
            row("2026-11-01", "daily"),
            now("2026-11-03T12:00:00Z"),
            "UTC",
        )
        .unwrap();
        assert_eq!(c.repetitions, 2);
    }
    #[test]
    fn timed_events_roll_forward_and_share_schedule_dst_rules() {
        let mut r = row("2026-03-29", "daily");
        r.target_time = Some("02:30:00".parse().unwrap());
        r.timezone = Some("Europe/Berlin".into());
        let c = computed(r, now("2026-03-29T00:00:00Z"), "UTC").unwrap();
        assert_eq!(c.next_at, Some(now("2026-03-29T01:00:00Z")));
        let mut r = row("2026-11-02", "daily");
        r.target_time = Some("09:00:00".parse().unwrap());
        let c = computed(r, now("2026-11-02T10:00:00Z"), "UTC").unwrap();
        assert_eq!(c.next_date.unwrap().to_string(), "2026-11-03");
        assert_eq!(c.repetitions, 0);
    }
    #[test]
    fn missing_contact_birthdate_suspends_without_exposing_placeholder_dates() {
        let mut r = row("1900-01-01", "yearly");
        r.contact_birthday = true;
        let contact = contacts::Contact {
            id: Uuid::new_v4(),
            data: contacts::ContactData {
                first_name: "Anna".into(),
                birthday_enabled: true,
                ..Default::default()
            },
            revision: 0,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        apply_contact(&mut r, &contact);
        let c = computed(r.clone(), now("2026-11-02T12:00:00Z"), "UTC").unwrap();
        assert!(c.suspended);
        assert!(c.next_at.is_none());
        assert!(c.target_date.is_none());
        assert!(c.full_years.is_none());
        let mut contact = contact;
        contact.data.birth_date = Some("2000-02-29".parse().unwrap());
        apply_contact(&mut r, &contact);
        let c = computed(r, now("2027-02-28T12:00:00Z"), "UTC").unwrap();
        assert!(!c.suspended);
        assert_eq!(c.full_years, Some(27));
        assert_eq!(c.next_date.unwrap().to_string(), "2027-02-28");
    }
    #[test]
    fn yearless_contact_birthday_recurs_without_age_or_elapsed_time() {
        let mut r = row("1900-01-01", "yearly");
        r.contact_birthday = true;
        let contact = contacts::Contact {
            id: Uuid::new_v4(),
            data: contacts::ContactData {
                first_name: "Anna".into(),
                birth_month_day: Some("02-29".into()),
                birthday_enabled: true,
                ..Default::default()
            },
            revision: 1,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };
        apply_contact(&mut r, &contact);
        let c = computed(r, now("2027-02-28T12:00:00Z"), "UTC").unwrap();
        assert!(!c.suspended);
        assert!(c.birth_year_unknown);
        assert_eq!(c.next_date.unwrap().to_string(), "2027-02-28");
        assert!(c.full_years.is_none());
        assert!(c.original_at.is_none());
        assert!(c.seconds_elapsed.is_none());
        assert_eq!(c.repetitions, 0);
    }
    #[test]
    fn yearless_birthday_snapshots_keep_precision_and_read_legacy_snapshots() {
        let old = serde_json::json!({"title":"Birthday", "target_date":"1980-02-29", "details":{}});
        let legacy: model::Snapshot = serde_json::from_value(old).unwrap();
        assert!(!legacy.birth_year_unknown);
        let snapshot = model::Snapshot {
            title: "Birthday".into(),
            target_date: Some("2000-02-29".parse().unwrap()),
            details: Details::default(),
            birth_year_unknown: true,
        };
        let restored: model::Snapshot =
            serde_json::from_value(serde_json::to_value(&snapshot).unwrap()).unwrap();
        assert!(restored.birth_year_unknown);
        assert_eq!(restored.target_date, snapshot.target_date);
    }
}

/// Provider imports use the existing event validation, persistence and calendar projection.
pub(crate) fn external_id(user: Uuid, key: &str) -> Uuid {
    use sha2::{Digest, Sha256};
    let digest = Sha256::digest(format!("external-event:{user}:{key}").as_bytes());
    let mut bytes = [0u8; 16];
    bytes.copy_from_slice(&digest[..16]);
    bytes[6] = (bytes[6] & 0x0f) | 0x80;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    Uuid::from_bytes(bytes)
}
pub(crate) async fn import_external_event(
    state: &AppState,
    user: Uuid,
    key: &str,
    title: &str,
    at: chrono::DateTime<Utc>,
    source: &str,
    all_day: bool,
) -> Result<Uuid, ApiError> {
    let id = external_id(user, key);
    let mut lock = state.database.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("external-event:{user}:{key}"))
        .execute(&mut *lock)
        .await?;
    let exists: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.countdowns WHERE user_id=$1 AND id=$2)",
    )
    .bind(user)
    .bind(id)
    .fetch_one(&mut *lock)
    .await?;
    if !exists {
        let input:dto::CountdownInput=serde_json::from_value(serde_json::json!({"title":title,"category":"other","icon":"tabler:discount","target_date":at.date_naive(),"target_time":if all_day {None}else{Some(at.time())},"timezone":if all_day {crate::shared::domain::settings(state,user).await?.timezone}else{"UTC".into()},"recurrence":"once","description":source})).map_err(|_|ApiError::internal())?;
        repository::save(state, user, id, input, repository::WriteMode::Create).await?;
    }
    lock.commit().await?;
    Ok(id)
}

/// External consumers ask the event owner instead of depending on its storage schema.
pub(crate) async fn external_event_exists(
    state: &AppState,
    user: Uuid,
    key: &str,
) -> Result<bool, ApiError> {
    Ok(
        sqlx::query_scalar(
            "SELECT EXISTS(SELECT 1 FROM app.countdowns WHERE user_id=$1 AND id=$2)",
        )
        .bind(user)
        .bind(external_id(user, key))
        .fetch_one(&state.database)
        .await?,
    )
}
