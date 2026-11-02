import { t, useLanguage } from "@/systems/i18n/locale";
import { HabitControls } from "@/features/habits/habit-controls";
import { WorkoutLauncher } from "@/features/workouts/workout-launcher";
import { usePreferences } from "@/features/settings/preferences-context";
import { Link } from "react-router";
import { Markdown } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/use-resource";
import { TaskCheckbox } from "./task-card";
import { TagChip } from "./tag-chip";
import type { TaskTag } from "./task-tags-page";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { instantLabel } from "@/lib/dates";
import { type TaskOccurrence } from "./types";

export function OccurrenceList({ occurrences, timezone, changed }: { occurrences: TaskOccurrence[]; timezone: string; changed: () => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const action = useAction();
  const tags = useResource<TaskTag[]>("/task-tags");
  return <div className="space-y-3">{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}{!occurrences.length && <p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">{t("На этот день ничего не запланировано. ")}<Link to="/tasks" className="text-primary underline">{t("Добавить задачу")}</Link></p>}{occurrences.map((occurrence) => {
    const start = occurrence.starts_at ? Date.parse(occurrence.starts_at) : null;
    const duration = occurrence.task.schedule?.duration_minutes;
    const overlaps = start !== null && duration && occurrences.some((other) => {
      if (other === occurrence || !other.starts_at || !other.task.schedule) return false;
      const otherStart = Date.parse(other.starts_at);
      return start < otherStart + other.task.schedule.duration_minutes * 60_000 && otherStart < start + duration * 60_000;
    });
    return <article key={`${occurrence.task.id}-${occurrence.date}`} className="rounded-xl border border-border bg-card p-4" style={{ borderLeftColor: occurrence.task.color, borderLeftWidth: 4 }}>
      <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="mb-1 text-xs font-medium text-muted-foreground">{occurrence.starts_at ? instantLabel(occurrence.starts_at, timezone, settings.time_format) : t("Без времени")}{duration ? t(" · {v0} мин", {v0: duration}) : ""}{overlaps ? t(" · Пересечение времени") : ""}</p><h3 className="break-words font-semibold">{occurrence.task.title}</h3>{occurrence.task.description && <details className="mt-2 text-sm"><summary className="cursor-pointer text-muted-foreground">{t("Описание")}</summary><Markdown value={occurrence.task.description} /></details>}<div className="mt-2 flex flex-wrap gap-2">{occurrence.task.tags.map((tag) => <TagChip key={tag} name={tag} color={tags.resource.status === "ready" ? tags.resource.data.find((item) => item.name === tag)?.color : undefined} />)}</div></div>
        {occurrence.task.source_kind !== "habit" && <label className="flex items-center gap-2 text-sm"><TaskCheckbox task={{ ...occurrence.task, status: occurrence.status }} occurrence={occurrence} busy={action.busy || !occurrence.editable} toggle={(completed) => action.run(() => api(`/tasks/${occurrence.task.id}/occurrences/${occurrence.date}`, { method: "POST", body: { status: completed ? "completed" : "todo" } }), changed)} />{t("Выполнено")}</label>}
      </div>{occurrence.task.source_kind === "habit" && <HabitControls occurrence={occurrence} changed={changed} />}{occurrence.task.habit?.workout_id && <WorkoutLauncher occurrence={occurrence} />}{!occurrence.editable && <p className="mt-2 text-xs text-muted-foreground">{t("Изменение недоступно: удалённый объект, изменённое расписание или будущая дата.")}</p>}<Button asChild size="sm" variant="outline" className="mt-3"><Link to={occurrence.task.source_kind === "habit" ? `/habits?habit=${occurrence.task.id}` : `/tasks?task=${occurrence.task.id}`}>{occurrence.task.source_kind === "habit" ? t("Открыть привычку") : t("Открыть задачу")}</Link></Button>
    </article>;
  })}</div>;
}
