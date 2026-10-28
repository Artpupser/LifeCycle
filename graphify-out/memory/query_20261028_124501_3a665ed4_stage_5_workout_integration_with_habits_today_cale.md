---
type: "query"
date: "2026-10-28T12:45:01.194111+00:00"
question: "Stage 5 workout integration with habits Today calendar and schedule"
contributor: "graphify"
outcome: "useful"
source_nodes: ["workout_plan.rs", "workout_sessions.rs", "workouts.rs", "habits.rs", "schedule.rs"]
---

# Q: Stage 5 workout integration with habits Today calendar and schedule

## Answer

Implemented workout_plan.rs for validated rounds and date-based progression, workouts.rs for owned exercise/plan CRUD, workout_sessions.rs for frozen server sessions and revision-guarded commands. Habit workout_id uses the existing Schedule and shared editable_occurrence/mark_in_transaction functions; all completions and events are atomic. Verified real API smoke and Chromium integration. Expanded vocabulary: workout habit task schedule calendar.

## Outcome

- Signal: useful

## Source Nodes

- workout_plan.rs
- workout_sessions.rs
- workouts.rs
- habits.rs
- schedule.rs