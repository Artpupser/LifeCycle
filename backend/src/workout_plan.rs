use crate::{domain, error::ApiError};
use chrono::NaiveDate;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
use uuid::Uuid;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Exercise {
    pub title: String,
    pub kind: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub images: Vec<Uuid>,
    #[serde(default)]
    pub sources: Vec<String>,
}
impl Exercise {
    pub fn validate(&self) -> Result<(), ApiError> {
        domain::text(&self.title, 1, 200)?;
        domain::text(&self.description, 0, 200000)?;
        if !["repetitions", "duration", "repetitions_duration"].contains(&self.kind.as_str())
            || self.images.len() > 3
            || self.sources.len() > 10
            || self.images.iter().collect::<BTreeSet<_>>().len() != self.images.len()
        {
            return Err(ApiError::validation(
                "Invalid exercise kind, images or sources",
            ));
        }
        for source in &self.sources {
            domain::text(source, 1, 2000)?;
            let url =
                url::Url::parse(source).map_err(|_| ApiError::validation("Invalid source URL"))?;
            if !["http", "https"].contains(&url.scheme())
                || url.host_str().is_none()
                || !url.username().is_empty()
                || url.password().is_some()
            {
                return Err(ApiError::validation(
                    "Sources must be HTTP(S) URLs without credentials",
                ));
            }
        }
        Ok(())
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Progression {
    pub start_date: NaiveDate,
    pub days: u32,
    pub target_repetitions: u32,
    pub target_duration_seconds: u32,
}
pub fn progress(initial: u32, target: u32, elapsed: i64, days: u32) -> u32 {
    let elapsed = elapsed.clamp(0, i64::from(days.max(1)));
    (i64::from(initial)
        + ((i64::from(target) - i64::from(initial)) * elapsed).div_euclid(i64::from(days.max(1))))
        as u32
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Entry {
    pub id: Uuid,
    pub exercise_id: Uuid,
    pub repetitions: u32,
    pub duration_seconds: u32,
    pub rest_seconds: u32,
    pub progression: Option<Progression>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Round {
    pub id: Uuid,
    pub title: String,
    pub repeat: u32,
    pub rest_seconds: u32,
    pub exercises: Vec<Entry>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Workout {
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub tags: Vec<String>,
    pub rounds: Vec<Round>,
}
fn load_valid(kind: &str, reps: u32, seconds: u32) -> bool {
    let reps_valid = (1..=10000).contains(&reps);
    let time_valid = (1..=86400).contains(&seconds);
    match kind {
        "duration" => reps == 0 && time_valid,
        "repetitions" => reps_valid && seconds == 0,
        "repetitions_duration" => {
            reps_valid && time_valid && u64::from(reps) * u64::from(seconds) <= 86400
        }
        _ => false,
    }
}
impl Workout {
    pub fn validate(&self, exercises: &BTreeMap<Uuid, Exercise>) -> Result<(), ApiError> {
        domain::text(&self.title, 1, 200)?;
        domain::text(&self.description, 0, 200000)?;
        domain::tags(&self.tags)?;
        if self.rounds.is_empty() || self.rounds.len() > 20 {
            return Err(ApiError::validation("Use 1 to 20 rounds"));
        }
        let mut ids = BTreeSet::new();
        let mut count = 0;
        let mut duration = 0u64;
        for round in &self.rounds {
            domain::text(&round.title, 1, 200)?;
            if round.id.is_nil()
                || !ids.insert(round.id)
                || !(1..=20).contains(&round.repeat)
                || round.rest_seconds > 3600
                || round.exercises.is_empty()
                || round.exercises.len() > 50
            {
                return Err(ApiError::validation(
                    "Invalid round identifiers, repeats or rest",
                ));
            }
            if round.rest_seconds > 0 {
                count += round.repeat;
                duration += u64::from(round.rest_seconds) * u64::from(round.repeat);
            }
            for entry in &round.exercises {
                let exercise = exercises
                    .get(&entry.exercise_id)
                    .ok_or_else(|| ApiError::validation("Select an active owned exercise"))?;
                if entry.id.is_nil()
                    || !ids.insert(entry.id)
                    || entry.rest_seconds > 3600
                    || !load_valid(&exercise.kind, entry.repetitions, entry.duration_seconds)
                {
                    return Err(ApiError::validation(
                        "Invalid exercise load, identifier or rest",
                    ));
                }
                let (mut max_reps, mut max_time) = (entry.repetitions, entry.duration_seconds);
                if let Some(p) = &entry.progression {
                    if !(1..=3650).contains(&p.days)
                        || !load_valid(
                            &exercise.kind,
                            p.target_repetitions,
                            p.target_duration_seconds,
                        )
                    {
                        return Err(ApiError::validation(
                            "Invalid progression duration or targets",
                        ));
                    }
                    max_reps = max_reps.max(p.target_repetitions);
                    max_time = max_time.max(p.target_duration_seconds);
                }
                count += round.repeat * (1 + u32::from(entry.rest_seconds > 0));
                let timed = u64::from(max_time)
                    * if exercise.kind == "repetitions_duration" {
                        u64::from(max_reps)
                    } else {
                        1
                    };
                duration += (timed + u64::from(entry.rest_seconds)) * u64::from(round.repeat);
            }
        }
        if let Some(last) = self.rounds.last() {
            if last.rest_seconds > 0 {
                count -= 1;
                duration -= u64::from(last.rest_seconds);
            }
            if let Some(entry) = last.exercises.last()
                && entry.rest_seconds > 0
            {
                count -= 1;
                duration -= u64::from(entry.rest_seconds);
            }
        }
        if count > 500 || duration > 86400 {
            return Err(ApiError::validation(
                "Plan supports at most 500 steps and 24 timed hours including rests",
            ));
        }
        Ok(())
    }
    pub fn snapshot(&self, exercises: &BTreeMap<Uuid, Exercise>, date: NaiveDate) -> Snapshot {
        let mut steps = vec![];
        for round in &self.rounds {
            for cycle in 1..=round.repeat {
                for entry in &round.exercises {
                    let exercise = exercises[&entry.exercise_id].clone();
                    let (mut repetitions, mut seconds) =
                        (entry.repetitions, entry.duration_seconds);
                    if let Some(p) = &entry.progression {
                        let elapsed = (date - p.start_date).num_days();
                        repetitions = progress(repetitions, p.target_repetitions, elapsed, p.days);
                        seconds = progress(seconds, p.target_duration_seconds, elapsed, p.days);
                    }
                    let duration_seconds = if exercise.kind == "repetitions_duration" {
                        repetitions * seconds
                    } else {
                        seconds
                    };
                    steps.push(Step {
                        title: exercise.title.clone(),
                        round_title: round.title.clone(),
                        cycle,
                        entry_id: Some(entry.id),
                        exercise: Some(exercise),
                        repetitions,
                        seconds_per_repetition: seconds,
                        duration_seconds,
                    });
                    if entry.rest_seconds > 0 {
                        steps.push(Step::rest(&round.title, cycle, entry.rest_seconds));
                    }
                }
                if round.rest_seconds > 0 {
                    steps.push(Step::rest(&round.title, cycle, round.rest_seconds));
                }
            }
        }
        while steps.last().is_some_and(|step| step.exercise.is_none()) {
            steps.pop();
        }
        Snapshot {
            plan: self.clone(),
            date,
            steps,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Step {
    pub title: String,
    pub round_title: String,
    pub cycle: u32,
    pub entry_id: Option<Uuid>,
    pub exercise: Option<Exercise>,
    pub repetitions: u32,
    pub seconds_per_repetition: u32,
    pub duration_seconds: u32,
}
impl Step {
    fn rest(round: &str, cycle: u32, duration_seconds: u32) -> Self {
        Self {
            title: "Отдых".into(),
            round_title: round.into(),
            cycle,
            entry_id: None,
            exercise: None,
            repetitions: 0,
            seconds_per_repetition: 0,
            duration_seconds,
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Snapshot {
    pub plan: Workout,
    pub date: NaiveDate,
    pub steps: Vec<Step>,
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn progression_is_bounded_and_uses_calendar_days_in_both_directions() {
        assert_eq!(progress(10, 20, -3, 10), 10);
        assert_eq!(progress(10, 20, 5, 10), 15);
        assert_eq!(progress(10, 20, 20, 10), 20);
        assert_eq!(progress(20, 10, 3, 7), 15);
        assert_eq!(progress(20, 10, 7, 7), 10);
    }
    #[test]
    fn load_modes_are_distinct_and_combined_time_is_bounded() {
        assert!(load_valid("duration", 0, 30));
        assert!(load_valid("repetitions", 20, 0));
        assert!(load_valid("repetitions_duration", 5, 10));
        assert!(!load_valid("duration", 1, 30));
        assert!(!load_valid("repetitions", 0, 0));
        assert!(!load_valid("repetitions_duration", 10000, 86400));
    }
    #[test]
    fn snapshot_resolves_progression_rounds_rests_and_private_instructions() {
        let exercise_id = Uuid::new_v4();
        let exercise = Exercise {
            title: "Hold".into(),
            kind: "repetitions_duration".into(),
            description: "**Technique**".into(),
            images: vec![Uuid::new_v4()],
            sources: vec!["https://example.org".into()],
        };
        let exercises = BTreeMap::from([(exercise_id, exercise)]);
        let plan = Workout {
            title: "Plan".into(),
            description: String::new(),
            tags: vec![],
            rounds: vec![Round {
                id: Uuid::new_v4(),
                title: "Round".into(),
                repeat: 2,
                rest_seconds: 10,
                exercises: vec![Entry {
                    id: Uuid::new_v4(),
                    exercise_id,
                    repetitions: 2,
                    duration_seconds: 10,
                    rest_seconds: 5,
                    progression: Some(Progression {
                        start_date: "2026-10-01".parse().unwrap(),
                        days: 10,
                        target_repetitions: 4,
                        target_duration_seconds: 20,
                    }),
                }],
            }],
        };
        plan.validate(&exercises).unwrap();
        let snapshot = plan.snapshot(&exercises, "2026-10-06".parse().unwrap());
        assert_eq!(
            snapshot
                .steps
                .iter()
                .map(|s| s.duration_seconds)
                .collect::<Vec<_>>(),
            vec![45, 5, 10, 45]
        );
        assert_eq!(snapshot.steps[3].cycle, 2);
        assert_eq!(snapshot.steps[0].exercise.as_ref().unwrap().images.len(), 1);
        assert_eq!(snapshot.steps[0].repetitions, 3);
        assert_eq!(
            snapshot.steps[0].exercise.as_ref().unwrap().description,
            "**Technique**"
        );
    }
    #[test]
    fn step_limit_counts_actual_steps_without_inventing_rests() {
        let id = Uuid::new_v4();
        let exercises = BTreeMap::from([(
            id,
            Exercise {
                title: "Reps".into(),
                kind: "repetitions".into(),
                description: String::new(),
                images: vec![],
                sources: vec![],
            },
        )]);
        let entries = (0..25)
            .map(|_| Entry {
                id: Uuid::new_v4(),
                exercise_id: id,
                repetitions: 1,
                duration_seconds: 0,
                rest_seconds: 0,
                progression: None,
            })
            .collect();
        let mut plan = Workout {
            title: "Limit".into(),
            description: String::new(),
            tags: vec![],
            rounds: vec![Round {
                id: Uuid::new_v4(),
                title: "Round".into(),
                repeat: 20,
                rest_seconds: 0,
                exercises: entries,
            }],
        };
        plan.validate(&exercises).unwrap();
        assert_eq!(
            plan.snapshot(&exercises, "2026-10-28".parse().unwrap())
                .steps
                .len(),
            500
        );
        plan.rounds[0].rest_seconds = 1;
        assert!(plan.validate(&exercises).is_err());
    }
}
