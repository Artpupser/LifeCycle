use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State, rejection::QueryRejection},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, LocalResult, NaiveDate, NaiveDateTime, TimeZone, Timelike, Utc};
use chrono_tz::Tz;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

#[derive(Clone, Copy, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum Kind {
    Sex,
    Masturbation,
}
#[derive(Clone, Copy, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
enum TimeOccurrence {
    #[default]
    Earlier,
    Later,
}
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(default, deny_unknown_fields)]
struct PartnerDetails {
    protection_used: Option<bool>,
    gender: String,
    name: String,
    positions: Vec<String>,
    sex_types: Vec<String>,
}
#[derive(Clone, Debug, Default, Deserialize, Serialize, PartialEq, Eq)]
#[serde(default, deny_unknown_fields)]
struct SoloDetails {
    porn_sources: Vec<String>,
    feelings_after: String,
}
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
struct EntryData {
    kind: Kind,
    local_start: NaiveDateTime,
    timezone: String,
    #[serde(default)]
    time_occurrence: TimeOccurrence,
    duration_minutes: Option<u32>,
    ejaculation_count: Option<u32>,
    #[serde(default)]
    toys: Vec<String>,
    lubricant_used: Option<bool>,
    #[serde(default)]
    setting: String,
    was_clothed: Option<bool>,
    #[serde(default)]
    emotions: Vec<String>,
    repeat_desired: Option<bool>,
    #[serde(default)]
    note: String,
    partner: Option<PartnerDetails>,
    solo: Option<SoloDetails>,
}
impl EntryData {
    fn start(&self) -> Result<DateTime<Utc>, ApiError> {
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
    fn validate(&self, now: DateTime<Utc>) -> Result<DateTime<Utc>, ApiError> {
        let start = self.start()?;
        if self.local_start.date() < NaiveDate::from_ymd_opt(1900, 1, 1).unwrap() || start > now {
            return Err(ApiError::validation(
                "Only past or current events since 1900 are supported",
            ));
        }
        if self
            .duration_minutes
            .is_some_and(|v| !(1..=1440).contains(&v))
            || self.ejaculation_count.is_some_and(|v| v > 100)
        {
            return Err(ApiError::validation(
                "Event measurement is outside the supported range",
            ));
        }
        domain::text(&self.setting, 0, 1000)?;
        domain::text(&self.note, 0, 200_000)?;
        validate_list(&self.toys)?;
        validate_list(&self.emotions)?;
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
                        .any(|v| !["anal", "oral", "vaginal", "other"].contains(&v.as_str()))
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
                    domain::text(&solo.feelings_after, 0, 5000)?;
                }
            }
        }
        Ok(start)
    }
}
fn validate_list(values: &[String]) -> Result<(), ApiError> {
    if values.len() > 30 {
        return Err(ApiError::validation("At most 30 list items are supported"));
    }
    let mut seen = BTreeSet::new();
    for value in values {
        domain::text(value, 1, 500)?;
        if value != value.trim() || !seen.insert(value.to_lowercase()) {
            return Err(ApiError::validation(
                "List items must be trimmed and distinct",
            ));
        }
    }
    Ok(())
}
#[derive(sqlx::FromRow)]
struct Row {
    id: Uuid,
    started_at: DateTime<Utc>,
    encrypted_data: Vec<u8>,
    revision: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Serialize)]
