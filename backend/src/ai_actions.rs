//! User-confirmed, atomic actions. Provider output is always untrusted input.
use crate::{
    ai::{self, Permissions},
    ai_access,
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    notes, profile,
    state::AppState,
    tasks,
    workout_plan::{Exercise, Workout},
    workouts,
};
use axum::{
    Json, Router,
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sqlx::PgConnection;
use std::collections::BTreeSet;
use uuid::Uuid;

#[derive(Clone, Copy, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
#[serde(rename_all = "snake_case")]
enum Entity {
    Exercise,
    Workout,
    Task,
    Note,
}
impl Entity {
    fn table(self) -> &'static str {
        match self {
            Self::Exercise => "exercises",
            Self::Workout => "workouts",
            Self::Task => "tasks",
            Self::Note => "notes",
        }
    }
    fn allowed(self, p: &Permissions) -> bool {
        p.changes
            && match self {
                Self::Exercise | Self::Workout => p.training(),
                Self::Task => p.tasks,
                Self::Note => p.notes,
            }
    }
}
#[derive(Clone, Copy, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
enum Operation {
    Create,
    Update,
}
#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct Action {
    entity: Entity,
    operation: Operation,
    id: Uuid,
    expected_updated_at: Option<DateTime<Utc>>,
    data: Value,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Prepare {
    revision: i64,
    source_turn_id: Option<Uuid>,
    summary: String,
    actions: Vec<Action>,
}
#[derive(Clone, Serialize, Deserialize)]
struct Change {
    action: Action,
    before: Option<Value>,
    after: Value,
    applied_updated_at: Option<DateTime<Utc>>,
}
#[derive(Serialize, Deserialize)]
struct Data {
    summary: String,
    changes: Vec<Change>,
}
#[derive(sqlx::FromRow)]
struct Row {
    id: Uuid,
    source_turn_id: Option<Uuid>,
    config_revision: i64,
    status: String,
    encrypted_data: Vec<u8>,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Serialize)]
