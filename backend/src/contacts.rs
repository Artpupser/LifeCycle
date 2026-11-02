//! Owner-only encrypted address book. Deliberately has no AI/context/event-log hooks.
use crate::{
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
};
use chrono::{DateTime, Datelike, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use uuid::Uuid;

#[derive(Clone, Default, Deserialize, Serialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct ContactData {
    pub first_name: String,
    pub last_name: String,
    pub middle_name: String,
    pub phones: Vec<String>,
    pub birth_date: Option<NaiveDate>,
    pub description: String,
    pub relationship: String,
    pub profession: String,
    pub activity: String,
    pub categories: Vec<String>,
    pub tags: Vec<String>,
    pub source_keys: Vec<String>,
    pub birthday_enabled: bool,
}
impl ContactData {
    pub fn name(&self) -> String {
        [&self.last_name, &self.first_name, &self.middle_name]
            .into_iter()
            .filter(|s| !s.trim().is_empty())
            .cloned()
            .collect::<Vec<_>>()
            .join(" ")
    }
    fn clean(&mut self, today: NaiveDate) -> Result<(), ApiError> {
        for value in [
            &mut self.first_name,
            &mut self.last_name,
            &mut self.middle_name,
            &mut self.relationship,
            &mut self.profession,
            &mut self.activity,
        ] {
            domain::text(value, 0, 200)?;
            *value = value.trim().to_owned();
        }
        domain::text(&self.name(), 1, 602)?;
        domain::text(&self.description, 0, 8000)?;
        if self
            .birth_date
            .is_some_and(|d| d.year() < 1900 || d > today)
        {
            return Err(ApiError::validation(
                "Birth date must be between 1900 and today",
            ));
        }
        if self.phones.len() > 20 || self.source_keys.len() > 20 {
            return Err(ApiError::validation(
                "At most 20 phone numbers and import identifiers",
            ));
        }
        let mut seen = std::collections::HashSet::new();
        for phone in &mut self.phones {
            domain::text(phone, 1, 80)?;
            *phone = phone.trim().to_owned();
            let key = phone_key(phone);
            if !(3..=30).contains(&key.len()) || !seen.insert(key) {
                return Err(ApiError::validation("Invalid or repeated phone number"));
            }
        }
        for key in &self.source_keys {
            domain::text(key, 1, 512)?;
        }
        self.source_keys.sort();
        self.source_keys.dedup();
        for labels in [&mut self.categories, &mut self.tags] {
            domain::tags(labels)?;
            for label in labels.iter_mut() {
                *label = label.trim().to_owned();
            }
            let mut seen = std::collections::HashSet::new();
            labels.retain(|s| seen.insert(s.to_lowercase()));
        }
        Ok(())
    }
}
pub(crate) fn phone_key(value: &str) -> String {
    let digits: String = value.chars().filter(char::is_ascii_digit).collect();
    digits.strip_prefix("00").unwrap_or(&digits).to_owned()
}
fn normalized(value: &str) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase()
}
fn duplicate(a: &ContactData, b: &ContactData) -> bool {
    a.source_keys.iter().any(|key| b.source_keys.contains(key))
        || a.phones
            .iter()
            .any(|p| b.phones.iter().any(|q| phone_key(p) == phone_key(q)))
        || (normalized(&a.name()) == normalized(&b.name()) && a.birth_date == b.birth_date)
}
#[derive(Clone, Serialize)]
pub(crate) struct Contact {
    pub id: Uuid,
    pub data: ContactData,
    pub revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
#[derive(sqlx::FromRow)]
struct Row {
    id: Uuid,
    encrypted_data: Vec<u8>,
    revision: i64,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
fn decode(s: &AppState, user: Uuid, r: Row) -> Result<Contact, ApiError> {
    let plain = s.cipher.decrypt(
        &r.encrypted_data,
        format!("contact:{user}:{}", r.id).as_bytes(),
    )?;
    Ok(Contact {
        id: r.id,
        data: serde_json::from_slice(&plain).map_err(|_| ApiError::internal())?,
        revision: r.revision,
        created_at: r.created_at,
        updated_at: r.updated_at,
    })
}
pub(crate) async fn all(
    s: &AppState,
    user: Uuid,
    db: &mut PgConnection,
) -> Result<Vec<Contact>, ApiError> {
    let rows: Vec<Row> =
        sqlx::query_as("SELECT * FROM app.contacts WHERE user_id=$1 ORDER BY created_at,id")
            .bind(user)
            .fetch_all(db)
            .await?;
    rows.into_iter().map(|r| decode(s, user, r)).collect()
}
pub(crate) async fn load(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    db: &mut PgConnection,
) -> Result<Contact, ApiError> {
    let row = sqlx::query_as("SELECT * FROM app.contacts WHERE user_id=$1 AND id=$2")
        .bind(user)
        .bind(id)
        .fetch_optional(db)
        .await?
        .ok_or_else(domain::not_found)?;
    decode(s, user, row)
}
pub(crate) async fn lock(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("contacts:{user}"))
        .execute(db)
        .await?;
    Ok(())
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Input {
    data: ContactData,
    revision: Option<i64>,
    #[serde(default)]
    allow_duplicate: bool,
}
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/contacts", get(list).post(create))
        .route("/api/contacts/import", post(import))
        .route("/api/contacts/labels", post(labels))
        .route("/api/contacts/{id}", get(read).put(update).delete(delete))
}
async fn list(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Contact>>, ApiError> {
    Ok(Json(
        all(&s, u.id, &mut *s.database.acquire().await?).await?,
    ))
}
async fn read(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Contact>, ApiError> {
    Ok(Json(
        load(&s, u.id, id, &mut *s.database.acquire().await?).await?,
    ))
}
fn stale() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "contact_stale",
        "Contact changed; reload before saving",
    )
}
async fn persist(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    data: ContactData,
    create: bool,
    db: &mut PgConnection,
) -> Result<Contact, ApiError> {
    let encrypted = s.cipher.encrypt(
        &serde_json::to_vec(&data).map_err(|_| ApiError::internal())?,
        format!("contact:{user}:{id}").as_bytes(),
    )?;
    let row = if create {
        sqlx::query_as("INSERT INTO app.contacts(id,user_id,encrypted_data) VALUES($1,$2,$3) RETURNING *")
    } else {
        sqlx::query_as("UPDATE app.contacts SET encrypted_data=$3,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1 AND user_id=$2 RETURNING *")
    }.bind(id).bind(user).bind(encrypted).fetch_one(&mut *db).await?;
    let contact = decode(s, user, row)?;
    sync_birthday(user, &contact, db).await?;
    Ok(contact)
}
async fn sync_birthday(
    user: Uuid,
    contact: &Contact,
    db: &mut PgConnection,
) -> Result<(), ApiError> {
    if contact.data.birthday_enabled {
        // Only a reference and event options are stored; name/date are resolved from encrypted Contacts.
        sqlx::query("INSERT INTO app.countdowns(id,user_id,title,category,icon,target_date,repeat_yearly,recurrence,contact_id,contact_birthday) VALUES($1,$2,'День рождения','День рождения','cake','1900-01-01',true,'yearly',$3,true) ON CONFLICT(user_id,contact_id) WHERE contact_birthday DO NOTHING")
            .bind(Uuid::new_v4()).bind(user).bind(contact.id).execute(&mut *db).await?;
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
    s: &AppState,
    user: Uuid,
    id: Uuid,
    db: &mut PgConnection,
) -> Result<(), ApiError> {
    let mut contact = load(s, user, id, db).await?;
    contact.data.birthday_enabled = false;
    persist(s, user, id, contact.data, false, db).await?;
    Ok(())
}
pub(crate) async fn enable_birthday(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    db: &mut PgConnection,
) -> Result<(), ApiError> {
    let mut contact = load(s, user, id, db).await?;
    if !contact.data.birthday_enabled {
        contact.data.birthday_enabled = true;
        persist(s, user, id, contact.data, false, db).await?;
    }
    Ok(())
}
async fn save(
    s: &AppState,
    user: Uuid,
    id: Uuid,
    mut input: Input,
    create: bool,
) -> Result<Contact, ApiError> {
    input.data.clean(domain::local_today(s, user).await?.0)?;
    let mut tx = s.database.begin().await?;
    lock(&mut tx, user).await?;
    let contacts = all(s, user, &mut tx).await?;
    if !create {
        let old = contacts
            .iter()
            .find(|c| c.id == id)
            .ok_or_else(domain::not_found)?;
        if input.revision != Some(old.revision) {
            return Err(stale());
        }
    }
    if !input.allow_duplicate
        && contacts
            .iter()
            .any(|c| c.id != id && duplicate(&input.data, &c.data))
    {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "contact_duplicate",
            "A matching contact already exists",
        ));
    }
    let contact = persist(s, user, id, input.data, create, &mut tx).await?;
    tx.commit().await?;
    Ok(contact)
}
async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Input>,
) -> Result<(StatusCode, Json<Contact>), ApiError> {
    Ok((
        StatusCode::CREATED,
        Json(save(&s, u.id, Uuid::new_v4(), v, true).await?),
    ))
}
async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Contact>, ApiError> {
    Ok(Json(save(&s, u.id, id, v, false).await?))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Delete {
    revision: i64,
    events: String,
}
async fn delete(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Delete>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    lock(&mut tx, u.id).await?;
    if load(&s, u.id, id, &mut tx).await?.revision != v.revision {
        return Err(stale());
    }
    match v.events.as_str() {
        "keep" => crate::countdowns::detach_contact(&s, u.id, id, &mut tx).await?,
        "delete" => {
            sqlx::query("DELETE FROM app.countdowns WHERE user_id=$1 AND contact_id=$2")
                .bind(u.id)
                .bind(id)
                .execute(&mut *tx)
                .await?;
        }
        _ => {
            return Err(ApiError::validation(
                "Choose whether linked events are kept or deleted",
            ));
        }
    }
    sqlx::query("DELETE FROM app.contacts WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ImportItem {
    id: Option<Uuid>,
    data: ContactData,
    revision: Option<i64>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Import {
    items: Vec<ImportItem>,
}
#[derive(Serialize)]
struct Imported {
    created: usize,
    updated: usize,
    skipped: usize,
}
async fn import(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(mut v): ApiJson<Import>,
) -> Result<Json<Imported>, ApiError> {
    if v.items.is_empty() || v.items.len() > 100 {
        return Err(ApiError::validation(
            "Import 1 to 100 selected contacts at a time",
        ));
    }
    let today = domain::local_today(&s, u.id).await?.0;
    for item in &mut v.items {
        item.data.clean(today)?;
    }
    let mut tx = s.database.begin().await?;
    lock(&mut tx, u.id).await?;
    let mut contacts = all(&s, u.id, &mut tx).await?;
    let mut result = Imported {
        created: 0,
        updated: 0,
        skipped: 0,
    };
    let mut updated = std::collections::HashSet::new();
    for mut item in v.items {
        if let Some(id) = item.id {
            let old = contacts
                .iter()
                .find(|c| c.id == id)
                .ok_or_else(domain::not_found)?;
            if item.revision != Some(old.revision) || !updated.insert(id) {
                return Err(stale());
            }
            // Import never silently discards identifiers from an earlier source.
            for key in &old.data.source_keys {
                if !item.data.source_keys.contains(key) {
                    item.data.source_keys.push(key.clone());
                }
            }
            item.data.clean(today)?;
            if contacts
                .iter()
                .any(|c| c.id != id && duplicate(&item.data, &c.data))
            {
                result.skipped += 1;
                continue;
            }
            let contact = persist(&s, u.id, id, item.data, false, &mut tx).await?;
            contacts.retain(|c| c.id != id);
            contacts.push(contact);
            result.updated += 1;
        } else if contacts.iter().any(|c| duplicate(&item.data, &c.data)) {
            result.skipped += 1;
        } else {
            contacts.push(persist(&s, u.id, Uuid::new_v4(), item.data, true, &mut tx).await?);
            result.created += 1;
        }
    }
    tx.commit().await?;
    Ok(Json(result))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct LabelChange {
    kind: String,
    name: String,
    replacement: Option<String>,
}
async fn labels(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<LabelChange>,
) -> Result<StatusCode, ApiError> {
    if !["categories", "tags"].contains(&v.kind.as_str()) {
        return Err(ApiError::validation("Unknown contact label kind"));
    }
    domain::text(&v.name, 1, 64)?;
    if let Some(name) = &v.replacement {
        domain::text(name, 1, 64)?;
    }
    let mut tx = s.database.begin().await?;
    lock(&mut tx, u.id).await?;
    for mut c in all(&s, u.id, &mut tx).await? {
        let labels = if v.kind == "categories" {
            &mut c.data.categories
        } else {
            &mut c.data.tags
        };
        if !labels.iter().any(|n| n.eq_ignore_ascii_case(&v.name)) {
            continue;
        }
        labels.retain(|n| !n.eq_ignore_ascii_case(&v.name));
        if let Some(name) = &v.replacement
            && !labels.iter().any(|n| n.eq_ignore_ascii_case(name.trim()))
        {
            labels.push(name.trim().to_owned());
        }
        persist(&s, u.id, c.id, c.data, false, &mut tx).await?;
    }
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn duplicates_normalize_phones_and_use_stable_import_ids() {
        let mut a = ContactData {
            first_name: "Anna".into(),
            phones: vec!["+7 (900) 123-45-67".into()],
            ..Default::default()
        };
        let mut b = ContactData {
            first_name: "Other".into(),
            phones: vec!["0079001234567".into()],
            ..Default::default()
        };
        assert!(duplicate(&a, &b));
        b.phones.clear();
        assert!(!duplicate(&a, &b));
        a.source_keys.push("vcard:one".into());
        b.source_keys = a.source_keys.clone();
        assert!(duplicate(&a, &b));
    }
    #[test]
    fn names_dates_numbers_and_labels_are_validated() {
        let today = "2026-11-02".parse().unwrap();
        assert!(ContactData::default().clean(today).is_err());
        let mut c = ContactData {
            first_name: " Anna ".into(),
            tags: vec![" Team ".into(), "team".into()],
            ..Default::default()
        };
        assert!(c.clean(today).is_ok());
        assert_eq!(c.tags, vec!["Team"]);
        c.birth_date = Some("2027-01-01".parse().unwrap());
        assert!(c.clean(today).is_err());
    }
}
