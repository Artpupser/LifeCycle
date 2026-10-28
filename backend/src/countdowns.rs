use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    schedule::Schedule,
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, Datelike, NaiveDate, NaiveTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CountdownInput {
    title: String,
    category: String,
    icon: String,
    target_date: NaiveDate,
    repeat_yearly: bool,
}
#[derive(sqlx::FromRow)]
struct Row {
    id: Uuid,
    title: String,
    category: String,
    icon: String,
    target_date: NaiveDate,
    repeat_yearly: bool,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Serialize)]
struct Countdown {
    id: Uuid,
    title: String,
    category: String,
    icon: String,
    target_date: NaiveDate,
    repeat_yearly: bool,
    next_date: NaiveDate,
    days_remaining: i64,
    next_at: DateTime<Utc>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/countdowns", get(list).post(create))
        .route("/api/countdowns/{id}", get(read).put(update).delete(delete))
}
async fn list(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Countdown>>, ApiError> {
    let (today, zone) = domain::local_today(&s, u.id).await?;
    let rows = sqlx::query_as::<_, Row>(
        "SELECT * FROM app.countdowns WHERE user_id=$1 ORDER BY target_date,id",
    )
    .bind(u.id)
    .fetch_all(&s.database)
    .await?;
    Ok(Json(
        rows.into_iter()
            .map(|r| computed(r, today, &zone))
            .collect::<Result<_, _>>()?,
    ))
}
async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Countdown>, ApiError> {
    let row = sqlx::query_as::<_, Row>("SELECT * FROM app.countdowns WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(u.id)
        .fetch_optional(&s.database)
        .await?
        .ok_or_else(domain::not_found)?;
    let (today, zone) = domain::local_today(&s, u.id).await?;
    Ok(Json(computed(row, today, &zone)?))
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
    let (today, zone) = domain::local_today(s, user).await?;
    let mut tx = s.database.begin().await?;
    let query = if create {
        "INSERT INTO app.countdowns(id,user_id,title,category,icon,target_date,repeat_yearly) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *"
    } else {
        "UPDATE app.countdowns SET title=$3,category=$4,icon=$5,target_date=$6,repeat_yearly=$7,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING *"
    };
    let row = sqlx::query_as::<_, Row>(query)
        .bind(id)
        .bind(user)
        .bind(v.title)
        .bind(v.category)
        .bind(v.icon)
        .bind(v.target_date)
        .bind(v.repeat_yearly)
        .fetch_optional(&mut *tx)
        .await?
        .ok_or_else(domain::not_found)?;
    let result = computed(row, today, &zone)?;
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
    let rows = sqlx::query("DELETE FROM app.countdowns WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(u.id)
        .execute(&mut *tx)
        .await?
        .rows_affected();
    if rows == 0 {
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
fn computed(row: Row, today: NaiveDate, zone: &str) -> Result<Countdown, ApiError> {
    let next_date = next_date(row.target_date, row.repeat_yearly, today)?;
    let schedule = Schedule {
        start_date: next_date,
        time: Some(NaiveTime::from_hms_opt(0, 0, 0).unwrap()),
        timezone: zone.to_owned(),
        duration_minutes: 1,
        recurrence: "once".into(),
        interval_days: 1,
        weekdays: vec![],
        end_date: None,
    };
    let next_at = schedule
        .occurrence_start(next_date)?
        .ok_or_else(ApiError::internal)?;
    Ok(Countdown {
        id: row.id,
        title: row.title,
        category: row.category,
        icon: row.icon,
        target_date: row.target_date,
        repeat_yearly: row.repeat_yearly,
        next_date,
        days_remaining: (next_date - today).num_days(),
        next_at,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}
fn next_date(target: NaiveDate, repeat: bool, today: NaiveDate) -> Result<NaiveDate, ApiError> {
    if !repeat {
        return Ok(target);
    }
    let in_year = |year| {
        NaiveDate::from_ymd_opt(year, target.month(), target.day())
            .or_else(|| NaiveDate::from_ymd_opt(year, 2, 28))
            .ok_or_else(ApiError::internal)
    };
    let mut next = in_year(today.year())?;
    if next < today {
        next = in_year(today.year() + 1)?;
    }
    Ok(next)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn leap_day_annual_event_uses_february_28_in_non_leap_years() {
        let target = NaiveDate::from_ymd_opt(2024, 2, 29).unwrap();
        let today = NaiveDate::from_ymd_opt(2027, 1, 1).unwrap();
        assert_eq!(
            next_date(target, true, today).unwrap(),
            NaiveDate::from_ymd_opt(2027, 2, 28).unwrap()
        );
        assert_eq!(next_date(target, false, today).unwrap(), target);
    }
}
