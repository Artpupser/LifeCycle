use super::dto::{PreviewInput, SendInput};
use super::generation::generate;
use super::models::{Preview, Turn, TurnData};
use super::repository::{config, expire, history, load_turn, require_chat};
use super::service::{allowed_history, open, rate_limit, seal, stale};
use crate::{
    infrastructure::state::AppState,
    modules::ai::context as ai_context,
    modules::ai::providers::responses as ai_provider,
    shared::auth::CurrentUser,
    shared::domain,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn preview(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<PreviewInput>,
) -> Result<Json<Preview>, ApiError> {
    domain::text(&v.message, 1, 8000)?;
    let greeting = match v.scenario.as_deref() {
        None | Some("assistant") => false,
        Some("greeting") => true,
        _ => return Err(ApiError::validation("Unsupported AI scenario")),
    };
    ai_context::validate_range(v.from, v.to)?;
    if let Some(search) = &v.search {
        domain::text(search, 0, 200)?;
    }
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(stale());
    }
    let chat = require_chat(&mut tx, u.id, id).await?;
    expire(&mut tx, u.id).await?;
    let messages = history(&s, u.id, id).await?;
    if messages.len() >= 200 {
        return Err(domain::conflict(
            "This chat has reached 200 requests; start a new chat",
        ));
    }
    if messages.iter().any(|m| m.status == "pending") {
        return Err(domain::conflict("Wait for or cancel the pending request"));
    }
    let mut context = if greeting {
        json!({"scenario":"greeting","selection":"Use only the information manually entered in this message. No application records, contacts, profile, notes, history or tools. Produce a greeting for the owner to review; do not send it to anyone."})
    } else {
        ai_context::build(
            &s,
            u.id,
            &c.permissions.0,
            v.from,
            v.to,
            v.search.as_deref(),
        )
        .await?
    };
    if !greeting && c.permissions.changes {
        let mut entities = Vec::new();
        if c.permissions.training() {
            entities.extend(["exercise", "workout"]);
        }
        if c.permissions.tasks {
            entities.push("task");
        }
        if c.permissions.notes {
            entities.push("note");
        }
        if !entities.is_empty() {
            context["action_protocol"] = json!({"version":1,"entities":entities,"max_actions":20,"confirmation_required":true,"read":"Only records included in this exact preview. IDs and updated_at identify source facts; missing/truncated data must not be guessed.","writes":"Deferred proposals via /api/ai/actions; create or patch only. No deletes, permission changes, provider access or contacts."});
        }
    }
    let history = if greeting {
        vec![]
    } else {
        allowed_history(&messages, c.revision)
    };
    let history_turns = history.len() / 2;
    let request = ai_provider::payload(
        &c.provider,
        c.auth_mode == "login",
        &c.model,
        history,
        &context,
        &v.message,
    );
    if serde_json::to_vec(&request)
        .map_err(|_| ApiError::internal())?
        .len()
        > 256 * 1024
    {
        return Err(ApiError::new(
            StatusCode::PAYLOAD_TOO_LARGE,
            "ai_context_too_large",
            "Narrow the date range, permissions or start a new chat",
        ));
    }
    sqlx::query("DELETE FROM app.ai_previews WHERE user_id=$1 AND chat_id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    let preview_id = Uuid::new_v4();
    let bytes = seal(
        &s,
        &format!("ai:preview:{}:{id}:{preview_id}", u.id),
        &request,
    )?;
    let expires_at=sqlx::query_scalar("INSERT INTO app.ai_previews(id,user_id,chat_id,chat_version,config_revision,encrypted_data) VALUES($1,$2,$3,$4,$5,$6) RETURNING expires_at").bind(preview_id).bind(u.id).bind(id).bind(chat.version).bind(c.revision).bind(bytes).fetch_one(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(Preview {
        id: preview_id,
        expires_at,
        config_revision: c.revision,
        history_turns,
        request,
    }))
}

pub(super) async fn send(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(chat_id): Path<Uuid>,
    ApiJson(v): ApiJson<SendInput>,
) -> Result<(StatusCode, Json<Turn>), ApiError> {
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, u.id).await?;
    let chat = require_chat(&mut tx, u.id, chat_id).await?;
    expire(&mut tx, u.id).await?;
    let existing: Option<(Uuid, Uuid)> =
        sqlx::query_as("SELECT chat_id,preview_id FROM app.ai_turns WHERE id=$1 AND user_id=$2")
            .bind(v.request_id)
            .bind(u.id)
            .fetch_optional(&mut *tx)
            .await?;
    if let Some((old_chat, preview)) = existing {
        if old_chat != chat_id || preview != v.preview_id {
            return Err(stale());
        }
        tx.commit().await?;
        return Ok((
            StatusCode::OK,
            Json(load_turn(&s, u.id, chat_id, v.request_id).await?),
        ));
    }
    c.ready()?;
    let pending: bool = sqlx::query_scalar(
        "SELECT EXISTS(SELECT 1 FROM app.ai_turns WHERE user_id=$1 AND status='pending')",
    )
    .bind(u.id)
    .fetch_one(&mut *tx)
    .await?;
    if pending {
        return Err(ApiError::new(
            StatusCode::CONFLICT,
            "ai_busy",
            "A request is already pending",
        ));
    }
    let row:Option<(i64,i64,Vec<u8>)>=sqlx::query_as("SELECT chat_version,config_revision,encrypted_data FROM app.ai_previews WHERE id=$1 AND user_id=$2 AND chat_id=$3 AND expires_at>now()").bind(v.preview_id).bind(u.id).bind(chat_id).fetch_optional(&mut *tx).await?;
    let (version, revision, bytes) = row.ok_or_else(stale)?;
    if version != chat.version || revision != c.revision {
        return Err(stale());
    }
    let request: Value = open(
        &s,
        &format!("ai:preview:{}:{chat_id}:{}", u.id, v.preview_id),
        &bytes,
    )?;
    let data = TurnData {
        request,
        answer: None,
        usage: None,
    };
    let encrypted = seal(
        &s,
        &format!("ai:turn:{}:{chat_id}:{}", u.id, v.request_id),
        &data,
    )?;
    rate_limit(&s, u.id, v.request_id).await?;
    sqlx::query("INSERT INTO app.ai_turns(id,user_id,chat_id,preview_id,config_revision,model,status,encrypted_data,provider) VALUES($1,$2,$3,$4,$5,$6,'pending',$7,$8)").bind(v.request_id).bind(u.id).bind(chat_id).bind(v.preview_id).bind(c.revision).bind(&c.model).bind(encrypted).bind(&c.provider).execute(&mut *tx).await?;
    sqlx::query("UPDATE app.ai_chats SET version=version+1 WHERE id=$1 AND user_id=$2")
        .bind(chat_id)
        .bind(u.id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("DELETE FROM app.ai_previews WHERE id=$1 AND user_id=$2")
        .bind(v.preview_id)
        .bind(u.id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    let worker = s.clone();
    tokio::spawn(async move {
        if generate(worker.clone(), u.id, chat_id, v.request_id)
            .await
            .is_err()
        {
            let _=sqlx::query("UPDATE app.ai_turns SET status='failed',error_code='ai_interrupted',finished_at=now() WHERE user_id=$1 AND id=$2 AND status='pending'").bind(u.id).bind(v.request_id).execute(&worker.database).await;
        }
    });
    Ok((
        StatusCode::ACCEPTED,
        Json(load_turn(&s, u.id, chat_id, v.request_id).await?),
    ))
}

pub(super) async fn read_turn(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((chat, id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Turn>, ApiError> {
    let mut db = s.database.acquire().await?;
    expire(&mut db, u.id).await?;
    Ok(Json(load_turn(&s, u.id, chat, id).await?))
}

pub(super) async fn cancel_turn(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((chat, id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Turn>, ApiError> {
    let mut tx = s.database.begin().await?;
    config(&mut tx, u.id).await?;
    require_chat(&mut tx, u.id, chat).await?;
    sqlx::query("UPDATE app.ai_turns SET status='cancelled',error_code='ai_cancelled',finished_at=now() WHERE id=$1 AND chat_id=$2 AND user_id=$3 AND status='pending'").bind(id).bind(chat).bind(u.id).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(load_turn(&s, u.id, chat, id).await?))
}
