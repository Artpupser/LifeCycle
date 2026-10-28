import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Markdown, MarkdownEditor } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import type { TaskOccurrence } from "@/features/planning/types";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { emptyMark, habitChanged, habitStatusLabels, type HabitMark, type HabitStatus } from "./types";

function MarkEditor({ occurrence, close, saved }: { occurrence: TaskOccurrence; close: () => void; saved: () => void }) {
  const [value, setValue] = useState(occurrence.habit_mark ?? emptyMark());
  const [uploading, setUploading] = useState(false);
  const action = useAction();
  async function submit(event: FormEvent) {
    event.preventDefault();
    await action.run(() => api(`/habits/${occurrence.task.id}/marks/${occurrence.date}`, { method: "POST", body: { status: value.status, completed_sub_habits: value.completed_sub_habits, note: value.note } }), () => { habitChanged(); saved(); close(); });
  }
  return <Dialog title={`Отметка: ${occurrence.task.title}`} onClose={close}><form className="space-y-5" onSubmit={(event) => void submit(event)}><p className="text-sm text-muted-foreground">{occurrence.date} · {occurrence.task.schedule?.timezone}</p><fieldset disabled={action.busy || !occurrence.editable} className="space-y-5"><FormField id="habit-mark-status" label="Результат привычки"><Select id="habit-mark-status" value={value.status} onChange={(event) => setValue({ ...value, status: event.target.value as HabitStatus })}>{Object.entries(habitStatusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></FormField>{occurrence.task.habit?.sub_habits.map((sub) => <label key={sub.id} className="flex items-start gap-3 rounded-xl border border-border p-3"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={value.completed_sub_habits.includes(sub.id)} onChange={(event) => setValue({ ...value, status: "pending", completed_sub_habits: event.target.checked ? [...value.completed_sub_habits, sub.id] : value.completed_sub_habits.filter((id) => id !== sub.id) })} /><span className="min-w-0 break-words"><span className="font-medium">{sub.title}</span>{sub.description && <Markdown value={sub.description} />}</span></label>)}{!!occurrence.task.habit?.sub_habits.length && <p className="text-xs text-muted-foreground">Выполнение всех пунктов завершает привычку. Отмена и пропуск сохраняются отдельно.</p>}<FormField id="habit-mark-note" label="Заметка к отметке"><MarkdownEditor id="habit-mark-note" value={value.note} onChange={(note) => setValue((old) => ({ ...old, note }))} onUploading={setUploading} /></FormField></fieldset>{action.error && <p role="alert" className="text-destructive">{action.error}</p>}<Button type="submit" disabled={action.busy || uploading || !occurrence.editable}>Сохранить отметку</Button></form></Dialog>;
}

export function HabitControls({ occurrence, changed }: { occurrence: TaskOccurrence; changed: () => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<HabitMark | null>(null);
  const action = useAction();
  const mark = draft ?? occurrence.habit_mark ?? emptyMark();
  const config = occurrence.task.habit!;
  async function save(next: HabitMark) {
    const previous = mark;
    setDraft(next);
    const saved = await action.run(() => api(`/habits/${occurrence.task.id}/marks/${occurrence.date}`, { method: "POST", body: { status: next.status, completed_sub_habits: next.completed_sub_habits, note: next.note } }), () => { habitChanged(); changed(); });
    if (!saved) setDraft(previous);
  }
  return <div className="mt-3 space-y-3"><div className="flex flex-wrap items-center gap-3"><span className="text-sm font-medium">{config.icon} Привычка{config.sub_habits.length ? ` · ${mark.completed_sub_habits.length}/${config.sub_habits.length}` : ""}</span><Select className="w-auto max-w-full" aria-label={`Результат ${occurrence.task.title}`} disabled={action.busy || !occurrence.editable} value={mark.status} onChange={(event) => void save({ ...mark, status: event.target.value as HabitStatus })}>{Object.entries(habitStatusLabels).map(([status, label]) => <option key={status} value={status} disabled={status === "completed" && config.sub_habits.length > 0 && mark.completed_sub_habits.length !== config.sub_habits.length}>{label}</option>)}</Select><Button size="sm" variant="outline" onClick={() => setEditing(true)}>Отметка и заметка</Button></div>{config.sub_habits.map((sub) => <label key={sub.id} className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" disabled={action.busy || !occurrence.editable} checked={mark.completed_sub_habits.includes(sub.id)} onChange={(event) => void save({ ...mark, status: "pending", completed_sub_habits: event.target.checked ? [...mark.completed_sub_habits, sub.id] : mark.completed_sub_habits.filter((id) => id !== sub.id) })} /><span className="min-w-0 break-words">{sub.title}</span></label>)}{mark.note && <details><summary className="cursor-pointer text-sm text-muted-foreground">Заметка к отметке</summary><Markdown value={mark.note} /></details>}{mark.marked_at && <p className="text-xs text-muted-foreground">Отмечено: {new Date(mark.marked_at).toLocaleString("ru-RU", { timeZone: occurrence.task.schedule?.timezone })}</p>}{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}{editing && <MarkEditor occurrence={occurrence} close={() => setEditing(false)} saved={changed} />}</div>;
}
