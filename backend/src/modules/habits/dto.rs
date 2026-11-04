use super::models::{HabitConfig, HabitStatus};
use crate::{shared::domain, shared::schedule::Schedule};
use chrono::NaiveDate;
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct HabitInput {
    pub(super) title: String,
    #[serde(default)]
    pub(super) description: String,
    #[serde(default)]
    pub(super) tags: Vec<String>,
    #[serde(default = "domain::default_color")]
    pub(super) color: String,
    pub(super) schedule: Schedule,
    #[serde(default)]
    pub(super) habit: HabitConfig,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct MarkInput {
    pub(super) status: HabitStatus,
    #[serde(default)]
    pub(super) note: String,
}

#[derive(Deserialize)]
pub(super) struct Range {
    pub(super) from: NaiveDate,
    pub(super) to: NaiveDate,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct DeleteHistory {
    pub(super) confirmed: bool,
}
