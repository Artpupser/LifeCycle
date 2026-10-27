import { Link } from "react-router";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { instantLabel } from "@/lib/dates";
import { statusLabels, type TaskOccurrence, type TaskStatus } from "./types";

export function OccurrenceList({ occurrences, timezone, changed }: { occurrences: TaskOccurrence[]; timezone: string; changed: () => void }) {
  const action = useAction();
  return <div className="space-y-3">{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}{!occurrences.length && <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">На этот день ничего не запланировано. <Link to="/tasks" className="text-primary underline">Добавить задачу</Link></p>}{occurrences.map((occurrence) => {
    const start = occurrence.starts_at ? Date.parse(occurrence.starts_at) : null;
    const duration = occurrence.task.schedule?.duration_minutes;
    const overlaps = start !== null && duration && occurrences.some((other) => {
      if (other === occurrence || !other.starts_at || !other.task.schedule) return false;
      const otherStart = Date.parse(other.starts_at);
      return start < otherStart + other.task.schedule.duration_minutes * 60_000 && otherStart < start + duration * 60_000;
    });
    return <article key={`${occurrence.task.id}-${occurrence.date}`} className="rounded-xl border border-border bg-card p-4" style={{ borderLeftColor: occurrence.task.color, borderLeftWidth: 4 }}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="mb-1 text-xs font-medium text-muted-foreground">{occurrence.starts_at ? instantLabel(occurrence.starts_at, timezone) : "Без времени"}{duration ? ` · ${duration} мин` : ""}{overlaps ? " · Пересечение времени" : ""}</p><h3 className="break-words font-semibold">{occurrence.task.title}</h3>{occurrence.task.description && <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted-foreground">Описание</summary><Markdown value={occurrence.task.description} /></details>}<div className="mt-2 flex flex-wrap gap-2">{occurrence.task.tags.map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs">#{tag}</span>)}</div></div>
        <Select className="w-auto max-w-full" aria-label={`Статус ${occurrence.task.title}`} disabled={action.busy || !occurrence.editable} value={occurrence.status} onChange={(event) => { void action.run(() => api(`/tasks/${occurrence.task.id}/occurrences/${occurrence.date}`, { method: "POST", body: { status: event.target.value as TaskStatus } }), changed); }}>{Object.entries(statusLabels).map(([status, label]) => <option key={status} value={status}>{label}</option>)}</Select>
      </div>{!occurrence.editable && <p className="mt-2 text-xs text-muted-foreground">Историческая отметка. Задача архивирована или расписание изменилось.</p>}<Button asChild size="sm" variant="outline" className="mt-3"><Link to={`/tasks?task=${occurrence.task.id}`}>Открыть задачу</Link></Button>
    </article>;
  })}</div>;
}
