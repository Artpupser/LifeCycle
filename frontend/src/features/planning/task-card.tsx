import {SubjectLabels} from "@/systems/labels/functional";
import {ObjectActions} from "@/systems/actions/action-menu";
import {taskDateActions} from "./quick-date-values";
import { AnimatedArticle } from "@/systems/animations/surfaces";
import { t, useLanguage } from "@/systems/i18n/locale";
import { useState, type ReactNode } from "react";
import { Clock3, Trash2, X, RotateCcw, CircleSlash, AlertTriangle } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Markdown } from "@/components/markdown";
import { TagChip } from "@/systems/labels/inputs";
import { taskTiming, taskResult, isTaskOverdue, priorityColors } from "./task-timing";
import type { Task, TaskOccurrence } from "./types";
import type { Label as TaskTag } from "@/systems/labels/types";
export function TaskCheckbox({ task, occurrence, busy, toggle }: { task: Task; occurrence?: TaskOccurrence; busy: boolean; toggle: (completed: boolean) => Promise<boolean> | void }) {
  useLanguage();
  const recurring = task.schedule && task.schedule.recurrence !== "once";
  const saved = recurring ? occurrence?.status === "completed" : task.status === "completed";
  const version = `${task.updated_at}-${task.status}-${occurrence?.status ?? ""}`;
  const [optimistic, setOptimistic] = useState<{ version: string; checked: boolean } | null>(null);
  const checked = optimistic?.version === version ? optimistic.checked : saved;
  const unavailable = recurring && (!occurrence || !occurrence.editable);
  if(taskResult(task,occurrence)==="rejected")return <button type="button" className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded border border-muted-foreground/40 text-muted-foreground" aria-label={t("Отменено: {v0}", {v0: task.title})} title={t("Вернуть в работу")} disabled={busy || Boolean(unavailable)} onClick={()=>void toggle(false)}><X className="size-4"/></button>;
  return <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary disabled:cursor-default disabled:opacity-40" aria-label={t("Выполнено: {title}",{title:task.title})} title={unavailable ? t("На сегодня нет доступного повторения") : t("Выполнено")} checked={checked} disabled={busy || Boolean(unavailable)} onChange={(event) => { const next = event.target.checked; setOptimistic({ version, checked: next }); void Promise.resolve(toggle(next)).then((ok) => { if (ok === false) setOptimistic(null); }).catch(() => setOptimistic(null)); }} />;
}
export function TaskCard({ task, occurrence, tags, now, timezone, busy, toggle, edit, remove, children, location, cancel, menuActions, draggable, dragStart, dragOver, drop }: { task: Task; occurrence?: TaskOccurrence; tags: TaskTag[]; now: number; timezone: string; busy: boolean; toggle: (completed: boolean) => Promise<boolean> | void; edit: () => void; remove: () => void; children?: ReactNode; menuActions?:ReactNode; location?: string; cancel?: () => void; draggable?: boolean; dragStart?: React.DragEventHandler<HTMLElement>; dragOver?: React.DragEventHandler<HTMLElement>; drop?: React.DragEventHandler<HTMLElement> }) {
  useLanguage();
  const recurring = task.schedule && task.schedule.recurrence !== "once";
  const result=taskResult(task,occurrence);
  const completed=["completed","rejected"].includes(result);
  const overdue=isTaskOverdue(task,now,timezone,occurrence);
  const priority=priorityColors[task.priority];
  const timing = taskTiming(task, now, timezone);
  return <AnimatedArticle data-drag-item="task" data-drag-key={`task-${task.id}`} draggable={draggable} onDragStart={dragStart} onDragOver={dragOver} onDrop={drop} data-task-result={overdue?"overdue":completed?"finished":"active"} style={priority?{borderLeft:`4px solid ${priority}`,backgroundColor:`color-mix(in srgb, ${priority} 8%, var(--card))`}:undefined} className={`group min-w-0 space-y-3 rounded-xl border bg-card p-4 shadow-sm hover:shadow-md ${completed ? "border-border/60 opacity-70" : "border-border"}`}>
    <div className="flex items-start gap-3"><TaskCheckbox task={task} occurrence={occurrence} busy={busy} toggle={toggle} /><button className={`min-w-0 flex-1 break-words text-left text-sm font-medium leading-6 hover:text-primary ${completed ? "text-muted-foreground line-through" : ""}`} onClick={edit}>{task.title}</button><ObjectActions subject={{kind:"tasks",id:task.id}} actions={taskDateActions(task,timezone,busy,edit)} label={t("Действия задачи {v0}", {v0:task.title})}>{cancel && <Button className="w-full justify-start" size="sm" variant="ghost" disabled={busy} onClick={cancel}>{result==="rejected"?<RotateCcw/>:<CircleSlash/>}{result==="rejected"?t("Вернуть в работу"):t("Отменить задачу")}</Button>}{menuActions}<Button className="w-full justify-start text-destructive" size="sm" variant="ghost" disabled={busy} onClick={remove}><Trash2 />{t("Удалить задачу")}</Button></ObjectActions></div>
    {overdue && <p className="inline-flex items-center gap-1 rounded-md bg-red-500/10 px-2 py-1 text-xs font-semibold text-destructive"><AlertTriangle className="size-3"/>{t("Просрочена")}</p>}{result==="rejected" && <p className="text-xs text-muted-foreground">{t("Отменена")}</p>}
    {task.description && <div className="max-h-14 overflow-hidden text-xs text-muted-foreground"><Markdown value={task.description} /></div>}
    <SubjectLabels subject={{kind:"tasks",id:task.id}}>{task.tags.map((name) => <TagChip key={name} name={name} color={tags.find((tag) => tag.name === name)?.color} />)}</SubjectLabels>
    {(timing || recurring || location) && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{timing && <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 ${timing.today ? "bg-primary/10 font-medium text-primary" : "bg-muted"}`}><Clock3 className="size-3" />{timing.text}</span>}{recurring && <span>{t("↻ Повторяется")}</span>}{location && <span className="truncate">{location}</span>}</div>}
    {children && <div className="border-t border-border/60 pt-3">{children}</div>}
  </AnimatedArticle>;
}