struct View {
    id: Uuid,
    source_turn_id: Option<Uuid>,
    config_revision: i64,
    status: String,
    data: Data,
    created_at: DateTime<Utc>,
    updated_at: DateTime<Utc>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Confirmation {
    confirmed: bool,
}
#[derive(Deserialize)]
struct Page {
    before: Option<DateTime<Utc>>,
}
const COLUMNS: &str =
    "id,source_turn_id,config_revision,status,encrypted_data,created_at,updated_at";
pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/ai/actions", get(list).post(prepare))
        .route("/api/ai/actions/{id}/apply", post(apply))
        .route("/api/ai/actions/{id}/undo", post(undo))
        .route("/api/ai/actions/{id}/dismiss", post(dismiss))
}
fn context(user: Uuid, id: Uuid) -> String {
    format!("ai:actions:{user}:{id}")
}
fn view(s: &AppState, user: Uuid, row: Row) -> Result<View, ApiError> {
    Ok(View {
        id: row.id,
        source_turn_id: row.source_turn_id,
        config_revision: row.config_revision,
        status: row.status,
        data: ai::open(s, &context(user, row.id), &row.encrypted_data)?,
        created_at: row.created_at,
        updated_at: row.updated_at,
    })
}
async fn row(db: &mut PgConnection, user: Uuid, id: Uuid) -> Result<Row, ApiError> {
    sqlx::query_as(&format!(
        "SELECT {COLUMNS} FROM app.ai_actions WHERE user_id=$1 AND id=$2 FOR UPDATE"
    ))
    .bind(user)
    .bind(id)
    .fetch_optional(db)
    .await?
    .ok_or_else(domain::not_found)
}
async fn list(
    State(s): State<AppState>,
    u: CurrentUser,
    Query(p): Query<Page>,
) -> Result<Json<Vec<View>>, ApiError> {
    let rows:Vec<Row>=sqlx::query_as(&format!("SELECT {COLUMNS} FROM app.ai_actions WHERE user_id=$1 AND ($2::timestamptz IS NULL OR created_at<$2) ORDER BY created_at DESC,id LIMIT 50"))
        .bind(u.id).bind(p.before).fetch_all(&s.database).await?;
    Ok(Json(
        rows.into_iter()
            .map(|r| view(&s, u.id, r))
            .collect::<Result<_, _>>()?,
    ))
}
async fn current(
    db: &mut PgConnection,
    user: Uuid,
    e: Entity,
    id: Uuid,
) -> Result<Option<(Value, DateTime<Utc>)>, ApiError> {
    let columns = match e {
        Entity::Exercise | Entity::Workout => "data",
        Entity::Note => {
            "jsonb_build_object('title',title,'content',content,'tags',tags,'color',color,'folder_id',folder_id)"
        }
        Entity::Task => {
            "jsonb_build_object('title',title,'description',description,'status',status,'tags',tags,'color',color,'priority',priority,'parent_id',parent_id,'due_at',due_at,'schedule',schedule)"
        }
    };
    let filter = if e == Entity::Task {
        " AND source_kind='manual'"
    } else {
        ""
    };
    Ok(sqlx::query_as(&format!(
        "SELECT {columns},updated_at FROM app.{} WHERE user_id=$1 AND id=$2{filter} FOR UPDATE",
        e.table()
    ))
    .bind(user)
    .bind(id)
    .fetch_optional(db)
    .await?)
}
fn merge(base: &mut Value, patch: &Value) -> Result<(), ApiError> {
    let object = base
        .as_object_mut()
        .ok_or_else(|| ApiError::validation("Action data must be an object"))?;
    for (k, v) in patch
        .as_object()
        .ok_or_else(|| ApiError::validation("Action data must be an object"))?
    {
        object.insert(k.clone(), v.clone());
    }
    Ok(())
}
async fn write(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    a: &Action,
    data: Value,
    create: bool,
) -> Result<(), ApiError> {
    match a.entity {
        Entity::Exercise => {
            let v: Exercise = serde_json::from_value(data)
                .map_err(|_| ApiError::validation("Invalid exercise action"))?;
            workouts::save_exercise_in(db, user, a.id, v, create).await?;
        }
        Entity::Workout => {
            let v: Workout = serde_json::from_value(data)
                .map_err(|_| ApiError::validation("Invalid workout action"))?;
            workouts::save_workout_in(db, user, a.id, v, create).await?;
        }
        Entity::Task => {
            let v: tasks::TaskInput = serde_json::from_value(data)
                .map_err(|_| ApiError::validation("Invalid task action"))?;
            tasks::save_in(s, db, user, a.id, v, create).await?;
        }
        Entity::Note => {
            let v: notes::NoteInput = serde_json::from_value(data)
                .map_err(|_| ApiError::validation("Invalid note action"))?;
            notes::save_note_in(db, user, a.id, v, create).await?;
        }
    }
    Ok(())
}
async fn remove(db: &mut PgConnection, user: Uuid, a: &Action) -> Result<(), ApiError> {
    match a.entity {
        Entity::Exercise => workouts::delete_exercise_in(db, user, a.id).await,
        Entity::Workout => workouts::delete_workout_in(db, user, a.id).await,
        Entity::Task => {
            let linked:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND parent_id=$2) OR EXISTS(SELECT 1 FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2)").bind(user).bind(a.id).fetch_one(&mut *db).await?;
            if linked {
                return Err(conflict());
            }
            tasks::delete_in(db, user, a.id).await
        }
        Entity::Note => notes::delete_note_in(db, user, a.id).await,
    }
}
fn denied() -> ApiError {
    ApiError::new(
        StatusCode::FORBIDDEN,
        "ai_action_denied",
        "Enable the entity permission and confirmed AI changes first",
    )
}
fn conflict() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "ai_action_conflict",
        "Data changed; review a fresh proposal",
    )
}
fn check_actions(actions: &[Action], p: &Permissions) -> Result<(), ApiError> {
    if actions.is_empty() || actions.len() > 20 {
        return Err(ApiError::validation("Use 1 to 20 actions"));
    }
    let mut ids = BTreeSet::new();
    for a in actions {
        if !a.entity.allowed(p) {
            return Err(denied());
        }
        if a.id.is_nil()
            || !ids.insert((a.entity, a.id))
            || !a.data.is_object()
            || (a.operation == Operation::Update && a.expected_updated_at.is_none())
            || (a.operation == Operation::Create && a.expected_updated_at.is_some())
        {
            return Err(ApiError::validation(
                "Use unique non-nil IDs, object data and an update version",
            ));
        }
    }
    Ok(())
}
async fn safety(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    changes: &[Change],
) -> Result<(), ApiError> {
    if !changes
        .iter()
        .any(|c| matches!(c.action.entity, Entity::Exercise | Entity::Workout))
    {
        return Ok(());
    }
    // Free text medical constraints cannot be safely classified by a model. Fail closed:
    // user retains the ordinary manual editor and can ask AI for discussion only.
    let encrypted: Option<Vec<u8>> =
        sqlx::query_scalar("SELECT encrypted_data FROM app.profiles WHERE user_id=$1 FOR SHARE")
            .bind(user)
            .fetch_optional(db)
            .await?;
    let health: profile::Profile = match encrypted {
        Some(bytes) => serde_json::from_slice(
            &s.cipher
                .decrypt(&bytes, format!("profile:{user}").as_bytes())?,
        )
        .map_err(|_| ApiError::internal())?,
        None => profile::Profile::default(),
    };
    if !health.conditions.is_empty()
        || !health.surgeries.is_empty()
        || !health.daily_medications.is_empty()
        || health.pregnant == Some(true)
    {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "ai_safety_review_required",
            "Known health restrictions require review in the manual workout editor",
        ));
    }

    Ok(())
}
async fn duplicate(
    db: &mut PgConnection,
    user: Uuid,
    e: Entity,
    title: &str,
) -> Result<bool, ApiError> {
    let column = if matches!(e, Entity::Exercise | Entity::Workout) {
        "data->>'title'"
    } else {
        "title"
    };
    Ok(sqlx::query_scalar(&format!("SELECT EXISTS(SELECT 1 FROM app.{} WHERE user_id=$1 AND lower(trim({column}))=lower(trim($2)))",e.table())).bind(user).bind(title).fetch_one(db).await?)
}

