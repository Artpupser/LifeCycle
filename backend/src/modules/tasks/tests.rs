use super::planning::{
    schedule_in_profile_range, schedule_intersects, schedule_matches_profile_dates,
};
use crate::shared::schedule::Schedule;
use chrono::NaiveDate;

fn date(value: &str) -> NaiveDate {
    value.parse().unwrap()
}

fn schedule() -> Schedule {
    Schedule {
        start_date: date("2020-01-01"),
        time: None,
        timezone: "UTC".into(),
        duration_minutes: 30,
        recurrence: "daily".into(),
        interval_days: 1,
        weekdays: vec![],
        end_date: None,
    }
}

#[test]
fn open_date_filters_find_old_and_distant_recurrences() {
    assert!(schedule_intersects(
        &schedule(),
        None,
        Some(date("2026-10-27"))
    ));
    let infrequent = Schedule {
        recurrence: "interval".into(),
        interval_days: 3650,
        ..schedule()
    };
    assert!(schedule_intersects(
        &infrequent,
        Some(date("2026-10-27")),
        None
    ));
    assert!(!schedule_intersects(
        &infrequent,
        Some(date("2026-10-27")),
        Some(date("2026-10-28"))
    ));
}

#[test]
fn date_filters_respect_boundaries_of_once_and_weekly_rules() {
    let once = Schedule {
        recurrence: "once".into(),
        ..schedule()
    };
    assert!(!schedule_intersects(&once, Some(date("2020-01-02")), None));
    let weekly = Schedule {
        recurrence: "weekly".into(),
        weekdays: vec![1],
        end_date: Some(date("2020-01-06")),
        ..schedule()
    };
    assert!(schedule_intersects(
        &weekly,
        Some(date("2020-01-06")),
        Some(date("2020-01-06"))
    ));
    assert!(!schedule_intersects(
        &weekly,
        Some(date("2020-01-07")),
        None
    ));
}

#[test]
fn multiday_tasks_overlap_calendar_and_search_without_changing_the_occurrence_key() {
    let rule = Schedule {
        start_date: date("2026-10-30"),
        recurrence: "once".into(),
        duration_minutes: 3 * 1440,
        time: None,
        ..schedule()
    };
    assert!(rule.validate_task().is_ok());
    assert!(rule.validate().is_err());
    let day = date("2026-11-01");
    assert_eq!(
        schedule_in_profile_range(&rule, day, day, &chrono_tz::UTC).unwrap(),
        vec![(rule.start_date, None)]
    );
    assert!(schedule_matches_profile_dates(
        &rule,
        Some(day),
        Some(day),
        &chrono_tz::UTC
    ));
    assert!(
        schedule_in_profile_range(
            &rule,
            date("2026-11-02"),
            date("2026-11-02"),
            &chrono_tz::UTC
        )
        .unwrap()
        .is_empty()
    );
    let repeating = Schedule {
        recurrence: "daily".into(),
        ..rule.clone()
    };
    assert!(repeating.validate_task().is_err());
    let timed = Schedule {
        time: Some(chrono::NaiveTime::from_hms_opt(23, 30, 0).unwrap()),
        duration_minutes: 1500,
        ..rule
    };
    assert_eq!(
        schedule_in_profile_range(&timed, day, day, &chrono_tz::UTC).unwrap()[0].0,
        date("2026-10-30")
    );
}

#[test]
fn timed_calendar_and_date_search_use_the_profile_day() {
    let tokyo = Schedule {
        start_date: date("2026-10-28"),
        time: Some(chrono::NaiveTime::from_hms_opt(0, 30, 0).unwrap()),
        timezone: "Asia/Tokyo".into(),
        recurrence: "once".into(),
        ..schedule()
    };
    let utc = chrono_tz::UTC;
    let day = date("2026-10-27");
    let rows = schedule_in_profile_range(&tokyo, day, day, &utc).unwrap();
    assert_eq!(rows.len(), 1);
    assert_eq!(rows[0].0, date("2026-10-28"));
    assert_eq!(rows[0].1.unwrap().to_rfc3339(), "2026-10-27T15:30:00+00:00");
    assert!(schedule_matches_profile_dates(
        &tokyo,
        Some(day),
        Some(day),
        &utc
    ));
    assert!(!schedule_matches_profile_dates(
        &tokyo,
        Some(date("2026-10-28")),
        Some(date("2026-10-28")),
        &utc
    ));
    let untimed = Schedule {
        time: None,
        ..tokyo
    };
    assert!(
        schedule_in_profile_range(&untimed, day, day, &utc)
            .unwrap()
            .is_empty()
    );
    assert_eq!(
        schedule_in_profile_range(&untimed, date("2026-10-28"), date("2026-10-28"), &utc).unwrap()
            [0],
        (date("2026-10-28"), None)
    );
}
