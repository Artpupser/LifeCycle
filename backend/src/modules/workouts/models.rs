use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Serialize, Deserialize, sqlx::FromRow)]
pub struct Record<T> {
    pub id: Uuid,
    pub data: DbJson<T>,
    #[serde(default)]
    #[sqlx(default)]
    pub ai_shared: bool,
    #[serde(default)]
    #[sqlx(default)]
    pub ai_access_revision: i64,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}
