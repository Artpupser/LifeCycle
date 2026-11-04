use super::models::{COLUMNS, Change, Confirmation, Data, Operation, Page, Prepare, Row, View};
use super::service::{
    check_actions, check_exercise_links, conflict, context, current, denied, duplicate, merge,
    persist, remove, row, safety, view, write,
};
use crate::{
    infrastructure::state::AppState,
    modules::ai,
    modules::ai::access as ai_access,
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
use chrono::Utc;
use serde_json::json;
use uuid::Uuid;

pub(super) async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(p): Query<Page>,
) -> Result<Json<Vec<View>>, ApiError> {
    let rows:Vec<Row>=sqlx::query_as(&format!("SELECT {COLUMNS} FROM app.ai_actions WHERE user_id=$1 AND NOT EXISTS(SELECT 1 FROM app.history_removals h WHERE h.user_id=$1 AND h.kind='ai' AND h.item_key=app.ai_actions.id::text) AND ($2::timestamptz IS NULL OR created_at<$2) ORDER BY created_at DESC,id LIMIT 50"))
        .bind(u.id).bind(p.before).fetch_all(&s.database).await?;
    Ok(Json(
        rows.into_iter()
            .map(|r| view(&s, u.id, r))
            .collect::<Result<_, _>>()?,
    ))
}

pub(super) async fn prepare(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(v): ApiJson<Prepare>,
) -> Result<(StatusCode, Json<View>), ApiError> {
    domain::text(&v.summary, 1, 4000)?;
    if serde_json::to_vec(&v.actions)
        .map_err(|_| ApiError::internal())?
        .len()
        > 256 * 1024
    {
        return Err(ApiError::validation("Proposal too large"));
    }
    let mut tx = s.database.begin().await?;
    let config = ai::config(&mut tx, u.id).await?;
    if config.revision != v.revision {
        return Err(ai::stale());
    }
    check_actions(&v.actions, &config.permissions.0)?;
    if let Some(id) = v.source_turn_id {
        let exists:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.ai_turns WHERE user_id=$1 AND id=$2 AND status='completed' AND config_revision=$3)").bind(u.id).bind(id).bind(config.revision).fetch_one(&mut *tx).await?;
        if !exists {
            return Err(ai::stale());
        }
    }
    let count:i64=sqlx::query_scalar("SELECT count(*) FROM app.ai_actions WHERE user_id=$1 AND status='prepared' AND created_at>now()-interval '15 minutes'").bind(u.id).fetch_one(&mut *tx).await?;
    if count >= 50 {
        return Err(domain::conflict("Dismiss a pending proposal first"));
    }
    tasks::lock_tasks(&mut tx, u.id).await?;
    sqlx::query("SAVEPOINT ai_validate")
        .execute(&mut *tx)
        .await?;
    let mut changes = vec![];
    for a in v.actions {
        if a.operation == Operation::Update
            && !ai_access::visible(&mut tx, u.id, a.entity.table(), a.id).await?
        {
            return Err(denied());
        }
        let before = current(&mut tx, u.id, a.entity, a.id).await?;
        match a.operation {
            Operation::Create => {
                let exists: bool = sqlx::query_scalar(&format!(
                    "SELECT EXISTS(SELECT 1 FROM app.{} WHERE id=$1)",
                    a.entity.table()
                ))
                .bind(a.id)
                .fetch_one(&mut *tx)
                .await?;
                if exists {
                    return Err(conflict());
                }
                let duplicate = duplicate(
                    &mut tx,
                    u.id,
                    a.entity,
                    a.data["title"].as_str().unwrap_or(""),
                )
                .await?;
                if duplicate {
                    return Err(ApiError::new(
                        StatusCode::CONFLICT,
                        "ai_duplicate",
                        "Reuse the existing entity instead of creating a duplicate",
                    ));
                }
            }
            Operation::Update => {
                if before.as_ref().map(|v| v.1) != a.expected_updated_at {
                    return Err(conflict());
                }
            }
        }
        let mut data = before.as_ref().map_or_else(|| json!({}), |v| v.0.clone());
        merge(&mut data, &a.data)?;
        write(
            &s,
            &mut tx,
            u.id,
            &a,
            data,
            a.operation == Operation::Create,
        )
        .await?;
        let after = current(&mut tx, u.id, a.entity, a.id)
            .await?
            .ok_or_else(domain::not_found)?
            .0;
        changes.push(Change {
            action: a,
            before: before.map(|v| v.0),
            after,
            applied_updated_at: None,
        });
    }
    check_exercise_links(&mut tx, u.id, &changes).await?;
    safety(&s, &mut tx, u.id, &changes).await?;
    sqlx::query("ROLLBACK TO SAVEPOINT ai_validate")
        .execute(&mut *tx)
        .await?;
    let id = Uuid::new_v4();
    let bytes = ai::seal(
        &s,
        &context(u.id, id),
        &Data {
            summary: v.summary,
            changes,
        },
    )?;
    sqlx::query("INSERT INTO app.ai_actions(id,user_id,source_turn_id,config_revision,status,encrypted_data) VALUES($1,$2,$3,$4,'prepared',$5)").bind(id).bind(u.id).bind(v.source_turn_id).bind(config.revision).bind(bytes).execute(&mut *tx).await?;
    let result = view(&s, u.id, row(&mut tx, u.id, id).await?)?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(result)))
}

