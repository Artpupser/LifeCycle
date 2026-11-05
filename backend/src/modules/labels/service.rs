use super::models::{Data, Label, Row};
use crate::{
    infrastructure::state::AppState, modules::contacts, shared::domain, shared::errors::ApiError,
};

use hmac::{Hmac, Mac};
use sha2::Sha256;
use sqlx::PgConnection;
use uuid::Uuid;

pub(super) fn key(s: &AppState, user: Uuid, kind: &str, name: &str) -> String {
    let mut mac = Hmac::<Sha256>::new_from_slice(&s.config.data_encryption_key).expect("HMAC key");
    mac.update(format!("label:{user}:{kind}:{}", name.trim().to_lowercase()).as_bytes());
    mac.finalize()
        .into_bytes()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect()
}

pub(super) fn encode(s: &AppState, user: Uuid, id: Uuid, data: &Data) -> Result<Vec<u8>, ApiError> {
    s.cipher.encrypt(
        &serde_json::to_vec(data).map_err(|_| ApiError::internal())?,
        format!("label:{user}:{id}").as_bytes(),
    )
}

pub(super) fn decode(s: &AppState, user: Uuid, row: Row) -> Result<Label, ApiError> {
    let data: Data = serde_json::from_slice(&s.cipher.decrypt(
        &row.encrypted_data,
        format!("label:{user}:{}", row.id).as_bytes(),
    )?)
    .map_err(|_| ApiError::internal())?;
    Ok(Label {
        id: row.id,
        name: data.name,
        color: data.color,
        kind: row.kind,
        icon: data.icon,
        function_key: row.function_key,
        is_system: row.is_system,
        repeatable: row.repeatable,
        revision: row.revision,
    })
}

pub(super) async fn lock(db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    sqlx::query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))")
        .bind(format!("labels:{user}"))
        .execute(db)
        .await?;
    Ok(())
}

pub(crate) async fn register(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    names: &[String],
) -> Result<(), ApiError> {
    register_kind(s, db, user, "tag", names).await
}

pub(super) async fn register_kind(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    kind: &str,
    names: &[String],
) -> Result<(), ApiError> {
    lock(db, user).await?;
    for name in names {
        let id = Uuid::new_v4();
        let data = Data {
            name: name.trim().into(),
            color: domain::default_color(),
            icon: None,
        };
        if data.name.is_empty() {
            continue;
        }
        domain::text(&data.name, 1, 64)?;
        sqlx::query("INSERT INTO app.labels(id,user_id,kind,name_key,encrypted_data) VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id,kind,name_key) DO NOTHING").bind(id).bind(user).bind(kind).bind(key(s,user,kind,name)).bind(encode(s,user,id,&data)?).execute(&mut *db).await?;
    }
    Ok(())
}

pub(super) async fn all(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
) -> Result<Vec<Label>, ApiError> {
    let rows: Vec<Row> = sqlx::query_as(
        "SELECT id,kind,function_key,is_system,repeatable,encrypted_data,revision FROM app.labels WHERE user_id=$1",
    )
    .bind(user)
    .fetch_all(db)
    .await?;
    rows.into_iter().map(|row| decode(s, user, row)).collect()
}

pub(super) async fn sync(s: &AppState, db: &mut PgConnection, user: Uuid) -> Result<(), ApiError> {
    let legacy: Vec<(Uuid, String, String)> =
        sqlx::query_as("SELECT id,name,color FROM app.legacy_task_tags WHERE user_id=$1")
            .bind(user)
            .fetch_all(&mut *db)
            .await?;
    for (legacy_id, name, color) in legacy {
        let id = sqlx::query_scalar::<_, Uuid>(
            "SELECT id FROM app.labels WHERE user_id=$1 AND kind='tag' AND name_key=$2",
        )
        .bind(user)
        .bind(key(s, user, "tag", &name))
        .fetch_optional(&mut *db)
        .await?
        .unwrap_or(legacy_id);
        let data = Data {
            name: name.clone(),
            color,
            icon: None,
        };
        sqlx::query("INSERT INTO app.labels(id,user_id,kind,name_key,encrypted_data) VALUES($1,$2,'tag',$3,$4) ON CONFLICT(user_id,kind,name_key) DO UPDATE SET encrypted_data=EXCLUDED.encrypted_data").bind(id).bind(user).bind(key(s,user,"tag",&name)).bind(encode(s,user,id,&data)?).execute(&mut *db).await?;
    }
    sqlx::query("DELETE FROM app.legacy_task_tags WHERE user_id=$1")
        .bind(user)
        .execute(&mut *db)
        .await?;
    let names:Vec<String>=sqlx::query_scalar("SELECT DISTINCT value FROM (SELECT tags FROM app.tasks WHERE user_id=$1 UNION ALL SELECT tags FROM app.notes WHERE user_id=$1 UNION ALL SELECT tags FROM app.countdowns WHERE user_id=$1 UNION ALL SELECT coalesce(data->'tags','[]'::jsonb) FROM app.workouts WHERE user_id=$1) t CROSS JOIN LATERAL jsonb_array_elements_text(tags) value").bind(user).fetch_all(&mut *db).await?;
    register(s, db, user, &names).await?;
    for c in contacts::all(s, user, db).await? {
        register(s, db, user, &c.data.tags).await?;
        register_kind(s, db, user, "category", &c.data.categories).await?;
    }
    Ok(())
}

