use serde::Serialize;
use uuid::Uuid;

pub(super) const MAX_BYTES: usize = 8 * 1024 * 1024;

#[derive(Serialize)]
pub(super) struct Media {
    pub(super) id: Uuid,
    pub(super) url: String,
    pub(super) content_type: String,
    pub(super) size: i64,
}
