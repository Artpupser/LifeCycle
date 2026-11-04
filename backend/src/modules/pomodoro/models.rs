use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Serialize, sqlx::FromRow)]
pub(crate) struct Session {
    pub(crate) id: Uuid,
    pub(crate) task_id: Option<Uuid>,
    pub(crate) phase: String,
    pub(crate) status: String,
    pub(crate) duration_seconds: i64,
    pub(crate) elapsed_seconds: i64,
    pub(crate) started_at: DateTime<Utc>,
    pub(crate) segment_started_at: Option<DateTime<Utc>>,
    pub(crate) ended_at: Option<DateTime<Utc>>,
    pub(crate) updated_at: DateTime<Utc>,
    pub(crate) run_id: Option<Uuid>,
    pub(crate) interval_index: Option<i64>,
    pub(crate) interval_kind: Option<String>,
    pub(crate) program_name: Option<String>,
    #[sqlx(skip)]
    pub(crate) program: Option<crate::modules::pomodoro::programs::ProgramState>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Start {
    pub(super) task_id: Option<Uuid>,
    pub(super) phase: String,
}

impl Session {
    pub(crate) fn elapsed_at(&self, now: DateTime<Utc>) -> i64 {
        let running = self
            .segment_started_at
            .map_or(0, |start| (now - start).num_seconds().max(0));
        (self.elapsed_seconds + running).min(self.duration_seconds)
    }
    pub(super) fn for_display(mut self) -> Self {
        self.elapsed_seconds = self.elapsed_at(Utc::now());
        self
    }
}