struct Entry {
    id: Uuid,
    started_at: DateTime<Utc>,
    data: EntryData,
    revision: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
fn context(user: Uuid, id: Uuid) -> String {
    format!("intimacy:v1:{user}:{id}")
}
fn decode(s: &AppState, user: Uuid, row: Row) -> Result<Entry, ApiError> {
    let bytes = s
        .cipher
        .decrypt(&row.encrypted_data, context(user, row.id).as_bytes())?;
    let data: EntryData = serde_json::from_slice(&bytes).map_err(|_| ApiError::internal())?;
    if data.start()? != row.started_at {
        return Err(ApiError::internal());
    }
    Ok(Entry {
        id: row.id,
        started_at: row.started_at,
        data,
        revision: row.revision,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Update {
    revision: i64,
    data: EntryData,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Revision {
    revision: i64,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Range {
    from: NaiveDate,
    to: NaiveDate,
    kind: Option<Kind>,
    #[serde(default)]
    offset: usize,
}
impl Range {
    fn validate(&self) -> Result<(), ApiError> {
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
struct Answers {
    yes: u64,
    no: u64,
    unknown: u64,
}
impl Answers {
    fn add(&mut self, value: Option<bool>) {
        match value {
            Some(true) => self.yes += 1,
            Some(false) => self.no += 1,
            None => self.unknown += 1,
        }
    }
}
#[derive(Default, Serialize)]
struct Day {
    sex: u64,
    masturbation: u64,
}
#[derive(Default, Serialize)]
struct Statistics {
    total: u64,
    sex: u64,
    masturbation: u64,
    active_days: usize,
    duration_minutes: u64,
    duration_answers: u64,
    average_duration_minutes: Option<f64>,
    ejaculations: u64,
    ejaculation_answers: u64,
    with_toys: u64,
    repeat_desired: Answers,
    lubricant_used: Answers,
    protection_used: Answers,
    emotions: BTreeMap<String, u64>,
    days: BTreeMap<NaiveDate, Day>,
}
impl Statistics {
    fn add(&mut self, data: &EntryData, start: DateTime<Utc>, zone: Tz) {
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
        if let Some(count) = data.ejaculation_count {
            self.ejaculations += u64::from(count);
            self.ejaculation_answers += 1;
        }
        if !data.toys.is_empty() {
            self.with_toys += 1;
        }
        self.repeat_desired.add(data.repeat_desired);
        self.lubricant_used.add(data.lubricant_used);
        for emotion in &data.emotions {
            *self.emotions.entry(emotion.to_lowercase()).or_default() += 1;
        }
        self.active_days = self.days.len();
        self.average_duration_minutes = (self.duration_answers > 0)
            .then(|| self.duration_minutes as f64 / self.duration_answers as f64);
    }
}
#[derive(Serialize)]
struct Journal {
    from: NaiveDate,
    to: NaiveDate,
    timezone: String,
    offset: usize,
    limit: usize,
    total: u64,
    entries: Vec<Entry>,
    statistics: Statistics,
}
#[derive(Default, Serialize)]
pub(crate) struct AnalyticsSummary {
    total: u64,
    sex: u64,
    masturbation: u64,
    active_days: usize,
    duration_minutes: u64,
    duration_answers: u64,
    average_duration_minutes: Option<f64>,
}
pub(crate) async fn analytics_summary(
    s: &AppState,
    user: Uuid,
    from: NaiveDate,
    to: NaiveDate,
    timezone: &str,
) -> Result<AnalyticsSummary, ApiError> {
    let zone = timezone.parse::<Tz>().map_err(|_| ApiError::internal())?;
    let rows = sqlx::query_as::<_, Row>("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 AND (started_at AT TIME ZONE $2)::date BETWEEN $3 AND $4")
        .bind(user).bind(timezone).bind(from).bind(to).fetch_all(&s.database).await?;
    let mut stats = Statistics::default();
    for row in rows {
        let entry = decode(s, user, row)?;
        stats.add(&entry.data, entry.started_at, zone);
    }
    Ok(AnalyticsSummary {
        total: stats.total,
        sex: stats.sex,
        masturbation: stats.masturbation,
        active_days: stats.active_days,
        duration_minutes: stats.duration_minutes,
        duration_answers: stats.duration_answers,
        average_duration_minutes: stats.average_duration_minutes,
    })
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/sex", get(list).post(create))
        .route("/api/sex/{id}", get(read).put(update).delete(delete))
}
async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    query: Result<Query<Range>, QueryRejection>,
) -> Result<Json<Journal>, ApiError> {
    let Query(q) = query.map_err(|_| ApiError::validation("Invalid journal range or filter"))?;
    q.validate()?;
    let settings = domain::settings(&s, u.id).await?;
    let zone = settings
        .timezone
        .parse::<Tz>()
        .map_err(|_| ApiError::internal())?;
    let rows = sqlx::query_as::<_, Row>("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 AND (started_at AT TIME ZONE $2)::date BETWEEN $3 AND $4 ORDER BY started_at DESC,id DESC")
        .bind(u.id).bind(&settings.timezone).bind(q.from).bind(q.to).fetch_all(&s.database).await?;
    let mut statistics = Statistics::default();
    let mut entries = Vec::new();
    for row in rows {
        let entry = decode(&s, u.id, row)?;
        if q.kind.is_some_and(|kind| entry.data.kind != kind) {
            continue;
        }
        let index = statistics.total as usize;
        statistics.add(&entry.data, entry.started_at, zone);
        if (q.offset..q.offset + 50).contains(&index) {
            entries.push(entry);
        }
    }
    Ok(Json(Journal {
        from: q.from,
        to: q.to,
        timezone: settings.timezone,
        offset: q.offset,
        limit: 50,
        total: statistics.total,
        entries,
        statistics,
    }))
}
async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Entry>, ApiError> {
    let row = sqlx::query_as("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 AND id=$2")
        .bind(u.id).bind(id).fetch_optional(&s.database).await?.ok_or_else(domain::not_found)?;
    Ok(Json(decode(&s, u.id, row)?))
}
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(data): ApiJson<EntryData>,
) -> Result<(StatusCode, Json<Entry>), ApiError> {
    let start = data.validate(Utc::now())?;
    let id = Uuid::new_v4();
    let bytes = serde_json::to_vec(&data).map_err(|_| ApiError::internal())?;
    let encrypted = s.cipher.encrypt(&bytes, context(u.id, id).as_bytes())?;
    let row = sqlx::query_as("INSERT INTO app.intimacy_entries (id,user_id,started_at,encrypted_data) VALUES($1,$2,$3,$4) RETURNING id,started_at,encrypted_data,revision,created_at,updated_at")
        .bind(id).bind(u.id).bind(start).bind(encrypted).fetch_one(&s.database).await?;
    Ok((StatusCode::CREATED, Json(decode(&s, u.id, row)?)))
}
fn stale() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "stale_intimacy",
        "Entry has changed; reload before editing or deleting",
    )
}
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(input): ApiJson<Update>,
) -> Result<Json<Entry>, ApiError> {
    let mut tx = s.database.begin().await?;
    let current: Row = sqlx::query_as("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 AND id=$2 FOR UPDATE")
        .bind(u.id).bind(id).fetch_optional(&mut *tx).await?.ok_or_else(domain::not_found)?;
    if current.revision != input.revision {
        return Err(stale());
    }
    let start = input.data.validate(Utc::now())?;
    let bytes = serde_json::to_vec(&input.data).map_err(|_| ApiError::internal())?;
    let encrypted = s.cipher.encrypt(&bytes, context(u.id, id).as_bytes())?;
    let row = sqlx::query_as("UPDATE app.intimacy_entries SET started_at=$3,encrypted_data=$4,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING id,started_at,encrypted_data,revision,created_at,updated_at")
        .bind(u.id).bind(id).bind(start).bind(encrypted).fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(decode(&s, u.id, row)?))
}
async fn delete(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    query: Result<Query<Revision>, QueryRejection>,
) -> Result<StatusCode, ApiError> {
    let Query(q) = query.map_err(|_| ApiError::validation("A valid revision is required"))?;
    let mut tx = s.database.begin().await?;
    let revision: i64 = sqlx::query_scalar(
        "SELECT revision FROM app.intimacy_entries WHERE user_id=$1 AND id=$2 FOR UPDATE",
    )
    .bind(u.id)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    if revision != q.revision {
        return Err(stale());
    }
    sqlx::query("DELETE FROM app.intimacy_entries WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

#[cfg(test)]
mod tests {
    use super::*;
    fn entry() -> EntryData {
        serde_json::from_value(serde_json::json!({"kind":"sex", "local_start":"2026-10-25T02:30:00", "timezone":"Europe/Berlin"})).unwrap()
    }
    #[test]
    fn actual_times_reject_dst_gaps_and_preserve_both_repeated_instants() {
        let mut data = entry();
        let first = data.start().unwrap();
        data.time_occurrence = TimeOccurrence::Later;
        assert_eq!(data.start().unwrap() - first, chrono::Duration::hours(1));
        data.local_start = "2026-03-29T02:30:00".parse().unwrap();
        assert!(data.start().is_err());
        data.local_start = "2026-10-25T02:30:01".parse().unwrap();
        assert!(data.start().is_err());
    }
    #[test]
    fn optional_answers_accept_zero_false_but_reject_incompatible_details_and_future() {
        let mut data = entry();
        data.ejaculation_count = Some(0);
        data.repeat_desired = Some(false);
        let now = "2026-10-28T12:00:00Z".parse().unwrap();
        assert!(data.validate(now).is_ok());
        data.solo = Some(SoloDetails::default());
        assert!(data.validate(now).is_err());
        data.solo = None;
        data.duration_minutes = Some(0);
        assert!(data.validate(now).is_err());
        data.duration_minutes = None;
        data.local_start = "2026-10-29T12:00:00".parse().unwrap();
        assert!(data.validate(now).is_err());
    }
    #[test]
    fn statistics_count_events_not_days_and_exclude_unanswered_measurements() {
        let mut stats = Statistics::default();
        let mut data = entry();
        let start = "2026-10-24T23:30:00Z".parse().unwrap();
        data.duration_minutes = Some(20);
        data.ejaculation_count = Some(0);
        data.repeat_desired = Some(false);
        data.partner = Some(PartnerDetails {
            protection_used: Some(false),
            ..Default::default()
        });
        stats.add(&data, start, chrono_tz::Asia::Tokyo);
        data.duration_minutes = None;
        data.ejaculation_count = None;
        data.repeat_desired = None;
        data.kind = Kind::Masturbation;
        data.partner = None;
        stats.add(&data, start, chrono_tz::Asia::Tokyo);
        assert_eq!(
            (
                stats.total,
                stats.active_days,
                stats.sex,
                stats.masturbation
            ),
            (2, 1, 1, 1)
        );
        assert_eq!(stats.average_duration_minutes, Some(20.0));
        assert_eq!(
            (
                stats.duration_answers,
                stats.ejaculation_answers,
                stats.ejaculations
            ),
            (1, 1, 0)
        );
        assert_eq!(
            (stats.repeat_desired.no, stats.repeat_desired.unknown),
            (1, 1)
        );
        assert_eq!(
            (stats.protection_used.no, stats.protection_used.unknown),
            (1, 0)
        );
        assert!(stats.days.contains_key(&"2026-10-25".parse().unwrap()));
        assert_eq!(Statistics::default().average_duration_minutes, None);
    }
    #[test]
    fn ciphertext_is_bound_to_owner_and_individual_entry() {
        let cipher = crate::crypto::DataCipher::new(&[9; 32]);
        let user = Uuid::new_v4();
        let id = Uuid::new_v4();
        let plain = serde_json::to_vec(&entry()).unwrap();
        let encrypted = cipher
            .encrypt(&plain, context(user, id).as_bytes())
            .unwrap();
        assert!(
            cipher
                .decrypt(&encrypted, context(user, Uuid::new_v4()).as_bytes())
                .is_err()
        );
        assert!(
            cipher
                .decrypt(&encrypted, context(Uuid::new_v4(), id).as_bytes())
                .is_err()
        );
        assert_eq!(
            cipher
                .decrypt(&encrypted, context(user, id).as_bytes())
                .unwrap(),
            plain
        );
    }
}
