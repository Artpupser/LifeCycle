use super::models::{
    Account, AttemptQuery, Callback, DisconnectInput, Pending, Revision, StartInput,
};
use super::service::{
    access, account, account_context, authorization_url, available, exchange, failure, hash,
    pending_context, random, redirect_uri, revoke, session_hash, store_account,
};
use crate::{
    infrastructure::state::AppState,
    modules::ai,
    modules::ai::providers::responses as ai_provider,
    shared::auth::CurrentUser,
    shared::errors::{ApiError, ApiJson},
};
use axum::{
    Json,
    extract::{Path, Query, State},
    http::{HeaderMap, StatusCode},
    response::Redirect,
};
use serde_json::{Value, json};
use uuid::Uuid;

pub(super) async fn start(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    ApiJson(v): ApiJson<StartInput>,
) -> Result<Json<Value>, ApiError> {
    if !available(&s) {
        return Err(failure("ai_login_local_only"));
    }
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(ai::stale());
    }
    let old = if let Some(id) = v.account_id {
        Some(account(&s, &mut tx, u.id, id).await?)
    } else {
        None
    };
    let count: i64 = sqlx::query_scalar("SELECT count(*) FROM app.ai_accounts WHERE user_id=$1")
        .bind(u.id)
        .fetch_one(&mut *tx)
        .await?;
    if old.is_none() && count >= 10 {
        return Err(failure("ai_account_limit"));
    }
    sqlx::query(
        "INSERT INTO app.ai_runtime(singleton,host_id) VALUES(true,$1) ON CONFLICT DO NOTHING",
    )
    .bind(Uuid::new_v4())
    .execute(&mut *tx)
    .await?;
    let host: Uuid = sqlx::query_scalar("SELECT host_id FROM app.ai_runtime WHERE singleton")
        .fetch_one(&mut *tx)
        .await?;
    let id = Uuid::new_v4();
    let pending = Pending {
        state: random(),
        nonce: random(),
        verifier: random(),
        session_hash: session_hash(&headers)?,
        redirect_uri: redirect_uri(&s),
        host_id: format!("urn:uuid:{host}"),
        account_id: v.account_id,
        account: old,
        result: None,
        registered_client: None,
    };
    sqlx::query("DELETE FROM app.ai_login_attempts WHERE user_id=$1 OR expires_at<=now()")
        .bind(u.id)
        .execute(&mut *tx)
        .await?;
    sqlx::query("INSERT INTO app.ai_login_attempts(id,user_id,config_revision,state_hash,encrypted_data,phase) VALUES($1,$2,$3,$4,$5,'created')")
        .bind(id).bind(u.id).bind(c.revision).bind(hash(&pending.state)).bind(ai::seal(&s,&pending_context(u.id,id),&pending)?).execute(&mut *tx).await?;
    tx.commit().await?;
    Ok(Json(
        json!({"url":format!("/api/ai/login/authorize?id={id}")}),
    ))
}

pub(super) async fn authorize(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    Query(q): Query<AttemptQuery>,
) -> Result<Redirect, ApiError> {
    let bytes:Vec<u8>=sqlx::query_scalar("UPDATE app.ai_login_attempts SET phase='launched' WHERE id=$1 AND user_id=$2 AND phase='created' AND expires_at>now() RETURNING encrypted_data")
        .bind(q.id).bind(u.id).fetch_optional(&s.database).await?.ok_or_else(|| failure("ai_login_expired"))?;
    let p: Pending = ai::open(&s, &pending_context(u.id, q.id), &bytes)?;
    if p.session_hash != session_hash(&headers)? {
        return Err(failure("ai_login_expired"));
    }
    Ok(Redirect::to(authorization_url(&p).as_str()))
}

pub(super) async fn callback(
    State(s): State<AppState>,
    Query(q): Query<Callback>,
) -> Result<Redirect, ApiError> {
    if q.state.len() != 43 {
        return Err(failure("ai_login_invalid"));
    }
    let row:Option<(Uuid,Uuid,Vec<u8>)>=sqlx::query_as("UPDATE app.ai_login_attempts SET phase='exchanging' WHERE state_hash=$1 AND phase='launched' AND expires_at>now() RETURNING id,user_id,encrypted_data")
        .bind(hash(&q.state)).fetch_optional(&s.database).await?;
    let (id, user, bytes) = row.ok_or_else(|| failure("ai_login_expired"))?;
    let mut p: Pending = ai::open(&s, &pending_context(user, id), &bytes)?;
    let result = exchange(&mut p, &q).await;
    let error = result.as_ref().err().copied();
    p.result = result.ok();
    sqlx::query("UPDATE app.ai_login_attempts SET encrypted_data=$2,phase=$3,error_code=$4 WHERE id=$1 AND phase='exchanging'")
        .bind(id).bind(ai::seal(&s,&pending_context(user,id),&p)?).bind(if error.is_some(){"failed"}else{"ready"}).bind(error).execute(&s.database).await?;
    Ok(Redirect::to(
        s.config
            .public_url
            .join(&format!("api/ai/login/complete?id={id}"))
            .unwrap()
            .as_str(),
    ))
}

