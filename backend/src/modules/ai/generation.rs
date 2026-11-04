use super::repository::{config, load_turn};
use super::service::{open, seal};
use crate::{
    infrastructure::state::AppState, modules::ai::login as ai_login,
    modules::ai::providers::responses as ai_provider, shared::errors::ApiError,
};
use std::time::Duration;
use uuid::Uuid;

pub(super) async fn generate(
    s: AppState,
    user: Uuid,
    chat: Uuid,
    id: Uuid,
) -> Result<(), ApiError> {
    let mut tx = s.database.begin().await?;
    let c = config(&mut tx, user).await?;
    let row = load_turn(&s, user, chat, id).await?;
    if row.status != "pending" || row.config_revision != c.revision || c.ready().is_err() {
        return Ok(());
    }
    let credential = if c.provider == "ollama" {
        Ok(String::new())
    } else if c.auth_mode == "login" {
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
        result=async { match credential { Ok(key) => if c.provider=="ollama"{crate::modules::ai::providers::ollama::generate(&c.ollama_url,&row.data.request).await}else{ai_provider::generate(&c.provider,&key,&row.data.request).await}, Err(code) => Err(code) } }=>result,
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

pub(super) async fn wait_for_cancel(s: &AppState, user: Uuid, chat: Uuid, id: Uuid) {
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
