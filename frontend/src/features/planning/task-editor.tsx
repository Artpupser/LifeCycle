import {defaultItemColor} from "@/systems/themes/themes";
import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton,SaveForm} from "@/components/ui/save";
import {toggleKeys} from "@/systems/selection/state";
import { t, useLanguage } from "@/systems/i18n/locale";
import { useState, type FormEvent } from "react";
import { TagSelection } from "@/systems/labels/inputs";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { scheduleInZone } from "./schedule-time";
import { PlanningFields } from "./planning-fields";
import { planningFromTask, buildPlanning } from "./task-planning";
import { taskInput, defaultSchedule, isRecurring, priorityLabels, type Task, type TaskInput } from "./types";

export function TaskEditor({ task, tasks, parentId, close, saved, submitDraft }: { task: Task | null; tasks: Task[]; parentId?: string; close: () => void; saved: () => void; submitDraft?: (value: TaskInput) => Promise<void> }) {
  useLanguage();
  const { settings } = usePreferences();
  const [draft, setDraft] = useState<TaskInput>(() => task ? taskInput(task) : { title: "", description: "", status: "todo", tags: [], color: defaultItemColor, priority: "normal", parent_id: parentId ?? null, due_at: null, schedule: null });
  const [planning, setPlanning] = useState(() => planningFromTask(task ?? { schedule:null,due_at:null }, settings.timezone));
  const initialPlanning = planningFromTask(task ?? { schedule:null,due_at:null },settings.timezone);
  const [dateError, setDateError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false); const action = useAction();
  function update<K extends keyof TaskInput>(key: K, value: TaskInput[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault();setDateError(null);let dates;try { dates=JSON.stringify(planning)===JSON.stringify(initialPlanning) ? { schedule:draft.schedule,due_at:draft.due_at } :buildPlanning(planning,settings.timezone,draft.schedule?scheduleInZone(draft.schedule,settings.timezone):null); }catch(error){setDateError(error instanceof Error?error.message:t("Проверьте время"));return;}const body={...draft,...dates};void action.run(() => submitDraft ? submitDraft(body) : api(task ? `/tasks/${task.id}` : "/tasks", { method: task ? "PUT" : "POST", body }), saved); }
  const recurring = isRecurring(draft);
  const repeatRule=draft.schedule ? scheduleInZone(draft.schedule,settings.timezone) : defaultSchedule(settings.timezone);
  function repeat(value: Partial<typeof repeatRule>) { if(!planning.startDate) setPlanning(planningFromTask({schedule:repeatRule,due_at:null},settings.timezone)); update("schedule",{...repeatRule,...value}); }
  return <Dialog title={task ? t("Редактировать задачу") : parentId ? t("Новая подзадача") : t("Новая задача")} onClose={close}><SaveForm onSubmit={submit} className="space-y-5"><fieldset disabled={action.busy} className="space-y-5">
    {!recurring && <label className="flex items-center gap-3 text-sm"><Input type="checkbox" className="size-5 accent-primary" checked={draft.status === "completed"} onChange={(event) => update("status", event.target.checked ? "completed" : "todo")} />{t("Выполнено")}</label>}
    {!recurring && <Button variant="ghost" className="text-muted-foreground" onClick={()=>update("status",draft.status==="rejected"?"todo":"rejected")}>{draft.status==="rejected"?t("Вернуть в работу"):t("Отменить задачу")}</Button>}
    <FormField id="task-title" label={t("Название задачи")}><Input id="task-title" required autoFocus maxLength={200} value={draft.title} onChange={(event) => update("title", event.target.value)} /></FormField>
    <FormField id="task-description" label={t("Описание")}><MarkdownEditor id="task-description" value={draft.description} onChange={(value) => update("description", value)} onUploading={setUploading} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="task-priority" label={t("Приоритет")}><ChoiceField id="task-priority" value={draft.priority} change={(next) => update("priority", next as TaskInput["priority"])}>{Object.entries(priorityLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</ChoiceField></FormField>
    <FormField id="task-parent" label={t("Родительская задача")}><ChoiceField id="task-parent" value={draft.parent_id ?? ""} change={(next) => update("parent_id", next || null)}><option value="">{t("Самостоятельная задача")}</option>{tasks.filter((item) => item.id !== task?.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</ChoiceField></FormField><FormField id="task-color" label={t("Цвет задачи")}><Input id="task-color" type="color" value={draft.color} onChange={(event) => update("color", event.target.value)} /></FormField></div>
    <fieldset className="space-y-3"><legend className="text-sm font-medium">{t("Теги задачи")}</legend><TagSelection value={draft.tags} change={tags=>update("tags",tags)}/></fieldset>
    <PlanningFields value={planning} change={(value)=>{setPlanning(value);setDateError(null);}} />
    <details className="space-y-3"><summary className="cursor-pointer text-sm text-muted-foreground">{t("Повторение")}</summary><FormField id="task-repeat" label={t("Повторять")}><ChoiceField id="task-repeat" value={repeatRule.recurrence} change={(next)=>repeat({recurrence:next as typeof repeatRule.recurrence})}><option value="once">{t("Один раз")}</option><option value="daily">{t("Каждый день")}</option><option value="weekly">{t("По дням недели")}</option><option value="interval">{t("Через несколько дней")}</option></ChoiceField></FormField>{repeatRule.recurrence==="interval" && <FormField id="task-interval" label={t("Каждые N дней")}><Input id="task-interval" type="number" min={1} max={3650} value={Number.isNaN(repeatRule.interval_days)?"":repeatRule.interval_days} onChange={(event)=>repeat({interval_days:event.target.valueAsNumber})}/></FormField>}{repeatRule.recurrence==="weekly" && <div className="flex flex-wrap gap-2">{[t("Пн"),t("Вт"),t("Ср"),t("Чт"),t("Пт"),t("Сб"),t("Вс")].map((day,index)=><label key={day} className="flex items-center gap-1 text-sm"><Input type="checkbox" checked={repeatRule.weekdays.includes(index+1)} onChange={(event)=>repeat({weekdays:toggleKeys(repeatRule.weekdays,index+1,event.target.checked)})}/>{day}</label>)}</div>}{repeatRule.recurrence!=="once"&&<FormField id="task-repeat-until" label={t("Повторять до (необязательно)")}><Input id="task-repeat-until" type="date" min={planning.startDate} value={repeatRule.end_date??""} onChange={(event)=>repeat({end_date:event.target.value||null})}/></FormField>}</details>
    {recurring && <p className="text-xs leading-6 text-muted-foreground">{t("Повторяющиеся задачи отмечаются отдельно на каждый день во вкладке «Сегодня» или календаре.")}</p>}
  </fieldset>{(action.error || dateError) && <p className="text-sm text-destructive" role="alert">{dateError || action.error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" onClick={close} disabled={action.busy || uploading}>{t("Отмена")}</Button><SaveButton type="submit" disabled={action.busy || uploading || (draft.schedule?.recurrence === "weekly" && !draft.schedule.weekdays.length)}>{action.busy ? t("Сохраняем…") : t("Сохранить задачу")}</SaveButton></div></SaveForm></Dialog>;
}
