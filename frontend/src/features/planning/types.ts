import { t } from "@/systems/i18n/locale";
import type { EventOccurrence } from "@/features/countdowns/types";
import type { HabitConfig, HabitMark } from "@/features/habits/types";
import { localDate } from "@/lib/dates";

export type Schedule = {
  start_date: string;
  time: string | null;
  timezone: string;
  duration_minutes: number;
  recurrence: "once" | "daily" | "weekly" | "interval";
  interval_days: number;
  weekdays: number[];
  end_date: string | null;
};

export type TaskStatus = "todo" | "in_progress" | "completed" | "rejected";
export type TaskInput = { title: string; description: string; status: TaskStatus; tags: string[]; color: string; priority: "low" | "normal" | "high" | "urgent"; parent_id: string | null; due_at: string | null; schedule: Schedule | null };
export type Task = TaskInput & { id: string; source_kind: string; source_id: string | null; habit?: HabitConfig | null; created_at: string; updated_at: string };
export type TaskOccurrence = { task: Task; date: string; starts_at: string | null; status: TaskStatus; editable: boolean; habit_mark?: HabitMark | null };
export type DayPlan = { date: string; timezone: string; tasks: TaskOccurrence[]; events: EventOccurrence[] };
export type CalendarPlan = { from: string; to: string; timezone: string; occurrences: TaskOccurrence[]; events: EventOccurrence[] };
export const statusLabels: Record<TaskStatus, string> = { get todo() { return t("К выполнению"); }, get in_progress() { return t("В работе"); }, get completed() { return t("Выполнено"); }, get rejected() { return t("Отменено"); } };
export const priorityLabels: Record<TaskInput["priority"], string> = { get low() { return t("Низкий · синий"); }, get normal() { return t("Без приоритета"); }, get high() { return t("Высокий · оранжевый"); }, get urgent() { return t("Срочный · красный"); } };
export const isRecurring = (task: TaskInput) => task.schedule !== null && task.schedule.recurrence !== "once";

export function defaultSchedule(timezone: string): Schedule { return { start_date: localDate(timezone), time: "09:00", timezone, duration_minutes: 30, recurrence: "once", interval_days: 2, weekdays: [1], end_date: null }; }

export function taskInput(task: TaskInput): TaskInput {
  return { title: task.title, description: task.description, status: task.status, tags: task.tags, color: task.color, priority: task.priority, parent_id: task.parent_id, due_at: task.due_at, schedule: task.schedule };
}

/** Shared normalization for tags and categories across the frontend. */
export { normalizeLabels } from "@/systems/labels/values";

export function focusTasks(tasks:Task[],occurrences:TaskOccurrence[]):Task[] {
 const today=new Map(occurrences.map(item=>[item.task.id,item.status]));
 return tasks.filter(task=>{
  const status=today.get(task.id)??(isRecurring(task)?null:task.status);
  return status==="todo"||status==="in_progress";
 });
}
