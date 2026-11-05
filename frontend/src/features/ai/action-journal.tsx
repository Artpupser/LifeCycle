import {useHistory} from "@/systems/history/use-history";
import { HistoryEntries } from "@/systems/history/history";
import { t, useLanguage } from "@/systems/i18n/locale";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { usePreferences } from "@/features/settings/preferences-context";
import { TaskEditor } from "@/features/planning/task-editor";
import type { Task } from "@/features/planning/types";
import { NoteEditor, type NoteInput, type Folder } from "@/features/notes/notes-page";
import { ExerciseEditor } from "@/features/workouts/exercise-editor";
import { WorkoutEditor } from "@/features/workouts/workout-editor";
import type { Exercise, Workout, RecordData } from "@/features/workouts/types";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { dateTimeLabel } from "@/lib/dates";
import { refreshActions } from "./actions";
import type { ActionItem, ActionChange, AiConfig } from "./types";

const entityLabels = { get exercise() { return t("упражнение"); }, get workout() { return t("тренировку"); }, get task() { return t("задачу"); }, get note() { return t("заметку"); } };
const labels = { get prepared() { return t("Ожидает подтверждения"); }, get applied() { return t("Применено"); }, get undone() { return t("Отменено"); }, get dismissed() { return t("Отклонено"); } };
function ChangeView({ change }: { change: ActionChange }) {
  useLanguage();
  const { settings } = usePreferences();
  const title = String(change.after.title ?? "");
  const workout = change.action.entity === "workout" ? change.after as unknown as Workout : null;
  return <article className="min-w-0 space-y-3 rounded-xl border border-border p-3"><h4 className="break-words font-semibold">{change.before ? t("Изменить") : t("Создать")} {t(entityLabels[change.action.entity])}: {title}</h4><Markdown value={String(change.after.description ?? change.after.content ?? "")} allowImages={false} />{change.action.entity === "task" && <p className="text-sm">{change.after.status === "completed" ? t("Выполнено") : t("Не выполнено")} {t(" · Приоритет: ")}{String(change.after.priority)}. {change.after.schedule ? t("Расписание: {v0} · {v1} · {v2}", {v0: String((change.after.schedule as Record<string, unknown>).start_date), v1: String((change.after.schedule as Record<string, unknown>).time ?? "без времени"), v2: String((change.after.schedule as Record<string, unknown>).recurrence)}) : t("Без расписания")}{typeof change.after.due_at === "string" ? t(" · Срок: {v0}", {v0: dateTimeLabel(change.after.due_at, settings.timezone, settings.time_format)}) : ""}</p>}{workout && <ol className="list-inside list-decimal space-y-2 text-sm">{workout.rounds.map((round) => <li key={round.id}>{round.title} × {round.repeat}{t(", отдых ")}{round.rest_seconds} {t(" сек.")}<ul className="ml-4 space-y-1">{round.exercises.map((entry) => <li key={entry.id}>{t("Упражнение ")}{entry.exercise_id.slice(0, 8)}: {entry.repetitions} {t(" повт., ")}{entry.duration_seconds} {t(" сек., отдых ")}{entry.rest_seconds} {t(" сек.")}{entry.intensity ? ` · ${entry.intensity}` : ""}{entry.progression ? t(" · прогрессия за {v0} дней", {v0: entry.progression.days}) : ""}</li>)}</ul></li>)}</ol>}<details><summary className="cursor-pointer text-sm text-primary">{t("Все поля до и после")}</summary><pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ before: change.before, after: change.after }, null, 2)}</pre></details></article>;
}
export function ActionReview({ initial, config, close }: { initial: ActionItem; config: AiConfig; close: () => void }) {
  useLanguage();
  const [item, setItem] = useState(initial);
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 1500); return () => window.clearInterval(timer); }, []);
  const [confirmed, setConfirmed] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tasks = useResource<Task[]>("/tasks");
  const folders = useResource<Folder[]>("/notes/folders");
  const exercises = useResource<RecordData<Exercise>[]>("/exercises");
  const change = editing === null ? null : item.data.changes[editing];
  async function command(action: "apply" | "undo" | "dismiss") {
    setBusy(true); setError(null);
    try { setItem(await api<ActionItem>(`/ai/actions/${item.id}/${action}`, { method: "POST", ...(action === "dismiss" ? {} : { body: { confirmed: true } }) })); setConfirmed(false); refreshActions(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  async function edit(data: unknown) {
    const actions = item.data.changes.map((c, index) => ({ ...c.action, data: index === editing ? data : c.after }));
    const next = await api<ActionItem>("/ai/actions", { method: "POST", body: { revision: config.revision, source_turn_id: item.source_turn_id, summary: item.data.summary, actions } });
    await api(`/ai/actions/${item.id}/dismiss`, { method: "POST" });
    setItem(next); setConfirmed(false); refreshActions();
  }
  const stale = item.config_revision !== config.revision || now - Date.parse(item.created_at) >= 15 * 60_000;
  const record = change ? { id: change.action.id, data: change.after, created_at: item.created_at, updated_at: item.updated_at } : null;
  if (change && record && change.action.entity === "exercise") return <ExerciseEditor initial={record as unknown as RecordData<Exercise>} close={() => setEditing(null)} saved={() => setEditing(null)} submitDraft={edit} />;
  if (change && record && change.action.entity === "task" && tasks.resource.status === "ready") return <TaskEditor task={{ ...change.after, id: change.action.id, source_kind: "manual", source_id: null, created_at: item.created_at, updated_at: item.updated_at } as unknown as Task} tasks={tasks.resource.data} close={() => setEditing(null)} saved={() => setEditing(null)} submitDraft={edit} />;
  if (change && record && change.action.entity === "note" && folders.resource.status === "ready") return <NoteEditor initial={{ ...change.after, id: change.action.id } as NoteInput & { id: string }} folders={folders.resource.data} close={() => setEditing(null)} saved={() => setEditing(null)} submitDraft={edit} />;
  if (change && record && change.action.entity === "workout" && exercises.resource.status === "ready") {
    const available = [...exercises.resource.data];
    for (const c of item.data.changes) if (c.action.entity === "exercise" && !available.some((e) => e.id === c.action.id)) available.push({ id: c.action.id, data: c.after as unknown as Exercise, created_at: item.created_at, updated_at: item.updated_at });
    return <WorkoutEditor initial={record as unknown as RecordData<Workout>} exercises={available} close={() => setEditing(null)} saved={() => setEditing(null)} submitDraft={edit} />;
  }
  return <Dialog title={t("Проверка изменений AI")} onClose={close}><div className="space-y-4"><p className="text-sm leading-6">{item.data.summary}</p><p className="text-sm text-muted-foreground">{t(labels[item.status])}{t(". Сохранение выполняет все изменения вместе. Предложение действует 15 минут; при изменении данных или разрешений подготовьте новое.")}</p>{item.data.changes.map((c, index) => <div key={c.action.id} className="space-y-2"><ChangeView change={c} />{item.status === "prepared" && <Button size="sm" variant="outline" disabled={busy || exercises.resource.status !== "ready" || tasks.resource.status !== "ready" || folders.resource.status !== "ready"} onClick={() => setEditing(index)}>{t("Изменить предложение ")}{index + 1}</Button>}</div>)}{item.status === "prepared" && <>{stale && <p role="status" className="text-sm text-destructive">{t("Срок или настройки предложения изменились. Подготовьте новое предложение.")}</p>}<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{t("Я проверил все изменения и хочу сохранить их")}</label><div className="flex flex-wrap gap-2"><Button disabled={busy || !confirmed || stale} onClick={() => void command("apply")}>{t("Подтвердить и сохранить изменения")}</Button><Button variant="outline" disabled={busy} onClick={() => void command("dismiss")}>{t("Отклонить предложение")}</Button></div></>}{item.status === "applied" && <><p className="text-sm">{t("Изменения сохранены. Откройте ")}<Link to="/workouts" className="text-primary underline">{t("тренировки")}</Link>, <Link to="/tasks" className="text-primary underline">{t("задачи")}</Link> {t(" или ")}<Link to="/notes" className="text-primary underline">{t("заметки")}</Link>{t(". Отмена доступна, пока эти записи не изменены и не появились новые связи.")}</p><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />{t("Подтверждаю отмену этих изменений")}</label><Button variant="outline" disabled={busy || !confirmed} onClick={() => void command("undo")}>{t("Отменить сохранённые изменения")}</Button></>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></Dialog>;
}
export function ActionJournal({ config }: { config: AiConfig }) {
  useLanguage();
  const [before, setBefore] = useState("");
  const resource = useHistory<ActionItem[]>({kind:"ai",before});
  const refresh = resource.retry;
  useEffect(() => { window.addEventListener("lifecycle:ai-actions", refresh); return () => window.removeEventListener("lifecycle:ai-actions", refresh); }, [refresh]);
  const [selected, setSelected] = useState<ActionItem | null>(null);
  const { settings } = usePreferences();
  return <section aria-label={t("Журнал изменений AI")} className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="text-xl font-semibold">{t("Журнал изменений AI")}</h2><Button size="sm" variant="outline" onClick={refresh}>{t("Обновить журнал")}</Button></div>{resource.resource.status === "loading" ? <LoadingState /> : resource.resource.status === "error" ? <ErrorState message={resource.resource.message} retry={refresh} /> : <>{!resource.resource.data.length && <p className="text-sm text-muted-foreground">{t("Предложения из ответов AI появятся здесь после проверки. Данные меняются только после подтверждения.")}</p>}<HistoryEntries items={resource.resource.data} itemKey={item=>item.id} kind="ai" scope={before} removed={refresh} render={item=><><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{item.data.summary}</p><p className="text-xs text-muted-foreground">{t(labels[item.status])} · {dateTimeLabel(item.created_at,settings.timezone,settings.time_format)}</p></div><Button size="sm" variant="outline" onClick={()=>setSelected(item)}>{t("Открыть изменения")}</Button></>}/>{resource.resource.data.length === 50 && <Button variant="outline" onClick={() => setBefore(resource.resource.status === "ready" ? resource.resource.data.at(-1)!.created_at : "")}>{t("Ранее")}</Button>}{before && <Button variant="outline" onClick={() => setBefore("")}>{t("Последние изменения")}</Button>}</>}{selected && <ActionReview initial={selected} config={config} close={() => { setSelected(null); refresh(); }} />}</section>;
}