pub(super) async fn complete(
    State(s): State<AppState>,
    u: CurrentUser,
    headers: HeaderMap,
    Query(q): Query<AttemptQuery>,
) -> Result<Redirect, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    let row:Option<(Vec<u8>,i64,Option<String>)>=sqlx::query_as("DELETE FROM app.ai_login_attempts WHERE id=$1 AND user_id=$2 AND phase IN ('ready','failed') AND expires_at>now() RETURNING encrypted_data,config_revision,error_code")
        .bind(q.id).bind(u.id).fetch_optional(&mut *tx).await?;
    let (bytes, revision, error) = row.ok_or_else(|| failure("ai_login_expired"))?;
    let p: Pending = ai::open(&s, &pending_context(u.id, q.id), &bytes)?;
    if p.session_hash != session_hash(&headers)? || revision != c.revision {
        return Err(ai::stale());
    }
    if let Some(code) = error {
        if p.account_id.is_none()
            && let Some(client_id) = p.registered_client
        {
            let registration = Account {
                client_id,
                subject: String::new(),
                email: None,
                credentials: None,
            };
            store_account(&s, &mut tx, u.id, q.id, &registration).await?;
        }
        tx.commit().await?;
        return Ok(Redirect::to(&format!("/ai?login_error={code}")));
    }
    let result = p.result.ok_or_else(|| failure("ai_login_invalid"))?;
    let id = p.account_id.unwrap_or_else(Uuid::new_v4);
    store_account(&s, &mut tx, u.id, id, &result).await?;
    sqlx::query("UPDATE app.ai_settings SET active_account_id=$2,provider='openai',auth_mode='login',enabled=false,revision=revision+1,updated_at=now() WHERE user_id=$1").bind(u.id).bind(id).execute(&mut *tx).await?;
    ai::invalidate(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(Redirect::to("/ai?login=connected"))
}

pub(super) async fn accounts(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Value>, ApiError> {
    let rows: Vec<(Uuid, Vec<u8>)> = sqlx::query_as(
        "SELECT id,encrypted_data FROM app.ai_accounts WHERE user_id=$1 ORDER BY id",
    )
    .bind(u.id)
    .fetch_all(&s.database)
    .await?;
    let mut items = Vec::new();
    for (id, bytes) in rows {
        let a: Account = ai::open(&s, &account_context(u.id, id), &bytes)?;
        items.push(json!({"id":id,"email":a.email,"label":format!("ChatGPT · {}",&id.to_string()[..8]),"connected":a.credentials.is_some()}));
    }
    Ok(Json(json!(items)))
}

pub(super) async fn select(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<Revision>,
) -> Result<StatusCode, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(ai::stale());
    }
    let a = account(&s, &mut tx, u.id, id).await?;
    if a.credentials.is_none() {
        return Err(failure("ai_login_required"));
    }
    sqlx::query("UPDATE app.ai_settings SET active_account_id=$2,provider='openai',auth_mode='login',enabled=false,revision=revision+1,updated_at=now() WHERE user_id=$1").bind(u.id).bind(id).execute(&mut *tx).await?;
    ai::invalidate(&mut tx, u.id).await?;
    tx.commit().await?;
    Ok(StatusCode::NO_CONTENT)
}

pub(super) async fn disconnect(
    State(s): State<AppState>,
    u: CurrentUser,
    Path(id): Path<Uuid>,
    ApiJson(v): ApiJson<DisconnectInput>,
) -> Result<Json<Value>, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    if c.revision != v.revision {
        return Err(ai::stale());
    }
    let mut a = account(&s, &mut tx, u.id, id).await?;
    let credentials = a.credentials.take();
    sqlx::query("UPDATE app.ai_settings SET enabled=CASE WHEN active_account_id=$2 AND auth_mode='login' THEN false ELSE enabled END,active_account_id=CASE WHEN active_account_id=$2 THEN NULL ELSE active_account_id END,revision=revision+1,updated_at=now() WHERE user_id=$1").bind(u.id).bind(id).execute(&mut *tx).await?;
    ai::invalidate(&mut tx, u.id).await?;
    if v.forget {
        sqlx::query("DELETE FROM app.ai_accounts WHERE user_id=$1 AND id=$2")
            .bind(u.id)
            .bind(id)
            .execute(&mut *tx)
            .await?;
    } else {
        store_account(&s, &mut tx, u.id, id, &a).await?;
    }
    tx.commit().await?;
    let confirmed = if let Some(token) = credentials {
        revoke(&a.client_id, &token.refresh_token).await.is_ok()
    } else {
        true
    };
    Ok(Json(
        json!({"remote_revoked":confirmed,"forgotten":v.forget}),
    ))
}

pub(super) async fn models(
    State(s): State<AppState>,
    u: CurrentUser,
) -> Result<Json<Value>, ApiError> {
    let mut tx = s.database.begin().await?;
    let c = ai::config(&mut tx, u.id).await?;
    let id = c
        .active_account_id
        .ok_or_else(|| failure("ai_login_required"))?;
    let token = access(&s, &mut tx, u.id, id).await;
    tx.commit().await?;
    let token = token.map_err(failure)?;
    let response = ai_provider::client(4)
        .map_err(failure)?
        .get("https://api.openai.com/v1/models")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|_| failure("ai_login_unavailable"))?;
    if !response.status().is_success() {
        return Err(failure("ai_login_required"));
    }
    let value = ai_provider::bounded_json_limit(response, 2 * 1024 * 1024)
        .await
        .map_err(failure)?;
    let models: Vec<_> = value["models"]
        .as_array()
        .ok_or_else(|| failure("ai_invalid_response"))?
        .iter()
        .filter(|m| m["visibility"] == "list")
        .filter_map(|m| Some(json!({"id":m["slug"].as_str()?,"name":m["display_name"].as_str()?})))
        .collect();
    Ok(Json(json!(models)))
}
