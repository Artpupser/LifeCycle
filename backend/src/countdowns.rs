use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    schedule::resolve_local_start,
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, Datelike, Duration, NaiveDate, NaiveTime, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Deserializer, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
struct Details {
    full_name: String,
    phone: String,
    occupation: String,
    relationship: String,
    notes: String,
}
#[derive(Clone, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
struct Display {
    clock: String,
    show_years: bool,
    show_repetitions: bool,
}
impl Default for Display {
    fn default() -> Self {
        Self {
            clock: "both".into(),
            show_years: true,
            show_repetitions: true,
        }
    }
}
fn nullable<'de, D: Deserializer<'de>>(d: D) -> Result<Option<Option<NaiveTime>>, D::Error> {
    Ok(Some(Option::<NaiveTime>::deserialize(d)?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CountdownInput {
    title: String,
    category: String,
    icon: String,
    target_date: NaiveDate,
    repeat_yearly: Option<bool>,
    recurrence: Option<String>,
    #[serde(default, deserialize_with = "nullable")]
    target_time: Option<Option<NaiveTime>>,
    timezone: Option<String>,
    description: Option<String>,
    details: Option<Details>,
    display: Option<Display>,
    expected_updated_at: Option<DateTime<Utc>>,
}
#[derive(Clone, sqlx::FromRow)]
struct Row {
    id: Uuid,
    title: String,
    category: String,
    icon: String,
    target_date: NaiveDate,
    recurrence: String,
    target_time: Option<NaiveTime>,
    timezone: Option<String>,
    description: String,
    details: DbJson<Details>,
    display: DbJson<Display>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Serialize)]
pub(crate) struct Countdown {
    id: Uuid,
    title: String,
    category: String,
    icon: String,
    target_date: NaiveDate,
    repeat_yearly: bool,
    recurrence: String,
    target_time: Option<NaiveTime>,
    timezone: String,
    description: String,
    details: Details,
    display: Display,
    next_date: NaiveDate,
    days_remaining: i64,
    next_at: DateTime<Utc>,
    original_at: DateTime<Utc>,
    seconds_remaining: i64,
    seconds_elapsed: i64,
    full_years: Option<i32>,
    repetitions: i64,
    computed_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Serialize)]
pub(crate) struct EventOccurrence {
    pub date: NaiveDate,
    pub event_at: DateTime<Utc>,
    pub countdown: Countdown,
}

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/countdowns", get(list).post(create))
        .route("/api/countdowns/{id}", get(read).put(update).delete(delete))
}
async fn rows(s: &AppState, user: Uuid) -> Result<Vec<Row>, ApiError> {
    Ok(
        sqlx::query_as("SELECT * FROM app.countdowns WHERE user_id=$1 ORDER BY target_date,id")
            .bind(user)
            .fetch_all(&s.database)
            .await?,
    )
}
async fn list(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Countdown>>, ApiError> {
    let zone = domain::settings(&s, u.id).await?.timezone;
    let now = Utc::now();
    Ok(Json(
        rows(&s, u.id)
            .await?
            .into_iter()
            .map(|r| computed(r, now, &zone))
            .collect::<Result<_, _>>()?,
    ))
}
async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Countdown>, ApiError> {
    let row = sqlx::query_as("SELECT * FROM app.countdowns WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(u.id)
        .fetch_optional(&s.database)
        .await?
        .ok_or_else(domain::not_found)?;
    Ok(Json(computed(
        row,
        Utc::now(),
        &domain::settings(&s, u.id).await?.timezone,
    )?))
}
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<CountdownInput>,
) -> Result<(StatusCode, Json<Countdown>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<CountdownInput>,
) -> Result<Json<Countdown>, ApiError> {
    Ok(Json(save(&s, u.id, id, v, false).await?))
}
async fn save(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    v: CountdownInput,
    create: bool,
) -> Result<Countdown, ApiError> {
    domain::text(&v.title, 1, 200)?;
    domain::text(&v.category, 1, 64)?;
    domain::text(&v.icon, 0, 48)?;
    if !(1900..=9998).contains(&v.target_date.year()) {
        return Err(ApiError::validation(
            "Countdown date must be between years 1900 and 9998",
        ));
    }
    if let Some(ref text) = v.description {
        domain::text(text, 0, 200_000)?;
    }
    if let Some(ref details) = v.details {
        for text in [
            &details.full_name,
            &details.phone,
            &details.occupation,
            &details.relationship,
        ] {
            domain::text(text, 0, 200)?;
        }
        domain::text(&details.notes, 0, 8000)?;
    }
    if v.display
        .as_ref()
        .is_some_and(|d| !["both", "remaining", "elapsed"].contains(&d.clock.as_str()))
    {
        return Err(ApiError::validation("Unsupported countdown display"));
    }
    let recurrence = v.recurrence.or(v
        .repeat_yearly
        .map(|b| if b { "yearly".into() } else { "once".into() }));
    if recurrence
        .as_ref()
        .is_some_and(|r| !["once", "daily", "monthly", "yearly"].contains(&r.as_str()))
    {
        return Err(ApiError::validation("Unsupported event recurrence"));
    }
    if v.timezone
        .as_ref()
        .is_some_and(|z| z.parse::<Tz>().is_err())
    {
        return Err(ApiError::validation("Invalid timezone"));
    }
    let profile_zone = domain::settings(s, user).await?.timezone;
    let mut tx = s.database.begin().await?;
    if create {
        sqlx::query("INSERT INTO app.countdowns(id,user_id,title,category,icon,target_date) VALUES($1,$2,$3,$4,$5,$6)")
            .bind(id).bind(user).bind(&v.title).bind(&v.category).bind(&v.icon).bind(v.target_date).execute(&mut *tx).await?;
    }
    let old: Row =
        sqlx::query_as("SELECT * FROM app.countdowns WHERE id=$1 AND user_id=$2 FOR UPDATE")
            .bind(id)
            .bind(user)
            .fetch_optional(&mut *tx)
            .await?
            .ok_or_else(domain::not_found)?;
    if !create && v.expected_updated_at.is_some_and(|at| at != old.updated_at) {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "event_stale",
            "Event changed; reload before saving",
        ));
    }
    let recurrence = recurrence.unwrap_or(old.recurrence);
    let zone = v.timezone.or(old.timezone);
    let row=sqlx::query_as("UPDATE app.countdowns SET title=$3,category=$4,icon=$5,target_date=$6,repeat_yearly=$7,recurrence=$8,target_time=$9,timezone=$10,description=$11,details=$12,display=$13,updated_at=clock_timestamp() WHERE id=$1 AND user_id=$2 RETURNING *")
        .bind(id).bind(user).bind(v.title.trim()).bind(v.category.trim()).bind(v.icon).bind(v.target_date).bind(recurrence=="yearly").bind(recurrence)
        .bind(v.target_time.unwrap_or(old.target_time)).bind(zone).bind(v.description.unwrap_or(old.description))
        .bind(DbJson(v.details.unwrap_or(old.details.0))).bind(DbJson(v.display.unwrap_or(old.display.0))).fetch_one(&mut *tx).await?;
    let result = computed(row, Utc::now(), &profile_zone)?;
    domain::event(
        &mut tx,
        user,
        if create {
            "countdown_created"
        } else {
            "countdown_updated"
        },
        "countdown",
        id,
        serde_json::json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(result)
}
async fn delete(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    if sqlx::query("DELETE FROM app.countdowns WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(u.id)
        .execute(&mut *tx)
        .await?
        .rows_affected()
        == 0
    {
        return Err(domain::not_found());
    }
    domain::event(
        &mut tx,
        u.id,
        "countdown_deleted",
        "countdown",
        id,
        serde_json::json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
// Calendar recurrence is anchored to the original day, never to a previously clamped occurrence.
fn clamped(year: i32, month: u32, day: u32) -> NaiveDate {
    (1..=day)
        .rev()
        .find_map(|d| NaiveDate::from_ymd_opt(year, month, d))
        .unwrap()
}
fn at_index(target: NaiveDate, rule: &str, index: i64) -> Result<NaiveDate, ApiError> {
    let date = match rule {
        "daily" => target.checked_add_signed(Duration::days(index)),
        "monthly" => {
            let months = i64::from(target.year()) * 12 + i64::from(target.month0()) + index;
            i32::try_from(months.div_euclid(12))
                .ok()
                .filter(|y| (1900..=9999).contains(y))
                .map(|y| clamped(y, months.rem_euclid(12) as u32 + 1, target.day()))
        }
        "yearly" => i32::try_from(i64::from(target.year()) + index)
            .ok()
            .filter(|y| (1900..=9999).contains(y))
            .map(|y| clamped(y, target.month(), target.day())),
        _ => Some(target),
    };
    date.ok_or_else(|| ApiError::validation("Event date is outside the supported calendar"))
}
fn index_near(target: NaiveDate, rule: &str, date: NaiveDate) -> i64 {
    match rule {
        "daily" => (date - target).num_days(),
        "monthly" => {
            i64::from(date.year() - target.year()) * 12 + i64::from(date.month())
                - i64::from(target.month())
        }
        "yearly" => i64::from(date.year() - target.year()),
        _ => 0,
    }
    .max(0)
}
fn instant(row: &Row, date: NaiveDate, zone: &str) -> Result<DateTime<Utc>, ApiError> {
    resolve_local_start(date, row.target_time.unwrap_or_default(), zone)
}
fn computed(row: Row, now: DateTime<Utc>, fallback: &str) -> Result<Countdown, ApiError> {
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
            clamped(today.year(), row.target_date.month(), row.target_date.day()),
            zone,
        )? > now
        {
            years -= 1;
        }
        Some(years.max(0))
    };
    Ok(Countdown {
        id: row.id,
        title: row.title.clone(),
        category: row.category.clone(),
        icon: row.icon.clone(),
        target_date: row.target_date,
        repeat_yearly: row.recurrence == "yearly",
        recurrence: row.recurrence.clone(),
        target_time: row.target_time,
        timezone: zone.into(),
        description: row.description.clone(),
        details: row.details.0.clone(),
        display: row.display.0.clone(),
        next_date,
        days_remaining: (next_date - today).num_days(),
        next_at,
        original_at,
        seconds_remaining: (next_at - now).num_seconds().max(0),
        seconds_elapsed: (now - original_at).num_seconds().max(0),
        full_years,
        repetitions,
        computed_at: now,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}
pub(crate) async fn occurrences(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    profile_zone: &str,
) -> Result<Vec<EventOccurrence>, ApiError> {
    if !(0..366).contains(&(to - from).num_days())
        || !(1900..=9998).contains(&from.year())
        || !(1900..=9998).contains(&to.year())
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
    for row in rows(s, user).await? {
        let zone = row.timezone.as_deref().unwrap_or(profile_zone);
        // At most one event per original local date; no materialized task copies.
        for offset in -2..=(to - from).num_days() + 2 {
            let date = from + Duration::days(offset);
            if date < row.target_date {
                continue;
            }
            let i = index_near(row.target_date, &row.recurrence, date);
            if at_index(row.target_date, &row.recurrence, i)? != date {
                continue;
            }
            let event_at = instant(&row, date, zone)?;
            // All-day dates remain calendar dates; timed events project into the profile zone.
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
    events.sort_by_key(|e| (e.date, e.event_at, e.countdown.id));
    // A skipped civil date can resolve to the same instant as its successor.
    let mut seen = std::collections::HashSet::new();
    events.retain(|e| seen.insert((e.event_at, e.countdown.id)));
    Ok(events)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn row(date: &str, rule: &str) -> Row {
        Row {
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
        }
    }
    fn now(value: &str) -> DateTime<Utc> {
        value.parse().unwrap()
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
        assert_eq!(c.next_date.to_string(), "2027-02-28");
        assert!(c.seconds_elapsed > 0);
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
        assert_eq!(c.next_at, now("2026-03-29T01:00:00Z"));
        let mut r = row("2026-11-02", "daily");
        r.target_time = Some("09:00:00".parse().unwrap());
        let c = computed(r, now("2026-11-02T10:00:00Z"), "UTC").unwrap();
        assert_eq!(c.next_date.to_string(), "2026-11-03");
        assert_eq!(c.repetitions, 0);
    }
}
