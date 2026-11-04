use super::domain::{Contact, ContactData, WriteMode};
use crate::{infrastructure::state::AppState, shared::domain, shared::errors::ApiError};
use chrono::{DateTime, Utc};
use sqlx::PgConnection;
use uuid::Uuid;

#[derive(sqlx::FromRow)]
struct Row {
    id: Uuid,
    encrypted_data: Vec<u8>,
    revision: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
fn decode(state: &AppState, user: Uuid, row: Row) -> Result<Contact, ApiError> {
    let plain = state.cipher.decrypt(
        &row.encrypted_data,
        format!("contact:{user}:{}", row.id).as_bytes(),
    )?;
    Ok(Contact {
        id: row.id,
        data: serde_json::from_slice(&plain)
            .map_err(|error| ApiError::internal_with_context("Deserialize contact", &error))?,
        revision: row.revision,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}
pub(crate) async fn all(
    state: &AppState,
    user: Uuid,
    db: &mut PgConnection,
) -> Result<Vec<Contact>, ApiError> {
    let rows: Vec<Row> =
        sqlx::query_as(
        r"SELECT id, encrypted_data, revision, created_at, updated_at FROM app.contacts WHERE user_id=$1 ORDER
        BY created_at, id",
    )
            .bind(user)
            .fetch_all(db)
            .await?;
    rows.into_iter()
        .map(|row| decode(state, user, row))
        .collect()
}
pub(crate) async fn load(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    db: &mut PgConnection,
) -> Result<Contact, ApiError> {
    let row = sqlx::query_as("SELECT id,encrypted_data,revision,created_at,updated_at FROM app.contacts WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .fetch_optional(db)
        .await?
        .ok_or_else(domain::not_found)?;
    decode(state, user, row)
}
pub(crate) async fn lock(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("contacts:{user}"))
        .execute(db)
        .await?;
    Ok(())
}
pub(super) async fn persist(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    data: ContactData,
    mode: WriteMode,
    db: &mut PgConnection,
) -> Result<Contact, ApiError> {
    let encrypted = state.cipher.encrypt(
        &serde_json::to_vec(&data)
            .map_err(|error| ApiError::internal_with_context("Serialize contact", &error))?,
        format!("contact:{user}:{id}").as_bytes(),
    )?;
    let query = if mode == WriteMode::Create {
        sqlx::query_as(
            r"INSERT INTO app.contacts(id, user_id, encrypted_data) VALUES($1, $2, $3)
              RETURNING id, encrypted_data, revision, created_at, updated_at",
        )
    } else {
        sqlx::query_as(
            r"UPDATE app.contacts
              SET encrypted_data=$3, revision=revision+1, updated_at=clock_timestamp()
              WHERE id=$1 AND user_id=$2
              RETURNING id, encrypted_data, revision, created_at, updated_at",
        )
    };
    let row = query
        .bind(id)
        .bind(user)
        .bind(encrypted)
        .fetch_one(&mut *db)
        .await?;
    let contact = decode(state, user, row)?;
    sync_birthday(user, &contact, db).await?;
    Ok(contact)
}
async fn sync_birthday(
    user: Uuid,
    contact: &Contact,
    db: &mut PgConnection,
) -> Result<(), ApiError> {
    if contact.data.birthday_enabled {
        sqlx::query(
            r"INSERT INTO app.countdowns(id, user_id, title, category, icon, target_date,
                                        repeat_yearly, recurrence, contact_id, contact_birthday)
              VALUES($1, $2, 'День рождения', 'birthday', 'cake', '1900-01-01', true, 'yearly', $3, true)
              ON CONFLICT(user_id, contact_id) WHERE contact_birthday DO NOTHING",
        )
        .bind(Uuid::new_v4())
        .bind(user)
        .bind(contact.id)
        .execute(&mut *db)
        .await?;
    } else {
        sqlx::query(
            "DELETE FROM app.countdowns WHERE user_id=$1 AND contact_id=$2 AND contact_birthday",
        )
        .bind(user)
        .bind(contact.id)
        .execute(&mut *db)
        .await?;
    }
    sqlx::query(
        "UPDATE app.countdowns SET updated_at=clock_timestamp() WHERE user_id=$1 AND contact_id=$2",
    )
    .bind(user)
    .bind(contact.id)
    .execute(&mut *db)
    .await?;
    Ok(())
}
pub(crate) async fn disable_birthday(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    db: &mut PgConnection,
) -> Result<(), ApiError> {
    let mut contact = load(state, user, id, db).await?;
    contact.data.birthday_enabled = false;
    persist(state, user, id, contact.data, WriteMode::Update, db).await?;
    Ok(())
}
pub(crate) async fn enable_birthday(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    db: &mut PgConnection,
) -> Result<(), ApiError> {
    let mut contact = load(state, user, id, db).await?;
    if !contact.data.birthday_enabled {
        contact.data.birthday_enabled = true;
        persist(state, user, id, contact.data, WriteMode::Update, db).await?;
    }
    Ok(())
}

pub(super) async fn delete_events(
    db: &mut PgConnection,
    user: Uuid,
    contact: Uuid,
) -> Result<(), ApiError> {
    sqlx::query("DELETE FROM app.countdowns WHERE user_id=$1 AND contact_id=$2")
        .bind(user)
        .bind(contact)
        .execute(db)
        .await?;
    Ok(())
}

pub(super) async fn delete_contact(
    db: &mut PgConnection,
    user: Uuid,
    id: Uuid,
) -> Result<(), ApiError> {
    sqlx::query("DELETE FROM app.contacts WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .execute(db)
        .await?;
    Ok(())
}
