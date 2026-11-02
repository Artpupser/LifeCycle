import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { useResource } from "@/hooks/use-resource";
import { ErrorState } from "@/components/resource-state";
import { TagSelection } from "./tag-chip";
import type { TaskTag } from "./task-tags-page";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { scheduleInZone } from "./schedule-time";
import { PlanningFields } from "./planning-fields";
import { planningFromTask, buildPlanning } from "./task-planning";
import { taskInput, defaultSchedule, isRecurring, priorityLabels, type Task, type TaskInput } from "./types";

export function TaskEditor({ task, tasks, parentId, close, saved, submitDraft }: { task: Task | null; tasks: Task[]; parentId?: string; close: () => void; saved: () => void; submitDraft?: (value: TaskInput) => Promise<void> }) {
  const { settings } = usePreferences();
  const [draft, setDraft] = useState<TaskInput>(() => task ? taskInput(task) : { title: "", description: "", status: "todo", tags: [], color: "#a3e635", priority: "normal", parent_id: parentId ?? null, due_at: null, schedule: null });
  const [planning, setPlanning] = useState(() => planningFromTask(task ?? { schedule:null,due_at:null }, settings.timezone));
  const initialPlanning = planningFromTask(task ?? { schedule:null,due_at:null },settings.timezone);
  const [dateError, setDateError] = useState<string | null>(null);
  const tagRegistry = useResource<TaskTag[]>("/task-tags");
  const [uploading, setUploading] = useState(false); const action = useAction();
  function update<K extends keyof TaskInput>(key: K, value: TaskInput[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault();setDateError(null);let dates;try { dates=JSON.stringify(planning)===JSON.stringify(initialPlanning) ? { schedule:draft.schedule,due_at:draft.due_at } :buildPlanning(planning,settings.timezone,draft.schedule?scheduleInZone(draft.schedule,settings.timezone):null); }catch(error){setDateError(error instanceof Error?error.message:"Проверьте время");return;}const body={...draft,...dates};void action.run(() => submitDraft ? submitDraft(body) : api(task ? `/tasks/${task.id}` : "/tasks", { method: task ? "PUT" : "POST", body }), saved); }
  const recurring = isRecurring(draft);
  const repeatRule=draft.schedule ? scheduleInZone(draft.schedule,settings.timezone) : defaultSchedule(settings.timezone);
  function repeat(value: Partial<typeof repeatRule>) { if(!planning.startDate) setPlanning(planningFromTask({schedule:repeatRule,due_at:null},settings.timezone)); update("schedule",{...repeatRule,...value}); }
  return <Dialog title={task ? "Редактировать задачу" : parentId ? "Новая подзадача" : "Новая задача"} onClose={close}><form onSubmit={submit} className="space-y-5"><fieldset disabled={action.busy} className="space-y-5">
    {!recurring && <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="size-5 accent-primary" checked={draft.status === "completed"} onChange={(event) => update("status", event.target.checked ? "completed" : "todo")} />Выполнено</label>}
    {!recurring && <Button variant="ghost" className="text-muted-foreground" onClick={()=>update("status",draft.status==="rejected"?"todo":"rejected")}>{draft.status==="rejected"?"Вернуть в работу":"Отменить задачу"}</Button>}
    <FormField id="task-title" label="Название задачи"><Input id="task-title" required autoFocus maxLength={200} value={draft.title} onChange={(event) => update("title", event.target.value)} /></FormField>
    <FormField id="task-description" label="Описание"><MarkdownEditor id="task-description" value={draft.description} onChange={(value) => update("description", value)} onUploading={setUploading} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="task-priority" label="Приоритет"><Select id="task-priority" value={draft.priority} onChange={(event) => update("priority", event.target.value as TaskInput["priority"])}>{Object.entries(priorityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></FormField>
    <FormField id="task-parent" label="Родительская задача"><Select id="task-parent" value={draft.parent_id ?? ""} onChange={(event) => update("parent_id", event.target.value || null)}><option value="">Самостоятельная задача</option>{tasks.filter((item) => item.id !== task?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</Select></FormField><FormField id="task-color" label="Цвет задачи"><Input id="task-color" type="color" value={draft.color} onChange={(event) => update("color", event.target.value)} /></FormField></div>
    <fieldset className="space-y-3"><legend className="text-sm font-medium">Теги задачи</legend><TagSelection value={draft.tags} change={tags=>update("tags",tags)} tags={tagRegistry.resource.status==="ready"?tagRegistry.resource.data:[]}/>{tagRegistry.resource.status === "error" && <ErrorState message={tagRegistry.resource.message} retry={tagRegistry.retry} />}<Link to="/task-tags" target="_blank" className="text-sm text-primary underline">Управление тегами (в новом окне)</Link><p className="text-xs text-muted-foreground">После создания тега вернитесь в это окно; список обновится.</p></fieldset>
    <PlanningFields value={planning} change={(value)=>{setPlanning(value);setDateError(null);}} />
    <details className="space-y-3"><summary className="cursor-pointer text-sm text-muted-foreground">Повторение</summary><FormField id="task-repeat" label="Повторять"><Select id="task-repeat" value={repeatRule.recurrence} onChange={(event)=>repeat({recurrence:event.target.value as typeof repeatRule.recurrence})}><option value="once">Один раз</option><option value="daily">Каждый день</option><option value="weekly">По дням недели</option><option value="interval">Через несколько дней</option></Select></FormField>{repeatRule.recurrence==="interval" && <FormField id="task-interval" label="Каждые N дней"><Input id="task-interval" type="number" min={1} max={3650} value={Number.isNaN(repeatRule.interval_days)?"":repeatRule.interval_days} onChange={(event)=>repeat({interval_days:event.target.valueAsNumber})}/></FormField>}{repeatRule.recurrence==="weekly" && <div className="flex flex-wrap gap-2">{["Пн","Вт","Ср","Чт","Пт","Сб","Вс"].map((day,index)=><label key={day} className="flex items-center gap-1 text-sm"><input type="checkbox" checked={repeatRule.weekdays.includes(index+1)} onChange={(event)=>repeat({weekdays:event.target.checked?[...repeatRule.weekdays,index+1]:repeatRule.weekdays.filter((d)=>d!==index+1)})}/>{day}</label>)}</div>}{repeatRule.recurrence!=="once"&&<FormField id="task-repeat-until" label="Повторять до (необязательно)"><Input id="task-repeat-until" type="date" min={planning.startDate} value={repeatRule.end_date??""} onChange={(event)=>repeat({end_date:event.target.value||null})}/></FormField>}</details>
    {recurring && <p className="text-xs leading-6 text-muted-foreground">Повторяющиеся задачи отмечаются отдельно на каждый день во вкладке «Сегодня» или календаре.</p>}
  </fieldset>{(action.error || dateError) && <p className="text-sm text-destructive" role="alert">{dateError || action.error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={close} disabled={action.busy || uploading}>Отмена</Button><Button type="submit" disabled={action.busy || uploading || (draft.schedule?.recurrence === "weekly" && !draft.schedule.weekdays.length)}>{action.busy ? "Сохраняем…" : "Сохранить задачу"}</Button></div></form></Dialog>;
}
