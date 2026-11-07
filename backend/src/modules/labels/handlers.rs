use super::catalog::collection_expandable;
use super::functions;
use super::models::{Data, Filter, Input, Label, Revision};
use super::service::{all, encode, key, lock, propagate, sync, validate_icon};
use crate::{
    infrastructure::state::AppState,
    modules::contacts,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::StatusCode,
};
use uuid::Uuid;

pub(super) async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(f): Query<Filter>,
) -> Result<Json<Vec<Label>>, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    contacts::lock(&mut tx, u.id).await?;
    sync(&s, &mut tx, u.id).await?;
    functions::seed(&s, &mut tx, u.id).await?;
    super::catalog::seed(&s, &mut tx, u.id).await?;
    let mut labels = all(&s, &mut tx, u.id).await?;
    if let Some(kind) = f.kind {
        labels.retain(|l| l.kind == kind);
    }
    labels.sort_by_key(|label| label.name.to_lowercase());
    tx.commit().await?;
    Ok(Json(labels))
}

pub(super) async fn create(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(mut v): ApiJson<Input>,
) -> Result<(StatusCode, Json<Label>), ApiError> {
    domain::text(&v.name, 1, 64)?;
    domain::color(&v.color)?;
    validate_icon(v.icon.as_deref())?;
    if collection_expandable(&v.kind) == Some(false) {
        return Err(ApiError::validation("Fixed collections cannot be extended"));
    }
    if !["tag", "category", "functional"].contains(&v.kind.as_str())
        && collection_expandable(&v.kind) != Some(true)
    {
        return Err(ApiError::validation("Unsupported label kind"));
    }
    if (v.kind == "functional" && v.function_key.as_deref() != Some("cost"))
        || (v.kind != "functional" && v.function_key.is_some())
    {
        return Err(ApiError::validation(
            "Functional labels require the cost adapter",
        ));
    }
    let mut tx = s.database.begin().await?;
    lock(&mut tx, u.id).await?;
    let details = v.details.clone().unwrap_or_default();
    domain::text(&details.description, 0, 5000)?;
    if let Some(image) = details.image_id {
        crate::modules::media::ensure_owned(&mut tx, u.id, image).await?;
    }
    let existing = all(&s, &mut tx, u.id).await?.into_iter().find(|label| {
        label.kind == v.kind && label.name.to_lowercase() == v.name.trim().to_lowercase()
    });
    if let Some(old) = existing {
        if collection_expandable(&old.kind) == Some(true) && !old.in_collection {
            tx.rollback().await?;
            v.revision = Some(old.revision);
            let result = update(State(s), u, Path(old.id), ApiJson(v)).await?;
            return Ok((StatusCode::CREATED, result));
        }
        return Err(domain::conflict("Label already exists"));
    }
    let id = Uuid::new_v4();
    sqlx::query(
        "INSERT INTO app.labels(id,user_id,kind,name_key,encrypted_data,function_key,repeatable) VALUES($1,$2,$3,$4,$5,$6,$7)",
    )
    .bind(id)
    .bind(u.id)
    .bind(&v.kind)
    .bind(key(&s, u.id, &v.kind, &v.name))
    .bind(encode(
        &s,
        u.id,
        id,
        &Data {
            name: v.name.trim().into(),
            color: v.color.clone(),
            icon: v.icon.clone(),
            description: details.description.clone(),
            image_id: details.image_id,
            in_collection: details.in_collection,
        },
    )?)
    .bind(&v.function_key)
    .bind(v.repeatable.unwrap_or(true))
    .execute(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok((
        StatusCode::CREATED,
        Json(Label {
            in_collection: details.in_collection,
            value: None,
            id,
            name: v.name.trim().into(),
            color: v.color,
            kind: v.kind,
            icon: v.icon,
            function_key: v.function_key,
            is_system: false,
            repeatable: v.repeatable.unwrap_or(true),
            revision: 0,
            description: details.description,
            image_id: details.image_id,
        }),
    ))
}

pub(super) async fn update(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Input>,
) -> Result<Json<Label>, ApiError> {
    domain::text(&v.name, 1, 64)?;
    domain::color(&v.color)?;
    validate_icon(v.icon.as_deref())?;
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    contacts::lock(&mut tx, u.id).await?;
    lock(&mut tx, u.id).await?;
    let labels = all(&s, &mut tx, u.id).await?;
    let old = labels
        .iter()
        .find(|l| l.id == id)
        .ok_or_else(domain::not_found)?;
    if v.revision != Some(old.revision) {
        return Err(domain::conflict("Label changed"));
    }
    if collection_expandable(&old.kind) == Some(false) {
        return Err(ApiError::validation("Fixed collections cannot be edited"));
    }
    let description = v.details.as_ref().map_or_else(
        || old.description.clone(),
        |details| details.description.clone(),
    );
    let image_id = v
        .details
        .as_ref()
        .map_or(old.image_id, |details| details.image_id);
    let in_collection = v
        .details
        .as_ref()
        .map_or(old.in_collection, |details| details.in_collection);
    domain::text(&description, 0, 5000)?;
    if let Some(image) = image_id {
        crate::modules::media::ensure_owned(&mut tx, u.id, image).await?;
    }
    if labels.iter().any(|l| {
        l.id != id && l.kind == old.kind && l.name.to_lowercase() == v.name.trim().to_lowercase()
    }) {
        return Err(domain::conflict("Label already exists"));
    }
    let repeatable = v.repeatable.unwrap_or(old.repeatable);
    if old.function_key.as_deref() == Some("ai_access") && repeatable {
        return Err(ApiError::validation("AI access can only be assigned once"));
    }
    if !repeatable && old.repeatable {
        let duplicates: bool = sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.label_values WHERE user_id=$1 AND label_id=$2 GROUP BY subject_kind,subject_id HAVING count(*)>1)").bind(u.id).bind(id).fetch_one(&mut *tx).await?;
        if duplicates {
            return Err(domain::conflict(
                "Remove repeated assignments before changing cardinality",
            ));
        }
    }
    sqlx::query("UPDATE app.labels SET repeatable=$3 WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .bind(repeatable)
        .execute(&mut *tx)
        .await?;
    let icon = v.icon.clone().or_else(|| old.icon.clone());
    if old.kind != "functional" && old.name != v.name.trim() {
        propagate(&s, &mut tx, u.id, old, Some(v.name.trim())).await?;
    }
    sqlx::query("UPDATE app.labels SET encrypted_data=$3,name_key=$4,revision=revision+1 WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).bind(encode(&s,u.id,id,&Data{name:v.name.trim().into(),color:v.color.clone(),icon:icon.clone(),description:description.clone(),image_id,in_collection})?).bind(key(&s,u.id,&old.kind,&v.name)).execute(&mut *tx).await?;
    let result = Label {
        in_collection,
        value: super::catalog::stored_value(&old.kind, v.name.trim()),
        id,
        name: v.name.trim().into(),
        color: v.color,
        kind: old.kind.clone(),
        icon,
        function_key: old.function_key.clone(),
        is_system: old.is_system,
        repeatable,
        revision: old.revision + 1,
        description,
        image_id,
    };
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn remove(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    contacts::lock(&mut tx, u.id).await?;
    lock(&mut tx, u.id).await?;
    let labels = all(&s, &mut tx, u.id).await?;
    let old = labels
        .iter()
        .find(|l| l.id == id)
        .ok_or_else(domain::not_found)?;
    if old.revision != v.revision {
        return Err(domain::conflict("Label changed"));
    }
    if old.is_system || collection_expandable(&old.kind) == Some(false) {
        return Err(ApiError::validation("System capability cannot be deleted"));
    }
    if collection_expandable(&old.kind) == Some(true) {
        let data = Data {
            name: old.name.clone(),
            color: old.color.clone(),
            icon: old.icon.clone(),
            description: old.description.clone(),
            image_id: old.image_id,
            in_collection: false,
        };
        sqlx::query("UPDATE app.labels SET encrypted_data=$3,revision=revision+1 WHERE user_id=$1 AND id=$2").bind(u.id).bind(id).bind(encode(&s,u.id,id,&data)?).execute(&mut *tx).await?;
        tx.commit().await?;
        return Ok(StatusCode::NO_CONTENT);
    }
    if old.kind != "functional" && collection_expandable(&old.kind).is_none() {
        propagate(&s, &mut tx, u.id, old, None).await?;
    }
    sqlx::query("DELETE FROM app.labels WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn list_tags(
    state: State<AppState>,
    user: CurrentUser,
) -> Result<Json<Vec<Label>>, ApiError> {
    list(
        state,
        user,
        Query(Filter {
            kind: Some("tag".into()),
        }),
    )
    .await
}