async fn prepare(
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
async fn check_exercise_links(
    db: &mut PgConnection,
    user: Uuid,
    changes: &[Change],
) -> Result<(), ApiError> {
    let new_ids: BTreeSet<_> = changes
        .iter()
        .filter(|c| c.action.entity == Entity::Exercise && c.action.operation == Operation::Create)
        .map(|c| c.action.id)
        .collect();
    for c in changes {
        if c.action.entity == Entity::Workout {
            let plan: Workout = serde_json::from_value(c.after.clone())
                .map_err(|_| ApiError::validation("Invalid workout"))?;
            for e in plan.rounds.iter().flat_map(|r| &r.exercises) {
                if !new_ids.contains(&e.exercise_id)
                    && !ai_access::exercise_visible(db, user, e.exercise_id).await?
                {
                    return Err(denied());
                }
            }
        }
    }
    Ok(())
}

async fn persist(
    db: &mut PgConnection,
    s: &AppState,
    user: Uuid,
    id: Uuid,
    status: &str,
    data: &Data,
) -> Result<View, ApiError> {
    sqlx::query("UPDATE app.ai_actions SET status=$3,encrypted_data=$4,updated_at=now() WHERE user_id=$1 AND id=$2").bind(user).bind(id).bind(status).bind(ai::seal(s,&context(user,id),data)?).execute(&mut *db).await?;
    domain::event(
        db,
        user,
        &format!("ai_actions_{status}"),
        "ai_action",
        id,
        json!({}),
    )
    .await?;
    view(s, user, row(db, user, id).await?)
}
async fn apply(
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
async fn undo(
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
async fn dismiss(
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

#[cfg(test)]
mod tests {
    use super::*;
    fn action() -> Action {
        Action {
            entity: Entity::Exercise,
            operation: Operation::Create,
            id: Uuid::new_v4(),
            expected_updated_at: None,
            data: json!({"title":"Test","kind":"repetitions"}),
        }
    }
    #[test]
    fn untrusted_actions_need_both_scopes_and_versions() {
        let a = action();
        assert!(check_actions(std::slice::from_ref(&a), &Permissions::default()).is_err());
        let p = Permissions {
            changes: true,
            workout_editor: true,
            ..Default::default()
        };
        assert!(check_actions(std::slice::from_ref(&a), &p).is_ok());
        assert!(check_actions(&[a.clone(), a.clone()], &p).is_err());
        let mut update = a;
        update.operation = Operation::Update;
        assert!(check_actions(&[update], &p).is_err());
        assert!(
            serde_json::from_value::<Action>(
                json!({"entity":"permissions","operation":"update","id":Uuid::new_v4(),"data":{}})
            )
            .is_err()
        );
    }
    #[test]
    fn patches_preserve_omitted_fields_and_reject_nonobjects() {
        let mut data =
            json!({"title":"Old","description":"Keep **Markdown**","images":[Uuid::new_v4()]});
        merge(&mut data, &json!({"title":"New"})).unwrap();
        assert_eq!(data["description"], "Keep **Markdown**");
        assert_eq!(data["images"].as_array().unwrap().len(), 1);
        assert!(merge(&mut data, &json!([])).is_err());
    }
}
