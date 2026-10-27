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
export type Task = TaskInput & { id: string; source_kind: string; source_id: string | null; created_at: string; updated_at: string };
export type TaskOccurrence = { task: Task; date: string; starts_at: string | null; status: TaskStatus; editable: boolean };
export type DayPlan = { date: string; timezone: string; tasks: TaskOccurrence[] };
export type CalendarPlan = { from: string; to: string; timezone: string; occurrences: TaskOccurrence[] };
export const statusLabels: Record<TaskStatus, string> = { todo: "К выполнению", in_progress: "В работе", completed: "Выполнено", rejected: "Отклонено" };
export const priorityLabels: Record<TaskInput["priority"], string> = { low: "Низкий", normal: "Обычный", high: "Высокий", urgent: "Срочный" };
export const isRecurring = (task: TaskInput) => task.schedule !== null && task.schedule.recurrence !== "once";

export function defaultSchedule(timezone: string): Schedule { return { start_date: localDate(timezone), time: "09:00", timezone, duration_minutes: 30, recurrence: "once", interval_days: 2, weekdays: [1], end_date: null }; }

export function taskInput(task: TaskInput): TaskInput {
  return { title: task.title, description: task.description, status: task.status, tags: task.tags, color: task.color, priority: task.priority, parent_id: task.parent_id, due_at: task.due_at, schedule: task.schedule };
}
