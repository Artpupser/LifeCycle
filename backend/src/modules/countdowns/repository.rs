use super::{
    domain::{ContactBinding, MIN_EVENT_YEAR, Recurrence, computed},
    dto::{CountdownInput, Unlink},
    model::{Countdown, Details, Row, Snapshot},
};
use crate::{
    infrastructure::state::AppState, modules::contacts, shared::domain, shared::errors::ApiError,
};
use axum::http::StatusCode;
use chrono::{NaiveDate, Utc};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Clone, Copy, PartialEq, Eq)]
pub(super) enum WriteMode {
    Create,
    Update,
}

fn encrypt_snapshot(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    snapshot: &Snapshot,
) -> Result<Vec<u8>, ApiError> {
    state.cipher.encrypt(
        &serde_json::to_vec(snapshot)
            .map_err(|error| ApiError::internal_with_context("Serialize event snapshot", &error))?,
        format!("contact-event:{user}:{id}").as_bytes(),
    )
}
pub(super) fn apply_contact(row: &mut Row, contact: &contacts::Contact) {
    let name = contact.data.name();
    row.contact_name = Some(name.clone());
    if row.contact_birthday {
        row.title = format!("День рождения: {name}");
        row.suspended = contact.data.birth_date.is_none();
        if let Some(date) = contact.data.birth_date {
            row.target_date = date;
        }
    }
    row.details = DbJson(Details {
        full_name: name,
        phone: contact.data.phones.join(" · "),
        occupation: [
            contact.data.profession.as_str(),
            contact.data.activity.as_str(),
        ]
        .into_iter()
        .filter(|part| !part.is_empty())
        .collect::<Vec<_>>()
        .join(" · "),
        relationship: contact.data.relationship.clone(),
        notes: contact.data.description.clone(),
    });
}
async fn hydrate(
    state: &AppState,
    user: Uuid,
    mut row: Row,
    db: &mut sqlx::PgConnection,
) -> Result<Row, ApiError> {
    if let Some(id) = row.contact_id {
        apply_contact(&mut row, &contacts::load(state, user, id, db).await?);
    }
    apply_snapshot(state, user, &mut row)?;
    Ok(row)
}

