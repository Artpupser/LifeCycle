//! Typed capability values extend the label owner. AI access remains in ai_access;
//! this module never creates a parallel permission flag or a financial ledger.
use super::{
    models::Data,
    service::{encode, key, lock},
    tags,
};
use crate::{
    infrastructure::state::AppState,
    modules::tasks,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sqlx::PgConnection;
use uuid::Uuid;

pub(super) async fn seed(s: &AppState, db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    for (function, name, icon) in [
        ("ai_access", "AI Доступ", "tabler:brain"),
        ("cost", "Стоимость", "tabler:coin"),
    ] {
        let id = Uuid::new_v4();
        let data = Data {
            name: name.into(),
            color: domain::default_color(),
            icon: Some(icon.into()),
        };
        sqlx::query("INSERT INTO app.labels(id,user_id,kind,function_key,name_key,encrypted_data,is_system,repeatable) VALUES($1,$2,'functional',$3,$4,$5,true,$6) ON CONFLICT DO NOTHING")
        .bind(id).bind(user).bind(function).bind(key(s,user,"functional",name)).bind(encode(s,user,id,&data)?).bind(function!="ai_access").execute(&mut *db).await?;
    }
    Ok(())
}
#[derive(Serialize)]
struct Assignment {
    id: Uuid,
    label_id: Uuid,
    subject_kind: String,
    subject_id: Uuid,
    value: Value,
    revision: i64,
}
#[derive(sqlx::FromRow)]
struct Stored {
    id: Uuid,
    aad_version: i16,
    label_id: Uuid,
    subject_kind: String,
    subject_id: Uuid,
    encrypted_value: Vec<u8>,
    revision: i64,
}
fn aad(user: Uuid, label: Uuid, kind: &str, id: Uuid, assignment: Option<Uuid>) -> String {
    let legacy = format!("label-value:{user}:{label}:{kind}:{id}");
    assignment.map_or(legacy.clone(), |value| format!("{legacy}:{value}"))
}
fn decoded(s: &AppState, user: Uuid, row: Stored) -> Result<Assignment, ApiError> {
    let value = serde_json::from_slice(
        &s.cipher.decrypt(
            &row.encrypted_value,
            aad(
                user,
                row.label_id,
                &row.subject_kind,
                row.subject_id,
                (row.aad_version == 1).then_some(row.id),
            )
            .as_bytes(),
        )?,
    )
    .map_err(|_| ApiError::internal())?;
    Ok(Assignment {
        id: row.id,
        label_id: row.label_id,
        subject_kind: row.subject_kind,
        subject_id: row.subject_id,
        value,
        revision: row.revision,
    })
}
fn table(kind: &str) -> Result<&'static str, ApiError> {
    match kind {
        "notes" => Ok("notes"),
        "tasks" | "habits" => Ok("tasks"),
        "workouts" => Ok("workouts"),
        "exercises" => Ok("exercises"),
        "contacts" => Ok("contacts"),
        "countdowns" => Ok("countdowns"),
        "intimacy" => Ok("intimacy_entries"),
        "boards" => Ok("task_boards"),
        _ => Err(ApiError::validation("Unsupported label subject")),
    }
}
pub(super) async fn exists(
    db: &mut PgConnection,
    user: Uuid,
    kind: &str,
    id: Uuid,
) -> Result<(), ApiError> {
    let table = table(kind)?;
    let extra = match kind {
        "tasks" => " AND source_kind='manual'",
        "habits" => " AND source_kind='habit'",
        _ => "",
    };
    let found: bool = sqlx::query_scalar(&format!(
        "SELECT EXISTS(SELECT 1 FROM app.{table} WHERE user_id=$1 AND id=$2{extra})"
    ))
    .bind(user)
    .bind(id)
    .fetch_one(db)
    .await?;
    if found {
        Ok(())
    } else {
        Err(domain::not_found())
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Cost {
    amount: String,
    currency: String,
}
fn cost(value: Value) -> Result<Value, ApiError> {
    let v: Cost = serde_json::from_value(value)
        .map_err(|_| ApiError::validation("Expected amount and currency"))?;
    if !["RUB", "USD", "EUR"].contains(&v.currency.as_str()) {
        return Err(ApiError::validation("Unsupported currency"));
    }
    let parts: Vec<_> = v.amount.split('.').collect();
    if parts.len() > 2
        || parts[0].is_empty()
        || parts[0].len() > 12
        || !parts[0].bytes().all(|c| c.is_ascii_digit())
        || parts
            .get(1)
            .is_some_and(|p| p.is_empty() || p.len() > 2 || !p.bytes().all(|c| c.is_ascii_digit()))
    {
        return Err(ApiError::validation(
            "Expected non-negative decimal amount, up to 2 fractional digits",
        ));
    }
    let integer = parts[0].trim_start_matches('0');
    let integer = if integer.is_empty() { "0" } else { integer };
    let fraction = format!("{0:0<2}", parts.get(1).copied().unwrap_or(""));
    Ok(serde_json::json!({"amount":format!("{integer}.{fraction}"),"currency":v.currency}))
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Change {
    label_id: Uuid,
    value: Option<Value>,
    revision: Option<i64>,
    assignment_id: Option<Uuid>,
}
#[derive(Deserialize)]
#[serde(untagged)]
enum Mutation {
    Tags(tags::Change),
    Value(Change),
}
#[derive(Serialize)]
struct Subject {
    tags: Vec<String>,
    values: Vec<Assignment>,
    ai_access: Option<crate::modules::ai::access::Access>,
}
pub(super) fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/labels/values", get(list))
        .route("/api/labels/subject-tags", get(tags::list))
        .route(
            "/api/labels/subjects/{kind}/{id}",
            get(subject).put(save).post(append),
        )
}
async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Vec<Assignment>>, ApiError> {
    let mut db = s.database.acquire().await?;
    let rows:Vec<Stored>=sqlx::query_as("SELECT id,aad_version,label_id,subject_kind,subject_id,encrypted_value,revision FROM app.label_values WHERE user_id=$1").bind(u.id).fetch_all(&mut *db).await?;
    let mut values = rows
        .into_iter()
        .map(|row| decoded(&s, u.id, row))
        .collect::<Result<Vec<_>, _>>()?;
    seed(&s, &mut db, u.id).await?;
    let ai_label: Uuid = sqlx::query_scalar(
        "SELECT id FROM app.labels WHERE user_id=$1 AND function_key='ai_access' AND is_system",
    )
    .bind(u.id)
    .fetch_one(&mut *db)
    .await?;
    for kind in [
        "notes",
        "tasks",
        "habits",
        "workouts",
        "exercises",
        "contacts",
        "countdowns",
        "intimacy",
        "boards",
    ] {
        let table = crate::modules::ai::access::object_table(kind)?;
        let extra = match kind {
            "tasks" => " AND source_kind='manual'",
            "habits" => " AND source_kind='habit'",
            _ => "",
        };
        let shared: Vec<(Uuid, i64)> = sqlx::query_as(&format!(
            "SELECT id,ai_access_revision FROM app.{table} WHERE user_id=$1 AND ai_shared{extra}"
        ))
        .bind(u.id)
        .fetch_all(&mut *db)
        .await?;
        values.extend(shared.into_iter().map(|(id, revision)| Assignment {
            id,
            label_id: ai_label,
            subject_kind: kind.into(),
            subject_id: id,
            value: serde_json::json!({"enabled":true}),
            revision,
        }));
    }
    Ok(Json(values))
}
async fn subject(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((kind, id)): Path<(String, Uuid)>,
) -> Result<Json<Subject>, ApiError> {
    let mut db = s.database.acquire().await?;
    exists(&mut db, u.id, &kind, id).await?;
    let rows:Vec<Stored>=sqlx::query_as("SELECT id,aad_version,label_id,subject_kind,subject_id,encrypted_value,revision FROM app.label_values WHERE user_id=$1 AND subject_kind=$2 AND subject_id=$3").bind(u.id).bind(&kind).bind(id).fetch_all(&mut *db).await?;
    let ai_table = crate::modules::ai::access::object_table(&kind)?;
    let ai_access: Option<crate::modules::ai::access::Access> = {
        Some(
            sqlx::query_as(&format!(
                "SELECT ai_shared,ai_access_revision FROM app.{ai_table} WHERE user_id=$1 AND id=$2"
            ))
            .bind(u.id)
            .bind(id)
            .fetch_one(&mut *db)
            .await?,
        )
    };
    let mut values = rows
        .into_iter()
        .map(|row| decoded(&s, u.id, row))
        .collect::<Result<Vec<_>, _>>()?;
    if let Some(access) = ai_access.as_ref().filter(|access| access.ai_shared) {
        let label_id: Option<Uuid> = sqlx::query_scalar(
            "SELECT id FROM app.labels WHERE user_id=$1 AND function_key='ai_access' AND is_system",
        )
        .bind(u.id)
        .fetch_optional(&mut *db)
        .await?;
        if let Some(label_id) = label_id {
            values.push(Assignment {
                id,
                label_id,
                subject_kind: kind.clone(),
                subject_id: id,
                value: serde_json::json!({"enabled":true}),
                revision: access.ai_access_revision,
            });
        }
    }
    Ok(Json(Subject {
        tags: tags::read(&s, &mut db, u.id, &kind, id).await?,
        values,
        ai_access,
    }))
}
async fn save(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((kind, id)): Path<(String, Uuid)>,
    ApiJson(v): ApiJson<Mutation>,
) -> Result<StatusCode, ApiError> {
    match v {
        Mutation::Tags(change) => tags::save(&s, u.id, &kind, id, change).await?,
        Mutation::Value(change) => mutate(&s, u.id, &kind, id, change, false).await?,
    }
    Ok(StatusCode::NO_CONTENT)
}
async fn append(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((kind, id)): Path<(String, Uuid)>,
    ApiJson(v): ApiJson<Change>,
) -> Result<(StatusCode, Json<Value>), ApiError> {
    if v.assignment_id.is_some() || v.revision.is_some() || v.value.is_none() {
        return Err(ApiError::validation(
            "A new assignment requires a value and no existing revision",
        ));
    }
    mutate(&s, u.id, &kind, id, v, true).await?;
    Ok((StatusCode::CREATED, Json(serde_json::json!({}))))
}
async fn mutate(
    s: &AppState,
    user: Uuid,
    kind: &str,
    id: Uuid,
    v: Change,
    append: bool,
) -> Result<(), ApiError> {
    let function: Option<String> =
        sqlx::query_scalar("SELECT function_key FROM app.labels WHERE user_id=$1 AND id=$2")
            .bind(user)
            .bind(v.label_id)
            .fetch_optional(&s.database)
            .await?
            .flatten();
    if function.as_deref() == Some("ai_access") {
        if append {
            return Err(ApiError::validation("AI access is a single label; use PUT"));
        }
        let enabled = match v.value {
            None => false,
            Some(value) if value == serde_json::json!({"enabled":true}) => true,
            _ => return Err(ApiError::validation("Expected AI access label")),
        };
        let mut db = s.database.acquire().await?;
        exists(&mut db, user, kind, id).await?;
        drop(db);
        let _ = crate::modules::ai::access::change(
            s.clone(),
            user,
            id,
            crate::modules::ai::access::Input {
                ai_shared: enabled,
                revision: v
                    .revision
                    .ok_or_else(|| ApiError::validation("AI access revision is required"))?,
            },
            kind,
        )
        .await?;
        return Ok(());
    }
    let mut tx = s.database.begin().await?;
    tasks::lock_tasks(&mut tx, user).await?;
    lock(&mut tx, user).await?;
    exists(&mut tx, user, kind, id).await?;
    let subject_table = table(kind)?;
    sqlx::query(&format!(
        "SELECT id FROM app.{subject_table} WHERE user_id=$1 AND id=$2 FOR KEY SHARE"
    ))
    .bind(user)
    .bind(id)
    .fetch_optional(&mut *tx)
    .await?
    .ok_or_else(domain::not_found)?;
    let function: Option<String> =
        sqlx::query_scalar("SELECT function_key FROM app.labels WHERE user_id=$1 AND id=$2")
            .bind(user)
            .bind(v.label_id)
            .fetch_optional(&mut *tx)
            .await?
            .flatten();
    if function.as_deref() != Some("cost") {
        return Err(ApiError::validation(
            "Use the capability's registered adapter",
        ));
    }
    let repeatable: bool =
        sqlx::query_scalar("SELECT repeatable FROM app.labels WHERE user_id=$1 AND id=$2")
            .bind(user)
            .bind(v.label_id)
            .fetch_one(&mut *tx)
            .await?;
    if append && !repeatable {
        let present:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.label_values WHERE user_id=$1 AND label_id=$2 AND subject_kind=$3 AND subject_id=$4)").bind(user).bind(v.label_id).bind(kind).bind(id).fetch_one(&mut *tx).await?;
        if present {
            return Err(domain::conflict("Label can only be assigned once"));
        }
    }
    let rows: Vec<(Uuid, i64)> = if append {
        vec![]
    } else {
        sqlx::query_as("SELECT id,revision FROM app.label_values WHERE user_id=$1 AND label_id=$2 AND subject_kind=$3 AND subject_id=$4 AND ($5::uuid IS NULL OR id=$5) FOR UPDATE")
            .bind(user).bind(v.label_id).bind(kind).bind(id).bind(v.assignment_id).fetch_all(&mut *tx).await?
    };
    if rows.len() > 1
        || rows.first().map(|row| row.1) != v.revision
        || (v.assignment_id.is_some() && rows.is_empty())
    {
        return Err(domain::conflict("Functional label changed"));
    }
    let assignment = rows.first().map(|row| row.0).unwrap_or_else(Uuid::new_v4);
    if let Some(value) = v.value {
        let value = cost(value)?;
        let bytes = s.cipher.encrypt(
            &serde_json::to_vec(&value).map_err(|_| ApiError::internal())?,
            aad(user, v.label_id, kind, id, Some(assignment)).as_bytes(),
        )?;
        sqlx::query("INSERT INTO app.label_values(id,user_id,label_id,subject_kind,subject_id,encrypted_value,aad_version) VALUES($1,$2,$3,$4,$5,$6,1) ON CONFLICT(user_id,id) DO UPDATE SET encrypted_value=EXCLUDED.encrypted_value,aad_version=1,revision=nextval('app.label_value_revision')")
            .bind(assignment).bind(user).bind(v.label_id).bind(kind).bind(id).bind(bytes).execute(&mut *tx).await?;
    } else {
        sqlx::query("DELETE FROM app.label_values WHERE user_id=$1 AND id=$2")
            .bind(user)
            .bind(assignment)
            .execute(&mut *tx)
            .await?;
    }
    tx.commit().await?;
    Ok(())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn exact_money() {
        assert_eq!(
            cost(serde_json::json!({"amount":"000100.1","currency":"RUB"})).unwrap(),
            serde_json::json!({"amount":"100.10","currency":"RUB"})
        );
        for amount in [
            "-1",
            "1.001",
            "1e3",
            "NaN",
            "1,5",
            "",
            ".5",
            "1234567890123",
        ] {
            assert!(cost(serde_json::json!({"amount":amount,"currency":"USD"})).is_err());
        }
        assert!(cost(serde_json::json!({"amount":"1","currency":"BTC"})).is_err());
    }
}