pub(super) async fn propagate(
    s: &AppState,
    db: &mut PgConnection,
    user: Uuid,
    label: &Label,
    replacement: Option<&str>,
) -> Result<(), ApiError> {
    if ["toy", "emotion", "setting"].contains(&label.kind.as_str()) {
        return crate::modules::intimacy::rename_collection(
            s,
            db,
            user,
            &label.kind,
            &label.name,
            replacement,
        )
        .await;
    }
    if label.kind == "category" && replacement.is_none() {
        sqlx::query("UPDATE app.countdowns SET category='other',updated_at=clock_timestamp() WHERE user_id=$1 AND category=$2").bind(user).bind(format!("custom:{}",label.id)).execute(&mut *db).await?;
    }
    if label.kind == "tag" {
        for table in ["tasks", "notes", "countdowns"] {
            let sql = format!(
                "UPDATE app.{table} SET tags=coalesce((SELECT jsonb_agg(DISTINCT value) FROM (SELECT CASE WHEN lower(value)=lower($2) THEN $3 ELSE value END AS value FROM jsonb_array_elements_text(tags) value) t WHERE value IS NOT NULL),'[]'::jsonb),updated_at=clock_timestamp() WHERE user_id=$1 AND EXISTS(SELECT 1 FROM jsonb_array_elements_text(tags) value WHERE lower(value)=lower($2))"
            );
            sqlx::query(&sql)
                .bind(user)
                .bind(&label.name)
                .bind(replacement)
                .execute(&mut *db)
                .await?;
        }
        sqlx::query("UPDATE app.workouts SET data=jsonb_set(data,'{tags}',coalesce((SELECT jsonb_agg(DISTINCT value) FROM (SELECT CASE WHEN lower(value)=lower($2) THEN $3 ELSE value END AS value FROM jsonb_array_elements_text(coalesce(data->'tags','[]'::jsonb)) value) t WHERE value IS NOT NULL),'[]'::jsonb)),updated_at=clock_timestamp() WHERE user_id=$1").bind(user).bind(&label.name).bind(replacement).execute(&mut *db).await?;
    }
    for mut c in contacts::all(s, user, db).await? {
        let values = if label.kind == "tag" {
            &mut c.data.tags
        } else {
            &mut c.data.categories
        };
        let mut changed = false;
        for value in values.iter_mut() {
            if value.to_lowercase() == label.name.to_lowercase() {
                *value = replacement.unwrap_or("").into();
                changed = true;
            }
        }
        values.retain(|v| !v.is_empty());
        if changed {
            let bytes = s.cipher.encrypt(
                &serde_json::to_vec(&c.data).map_err(|_| ApiError::internal())?,
                format!("contact:{user}:{}", c.id).as_bytes(),
            )?;
            sqlx::query("UPDATE app.contacts SET encrypted_data=$3,revision=revision+1,updated_at=clock_timestamp() WHERE user_id=$1 AND id=$2").bind(user).bind(c.id).bind(bytes).execute(&mut *db).await?;
        }
    }
    Ok(())
}

pub(super) fn validate_icon(icon: Option<&str>) -> Result<(), ApiError> {
    if let Some(icon) = icon
        && (icon.len() > 128
            || icon.split(':').count() != 2
            || icon.split(':').any(str::is_empty)
            || !icon
                .bytes()
                .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || b":-_".contains(&c)))
    {
        return Err(ApiError::validation("Invalid icon identifier"));
    }
    Ok(())
}
