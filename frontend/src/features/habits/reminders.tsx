import { useEffect } from "react";
import { Link } from "react-router";
import { ErrorState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/features/settings/preferences-context";
import { useAction } from "@/hooks/use-action";
import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";
import { instantLabel } from "@/lib/dates";

type Reminder = { task_id: string; date: string; title: string; starts_at: string; due_at: string };
function EnabledReminders() {
  const { settings } = usePreferences();
  const { resource, retry } = useResource<Reminder[]>("/reminders");
  const action = useAction();
  useEffect(() => {
    const interval = window.setInterval(retry, 30_000);
    window.addEventListener("habits-changed", retry);
    return () => { window.clearInterval(interval); window.removeEventListener("habits-changed", retry); };
  }, [retry]);
  return <aside aria-label="Напоминания привычек" className="mx-auto max-w-6xl px-5 pt-4 sm:px-10"><div aria-live="polite">{resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : resource.status === "ready" && resource.data.length > 0 && <div className="space-y-3 rounded-xl border border-primary/40 bg-primary/5 p-4"><p className="font-semibold">Пора уделить время привычке</p>{resource.data.map((reminder) => <div key={`${reminder.task_id}-${reminder.date}`} className="flex flex-wrap items-center justify-between gap-3"><Link className="min-w-0 break-words text-sm text-primary underline" to={`/habits?habit=${reminder.task_id}`}>{reminder.title} · {instantLabel(reminder.starts_at, settings.timezone, settings.time_format)}</Link><Button size="sm" variant="outline" disabled={action.busy} aria-label={`Прочитано: ${reminder.title}`} onClick={() => void action.run(() => api(`/reminders/${reminder.task_id}/${reminder.date}/dismiss`, { method: "POST" }), retry)}>Прочитано</Button></div>)}</div>}</div>{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}</aside>;
}
export function HabitReminders() {
  const { settings } = usePreferences();
  return settings.reminders_enabled ? <EnabledReminders key={settings.reminder_minutes_before} /> : null;
}
