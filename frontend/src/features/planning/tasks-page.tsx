import { CalendarDays, History, ListTodo, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useAction } from "@/hooks/use-action";
import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";
import { dateTimeLabel, dateLabel, instantLabel, localDate } from "@/lib/dates";
import { TaskEditor } from "./task-editor";
import { TaskGantt } from "./task-gantt";
import { taskInput, isRecurring, priorityLabels, statusLabels, type Task, type TaskOccurrence, type TaskStatus } from "./types";

function HistoryDialog({ task, close }: { task: Pick<Task, "id" | "title">; close: () => void }) {
  const { settings } = usePreferences();
  const { resource, retry } = useResource<TaskOccurrence[]>(`/tasks/${task.id}/history`);
  return <Dialog title={`История: ${task.title}`} onClose={close}>{resource.status === "loading" ? <LoadingState /> : resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : resource.data.length ? <ul className="divide-y divide-border">{resource.data.map((item) => <li key={item.date} className="space-y-3 py-4"><div className="flex flex-wrap items-center justify-between gap-2"><span>{dateLabel(item.date, { day: "numeric", month: "long", year: "numeric" })}{item.starts_at ? ` · ${instantLabel(item.starts_at, settings.timezone, settings.time_format)}` : ""}</span><span className="text-sm text-muted-foreground">{statusLabels[item.status]}</span></div><p className="break-words font-medium">{item.task.title}</p>{item.task.description && <details><summary className="cursor-pointer text-sm text-muted-foreground">Сохранённое описание</summary><Markdown value={item.task.description} /></details>}</li>)}</ul> : <p className="text-sm text-muted-foreground">Отметок пока нет.</p>}</Dialog>;
}

