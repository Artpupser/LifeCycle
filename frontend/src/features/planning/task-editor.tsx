import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { localDateTimeInput } from "@/lib/dates";
import { ScheduleEditor } from "./schedule-editor";
import { defaultSchedule, taskInput, isRecurring, priorityLabels, statusLabels, type Task, type TaskInput, type TaskStatus } from "./types";

export function TaskEditor({ task, tasks, parentId, close, saved }: { task: Task | null; tasks: Task[]; parentId?: string; close: () => void; saved: () => void }) {
  const { settings } = usePreferences();
  const [draft, setDraft] = useState<TaskInput>(() => task ? taskInput(task) : { title: "", description: "", status: "todo", tags: [], color: "#a3e635", priority: "normal", parent_id: parentId ?? null, due_at: null, schedule: null });
  const [tags, setTags] = useState(draft.tags.join(", ")); const [uploading, setUploading] = useState(false); const action = useAction();
  function update<K extends keyof TaskInput>(key: K, value: TaskInput[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void action.run(() => api(task ? `/tasks/${task.id}` : "/tasks", { method: task ? "PUT" : "POST", body: { ...draft, tags: [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))] } }), saved); }
  const recurring = isRecurring(draft);
  return <Dialog title={task ? "Редактировать задачу" : parentId ? "Новая подзадача" : "Новая задача"} onClose={close}><form onSubmit={submit} className="space-y-5"><fieldset disabled={action.busy} className="space-y-5">
    <FormField id="task-title" label="Название задачи"><Input id="task-title" required autoFocus maxLength={200} value={draft.title} onChange={(event) => update("title", event.target.value)} /></FormField>
    <FormField id="task-description" label="Описание"><MarkdownEditor id="task-description" value={draft.description} onChange={(value) => update("description", value)} onUploading={setUploading} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="task-status" label="Статус задачи"><Select id="task-status" value={draft.status} onChange={(event) => update("status", event.target.value as TaskStatus)}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key} disabled={recurring && key !== "todo"}>{label}</option>)}</Select></FormField><FormField id="task-priority" label="Приоритет"><Select id="task-priority" value={draft.priority} onChange={(event) => update("priority", event.target.value as TaskInput["priority"])}>{Object.entries(priorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></FormField>
    <FormField id="task-parent" label="Родительская задача"><Select id="task-parent" value={draft.parent_id ?? ""} onChange={(event) => update("parent_id", event.target.value || null)}><option value="">Самостоятельная задача</option>{tasks.filter((item) => item.id !== task?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></FormField><FormField id="task-color" label="Цвет задачи"><Input id="task-color" type="color" value={draft.color} onChange={(event) => update("color", event.target.value)} /></FormField></div>
    <FormField id="task-tags" label="Теги через запятую"><Input id="task-tags" maxLength={1949} value={tags} onChange={(event) => setTags(event.target.value)} /></FormField>
    <FormField id="task-due" label={`Дедлайн (${Intl.DateTimeFormat().resolvedOptions().timeZone})`}><Input id="task-due" type="datetime-local" value={draft.due_at ? localDateTimeInput(draft.due_at) : ""} onChange={(event) => update("due_at", event.target.value ? new Date(event.target.value).toISOString() : null)} /></FormField>
    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium"><input type="checkbox" className="size-5 accent-primary" checked={draft.schedule !== null} onChange={(event) => update("schedule", event.target.checked ? defaultSchedule(settings.timezone) : null)} />Добавить в расписание</label>
    {draft.schedule && <ScheduleEditor value={draft.schedule} onChange={(schedule) => setDraft((current) => ({ ...current, schedule, status: schedule.recurrence !== "once" ? "todo" : current.status }))} />}
    {recurring && <p className="text-xs leading-6 text-muted-foreground">Повторяющиеся задачи отмечаются отдельно на каждый день во вкладке «Сегодня» или календаре.</p>}
  </fieldset>{action.error && <p className="text-sm text-destructive" role="alert">{action.error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={close} disabled={action.busy || uploading}>Отмена</Button><Button type="submit" disabled={action.busy || uploading || (draft.schedule?.recurrence === "weekly" && !draft.schedule.weekdays.length)}>{action.busy ? "Сохраняем…" : "Сохранить задачу"}</Button></div></form></Dialog>;
}
