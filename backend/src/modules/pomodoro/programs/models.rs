use crate::{modules::pomodoro::Session, shared::errors::ApiError};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

pub(super) const MAX_REPLAY_INTERVALS: i64 = 5000;

#[derive(Clone, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub(crate) struct Program {
    pub work_seconds: i64,
    pub chill_seconds: i64,
    pub more_chill_seconds: i64,
    pub sequence: Vec<String>,
    pub repeat: bool,
}

impl Program {
    pub(super) fn validate(&self) -> Result<(), ApiError> {
        if self.sequence.is_empty()
            || self.sequence.len() > 60
            || !self.sequence.iter().any(|s| s == "w")
            || self
                .sequence
                .iter()
                .any(|s| !["w", "c", "mc"].contains(&s.as_str()))
            || [
                self.work_seconds,
                self.chill_seconds,
                self.more_chill_seconds,
            ]
            .iter()
            .any(|s| !(1..=86400).contains(s))
        {
            return Err(ApiError::validation(
                "A program needs 1–60 w/c/mc intervals including work, each duration 1–86400 seconds",
            ));
        }
        Ok(())
    }
    pub(super) fn duration(&self, kind: &str) -> i64 {
        match kind {
            "w" => self.work_seconds,
            "c" => self.chill_seconds,
            _ => self.more_chill_seconds,
        }
    }
    pub(super) fn total(&self) -> i64 {
        self.sequence.iter().map(|k| self.duration(k)).sum()
    }
    pub(super) fn offset(&self, index: i64) -> i64 {
        let count = self.sequence.len() as i64;
        index / count * self.total()
            + self
                .sequence
                .iter()
                .take((index % count) as usize)
                .map(|k| self.duration(k))
                .sum::<i64>()
    }
    pub(super) fn position(&self, elapsed: i64) -> (i64, i64) {
        if !self.repeat && elapsed >= self.total() {
            return (self.sequence.len() as i64, 0);
        }
        let mut left = elapsed % self.total();
        let cycle_start = elapsed / self.total() * self.sequence.len() as i64;
        for (step, kind) in self.sequence.iter().enumerate() {
            let d = self.duration(kind);
            if left < d {
                return (cycle_start + step as i64, left);
            }
            left -= d;
        }
        unreachable!()
    }
}

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Config {
    pub(super) id: Uuid,
    pub(super) name: String,
    pub(super) data: DbJson<Program>,
    pub(super) revision: i64,
    pub(super) created_at: DateTime<Utc>,
    pub(super) updated_at: DateTime<Utc>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct ConfigInput {
    pub(super) name: String,
    pub(super) data: Program,
    pub(super) revision: Option<i64>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Start {
    pub(super) config_id: Uuid,
    pub(super) revision: i64,
    pub(super) task_id: Option<Uuid>,
}

#[derive(Clone, Serialize, Deserialize)]
pub(super) struct Anchor {
    pub(super) elapsed: i64,
    pub(super) at: DateTime<Utc>,
}

#[derive(sqlx::FromRow)]
pub(super) struct Run {
    pub(super) id: Uuid,
    pub(super) task_id: Option<Uuid>,
    pub(super) name: String,
    pub(super) data: DbJson<Program>,
    pub(super) status: String,
    pub(super) elapsed_seconds: i64,
    pub(super) segment_started_at: Option<DateTime<Utc>>,
    pub(super) anchors: DbJson<Vec<Anchor>>,
    pub(super) processed_intervals: i64,
    pub(super) revision: i64,
}

impl Run {
    pub(super) fn elapsed(&self, now: DateTime<Utc>) -> i64 {
        let n = self.elapsed_seconds
            + self
                .segment_started_at
                .map_or(0, |at| (now - at).num_seconds().max(0));
        if self.data.repeat {
            n
        } else {
            n.min(self.data.total())
        }
    }
    pub(super) fn wall(&self, offset: i64, end: bool) -> DateTime<Utc> {
        let anchor = self
            .anchors
            .iter()
            .rev()
            .find(|a| {
                if end {
                    a.elapsed < offset
                } else {
                    a.elapsed <= offset
                }
            })
            .unwrap_or(&self.anchors[0]);
        anchor.at + Duration::seconds(offset - anchor.elapsed)
    }
}

#[derive(Serialize)]
pub(crate) struct ProgramState {
    pub(super) run_id: Uuid,
    pub(super) name: String,
    pub(super) interval_index: i64,
    pub(super) sequence_length: usize,
    pub(super) cycle: i64,
    pub(super) next_kind: Option<String>,
    pub(super) next_duration_seconds: Option<i64>,
    pub(super) repeat: bool,
    pub(super) revision: i64,
    pub(crate) history_pending: i64,
}

#[derive(Deserialize, Default)]
pub(super) struct HistoryQuery {
    #[serde(default)]
    pub(super) offset: i64,
}

#[derive(Serialize)]
pub(super) struct History {
    pub(super) items: Vec<Session>,
    pub(super) next_offset: Option<i64>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Revision {
    pub(super) revision: i64,
}

#[derive(Default, Deserialize)]
#[serde(default, deny_unknown_fields)]
pub(crate) struct Action {
    pub(super) revision: Option<i64>,
}
