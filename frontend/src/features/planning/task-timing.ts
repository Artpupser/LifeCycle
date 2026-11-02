import { weekday, dateLabel, dayDifference, localDate, localDateTimeToInstant, shiftDate } from "@/lib/dates";
import type { Schedule, Task } from "./types";
function occurs(schedule: Schedule, date: string) {
  if (date < schedule.start_date || (schedule.end_date && date > schedule.end_date)) return false;
  const elapsed = dayDifference(schedule.start_date, date);
  if (schedule.recurrence === "once") return !elapsed;
  if (schedule.recurrence === "weekly") { const day = weekday(date) || 7; return schedule.weekdays.includes(day); }
  return schedule.recurrence === "daily" || elapsed % schedule.interval_days === 0;
}
export function upcomingStart(task: Task, now: number): { date: string; instant: number | null; end: number | null } | null {
  const rule = task.schedule;
  if (!rule) return task.due_at ? { date: task.due_at.slice(0, 10), instant: Date.parse(task.due_at), end: Date.parse(task.due_at) } : null;
  let date = rule.start_date;
  if (rule.recurrence !== "once") {
    const today = localDate(rule.timezone, now);
    const previous = shiftDate(today, -1);
    if (rule.time && occurs(rule, previous)) {
      const start = localDateTimeToInstant(`${previous}T${rule.time.slice(0, 5)}`, rule.timezone);
      if (start !== null && start <= now && start + rule.duration_minutes * 60_000 >= now) return { date: previous, instant: start, end: start + rule.duration_minutes * 60_000 };
    }
    date = today > rule.start_date ? today : rule.start_date;
    if (rule.recurrence === "interval") {
      const elapsed = dayDifference(rule.start_date, date); const period = rule.interval_days;
      date = shiftDate(date, (period - elapsed % period) % period);
    }
    if (rule.recurrence === "weekly") { for (let i = 0; i < 7 && !occurs(rule, date); i++) date = shiftDate(date, 1); }
    if (!occurs(rule, date)) return null;
  }
  const instant = rule.time ? localDateTimeToInstant(`${date}T${rule.time.slice(0, 5)}`, rule.timezone) : null;
  return { date, instant, end: instant === null ? null : instant + rule.duration_minutes * 60_000 };
}
export function taskTiming(task: Task, now: number, timezone: string): { text: string; today: boolean } | null {
  const planned = upcomingStart(task, now); if (!planned) return null;
  const today = localDate(timezone, now);
  const first = planned.instant === null ? planned.date : localDate(timezone, planned.instant);
  const running = planned.instant !== null && planned.end !== null && now >= planned.instant && now <= planned.end;
  if (today === first || running || (planned.instant===null && task.schedule?.recurrence==="once" && today>=first && today<shiftDate(first,Math.ceil(task.schedule.duration_minutes/1440)))) return { text: "Сегодня", today: true };
  const days = dayDifference(today, first);
  if (days === 1) return { text: "Завтра", today: false };
  if (days > 1) return { text: `Через ${days} ${days % 10 === 1 && days % 100 !== 11 ? "день" : days % 10 >= 2 && days % 10 <= 4 && !(days % 100 >= 12 && days % 100 <= 14) ? "дня" : "дней"}`, today: false };
  return { text: `Начало ${dateLabel(first, { day: "numeric", month: "short" })}`, today: false };
}

export function taskResult(task: Task, occurrence?: { status: string }) {
  return task.schedule && task.schedule.recurrence !== "once" ? occurrence?.status ?? "todo" : task.status;
}
export function taskDeadline(task: Task, now: number, timezone: string): number | null {
  const rule=task.schedule;
  if(!rule)return task.due_at?Date.parse(task.due_at):null;
  const planned=upcomingStart(task,now);
  if(!planned)return null;
  if(planned.end!==null)return planned.end;
  const days=rule.recurrence==="once"?Math.max(1,Math.ceil(rule.duration_minutes/1440)):1;
  return localDateTimeToInstant(`${shiftDate(planned.date,days)}T00:00`,rule.timezone || timezone);
}
export function isTaskOverdue(task: Task, now: number, timezone: string, occurrence?: {status:string}) {
  if(["completed","rejected"].includes(taskResult(task,occurrence)))return false;
  const end=taskDeadline(task,now,timezone);return end!==null && now>end;
}
export function taskGroup(task: Task, now: number, timezone: string, occurrence?: {status:string}) {
  return isTaskOverdue(task,now,timezone,occurrence)?0:["completed","rejected"].includes(taskResult(task,occurrence))?2:1;
}
export function sortedTasks(tasks: Task[], now: number, timezone: string, occurrences: {task:{id:string};status:string}[] =[]) {
  return tasks.map((task,index)=>({task,index,group:taskGroup(task,now,timezone,occurrences.find((item)=>item.task.id===task.id))})).sort((a,b)=>a.group-b.group || a.index-b.index).map(({task})=>task);
}
export const priorityColors: Record<string,string>={low:"#2563EB",high:"#F59E0B",urgent:"#DC2626"};

/** A single occurrence keeps its original date key while covering every day in its interval. */
export function occurrenceCoversDate(item: {date:string;starts_at:string|null;task:{schedule:Schedule|null}}, date: string, zone: string) {
  const first=item.starts_at ? localDate(zone, item.starts_at) : item.date;
  const rule=item.task.schedule;
  if(rule?.recurrence!=="once")return first===date;
  const last=item.starts_at ? localDate(zone,Date.parse(item.starts_at)+rule.duration_minutes*60_000-1) : shiftDate(item.date,Math.max(0,Math.ceil(rule.duration_minutes/1440)-1));
  return date>=first && date<=last;
}