export function TasksPage() {
  const { settings } = usePreferences();
  const [locationParams, setLocationParams] = useSearchParams();
  const [query, setQuery] = useState(""); const [search, setSearch] = useState(""); const [status, setStatus] = useState(""); const [from, setFrom] = useState(""); const [to, setTo] = useState(""); const [tag, setTag] = useState("");
  const [view, setView] = useState<"list" | "kanban" | "gantt">("list");
  const params = new URLSearchParams({ ...(search ? { q: search } : {}), ...(status ? { status } : {}), ...(from ? { from } : {}), ...(to ? { to } : {}), ...(tag ? { tag } : {}) });
  const { resource, retry } = useResource<Task[]>(`/tasks?${params}`);
  const tasks = resource.status === "ready" ? resource.data : [];
  const all = useResource<Task[]>("/tasks");
  const parentTasks = all.resource.status === "ready" ? all.resource.data : tasks;
  const [editing, setEditing] = useState<Task | "new" | null>(null); const [parentId, setParentId] = useState<string | undefined>(); const [history, setHistory] = useState<Task | null>(null); const [detail, setDetail] = useState<Task | null>(null); const action = useAction();
  function refreshed() { retry(); all.retry(); }
  const selectedId = locationParams.get("task");
  const selectedTask = detail ?? parentTasks.find((task) => task.id === selectedId);
  function closeDetail() { setDetail(null); setLocationParams({}, { replace: true }); }
  function changeStatus(task: Task, next: TaskStatus) { void action.run(() => api(`/tasks/${task.id}`, { method: "PUT", body: { ...taskInput(task), status: next } }), refreshed); }
  function remove(task: Task) { if (window.confirm(`Удалить задачу «${task.title}»? История отметок сохранится, подзадачи станут самостоятельными.`)) void action.run(() => api(`/tasks/${task.id}`, { method: "DELETE" }), refreshed); }
  function renderTask(task: Task) {
    return <Card key={task.id} className="space-y-4 p-4"><div className="flex items-start gap-2"><svg width="10" height="10" className="mt-1.5 shrink-0" aria-hidden="true"><circle cx="5" cy="5" r="5" fill={task.color} /></svg><button className="min-w-0 flex-1 break-words text-left font-medium hover:text-primary" onClick={() => setDetail(task)}>{task.title}</button><Button size="sm" variant="outline" aria-label={`Редактировать задачу ${task.title}`} onClick={() => { setParentId(undefined); setEditing(task); }}><Pencil aria-hidden="true" /></Button></div>{task.parent_id && <p className="text-xs text-muted-foreground">↳ {parentTasks.find((parent) => parent.id === task.parent_id)?.title ?? "Подзадача"}</p>}<div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><span className={`rounded-full bg-muted px-2 py-1 ${task.priority === "urgent" || task.priority === "high" ? "text-primary" : ""}`}>{priorityLabels[task.priority]}</span>{task.schedule && <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><CalendarDays className="size-3" aria-hidden="true" />{dateLabel(task.schedule.start_date)}{isRecurring(task) ? " · повторяется" : ""}</span>}{task.tags.map((item) => <button key={item} onClick={() => setTag(item)} className="rounded-full bg-muted px-2 py-1 hover:text-primary">#{item}</button>)}</div><Select aria-label={`Статус ${task.title}`} value={task.status} disabled={action.busy} onChange={(event) => changeStatus(task, event.target.value as TaskStatus)}>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key} disabled={isRecurring(task) && key !== "todo"}>{label}</option>)}</Select>{isRecurring(task) && <p className="text-xs text-muted-foreground">Каждое повторение отмечается в <Link to="/calendar" className="text-primary underline">календаре</Link> или плане дня.</p>}<div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => { setParentId(task.id); setEditing("new"); }}><Plus aria-hidden="true" />Подзадача</Button><Button variant="outline" size="sm" aria-label={`История задачи ${task.title}`} onClick={() => setHistory(task)}><History aria-hidden="true" /></Button><Button variant="outline" size="sm" aria-label={`Удалить задачу ${task.title}`} disabled={action.busy} onClick={() => remove(task)}><Trash2 aria-hidden="true" /></Button></div></Card>;
  }

  return <main id="main" className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-10"><div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">От намерения к действию</p><h1 className="text-3xl font-semibold">Задачи</h1></div><Button onClick={() => { setParentId(undefined); setEditing("new"); }}><Plus aria-hidden="true" />Новая задача</Button></div>
    <div className="mb-6 space-y-4"><div className="flex flex-wrap justify-between gap-4"><form className="flex min-w-60 flex-1 gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(query); }}><Input aria-label="Поиск задач" placeholder="Поиск по задачам…" value={query} onChange={(event) => setQuery(event.target.value)} /><Button variant="outline" type="submit" aria-label="Найти задачи"><Search aria-hidden="true" /></Button></form><div className="flex gap-1" aria-label="Представление задач">{([{ id: "list", label: "Список" }, { id: "kanban", label: "Kanban" }, { id: "gantt", label: "Gantt" }] as const).map((tab) => <Button key={tab.id} variant={view === tab.id ? "default" : "outline"} aria-pressed={view === tab.id} onClick={() => setView(tab.id)}>{tab.label}</Button>)}</div></div>
    <div className="grid gap-3 sm:grid-cols-4"><Select aria-label="Фильтр статуса" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Все статусы</option>{Object.entries(statusLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select><Input aria-label="Задачи с даты" type="date" value={from} onChange={(event) => setFrom(event.target.value)} /><Input aria-label="Задачи до даты" type="date" min={from} value={to} onChange={(event) => setTo(event.target.value)} /><Input aria-label="Фильтр по тегу" placeholder="Тег" value={tag} maxLength={64} onChange={(event) => setTag(event.target.value)} /></div></div>
    {action.error && <p className="mb-4 text-sm text-destructive" role="alert">{action.error}</p>}
    {resource.status === "loading" ? <LoadingState /> : resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : view === "gantt" ? <TaskGantt key={`${resource.data.map((item) => item.updated_at).join()}-${from}`} tasks={tasks} from={from || localDate(settings.timezone)} edit={setEditing} /> : !tasks.length ? <Card className="p-12 text-center"><ListTodo className="mx-auto mb-4 size-8 text-muted-foreground" aria-hidden="true" /><h2 className="font-medium">Пока нет задач</h2><p className="mt-2 text-sm text-muted-foreground">Создайте задачу или измените фильтры.</p></Card> : view === "list" ? <div className="grid gap-4 md:grid-cols-2">{tasks.map(renderTask)}</div> : <div className="grid items-start gap-4 overflow-x-auto md:grid-cols-4">{(Object.keys(statusLabels) as TaskStatus[]).map((column) => <section key={column} className="min-w-0 space-y-3 rounded-2xl bg-muted/40 p-3"><h2 className="px-1 py-2 text-sm font-semibold">{statusLabels[column]} <span className="ml-1 text-muted-foreground">{tasks.filter((task) => task.status === column).length}</span></h2>{tasks.filter((task) => task.status === column).map(renderTask)}</section>)}</div>}
    {editing && <TaskEditor task={editing === "new" ? null : editing} tasks={parentTasks} parentId={parentId} close={() => setEditing(null)} saved={() => { setEditing(null); refreshed(); }} />}
    {history && <HistoryDialog task={history} close={() => setHistory(null)} />}
    {selectedTask && <Dialog title={selectedTask.title} onClose={closeDetail}><Markdown value={selectedTask.description} />{selectedTask.due_at && <p className="mt-5 text-sm text-muted-foreground">Дедлайн: {dateTimeLabel(selectedTask.due_at, settings.timezone, settings.time_format)}</p>}<div className="mt-6 flex flex-wrap gap-2"><Button onClick={() => { setEditing(selectedTask); setParentId(undefined); closeDetail(); }}>Редактировать задачу</Button><Button variant="outline" onClick={() => { setHistory(selectedTask); closeDetail(); }}>История отметок</Button></div></Dialog>}
    {selectedId && !selectedTask && all.resource.status === "ready" && <HistoryDialog task={{ id: selectedId, title: "Удалённая задача" }} close={closeDetail} />}
  </main>;
}
