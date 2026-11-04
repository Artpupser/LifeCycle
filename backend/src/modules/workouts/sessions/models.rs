use crate::{
    modules::tasks::TaskOccurrence, modules::workouts::plan::Snapshot, shared::domain,
    shared::errors::ApiError,
};
use chrono::{DateTime, NaiveDate, Utc};
use serde::{Deserialize, Serialize};
use sqlx::types::Json as DbJson;
use uuid::Uuid;

#[derive(Clone, Serialize, Deserialize)]
pub(super) struct StepResult {
    pub(super) step_index: i32,
    pub(super) status: String,
    pub(super) elapsed_seconds: i64,
    pub(super) actual_repetitions: u32,
    pub(super) ended_at: DateTime<Utc>,
}

#[derive(Clone, Serialize, sqlx::FromRow)]
pub(super) struct Session {
    pub(super) id: Uuid,
    pub(super) workout_id: Uuid,
    pub(super) habit_id: Option<Uuid>,
    pub(super) occurrence_date: Option<NaiveDate>,
    pub(super) habit_occurrence: Option<DbJson<TaskOccurrence>>,
    pub(super) snapshot: DbJson<Snapshot>,
    pub(super) status: String,
    pub(super) step_index: i32,
    pub(super) elapsed_seconds: i64,
    pub(super) segment_started_at: Option<DateTime<Utc>>,
    pub(super) results: DbJson<Vec<StepResult>>,
    pub(super) revision: i64,
    pub(super) note: String,
    pub(super) habit_completed: bool,
    pub(super) started_at: DateTime<Utc>,
    pub(super) ended_at: Option<DateTime<Utc>>,
}

impl Session {
    pub(super) fn elapsed_at(&self, now: DateTime<Utc>) -> i64 {
        self.elapsed_seconds
            + self
                .segment_started_at
                .map_or(0, |start| (now - start).num_seconds().max(0))
    }
    pub(super) fn display(mut self) -> Self {
        self.elapsed_seconds = self.elapsed_at(Utc::now());
        self
    }
    pub(super) fn active(&self) -> bool {
        ["running", "paused"].contains(&self.status.as_str())
    }
    pub(super) fn advance(
        &mut self,
        action: &str,
        repetitions: Option<u32>,
        now: DateTime<Utc>,
    ) -> Result<(), ApiError> {
        if !self.active() || (action == "next" && self.status != "running") {
            return Err(domain::conflict(
                "Resume an active workout before completing a step",
            ));
        }
        let step = self
            .snapshot
            .steps
            .get(self.step_index as usize)
            .ok_or_else(ApiError::internal)?;
        let elapsed = self.elapsed_at(now);
        if action == "next" && elapsed < i64::from(step.duration_seconds) {
            return Err(domain::conflict("The step timer has not elapsed"));
        }
        let actual = if action == "skip" || step.repetitions == 0 {
            0
        } else {
            repetitions.unwrap_or(step.repetitions)
        };
        if actual > 10000 {
            return Err(ApiError::validation("Repetitions must be at most 10000"));
        }
        self.results.push(StepResult {
            step_index: self.step_index,
            status: if action == "skip" {
                "skipped"
            } else {
                "completed"
            }
            .into(),
            elapsed_seconds: elapsed,
            actual_repetitions: actual,
            ended_at: now,
        });
        self.step_index += 1;
        self.elapsed_seconds = 0;
        self.segment_started_at = if self.status == "running" {
            Some(now)
        } else {
            None
        };
        if self.step_index as usize == self.snapshot.steps.len() {
            let complete = self.results.iter().all(|result| {
                let step = &self.snapshot.steps[result.step_index as usize];
                step.exercise.is_none()
                    || result.status == "completed" && result.actual_repetitions >= step.repetitions
            });
            self.status = if complete { "completed" } else { "partial" }.into();
            self.segment_started_at = None;
            self.ended_at = Some(now);
        }
        Ok(())
    }
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Start {
    pub(super) workout_id: Uuid,
    pub(super) habit_id: Option<Uuid>,
    pub(super) date: Option<NaiveDate>,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
pub(super) struct Command {
    pub(super) revision: i64,
    pub(super) actual_repetitions: Option<u32>,
    pub(super) note: Option<String>,
}

#[derive(Deserialize)]
pub(super) struct HistoryQuery {
    pub(super) workout_id: Option<Uuid>,
    pub(super) before: Option<DateTime<Utc>>,
}

#[derive(Serialize, sqlx::FromRow)]
pub(super) struct Summary {
    pub(super) id: Uuid,
    pub(super) workout_id: Uuid,
    pub(super) title: String,
    pub(super) date: NaiveDate,
    pub(super) status: String,
    pub(super) confirmed_steps: i32,
    pub(super) habit_completed: bool,
    pub(super) started_at: DateTime<Utc>,
    pub(super) ended_at: Option<DateTime<Utc>>,
}
