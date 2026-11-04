//! Ordinary tag adapters keep native feature fields authoritative. Subjects without
//! such fields bind catalog IDs here, sharing registry rename/delete semantics.
use super::{
    functions::exists,
    service::{all, lock, register},
};
use crate::{
    infrastructure::state::AppState,
    modules::{contacts, tasks},
    shared::{auth::CurrentUser, domain, errors::ApiError},
};
use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};
use sqlx::PgConnection;
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Change {
    tags: Vec<String>,
    previous_tags: Option<Vec<String>>,
}
#[derive(Serialize)]
pub(super) struct SubjectTags {
    subject_kind: String,
    subject_id: Uuid,
    tags: Vec<String>,
}
fn normalized(mut tags: Vec<String>) -> Result<Vec<String>, ApiError> {
    domain::tags(&tags)?;
    let mut seen = std::collections::BTreeSet::new();
    for tag in &mut tags {
        *tag = tag.trim().to_string();
    }
    tags.retain(|tag| seen.insert(tag.to_lowercase()));
    domain::tags(&tags)?;
    Ok(tags)
}
fn same(a: &[String], b: &[String]) -> bool {
    let keys = |values: &[String]| {
        values
            .iter()
            .map(|value| value.to_lowercase())
            .collect::<std::collections::BTreeSet<_>>()
    };
    keys(a) == keys(b)
}
pub(super) async fn read(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    kind: &str,
    id: Uuid,
) -> Result<Vec<String>, ApiError> {
    match kind {
        "notes" | "tasks" | "habits" | "countdowns" => {
            let table = if kind == "habits" { "tasks" } else { kind };
            let value: serde_json::Value = sqlx::query_scalar(&format!(
                "SELECT tags FROM app.{table} WHERE user_id=$1 AND id=$2"
            ))
            .bind(user)
            .bind(id)
            .fetch_one(&mut *db)
            .await?;
            serde_json::from_value(value).map_err(|_| ApiError::internal())
        }
        "workouts" => {
            let value:serde_json::Value=sqlx::query_scalar("SELECT coalesce(data->'tags','[]'::jsonb) FROM app.workouts WHERE user_id=$1 AND id=$2")
                .bind(user).bind(id).fetch_one(&mut *db).await?;
            serde_json::from_value(value).map_err(|_| ApiError::internal())
        }
        "contacts" => Ok(contacts::load(s, user, id, db).await?.data.tags),
        "exercises" | "intimacy" | "boards" => {
            let ids:Vec<Uuid>=sqlx::query_scalar("SELECT label_id FROM app.label_subject_tags WHERE user_id=$1 AND subject_kind=$2 AND subject_id=$3")
                .bind(user).bind(kind).bind(id).fetch_all(&mut *db).await?;
            let mut names = all(s, db, user)
                .await?
                .into_iter()
                .filter(|label| ids.contains(&label.id))
                .map(|label| label.name)
                .collect::<Vec<_>>();
            names.sort_by_key(|name| name.to_lowercase());
            Ok(names)
        }
        _ => Err(ApiError::validation("Unsupported label subject")),
    }
}
pub(super) async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<SubjectTags>>, ApiError> {
    let mut db = s.database.acquire().await?;
    let rows:Vec<(String,Uuid,Uuid)>=sqlx::query_as("SELECT subject_kind,subject_id,label_id FROM app.label_subject_tags WHERE user_id=$1 ORDER BY subject_kind,subject_id,label_id")
        .bind(u.id).fetch_all(&mut *db).await?;
    let labels = all(&s, &mut db, u.id).await?;
    let mut subjects: Vec<SubjectTags> = vec![];
    for (kind, id, label_id) in rows {
        let Some(label) = labels.iter().find(|label| label.id == label_id) else {
            continue;
        };
        if let Some(subject) = subjects
            .iter_mut()
            .find(|subject| subject.subject_kind == kind && subject.subject_id == id)
        {
            subject.tags.push(label.name.clone());
        } else {
            subjects.push(SubjectTags {
                subject_kind: kind,
                subject_id: id,
                tags: vec![label.name.clone()],
            });
        }
    }
    Ok(Json(subjects))
}
pub(super) async fn save(
    s: &AppState,
    user: Uuid,
    kind: &str,
    id: Uuid,
    change: Change,
) -> Result<(), ApiError> {
    let tags = normalized(change.tags)?;
    let today = if kind == "habits" {
        Some(domain::local_today(s, user).await?.0)
    } else {
        None
    };
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, user).await?;
    contacts::lock(&mut tx, user).await?;
    lock(&mut tx, user).await?;
    exists(&mut tx, user, kind, id).await?;
    let table = match kind {
        "habits" => "tasks",
        "intimacy" => "intimacy_entries",
        "boards" => "task_boards",
        other => other,
    };
    sqlx::query(&format!(
        "SELECT id FROM app.{table} WHERE user_id=$1 AND id=$2 FOR UPDATE"
    ))
    .bind(user)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    let old = read(s, &mut tx, user, kind, id).await?;
    if let Some(previous) = change.previous_tags
        && !same(&normalized(previous)?, &old)
    {
        return Err(domain::conflict("Subject tags changed"));
    }
    register(s, &mut tx, user, &tags).await?;
    let value = serde_json::to_value(&tags).map_err(|_| ApiError::internal())?;
    match kind {
        "notes" | "tasks" | "habits" | "countdowns" => {
            sqlx::query(&format!("UPDATE app.{table} SET tags=$3,updated_at=clock_timestamp() WHERE user_id=$1 AND id=$2"))
                .bind(user).bind(id).bind(&value).execute(&mut *tx).await?;
            if let Some(today) = today {
                // Snapshot from today follows the normal habit edit behavior;
                // previous versions and recorded occurrences retain their metadata.
                sqlx::query("INSERT INTO app.habit_versions(user_id,task_id,effective_from,snapshot) SELECT user_id,id,$3,to_jsonb(t) FROM app.tasks t WHERE user_id=$1 AND id=$2 ON CONFLICT(user_id,task_id,effective_from) DO UPDATE SET snapshot=EXCLUDED.snapshot")
                    .bind(user).bind(id).bind(today).execute(&mut *tx).await?;
                sqlx::query("UPDATE app.habit_versions SET snapshot=jsonb_set(snapshot,'{tags}',$3) WHERE user_id=$1 AND task_id=$2 AND effective_from>$4")
                    .bind(user).bind(id).bind(&value).bind(today).execute(&mut *tx).await?;
            }
        }
        "workouts" => {
            sqlx::query("UPDATE app.workouts SET data=jsonb_set(data,'{tags}',$3),updated_at=clock_timestamp() WHERE user_id=$1 AND id=$2")
                .bind(user).bind(id).bind(&value).execute(&mut *tx).await?;
        }
        "contacts" => {
            let mut contact = contacts::load(s, user, id, &mut tx).await?;
            contact.data.tags = tags;
            let bytes = s.cipher.encrypt(
                &serde_json::to_vec(&contact.data).map_err(|_| ApiError::internal())?,
                format!("contact:{user}:{id}").as_bytes(),
            )?;
            sqlx::query("UPDATE app.contacts SET encrypted_data=$3,revision=revision+1,updated_at=clock_timestamp() WHERE user_id=$1 AND id=$2")
                .bind(user).bind(id).bind(bytes).execute(&mut *tx).await?;
        }
        "exercises" | "intimacy" | "boards" => {
            sqlx::query("DELETE FROM app.label_subject_tags WHERE user_id=$1 AND subject_kind=$2 AND subject_id=$3")
                .bind(user).bind(kind).bind(id).execute(&mut *tx).await?;
            for label in all(s, &mut tx, user).await?.into_iter().filter(|label| {
                label.kind == "tag"
                    && tags.iter().any(|name| {
                        name.eq_ignore_ascii_case(&label.name)
                            || name.to_lowercase() == label.name.to_lowercase()
                    })
            }) {
                sqlx::query("INSERT INTO app.label_subject_tags(user_id,label_id,subject_kind,subject_id) VALUES($1,$2,$3,$4)")
                    .bind(user).bind(label.id).bind(kind).bind(id).execute(&mut *tx).await?;
            }
        }
        _ => return Err(ApiError::validation("Unsupported label subject")),
    }
    domain::event(
        &mut tx,
        user,
        "labels_updated",
        kind,
        id,
        serde_json::json!({}),
    )
    .await?;
    tx.commit().await?;
    Ok(())
}
