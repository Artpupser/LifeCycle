import type { HabitStatistics } from "@/features/habits/types";

export type Privacy = { include_profile: boolean; include_intimacy: boolean };
export type Day = { date: string; events: number; tasks_completed: number; habits_completed: number; focus_seconds: number; workouts_completed: number };
export type Report = {
  from: string; to: string; timezone: string; generated_at: string; privacy: Privacy;
  event_count: number; active_days: number; event_types: Record<string, number>; days: Day[];
  tasks: { scheduled: number; completed: number; rejected: number; in_progress: number; pending: number; missed: number; future: number; planned_minutes: number; completion_rate: number | null };
  habits: { expected: number; completed: number; skipped: number; cancelled: number; missed: number; pending: number; completed_sub_habits: number; total_sub_habits: number; completion_rate: number | null; ranking: HabitStatistics[] };
  pomodoro: { completed: number; cancelled: number; seconds: number };
  workouts: { completed: number; partial: number; cancelled: number; exercise_steps: number; repetitions: number; seconds: number };
  profile?: { age_years: number | null; height_cm: number | null; weight_kg: number | null };
  intimacy?: { total: number; sex: number; masturbation: number; active_days: number; duration_minutes: number; duration_answers: number; average_duration_minutes: number | null };
};
