use super::models::{Action, COLUMNS, Change, Data, Entity, Operation, Row, View};
use crate::{
    infrastructure::state::AppState,
    modules::ai::access as ai_access,
    modules::ai::{self, Permissions},
    modules::notes,
    modules::profile,
    modules::tasks,
    modules::workouts,
    modules::workouts::plan::{Exercise, Workout},
    shared::domain,
    shared::errors::ApiError,
};
use axum::http::StatusCode;
use chrono::{DateTime, Utc};
use serde_json::{Value, json};
use sqlx::PgConnection;
use std::collections::BTreeSet;
use uuid::Uuid;

pub(super) fn context(user: Uuid, id: Uuid) -> String {
    format!("ai:actions:{user}:{id}")
}

pub(super) fn view(s: &AppState, user: Uuid, row: Row) -> Result<View, ApiError> {
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

pub(super) async fn row(db: &mut PgConnection, user: Uuid, id: Uuid) -> Result<Row, ApiError> {
    sqlx::query_as(&format!(
        "SELECT {COLUMNS} FROM app.ai_actions WHERE user_id=$1 AND id=$2 FOR UPDATE"
    ))
    .bind(user)
    .bind(id)
    .fetch_optional(db)
    .await?
    .ok_or_else(domain::not_found)
}

pub(super) async fn current(
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

pub(super) fn merge(base: &mut Value, patch: &Value) -> Result<(), ApiError> {
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

pub(super) async fn write(
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

pub(super) async fn remove(db: &mut PgConnection, user: Uuid, a: &Action) -> Result<(), ApiError> {
    match a.entity {
        Entity::Exercise => workouts::delete_exercise_in(db, user, a.id).await,
        Entity::Workout => workouts::delete_workout_in(db, user, a.id).await,
        Entity::Task => {
            let linked:bool=sqlx::query_scalar("SELECT EXISTS(SELECT 1 FROM app.tasks WHERE user_id=$1 AND parent_id=$2) OR EXISTS(SELECT 1 FROM app.task_occurrences WHERE user_id=$1 AND task_id=$2) OR EXISTS(SELECT 1 FROM app.board_items WHERE user_id=$1 AND task_id=$2)").bind(user).bind(a.id).fetch_one(&mut *db).await?;
            if linked {
                return Err(conflict());
            }
            tasks::delete_in(db, user, a.id).await
        }
        Entity::Note => notes::delete_note_in(db, user, a.id).await,
    }
}

pub(super) fn denied() -> ApiError {
    ApiError::new(
        StatusCode::FORBIDDEN,
        "ai_action_denied",
        "Enable the entity permission and confirmed AI changes first",
    )
}

pub(super) fn conflict() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "ai_action_conflict",
        "Data changed; review a fresh proposal",
    )
}

pub(super) fn check_actions(actions: &[Action], p: &Permissions) -> Result<(), ApiError> {
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

pub(super) async fn safety(
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

pub(super) async fn duplicate(
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

pub(super) async fn check_exercise_links(
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

pub(super) async fn persist(
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
