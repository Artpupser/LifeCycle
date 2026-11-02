import { t } from "@/systems/i18n/locale";
import type { Schedule, Task } from "@/features/planning/types";

export type SubHabit = { id: string; title: string; description: string };
export type HabitConfig = { icon: string; sub_habits: SubHabit[]; reminder_enabled: boolean; reminder_minutes_before: number | null; workout_id?: string | null };
export type HabitStatus = "pending" | "completed" | "skipped" | "cancelled";
export type HabitMark = { status: HabitStatus; completed_sub_habits: string[]; note: string; marked_at?: string | null };
export type HabitInput = { title: string; description: string; tags: string[]; color: string; schedule: Schedule; habit: HabitConfig };
export type Habit = Task & { schedule: Schedule; habit: HabitConfig };
export type HabitStatistics = { active: boolean; id: string; title: string; expected: number; completed: number; skipped: number; cancelled: number; missed: number; pending: number; completed_sub_habits: number; total_sub_habits: number; completion_rate: number; current_streak: number; best_streak: number; longest_missed_streak: number; shortest_missed_streak: number; last_missed_streak: number };
export const habitStatusLabels: Record<HabitStatus, string> = { get pending() { return t("Не завершено"); }, get completed() { return t("Выполнено"); }, get skipped() { return t("Пропущено"); }, get cancelled() { return t("Отменено"); } };
export const emptyMark = (): HabitMark => ({ status: "pending", completed_sub_habits: [], note: "" });
export function habitChanged() { window.dispatchEvent(new Event("habits-changed")); }