fn apply_snapshot(state: &AppState, user: Uuid, row: &mut Row) -> Result<(), ApiError> {
    if let Some(encrypted) = &row.contact_snapshot {
        let snapshot: Snapshot = serde_json::from_slice(&state.cipher.decrypt(
            encrypted,
            format!("contact-event:{user}:{}", row.id).as_bytes(),
        )?)
        .map_err(|error| ApiError::internal_with_context("Deserialize event snapshot", &error))?;
        row.title = snapshot.title;
        row.suspended = snapshot.target_date.is_none();
        if let Some(date) = snapshot.target_date {
            row.target_date = date;
        }
        row.details = DbJson(snapshot.details);
    }
    Ok(())
}
pub(super) async fn rows(state: &AppState, user: Uuid) -> Result<Vec<Row>, ApiError> {
    let mut tx = state.database.begin().await?;
    sqlx::query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY")
        .execute(&mut *tx)
        .await?;
    let mut rows: Vec<Row> =
        sqlx::query_as(
        r"SELECT id, title, category, tags, icon, target_date, recurrence, target_time, timezone, description,
        details, display, created_at, updated_at, contact_id, contact_birthday, contact_snapshot FROM
        app.countdowns WHERE user_id=$1 ORDER BY target_date, id",
    )
            .bind(user)
            .fetch_all(&mut *tx)
            .await?;
    let contacts: std::collections::HashMap<_, _> = contacts::all(state, user, &mut tx)
        .await?
        .into_iter()
        .map(|contact| (contact.id, contact))
        .collect();
    for row in &mut rows {
        if let Some(id) = row.contact_id {
            let contact = contacts.get(&id).ok_or_else(ApiError::internal)?;
            apply_contact(row, contact);
        } else if row.contact_snapshot.is_some() {
            apply_snapshot(state, user, row)?;
        }
    }
    tx.commit().await?;
    Ok(rows)
}
pub(super) async fn save(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    input: CountdownInput,
    mode: WriteMode,
) -> Result<Countdown, ApiError> {
    let recurrence = input.validate()?;
    let category = super::domain::category(&input.category)?;
    let submitted_tags = input.tags.clone();
    let profile_zone = domain::settings(state, user).await?.timezone;
    let mut tx = state.database.begin().await?;
    contacts::lock(&mut tx, user).await?;
    if let Some(id) = category.strip_prefix("custom:") {
        let id = Uuid::parse_str(id).map_err(|_| ApiError::validation("Invalid category"))?;
        let valid:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.labels WHERE user_id=$1 AND id=$2 AND kind='category')").bind(user).bind(id).fetch_one(&mut *tx).await?;
        if !valid {
            return Err(domain::not_found());
        }
    }

    if mode == WriteMode::Create {
        sqlx::query("INSERT INTO app.countdowns(id,user_id,title,category,icon,target_date) VALUES($1,$2,$3,$4,$5,$6)")
            .bind(id)
        .bind(user)
        .bind(&input.title)
        .bind(&category)
        .bind(&input.icon)
        .bind(input.target_date)
        .execute(&mut *tx).await?;
    }
    let old = load_for_update(&mut tx, user, id).await?;
    if mode == WriteMode::Update
        && input
            .expected_updated_at
            .is_some_and(|at| at != old.updated_at)
    {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "event_stale",
            "Event changed; reload before saving",
        ));
    }
    let contact_id = input.contact_id.unwrap_or(old.contact_id);
    if old.contact_id.is_some() && contact_id.is_none()
        || old.contact_birthday && contact_id != old.contact_id
    {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "event_contact_locked",
            "Use unlink to preserve contact event data",
        ));
    }
    let birthday = old.contact_birthday || input.contact_birthday.unwrap_or(false);
    let binding = ContactBinding::try_from((contact_id, birthday))?;
    let contact_id = binding.contact_id();
    if birthday && !old.contact_birthday {
        let exists: bool = sqlx::query_scalar(
            r"SELECT EXISTS(SELECT 1 FROM app.countdowns
              WHERE user_id=$1 AND contact_id=$2 AND contact_birthday AND id<>$3)",
        )
        .bind(user)
        .bind(contact_id)
        .bind(id)
        .fetch_one(&mut *tx)
        .await?;
        if exists {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "contact_birthday_exists",
                "This contact already has a birthday event",
            ));
        }
    }
    if let Some(contact) = contact_id {
        contacts::load(state, user, contact, &mut tx).await?;
    }
    let resolved = hydrate(state, user, old.clone(), &mut tx).await?;
    let private = contact_id.is_some() || old.contact_snapshot.is_some();
    let recurrence = if birthday {
        Recurrence::Yearly
    } else {
        match recurrence {
            Some(recurrence) => recurrence,
            None => old.recurrence.parse()?,
        }
    };
    let zone = input.timezone.or(old.timezone);
    let title = if birthday {
        "День рождения"
    } else {
        input.title.trim()
    };
    let details = input.details.unwrap_or(resolved.details.0);
    let snapshot = if old.contact_snapshot.is_some() && contact_id.is_none() {
        Some(encrypt_snapshot(
            state,
            user,
            id,
            &Snapshot {
                title: title.to_owned(),
                target_date: Some(input.target_date),
                details: details.clone(),
            },
        )?)
    } else {
        None
    };
    let target_date = if birthday || snapshot.is_some() {
        NaiveDate::from_ymd_opt(MIN_EVENT_YEAR, 1, 1).ok_or_else(ApiError::internal)?
    } else {
        input.target_date
    };
    let target_time = if birthday {
        None
    } else {
        input.target_time.unwrap_or(old.target_time)
    };
    let stored_details = if private { Details::default() } else { details };
    let mut row: Row = sqlx::query_as(
        r"UPDATE app.countdowns SET title=$3, category=$4, icon=$5, target_date=$6, repeat_yearly=$7,
        recurrence=$8, target_time=$9, timezone=$10, description=$11, details=$12, display=$13,
        contact_id=$14, contact_snapshot=$15, contact_birthday=$16, updated_at=clock_timestamp() WHERE id=$1
        AND user_id=$2 RETURNING id, title, category, tags, icon, target_date, recurrence, target_time, timezone,
        description, details, display, created_at, updated_at, contact_id, contact_birthday,
        contact_snapshot",
    )
    .bind(id)
    .bind(user)
    .bind(if snapshot.is_some() { "Событие" } else { title })
    .bind(if birthday {"birthday"} else {category.as_str()})
    .bind(input.icon)
    .bind(target_date)
    .bind(recurrence == Recurrence::Yearly)
    .bind(recurrence)
    .bind(target_time)
    .bind(zone)
    .bind(input.description.unwrap_or(old.description))
    .bind(DbJson(stored_details))
    .bind(DbJson(input.display.unwrap_or(old.display.0)))
    .bind(contact_id)
    .bind(snapshot)
    .bind(birthday)
    .fetch_one(&mut *tx)
    .await?;
    if let Some(tags) = submitted_tags {
        sqlx::query("UPDATE app.countdowns SET tags=$3 WHERE user_id=$1 AND id=$2")
            .bind(user)
            .bind(id)
            .bind(DbJson(&tags))
            .execute(&mut *tx)
            .await?;
        row.tags = DbJson(tags);
    }
    let row = if let ContactBinding::Birthday(contact) = binding
        && !old.contact_birthday
    {
        contacts::enable_birthday(state, user, contact, &mut tx).await?;
        sqlx::query_as(
            r"SELECT id, title, category, tags, icon, target_date, recurrence, target_time, timezone,
                     description, details, display, created_at, updated_at, contact_id,
                     contact_birthday, contact_snapshot
              FROM app.countdowns WHERE id=$1 AND user_id=$2",
        )
        .bind(id)
        .bind(user)
        .fetch_one(&mut *tx)
        .await?
    } else {
        row
    };
    let result = computed(
        hydrate(state, user, row, &mut tx).await?,
        Utc::now(),
        &profile_zone,
    )?;
    if !private {
        domain::event(
            &mut tx,
            user,
            if mode == WriteMode::Create {
                "countdown_created"
            } else {
                "countdown_updated"
            },
            "countdown",
            id,
            serde_json::json!({}),
        )
        .await?;
    }
    tx.commit().await?;
    Ok(result)
}
pub(super) async fn delete(state: &AppState, user: Uuid, id: Uuid) -> Result<StatusCode, ApiError> {
    let mut tx = state.database.begin().await?;
    contacts::lock(&mut tx, user).await?;
    let old = load_for_update(&mut tx, user, id).await?;
    sqlx::query("DELETE FROM app.countdowns WHERE id=$1 AND user_id=$2")
        .bind(id)
        .bind(user)
        .execute(&mut *tx)
        .await?;
    if let ContactBinding::Birthday(contact) =
        ContactBinding::try_from((old.contact_id, old.contact_birthday))?
    {
        contacts::disable_birthday(state, user, contact, &mut tx).await?;
    }
    if old.contact_id.is_none() && old.contact_snapshot.is_none() {
        domain::event(
            &mut tx,
            user,
            "countdown_deleted",
            "countdown",
            id,
            serde_json::json!({}),
        )
        .await?;
    }
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
async fn detach_one(
    state: &AppState,
    user: Uuid,
    row: Row,
    db: &mut sqlx::PgConnection,
) -> Result<(), ApiError> {
    let row = hydrate(state, user, row, db).await?;
    let snapshot = encrypt_snapshot(
        state,
        user,
        row.id,
        &Snapshot {
            title: row.title,
            target_date: (!row.suspended).then_some(row.target_date),
            details: row.details.0,
        },
    )?;
    sqlx::query(
        r"UPDATE app.countdowns SET contact_id=NULL, contact_birthday=false, contact_snapshot=$3, title=
        'Событие' , target_date= '1900-01-01' , details= '{}' , updated_at=clock_timestamp() WHERE
        user_id=$1 AND id=$2",
    )
        .bind(user)
        .bind(row.id)
        .bind(snapshot)
        .execute(db).await?;
    Ok(())
}
pub(crate) async fn detach_contact(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    db: &mut sqlx::PgConnection,
) -> Result<(), ApiError> {
    let rows: Vec<Row> = sqlx::query_as(
        r"SELECT id, title, category, tags, icon, target_date, recurrence, target_time, timezone, description,
        details, display, created_at, updated_at, contact_id, contact_birthday, contact_snapshot FROM
        app.countdowns WHERE user_id=$1 AND contact_id=$2 FOR UPDATE",
    )
    .bind(user)
    .bind(id)
    .fetch_all(&mut *db)
    .await?;
    for row in rows {
        detach_one(state, user, row, db).await?;
    }
    Ok(())
}
pub(super) async fn unlink(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    input: Unlink,
) -> Result<StatusCode, ApiError> {
    let mut tx = state.database.begin().await?;
    contacts::lock(&mut tx, user).await?;
    let row = load_for_update(&mut tx, user, id).await?;
    if row.updated_at != input.expected_updated_at {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "event_stale",
            "Event changed; reload before unlinking",
        ));
    }
    let contact = row
        .contact_id
        .ok_or_else(|| domain::conflict("Event is already independent"))?;
    let birthday = row.contact_birthday;
    detach_one(state, user, row, &mut tx).await?;
    if birthday {
        contacts::disable_birthday(state, user, contact, &mut tx).await?;
    }
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

async fn load_for_update(
    db: &mut sqlx::PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<Row, ApiError> {
    sqlx::query_as(
        r"SELECT id, title, category, tags, icon, target_date, recurrence, target_time, timezone, description,
        details, display, created_at, updated_at, contact_id, contact_birthday, contact_snapshot FROM
        app.countdowns WHERE id=$1 AND user_id=$2 FOR UPDATE",
    )
        .bind(id)
        .bind(user).fetch_optional(db).await?.ok_or_else(domain::not_found)
}
