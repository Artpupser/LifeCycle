use super::models::{Entry, EntryData, Journal, Range, Revision, Row, Statistics, Update};
use super::service::{context, decode, stale};
use crate::{
    infrastructure::state::AppState,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, Query, State, rejection::QueryRejection},
    http::StatusCode,
};
use chrono::Utc;
use chrono_tz::Tz;
use uuid::Uuid;

pub(super) async fn list(
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

pub(super) async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Entry>, ApiError> {
    let row = sqlx::query_as("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 AND id=$2")
        .bind(u.id).bind(id).fetch_optional(&s.database).await?.ok_or_else(domain::not_found)?;
    Ok(Json(decode(&s, u.id, row)?))
}

pub(super) async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(mut data): ApiJson<EntryData>,
) -> Result<(StatusCode, Json<Entry>), ApiError> {
    data.retire_legacy_fields();
    let start = data.validate(Utc::now())?;
    validate_collection_choices(&data, None)?;
    let mut tx = s.database.begin().await?;
    crate::modules::tasks::lock_tasks(&mut tx, u.id).await?;
    crate::modules::contacts::lock(&mut tx, u.id).await?;
    super::service::register_collection_labels(&s, &mut tx, u.id, &data, true).await?;
    let id = Uuid::new_v4();
    let bytes = serde_json::to_vec(&data).map_err(|_| ApiError::internal())?;
    let encrypted = s.cipher.encrypt(&bytes, context(u.id, id).as_bytes())?;
    let row = sqlx::query_as("INSERT INTO app.intimacy_entries (id,user_id,started_at,encrypted_data) VALUES($1,$2,$3,$4) RETURNING id,started_at,encrypted_data,revision,created_at,updated_at")
        .bind(id).bind(u.id).bind(start).bind(encrypted).fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(decode(&s, u.id, row)?)))
}

pub(super) async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(mut input): ApiJson<Update>,
) -> Result<Json<Entry>, ApiError> {
    let mut tx = s.database.begin().await?;
    crate::modules::tasks::lock_tasks(&mut tx, u.id).await?;
    crate::modules::contacts::lock(&mut tx, u.id).await?;
    let current: Row = sqlx::query_as("SELECT id,started_at,encrypted_data,revision,created_at,updated_at FROM app.intimacy_entries WHERE user_id=$1 AND id=$2 FOR UPDATE")
        .bind(u.id).bind(id).fetch_optional(&mut *tx).await?.ok_or_else(domain::not_found)?;
    if current.revision != input.revision {
        return Err(stale());
    }
    input.data.retire_legacy_fields();
    let start = input.data.validate(Utc::now())?;
    let previous = decode(&s, u.id, current)?;
    validate_collection_choices(&input.data, Some(&previous.data))?;
    super::service::register_collection_labels(&s, &mut tx, u.id, &input.data, true).await?;
    let bytes = serde_json::to_vec(&input.data).map_err(|_| ApiError::internal())?;
    let encrypted = s.cipher.encrypt(&bytes, context(u.id, id).as_bytes())?;
    let row = sqlx::query_as("UPDATE app.intimacy_entries SET started_at=$3,encrypted_data=$4,revision=revision+1,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING id,started_at,encrypted_data,revision,created_at,updated_at")
        .bind(u.id).bind(id).bind(start).bind(encrypted).fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(decode(&s, u.id, row)?))
}

fn validate_collection_choices(
    data: &EntryData,
    previous: Option<&EntryData>,
) -> Result<(), ApiError> {
    for (kind, values, old) in [
        (
            "emotion",
            &data.emotions_before,
            previous.map(|entry| &entry.emotions_before),
        ),
        (
            "emotion",
            &data.emotions_after,
            previous.map(|entry| &entry.emotions_after),
        ),
        (
            "lubricant",
            &data.lubricants,
            previous.map(|entry| &entry.lubricants),
        ),
        (
            "contraception",
            &data.contraception,
            previous.map(|entry| &entry.contraception),
        ),
    ] {
        validate_fixed_values(kind, values, old.map(Vec::as_slice).unwrap_or(&[]))?;
    }
    Ok(())
}
fn validate_fixed_values(
    kind: &str,
    values: &[String],
    previous: &[String],
) -> Result<(), ApiError> {
    if values.iter().any(|value| {
        !crate::modules::labels::fixed_collection_value(kind, value) && !previous.contains(value)
    }) {
        return Err(ApiError::validation(
            "Choose a value from the fixed collection",
        ));
    }
    Ok(())
}

#[cfg(test)]
#[test]
fn collection_emotions_allow_legacy_values_only_when_already_saved() {
    let legacy = vec!["Old personal value".into()];
    assert!(validate_fixed_values("emotion", &["Радость".into()], &[]).is_ok());
    assert!(validate_fixed_values("emotion", &legacy, &[]).is_err());
    for (kind, value) in [
        ("lubricant", "water_based"),
        ("contraception", "external_condom"),
    ] {
        assert!(validate_fixed_values(kind, &[value.into()], &[]).is_ok());
        assert!(validate_fixed_values(kind, &legacy, &[]).is_err());
        assert!(validate_fixed_values(kind, &legacy, &legacy).is_ok());
    }
    assert!(validate_fixed_values("emotion", &legacy, &legacy).is_ok());
    assert!(validate_fixed_values("emotion", &["Another personal value".into()], &legacy).is_err());
}

pub(super) async fn delete(
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
