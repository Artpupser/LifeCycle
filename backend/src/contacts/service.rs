use super::{
    domain::{Contact, DeleteEvents, LabelKind, WriteMode, duplicate},
    dto::{Delete, Import, Imported, Input, LabelChange},
    repository::{self, all, load, lock, persist},
};
use crate::{domain, error::ApiError, state::AppState};
use axum::http::StatusCode;
use uuid::Uuid;

const MAX_IMPORT_CONTACTS: usize = 100;

fn stale() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "contact_stale",
        "Contact changed; reload before saving",
    )
}
pub(super) async fn save(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    mut input: Input,
    mode: WriteMode,
) -> Result<Contact, ApiError> {
    input
        .data
        .clean(domain::local_today(state, user).await?.0)?;
    let mut tx = state.database.begin().await?;
    lock(&mut tx, user).await?;
    let contacts = all(state, user, &mut tx).await?;
    if mode == WriteMode::Update {
        let old = contacts
            .iter()
            .find(|contact| contact.id == id)
            .ok_or_else(domain::not_found)?;
        if input.revision != Some(old.revision) {
            return Err(stale());
        }
    }
    if !input.allow_duplicate
        && contacts
            .iter()
            .any(|contact| contact.id != id && duplicate(&input.data, &contact.data))
    {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "contact_duplicate",
            "A matching contact already exists",
        ));
    }
    let contact = persist(state, user, id, input.data, mode, &mut tx).await?;
    tx.commit().await?;
    Ok(contact)
}
pub(super) async fn delete(
    state: &AppState,
    user: Uuid,
    id: Uuid,
    input: Delete,
) -> Result<(), ApiError> {
    let mut tx = state.database.begin().await?;
    lock(&mut tx, user).await?;
    if load(state, user, id, &mut tx).await?.revision != input.revision {
        return Err(stale());
    }
    match input.events.parse::<DeleteEvents>()? {
        DeleteEvents::Keep => crate::countdowns::detach_contact(state, user, id, &mut tx).await?,
        DeleteEvents::Delete => {
            repository::delete_events(&mut tx, user, id).await?;
        }
    }
    repository::delete_contact(&mut tx, user, id).await?;
    tx.commit().await?;
    Ok(())
}
pub(super) async fn import(
    state: &AppState,
    user: Uuid,
    mut input: Import,
) -> Result<Imported, ApiError> {
    if input.items.is_empty() || input.items.len() > MAX_IMPORT_CONTACTS {
        return Err(ApiError::validation(
            "Import 1 to 100 selected contacts at a time",
        ));
    }
    let today = domain::local_today(state, user).await?.0;
    for item in &mut input.items {
        item.data.clean(today)?;
    }
    let mut tx = state.database.begin().await?;
    lock(&mut tx, user).await?;
    let mut contacts = all(state, user, &mut tx).await?;
    let mut result = Imported {
        created: 0,
        updated: 0,
        skipped: 0,
    };
    let mut updated = std::collections::HashSet::new();
    for mut item in input.items {
        if let Some(id) = item.id {
            let old = contacts
                .iter()
                .find(|contact| contact.id == id)
                .ok_or_else(domain::not_found)?;
            if item.revision != Some(old.revision) || !updated.insert(id) {
                return Err(stale());
            }

            for key in &old.data.source_keys {
                if !item.data.source_keys.contains(key) {
                    item.data.source_keys.push(key.clone());
                }
            }
            item.data.clean(today)?;
            if contacts
                .iter()
                .any(|contact| contact.id != id && duplicate(&item.data, &contact.data))
            {
                result.skipped += 1;
                continue;
            }
            let contact = persist(state, user, id, item.data, WriteMode::Update, &mut tx).await?;
            contacts.retain(|contact| contact.id != id);
            contacts.push(contact);
            result.updated += 1;
        } else if contacts
            .iter()
            .any(|contact| duplicate(&item.data, &contact.data))
        {
            result.skipped += 1;
        } else {
            contacts.push(
                persist(
                    state,
                    user,
                    Uuid::new_v4(),
                    item.data,
                    WriteMode::Create,
                    &mut tx,
                )
                .await?,
            );
            result.created += 1;
        }
    }
    tx.commit().await?;
    Ok(result)
}
pub(super) async fn labels(
    state: &AppState,
    user: Uuid,
    input: LabelChange,
) -> Result<(), ApiError> {
    let kind = input.kind.parse::<LabelKind>()?;
    domain::text(&input.name, 1, 64)?;
    if let Some(name) = &input.replacement {
        domain::text(name, 1, 64)?;
    }
    let mut tx = state.database.begin().await?;
    lock(&mut tx, user).await?;
    for mut contact in all(state, user, &mut tx).await? {
        let labels = if kind == LabelKind::Categories {
            &mut contact.data.categories
        } else {
            &mut contact.data.tags
        };
        if !labels
            .iter()
            .any(|name| name.eq_ignore_ascii_case(&input.name))
        {
            continue;
        }
        labels.retain(|name| !name.eq_ignore_ascii_case(&input.name));
        if let Some(name) = &input.replacement
            && !labels
                .iter()
                .any(|name| name.eq_ignore_ascii_case(name.trim()))
        {
            labels.push(name.trim().to_owned());
        }
        persist(
            state,
            user,
            contact.id,
            contact.data,
            WriteMode::Update,
            &mut tx,
        )
        .await?;
    }
    tx.commit().await?;
    Ok(())
}
