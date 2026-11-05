use uuid::Uuid;

#[derive(serde::Deserialize)]
pub(super) struct FeedQuery {
    pub(super) from: chrono::NaiveDate,
    pub(super) to: chrono::NaiveDate,
    pub(super) before: Option<chrono::DateTime<chrono::Utc>>,
    pub(super) before_id: Option<Uuid>,
    pub(super) section: Option<String>,
    pub(super) operation: Option<String>,
    pub(super) text: Option<String>,
}

#[derive(serde::Serialize, sqlx::FromRow)]
pub(super) struct FeedItem {
    pub(super) id: Uuid,
    pub(super) section: String,
    pub(super) operation: String,
    pub(super) entity_key: String,
    pub(super) occurred_at: chrono::DateTime<chrono::Utc>,
}

#[derive(serde::Serialize)]
pub(super) struct Feed {
    pub(super) items: Vec<FeedItem>,
    pub(super) next_before: Option<chrono::DateTime<chrono::Utc>>,
    pub(super) next_id: Option<Uuid>,
}
