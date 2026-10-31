use crate::{
    ai_context, ai_login, ai_provider,
    auth::CurrentUser,
    domain,
    error::{ApiError, ApiJson},
    state::AppState,
};
use axum::{
    Json, Router,
    extract::{Path, State},
    http::StatusCode,
    routing::get,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize, de::DeserializeOwned};
use serde_json::{Value, json};
use sqlx::{PgConnection, types::Json as DbJson};
use std::time::Duration;
use uuid::Uuid;

#[derive(Clone, Default, Debug, PartialEq, Serialize, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct Permissions {
    pub(crate) analytics: bool,
    pub(crate) tasks: bool,
    pub(crate) habits: bool,
    pub(crate) workouts: bool,
    pub(crate) notes: bool,
    pub(crate) profile: bool,
    pub(crate) intimacy: bool,
    #[serde(skip_serializing)]
    pub(crate) workout_editor: bool,
    #[serde(skip_serializing)]
    pub(crate) personalization: bool,
    pub(crate) changes: bool,
}

impl Permissions {
    pub(crate) fn training(&self) -> bool {
        self.workouts || self.workout_editor
    }
}

#[derive(sqlx::FromRow)]
pub(crate) struct Config {
    pub(crate) model: String,
    pub(crate) enabled: bool,
    pub(crate) permissions: DbJson<Permissions>,
    encrypted_key: Option<Vec<u8>>,
    encrypted_openrouter_key: Option<Vec<u8>>,
    pub(crate) provider: String,
    pub(crate) auth_mode: String,
    pub(crate) active_account_id: Option<Uuid>,
    pub(crate) revision: i64,
}
#[derive(Serialize)]
struct ConfigView {
    provider: String,
    auth_mode: String,
    active_account_id: Option<Uuid>,
    login_available: bool,
    model: String,
    enabled: bool,
    permissions: Permissions,
    key_present: bool,
    openai_key_present: bool,
    openrouter_key_present: bool,
    revision: i64,
}
impl Config {
    fn view(self, s: &AppState) -> ConfigView {
        let key_present = self.selected_key().is_some();
        let openai_key_present = self.encrypted_key.is_some();
        let openrouter_key_present = self.encrypted_openrouter_key.is_some();
        ConfigView {
            provider: self.provider,
            auth_mode: self.auth_mode,
            active_account_id: self.active_account_id,
            login_available: ai_login::available(s),
            model: self.model,
            enabled: self.enabled,
            permissions: self.permissions.0,
            key_present,
            openai_key_present,
            openrouter_key_present,
            revision: self.revision,
        }
    }
    fn ready(&self) -> Result<(), ApiError> {
        if !self.enabled
            || (self.auth_mode == "login" && self.active_account_id.is_none())
            || (self.auth_mode == "api_key" && self.selected_key().is_none())
        {
            return Err(ApiError::new(
                StatusCode::CONFLICT,
                "ai_not_configured",
                "Connect the selected provider and enable AI first",
            ));
        }
        Ok(())
    }
    fn selected_key(&self) -> Option<&Vec<u8>> {
        if self.provider == "openrouter" {
            self.encrypted_openrouter_key.as_ref()
        } else {
            self.encrypted_key.as_ref()
        }
    }
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ConfigInput {
    revision: i64,
    model: String,
    enabled: bool,
    permissions: Permissions,
    api_key: Option<String>,
    #[serde(default)]
    remove_key: bool,
    provider: Option<String>,
    auth_mode: Option<String>,
}
#[derive(Serialize, sqlx::FromRow)]
struct Chat {
    id: Uuid,
    version: i64,
    created_at: DateTime<Utc>,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PreviewInput {
    revision: i64,
    from: NaiveDate,
    to: NaiveDate,
    message: String,
    search: Option<String>,
}
#[derive(Serialize)]
struct Preview {
    id: Uuid,
    expires_at: DateTime<Utc>,
    config_revision: i64,
    history_turns: usize,
    request: Value,
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct SendInput {
    request_id: Uuid,
    preview_id: Uuid,
}
#[derive(Serialize, Deserialize)]
struct TurnData {
    request: Value,
    answer: Option<String>,
    usage: Option<Value>,
}
#[derive(sqlx::FromRow)]
struct TurnRow {
    id: Uuid,
    config_revision: i64,
    model: String,
    provider: String,
    status: String,
    error_code: Option<String>,
    encrypted_data: Vec<u8>,
    created_at: DateTime<Utc>,
    finished_at: Option<DateTime<Utc>>,
}
#[derive(Serialize)]
struct Turn {
    id: Uuid,
    config_revision: i64,
    model: String,
    provider: String,
    status: String,
    error_code: Option<String>,
    data: TurnData,
    created_at: DateTime<Utc>,
    finished_at: Option<DateTime<Utc>>,
}
const TURN_COLUMNS: &str =
    "id,config_revision,model,provider,status,error_code,encrypted_data,created_at,finished_at";

pub fn routes() -> Router<AppState> {
    Router::new()
        .route("/api/ai/settings", get(read_config).put(update_config))
        .route(
            "/api/ai/connections/{provider}",
            axum::routing::delete(remove_connection),
        )
        .route("/api/ai/chats", get(chats).post(create_chat))
        .route("/api/ai/chats/{id}", get(read_chat).delete(delete_chat))
        .route("/api/ai/chats/{id}/preview", axum::routing::post(preview))
        .route("/api/ai/chats/{id}/messages", axum::routing::post(send))
        .route(
            "/api/ai/chats/{chat}/messages/{id}",
            get(read_turn).delete(cancel_turn),
        )
}
#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct ConnectionRevision {
    revision: i64,
}
async fn remove_connection(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(provider): Path<String>,
    ApiJson(v): ApiJson<ConnectionRevision>,
) -> Result<StatusCode, ApiError> {
    if !["openai", "openrouter"].contains(&provider.as_str()) {
        return Err(domain::not_found());
    }
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(stale());
    }
    let column = if provider == "openai" {
        "encrypted_key"
    } else {
        "encrypted_openrouter_key"
    };
    sqlx::query(&format!("UPDATE app.ai_settings SET {column}=NULL,enabled=CASE WHEN provider=$2 AND auth_mode='api_key' THEN false ELSE enabled END,revision=revision+1,updated_at=now() WHERE user_id=$1"))
        .bind(u.id).bind(provider).execute(&mut *tx).await?;
    invalidate(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
pub(crate) fn stale() -> ApiError {
    ApiError::new(
        StatusCode::CONFLICT,
        "ai_stale",
        "Settings, conversation or preview changed; review a new preview",
    )
}
pub(crate) fn seal<T: Serialize>(
    s: &AppState,
    context: &str,
    value: &T,
) -> Result<Vec<u8>, ApiError> {
    s.cipher.encrypt(
        &serde_json::to_vec(value).map_err(|_| ApiError::internal())?,
        context.as_bytes(),
    )
}
pub(crate) fn open<T: DeserializeOwned>(
    s: &AppState,
    context: &str,
    bytes: &[u8],
) -> Result<T, ApiError> {
    serde_json::from_slice(&s.cipher.decrypt(bytes, context.as_bytes())?)
        .map_err(|_| ApiError::internal())
}
pub(crate) async fn config(db: &mut PgConnection, user: Uuid) -> Result<Config, ApiError> {
    sqlx::query("INSERT INTO app.ai_settings(user_id) VALUES($1) ON CONFLICT DO NOTHING")
        .bind(user)
        .execute(&mut *db)
        .await?;
    Ok(sqlx::query_as("SELECT model,enabled,permissions,encrypted_key,encrypted_openrouter_key,provider,auth_mode,active_account_id,revision FROM app.ai_settings WHERE user_id=$1 FOR UPDATE").bind(user).fetch_one(db).await?)
}
pub(crate) async fn invalidate(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("DELETE FROM app.ai_previews WHERE user_id=$1")
        .bind(user)
        .execute(&mut *db)
        .await?;
    sqlx::query("UPDATE app.ai_turns SET status='cancelled',error_code='ai_permissions_changed',finished_at=now() WHERE user_id=$1 AND status='pending'").bind(user).execute(&mut *db).await?;
    sqlx::query("DELETE FROM app.ai_login_attempts WHERE user_id=$1")
        .bind(user)
        .execute(db)
        .await?;
    Ok(())
}
async fn expire(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("UPDATE app.ai_turns SET status='failed',error_code='ai_interrupted',finished_at=now() WHERE user_id=$1 AND status='pending' AND created_at<now()-interval '2 minutes'").bind(user).execute(&mut *db).await?;
    sqlx::query("DELETE FROM app.ai_previews WHERE user_id=$1 AND expires_at<=now()")
        .bind(user)
        .execute(db)
        .await?;
    Ok(())
}
async fn read_config(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<ConfigView>, ApiError> {
    let mut tx = s.database.begin().await?;
    let v = config(&mut tx, u.id).await?.view(&s);
    expire(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(Json(v))
}
fn valid_model(model: &str, provider: &str) -> bool {
    !model.is_empty()
        && model.len() <= 100
        && model.bytes().all(|b| {
            b.is_ascii_alphanumeric()
                || b"-_.:".contains(&b)
                || (provider == "openrouter" && b == b'/')
        })
        && !model.contains("://")
}
async fn update_config(
    State(s): State<AppState>,
    u: CurrentUser,
    ApiJson(mut v): ApiJson<ConfigInput>,
) -> Result<Json<ConfigView>, ApiError> {
    v.permissions.workouts |= v.permissions.workout_editor;
    v.permissions.workout_editor = false;
    v.permissions.personalization = false;
    if v.remove_key && v.api_key.is_some() {
        return Err(ApiError::validation(
            "Use a valid Responses API model ID and one key action",
        ));
    }
    if let Some(key) = &v.api_key
        && (!(20..=512).contains(&key.len()) || !key.bytes().all(|b| b.is_ascii_graphic()))
    {
        return Err(ApiError::validation("Invalid API key format"));
    }
    let mut tx = s.database.begin().await?;
    let old = config(&mut tx, u.id).await?;
    if old.revision != v.revision {
        return Err(stale());
    }
    let provider = v.provider.as_deref().unwrap_or(&old.provider);
    let auth_mode = v.auth_mode.as_deref().unwrap_or(&old.auth_mode);
    if !["openai", "openrouter"].contains(&provider)
        || !["api_key", "login"].contains(&auth_mode)
        || (auth_mode == "login" && provider != "openai")
        || !valid_model(&v.model, provider)
        || (auth_mode == "login" && (v.api_key.is_some() || v.remove_key))
    {
        return Err(ApiError::validation(
            "Invalid provider, authentication method or model",
        ));
    }
    let mut encrypted_key = old.encrypted_key.clone();
    let mut encrypted_openrouter_key = old.encrypted_openrouter_key.clone();
    let selected = if provider == "openrouter" {
        &mut encrypted_openrouter_key
    } else {
        &mut encrypted_key
    };
    if v.remove_key {
        *selected = None;
    } else if let Some(key) = &v.api_key {
        let context = if provider == "openrouter" {
            format!("ai:openrouter-key:{}", u.id)
        } else {
            format!("ai:key:{}", u.id)
        };
        *selected = Some(seal(&s, &context, key)?);
    }
    if v.enabled
        && ((auth_mode == "api_key" && selected.is_none())
            || (auth_mode == "login" && old.active_account_id.is_none()))
    {
        return Err(ApiError::validation(
            "Connect the selected provider before enabling AI",
        ));
    }
    let changed = old.model != v.model
        || old.enabled != v.enabled
        || old.permissions.0 != v.permissions
        || old.provider != provider
        || old.auth_mode != auth_mode
        || v.api_key.is_some()
        || v.remove_key;
    let revision = old.revision + i64::from(changed);
    sqlx::query("UPDATE app.ai_settings SET model=$2,enabled=$3,permissions=$4,encrypted_key=$5,revision=$6,updated_at=now(),provider=$7,auth_mode=$8,encrypted_openrouter_key=$9 WHERE user_id=$1")
        .bind(u.id).bind(&v.model).bind(v.enabled).bind(DbJson(&v.permissions)).bind(&encrypted_key).bind(revision).bind(provider).bind(auth_mode).bind(&encrypted_openrouter_key).execute(&mut *tx).await?;
    if changed {
        invalidate(&mut tx, u.id).await?;
    }
    tx.commit().await?;
    Ok(Json(
        Config {
            model: v.model,
            enabled: v.enabled,
            permissions: DbJson(v.permissions),
            encrypted_key,
            encrypted_openrouter_key,
            provider: provider.to_owned(),
            auth_mode: auth_mode.to_owned(),
            active_account_id: old.active_account_id,
            revision,
        }
        .view(&s),
    ))
}
async fn chats(State(s): State<AppState>, u: CurrentUser) -> Result<Json<Vec<Chat>>, ApiError> {
    Ok(Json(sqlx::query_as("SELECT id,version,created_at FROM app.ai_chats WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 100").bind(u.id).fetch_all(&s.database).await?))
}
async fn create_chat(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<(StatusCode, Json<Chat>), ApiError> {
    let mut tx = s.database.begin().await?;
    config(&mut tx, u.id).await?;
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM app.ai_chats WHERE user_id=$1")
        .bind(u.id)
        .fetch_one(&mut *tx)
        .await?;
    if count >= 100 {
        return Err(domain::conflict(
            "Delete an old conversation before creating another",
        ));
    }
    let chat = sqlx::query_as(
        "INSERT INTO app.ai_chats(id,user_id) VALUES($1,$2) RETURNING id,version,created_at",
    )
    .bind(Uuid::new_v4())
    .bind(u.id)
    .fetch_one(&mut *tx)
    .await?;
    tx.commit().await?;
    Ok((StatusCode::CREATED, Json(chat)))
}
async fn require_chat(db: &mut PgConnection, user: Uuid, id: Uuid) -> Result<Chat, ApiError> {
    sqlx::query_as(
        "SELECT id,version,created_at FROM app.ai_chats WHERE id=$1 AND user_id=$2 FOR UPDATE",
    )
    .bind(id)
    .bind(user)
    .fetch_optional(db)
    .await?
    .ok_or_else(domain::not_found)
}
fn turn(s: &AppState, user: Uuid, chat: Uuid, row: TurnRow) -> Result<Turn, ApiError> {
    let data = open(
        s,
        &format!("ai:turn:{user}:{chat}:{}", row.id),
        &row.encrypted_data,
    )?;
    Ok(Turn {
        id: row.id,
        config_revision: row.config_revision,
        model: row.model,
        provider: row.provider,
        status: row.status,
        error_code: row.error_code,
        data,
        created_at: row.created_at,
        finished_at: row.finished_at,
    })
}
async fn history(s: &AppState, user: Uuid, chat: Uuid) -> Result<Vec<Turn>, ApiError> {
    let rows:Vec<TurnRow>=sqlx::query_as(&format!("SELECT {TURN_COLUMNS} FROM app.ai_turns WHERE user_id=$1 AND chat_id=$2 ORDER BY created_at,id")).bind(user).bind(chat).fetch_all(&s.database).await?;
    rows.into_iter()
        .map(|row| turn(s, user, chat, row))
        .collect()
}
async fn read_chat(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<Json<Value>, ApiError> {
    let mut tx = s.database.begin().await?;
    config(&mut tx, u.id).await?;
    expire(&mut tx, u.id).await?;
    let chat = require_chat(&mut tx, u.id, id).await?;
    let messages = history(&s, u.id, id).await?;
    tx.commit().await?;
    Ok(Json(json!({"chat":chat,"messages":messages})))
}
async fn delete_chat(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    config(&mut tx, u.id).await?;
    require_chat(&mut tx, u.id, id).await?;
    sqlx::query("DELETE FROM app.ai_chats WHERE user_id=$1 AND id=$2")
        .bind(u.id)
        .bind(id)
        .execute(&mut *tx)
        .await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}
fn question(request: &Value) -> &str {
    request["input"]
        .as_array()
        .and_then(|v| v.last())
        .and_then(|v| v["content"].as_str())
        .unwrap_or("")
}
fn allowed_history(messages: &[Turn], revision: i64) -> Vec<Value> {
    let selected: Vec<_> = messages
        .iter()
        .filter(|t| t.status == "completed" && t.config_revision == revision)
        .rev()
        .take(10)
        .collect();
    let mut output = Vec::new();
    for t in selected.into_iter().rev() {
        output.push(json!({"role":"user","content":question(&t.data.request)}));
        output.push(json!({"role":"assistant","content":t.data.answer}));
    }
    output
}
async fn preview(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<PreviewInput>,
) -> Result<Json<Preview>, ApiError> {
    domain::text(&v.message, 1, 8000)?;
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
    let mut context = ai_context::build(
        &s,
        u.id,
        &c.permissions.0,
        v.from,
        v.to,
        v.search.as_deref(),
    )
    .await?;
    if c.permissions.changes {
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
    let history = allowed_history(&messages, c.revision);
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
async fn load_turn(s: &AppState, user: Uuid, chat: Uuid, id: Uuid) -> Result<Turn, ApiError> {
    let row = sqlx::query_as(&format!(
        "SELECT {TURN_COLUMNS} FROM app.ai_turns WHERE user_id=$1 AND chat_id=$2 AND id=$3"
    ))
    .bind(user)
    .bind(chat)
    .bind(id)
    .fetch_optional(&s.database)
    .await?
    .ok_or_else(domain::not_found)?;
    turn(s, user, chat, row)
}
async fn rate_limit(s: &AppState, user: Uuid, request: Uuid) -> Result<(), ApiError> {
    let mut redis = s.redis.get_multiplexed_async_connection().await?;
    let seconds: u64 = redis::Script::new("local now=tonumber(ARGV[1]); redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',now-3600000); if redis.call('ZCARD',KEYS[1])>=50 then return 3600 end; if redis.call('ZCOUNT',KEYS[1],now-60000,'+inf')>=5 then return 60 end; redis.call('ZADD',KEYS[1],now,ARGV[2]); redis.call('PEXPIRE',KEYS[1],3600000); return 0")
        .key(format!("ai:requests:{user}"))
        .arg(Utc::now().timestamp_millis())
        .arg(request.to_string())
        .invoke_async(&mut redis).await?;
    if seconds > 0 {
        return Err(ApiError::rate_limited(seconds));
    }
    Ok(())
}
async fn send(
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
async fn read_turn(
    State(s): State<AppState>,
    u: CurrentUser,
    Path((chat, id)): Path<(Uuid, Uuid)>,
) -> Result<Json<Turn>, ApiError> {
    let mut db = s.database.acquire().await?;
    expire(&mut db, u.id).await?;
    Ok(Json(load_turn(&s, u.id, chat, id).await?))
}
async fn cancel_turn(
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
async fn generate(s: AppState, user: Uuid, chat: Uuid, id: Uuid) -> Result<(), ApiError> {
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, user).await?;
    let row = load_turn(&s, user, chat, id).await?;
    if row.status != "pending" || row.config_revision != c.revision || c.ready().is_err() {
        return Ok(());
    }
    let credential = if c.auth_mode == "login" {
        ai_login::access(&s, &mut tx, user, c.active_account_id.unwrap()).await
    } else {
        let context = if c.provider == "openrouter" {
            format!("ai:openrouter-key:{user}")
        } else {
            format!("ai:key:{user}")
        };
        open::<String>(&s, &context, c.selected_key().unwrap()).map_err(|_| "ai_credentials")
    };
    tx.commit().await?;
    let result = tokio::select! {
        result=async { match credential { Ok(key) => ai_provider::generate(&c.provider,&key,&row.data.request).await, Err(code) => Err(code) } }=>result,
        _=wait_for_cancel(&s,user,chat,id)=>return Ok(()),
    };
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, user).await?;
    if c.revision != row.config_revision {
        return Ok(());
    }
    let mut data = row.data;
    let (status, code) = match result {
        Ok(answer) => {
            data.answer = Some(answer.text);
            data.usage = Some(answer.usage);
            ("completed", None)
        }
        Err(code) => ("failed", Some(code)),
    };
    let bytes = seal(&s, &format!("ai:turn:{user}:{chat}:{id}"), &data)?;
    sqlx::query("UPDATE app.ai_turns SET status=$4,error_code=$5,encrypted_data=$6,finished_at=now() WHERE user_id=$1 AND chat_id=$2 AND id=$3 AND status='pending'").bind(user).bind(chat).bind(id).bind(status).bind(code).bind(bytes).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(())
}
async fn wait_for_cancel(s: &AppState, user: Uuid, chat: Uuid, id: Uuid) {
    loop {
        tokio::time::sleep(Duration::from_millis(300)).await;
        let state = sqlx::query_scalar::<_, String>(
            "SELECT status FROM app.ai_turns WHERE user_id=$1 AND chat_id=$2 AND id=$3",
        )
        .bind(user)
        .bind(chat)
        .bind(id)
        .fetch_optional(&s.database)
        .await;
        if !matches!(state,Ok(Some(status)) if status=="pending") {
            return;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn permissions_default_off_and_reject_unknown_scopes() {
        assert_eq!(
            serde_json::from_value::<Permissions>(json!({})).unwrap(),
            Permissions::default()
        );
        assert!(serde_json::from_value::<Permissions>(json!({"everything":true})).is_err());
        assert!(valid_model("gpt-4.1-mini", "openai"));
        assert!(!valid_model("https://other-host/", "openrouter"));
        assert!(!valid_model("gpt\r\nsecret", "openai"));
    }
    #[test]
    fn permission_changes_exclude_old_messages_from_new_requests() {
        let make = |revision, status: &str| Turn {
            id: Uuid::new_v4(),
            config_revision: revision,
            model: "model".into(),
            provider: "openai".into(),
            status: status.into(),
            error_code: None,
            data: TurnData {
                request: json!({"input":[{"content":"Private question"}]}),
                answer: Some("Private answer".into()),
                usage: None,
            },
            created_at: Utc::now(),
            finished_at: None,
        };
        let messages = vec![
            make(1, "completed"),
            make(2, "failed"),
            make(2, "completed"),
        ];
        assert_eq!(allowed_history(&messages, 3).len(), 0);
        assert_eq!(allowed_history(&messages, 2).len(), 2);
        assert_eq!(
            allowed_history(&messages, 1)[1]["content"],
            "Private answer"
        );
    }
}