pub(super) async fn apply(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Confirmation>,
) -> Result<Json<View>, ApiError> {
    if !v.confirmed {
        return Err(ApiError::validation("Explicit confirmation required"));
    }
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    let mut item = view(&s, u.id, row(&mut tx, u.id, id).await?)?;
    if item.status == "applied" {
        return Ok(Json(item));
    }
    if item.status != "prepared"
        || item.config_revision != c.revision
        || Utc::now() - item.created_at > chrono::Duration::minutes(15)
    {
        return Err(ai::stale());
    }
    check_actions(
        &item
            .data
            .changes
            .iter()
            .map(|c| c.action.clone())
            .collect::<Vec<_>>(),
        &c.permissions.0,
    )?;
    check_exercise_links(&mut tx, u.id, &item.data.changes).await?;
    safety(&s, &mut tx, u.id, &item.data.changes).await?;
    tasks::lock_tasks(&mut tx, u.id).await?;
    for change in &mut item.data.changes {
        if change.action.operation == Operation::Update
            && !ai_access::visible(
                &mut tx,
                u.id,
                change.action.entity.table(),
                change.action.id,
            )
            .await?
        {
            return Err(denied());
        }
        let now = current(&mut tx, u.id, change.action.entity, change.action.id).await?;
        if now.as_ref().map(|v| v.1) != change.action.expected_updated_at
            || now.as_ref().map(|v| &v.0) != change.before.as_ref()
        {
            return Err(conflict());
        }
        if change.action.operation == Operation::Create {
            let exists: bool = sqlx::query_scalar(&format!(
                "SELECT EXISTS(SELECT 1 FROM app.{} WHERE id=$1)",
                change.action.entity.table()
            ))
            .bind(change.action.id)
            .fetch_one(&mut *tx)
            .await?;
            if exists {
                return Err(conflict());
            }
            let duplicate = duplicate(
                &mut tx,
                u.id,
                change.action.entity,
                change.after["title"].as_str().unwrap_or(""),
            )
            .await?;
            if duplicate {
                return Err(conflict());
            }
        }
        write(
            &s,
            &mut tx,
            u.id,
            &change.action,
            change.after.clone(),
            change.before.is_none(),
        )
        .await?;
        change.applied_updated_at = current(&mut tx, u.id, change.action.entity, change.action.id)
            .await?
            .map(|v| v.1);
    }
    let result = persist(&mut tx, &s, u.id, id, "applied", &item.data).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn undo(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Confirmation>,
) -> Result<Json<View>, ApiError> {
    if !v.confirmed {
        return Err(ApiError::validation("Explicit confirmation required"));
    }
    let mut tx = s.database.begin().await?;
    ai::config(&mut tx, u.id).await?;
    let item = view(&s, u.id, row(&mut tx, u.id, id).await?)?;
    if item.status == "undone" {
        return Ok(Json(item));
    }
    if item.status != "applied" {
        return Err(conflict());
    }
    tasks::lock_tasks(&mut tx, u.id).await?;
    for c in item.data.changes.iter().rev() {
        let now = current(&mut tx, u.id, c.action.entity, c.action.id).await?;
        if now.as_ref().map(|v| v.1) != c.applied_updated_at
            || now.as_ref().map(|v| &v.0) != Some(&c.after)
        {
            return Err(conflict());
        }
        if let Some(before) = &c.before {
            write(&s, &mut tx, u.id, &c.action, before.clone(), false).await?;
        } else {
            remove(&mut tx, u.id, &c.action).await?;
        }
    }
    let result = persist(&mut tx, &s, u.id, id, "undone", &item.data).await?;
    tx.commit().await?;
    Ok(Json(result))
}

pub(super) async fn dismiss(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<View>, ApiError> {
    let mut tx = s.database.begin().await?;
    ai::config(&mut tx, u.id).await?;
    let item = view(&s, u.id, row(&mut tx, u.id, id).await?)?;
    if item.status != "prepared" && item.status != "dismissed" {
        return Err(conflict());
    }
    let result = persist(&mut tx, &s, u.id, id, "dismissed", &item.data).await?;
    tx.commit().await?;
    Ok(Json(result))
}
