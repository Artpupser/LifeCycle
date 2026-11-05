use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Input {
    pub(crate) ai_shared: bool,
    pub(crate) revision: i64,
}

#[derive(Serialize, sqlx::FromRow)]
pub(crate) struct Access {
    pub(crate) ai_shared: bool,
    pub(crate) ai_access_revision: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BulkItem {
    pub(super) id: Uuid,
    pub(super) revision: i64,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct BulkInput {
    pub(super) items: Vec<BulkItem>,
    pub(crate) ai_shared: bool,
    pub(super) confirmed: bool,
}

#[derive(Serialize)]
pub(super) struct BulkAccess {
    pub(super) id: Uuid,
    #[serde(flatten)]
    pub(super) access: Access,
}
