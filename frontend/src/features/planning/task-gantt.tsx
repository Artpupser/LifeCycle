import { ErrorState, LoadingState } from "@/components/resource-state";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { dateLabel, dayDifference, instantLabel, localDate, minuteOfDay, shiftDate } from "@/lib/dates";
import type { CalendarPlan, Task } from "./types";

export function TaskGantt({ tasks, from, edit }: { tasks: Task[]; from: string; edit: (task: Task) => void }) {
  const { settings } = usePreferences();
  const { resource, retry } = useResource<CalendarPlan>(`/calendar?from=${from}&to=${shiftDate(from, 13)}`);
  if (resource.status === "loading") return <LoadingState />;
  if (resource.status === "error") return <ErrorState message={resource.message} retry={retry} />;
  const width = 1120; const left = 220; const column = (width - left) / 14;
  const ids = new Set(tasks.map((task) => task.id));
  const occurrences = resource.data.occurrences.filter((item) => ids.has(item.task.id));
  return <div className="overflow-x-auto rounded-2xl border border-border bg-card p-3"><svg width={width} height={Math.max(120, tasks.length * 46 + 60)} role="img" aria-label={`Диаграмма Ганта на 14 дней с ${dateLabel(from)}`} className="max-w-none text-foreground"><rect width={width} height="50" fill="var(--muted)" />{Array.from({ length: 14 }, (_, index) => <g key={index}><text x={left + index * column + 8} y="30" fontSize="11" fill="var(--muted-foreground)">{dateLabel(shiftDate(from, index), { day: "numeric", month: "short" })}</text><line x1={left + index * column} x2={left + index * column} y1="50" y2={tasks.length * 46 + 60} stroke="var(--border)" /></g>)}{tasks.map((task, index) => <g key={task.id}><text x="10" y={index * 46 + 79} fontSize="12" fill="var(--foreground)" role="button" tabIndex={0} onClick={() => edit(task)} onKeyDown={(event) => { if (event.key === "Enter") edit(task); }} className="cursor-pointer"><title>{task.title}</title>{task.title.length > 25 ? `${task.title.slice(0, 24)}…` : task.title}</text>{occurrences.filter((item) => item.task.id === task.id).map((item) => {
    const fraction = item.starts_at ? minuteOfDay(item.starts_at, settings.timezone) / 1440 : 0; const x = left + (dayDifference(from, item.starts_at ? localDate(settings.timezone, new Date(item.starts_at)) : item.date) + fraction) * column;
    const barWidth = Math.min(width - x, Math.max(5, ((item.task.schedule?.duration_minutes ?? 1440) / 1440) * column));
    return <rect key={`${task.id}-${item.date}`} x={x} y={index * 46 + 62} width={Math.max(0, barWidth)} height="24" rx="5" fill={item.status === "completed" ? "var(--primary)" : task.color} opacity={item.status === "rejected" ? 0.3 : 0.8}><title>{task.title} · {dateLabel(item.date)} · {item.starts_at ? instantLabel(item.starts_at, settings.timezone, settings.time_format) : "Без времени"}</title></rect>;
  })}</g>)}</svg>{!tasks.length && <p className="p-5 text-sm text-muted-foreground">Создайте задачу с расписанием.</p>}<p className="p-2 text-xs text-muted-foreground">Показаны реальные вхождения расписания за 14 дней. Задачи без расписания не имеют полосы.</p></div>;
}
