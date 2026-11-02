import { toInstant } from "@/lib/dates";
import { useEffect, useRef, useState, type PointerEvent, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from "lucide-react";
import { TagChip } from "./tag-chip";
import { taskTiming, isTaskOverdue, priorityColors } from "./task-timing";
import type { TaskTag } from "./task-tags-page";
import { TaskCheckbox } from "./task-card";
import { Dialog } from "@/components/dialog";
import { PlanningFields } from "./planning-fields";
import { buildPlanning, type Planning } from "./task-planning";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { dateLabel, dateTimeLabel, instantLabel, localDate, localDateTimeToInstant, zonedDateTimeInput, shiftDate } from "@/lib/dates";
import type { CalendarPlan, Task, TaskOccurrence } from "./types";
import { changedInterval, dayStart } from "./gantt-time";
export type GanttZoom = "day" | "week" | "fortnight";
type Interval = { start: number; duration: number };
type Drag = { task: Task; item: TaskOccurrence; mode: "move" | "start" | "end"; clientX: number; start: number; duration: number; key: string };
export function TaskGantt({ tasks, from, edit, saved, zoom, onZoomChange, onFromChange, completion, todayOccurrences = [], taskBusy = false, tags = [], now }: { tasks: Task[]; from: string; edit: (task: Task) => void; saved?: () => void; zoom?: GanttZoom; onZoomChange?: (zoom: GanttZoom) => void; onFromChange?: (date: string) => void; completion?: (task: Task, completed: boolean) => Promise<boolean>; todayOccurrences?: TaskOccurrence[]; taskBusy?: boolean; tags?: TaskTag[]; now?: number }) {
  const { settings } = usePreferences();
  const [expanded, setExpanded] = useState(false);
  const viewportElement = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState({ width: 1200, height: 500 });
  const [magnification,setMagnification]=useState(1);
  const anchor=useRef<{fraction:number;x:number}|null>(null);
  const [localZoom, setLocalZoom] = useState<GanttZoom>("fortnight");
  const scale = zoom ?? localZoom;
  const days = scale === "day" ? 1 : scale === "week" ? 7 : 14;
  const { resource, retry, refresh } = useResource<CalendarPlan>(`/calendar?from=${shiftDate(from, -1)}&to=${shiftDate(from, days)}`);
  const action = useAction();
  const [selection, setSelection] = useState<{ task: Task; item: TaskOccurrence } | null>(null);
  const drag = useRef<Drag | null>(null);
  const [preview, setPreview] = useState<(Interval & { key: string }) | null>(null);
  const [validation, setValidation] = useState<string | null>(null);
  const left = viewport.width < 640 ? 150 : 220;
  const basePlot=scale==="day"?960:days*160;
  const width = Math.max(viewport.width, left + basePlot*magnification);
  const height = Math.max(viewport.height, tasks.length * 72 + 60);
  const plot = width - left;
  useEffect(() => {
    const element = viewportElement.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setViewport({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element); return () => observer.disconnect();
  }, [resource.status, expanded]);
  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape" && !document.querySelector("dialog[open]")) setExpanded(false); };
    window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape);
  }, [expanded]);
  useEffect(()=>{
    const element=viewportElement.current;if(!element)return;
    const wheel=(event:WheelEvent)=>{
      event.preventDefault();if(event.shiftKey){element.scrollLeft+=event.deltaY+event.deltaX;return;}
      const rect=element.getBoundingClientRect();const x=Math.max(left,event.clientX-rect.left);
      anchor.current={fraction:(element.scrollLeft+x-left)/(width-left),x};
      const minimum=Math.max(.15,(element.clientWidth-left)/basePlot);
      setMagnification((value)=>Math.max(minimum,Math.min(8,value*Math.exp(-event.deltaY*.002))));
    };
    element.addEventListener("wheel",wheel,{passive:false});return()=>element.removeEventListener("wheel",wheel);
  },[resource.status,width,left,basePlot]);
  useEffect(()=>{const element=viewportElement.current;const value=anchor.current;if(element&&value){element.scrollLeft=left+value.fraction*(width-left)-value.x;anchor.current=null;}},[width,left]);
  const begin = dayStart(from, settings.timezone); const end = dayStart(shiftDate(from, days), settings.timezone);
  const span = Math.max(60_000, end - begin); const x = (instant: number) => left + (instant - begin) / span * plot;
  const occurrenceKey = (item: TaskOccurrence) => `${item.task.id}-${item.date}`;
  async function persist(task: Task, item: TaskOccurrence, interval: Interval) {
    setValidation(null);
    const ok = await action.run(() => api(`/tasks/${task.id}/plan`, { method: "PUT", body: { expected_updated_at: task.updated_at, occurrence_date: item.date, starts_at: toInstant(interval.start), duration_minutes: interval.duration } }), () => { setSelection(null); refresh(); saved?.(); });
    return ok;
  }
  function pointerDown(event: PointerEvent<SVGElement>, task: Task, item: TaskOccurrence, mode: Drag["mode"]) {
    if (action.busy || !item.editable || !item.starts_at || !task.schedule?.time || ["completed", "rejected"].includes(item.status)) return;
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { task, item, mode, clientX: event.clientX, start: Date.parse(item.starts_at), duration: task.schedule?.duration_minutes ?? 30, key: occurrenceKey(item) };
  }
  function intervalAt(event: PointerEvent<SVGElement>, value: Drag) {
    const renderedWidth = event.currentTarget.ownerSVGElement?.getBoundingClientRect().width ?? width;
    const delta = Math.round((event.clientX - value.clientX) * width / renderedWidth / plot * span / 60_000);
    return changedInterval(value.start, value.duration, delta, value.mode,15,value.task.schedule?.recurrence==="once"?366*1440:1440);
  }
  function pointerMove(event: PointerEvent<SVGElement>) { if (drag.current && Math.abs(event.clientX-drag.current.clientX)>=3) setPreview({ ...intervalAt(event, drag.current), key: drag.current.key }); }
  function pointerUp(event: PointerEvent<SVGElement>) {
    const value = drag.current; drag.current = null; setPreview(null);
    if (!value) return;
    if(Math.abs(event.clientX-value.clientX)<3){setSelection({task:value.task,item:value.item});return;}
    const interval = intervalAt(event, value);
    if (interval.start !== value.start || interval.duration !== value.duration) void persist(value.task, value.item, interval);
    else setSelection({ task: value.task, item: value.item });
  }
  const pointer = { onPointerMove: pointerMove, onPointerUp: pointerUp, onPointerCancel: () => { drag.current = null; setPreview(null); } };
  if (resource.status === "loading") return <LoadingState />;
  if (resource.status === "error") return <ErrorState message={resource.message} retry={retry} />;
  const ids = new Set(tasks.map((task) => task.id));
  const occurrences = resource.data.occurrences.filter((item) => ids.has(item.task.id) && Boolean(item.task.schedule));
  return <div className={`flex min-h-0 min-w-0 flex-1 flex-col gap-3 ${expanded ? "fixed inset-3 z-50 rounded-2xl border border-border bg-background p-4 shadow-2xl" : ""}`}><div className="flex shrink-0 flex-wrap items-center gap-2">{onFromChange && <><Button size="icon" variant="outline" aria-label="Предыдущий период Gantt" onClick={() => onFromChange(shiftDate(from, -days))}><ChevronLeft /></Button><Button size="sm" variant="outline" onClick={() => onFromChange(localDate(settings.timezone))}>Сегодня</Button><Button size="icon" variant="outline" aria-label="Следующий период Gantt" onClick={() => onFromChange(shiftDate(from, days))}><ChevronRight /></Button><Input aria-label="Начало шкалы доски" className="w-auto max-w-44" type="date" value={from} onChange={(event) => { if (event.target.value) onFromChange(event.target.value); }} /></>}<label className="text-sm" htmlFor="gantt-zoom">Масштаб Gantt</label><Select id="gantt-zoom" className="w-auto" value={scale} disabled={action.busy} onChange={(event) => { const next = event.target.value as GanttZoom; setLocalZoom(next);setMagnification(1); onZoomChange?.(next); }}><option value="day">День · часы</option><option value="week">Неделя</option><option value="fortnight">Две недели</option></Select><span className="text-xs text-muted-foreground" aria-label="Масштаб колесом">{Math.round(magnification*100)}%</span><Button size="icon" variant="outline" className="ml-auto" aria-label={expanded ? "Свернуть Gantt" : "Развернуть Gantt"} title={expanded ? "Свернуть" : "На весь экран"} onClick={() => setExpanded(!expanded)}>{expanded ? <Minimize2 /> : <Maximize2 />}</Button></div>{(action.error || validation) && <div role="alert" className="space-y-2 text-sm text-destructive"><p>{action.error || validation}</p><Button variant="outline" onClick={() => { refresh(); saved?.(); }}>Обновить задачи</Button></div>}<div ref={viewportElement} aria-label="Рабочая область Gantt" className="workspace-scroll relative min-h-72 min-w-0 flex-1 overflow-auto rounded-2xl border border-border bg-card"><div style={{ width, height }}><svg width={width} height={height} role="img" aria-label={`Диаграмма Ганта на ${days} дней с ${dateLabel(from)}`} className="block max-w-none text-foreground"><defs><clipPath id="gantt-plot"><rect x={left} y={50} width={plot} height={Math.max(80, height - 50)} /></clipPath></defs><rect width={width} height="50" fill="var(--muted)" />{Array.from({ length: days + 1 }, (_, index) => { const position = x(dayStart(shiftDate(from, index), settings.timezone)); return <g key={index}><text x={position + 5} y="20" fontSize="11" fill="var(--muted-foreground)">{dateLabel(shiftDate(from, index), { day: "numeric", month: "short" })}</text><line x1={position} x2={position} y1="40" y2={height} stroke="var(--border)" /></g>; })}{Array.from({ length: Math.ceil(span / 3_600_000) }, (_, i) => begin + i * 3_600_000).filter((_, i) => scale === "day" || i % 6 === 0).map((hour) => <g key={hour}><text x={x(hour) + 3} y="38" fontSize="9" fill="var(--muted-foreground)">{instantLabel(toInstant(hour), settings.timezone, settings.time_format)}</text><line x1={x(hour)} x2={x(hour)} y1="50" y2={height} stroke="var(--border)" strokeDasharray="2 4" /></g>)}{tasks.map((task, index) => <g key={task.id}><g clipPath="url(#gantt-plot)">{occurrences.filter((item) => item.task.id === task.id).map((item) => {
    const key = occurrenceKey(item); const active = preview?.key === key ? preview : null;
    const start = active?.start ?? (item.starts_at ? Date.parse(item.starts_at) : dayStart(item.date, settings.timezone));
    const duration = active?.duration ?? item.task.schedule?.duration_minutes ?? 1440;
    const finish = item.starts_at ? start + duration * 60_000 : dayStart(shiftDate(item.date, item.task.schedule?.recurrence==="once"?Math.max(1,Math.ceil(duration/1440)):1), settings.timezone);
    if (finish <= begin || start >= end) return null;
    const barX = x(start); const barWidth = (finish - start) / span * plot; const y = index * 72 + 70;
    const editable = item.editable && Boolean(item.starts_at) && Boolean(task.schedule?.time) && !["completed", "rejected"].includes(item.status) && !action.busy;
    const label = `${task.title} · ${dateLabel(item.date)} · ${item.starts_at ? instantLabel(toInstant(start), settings.timezone, settings.time_format) : "Без времени"} → ${item.starts_at ? dateTimeLabel(toInstant(finish), settings.timezone, settings.time_format) : ""} · ${duration} мин`;
    return <g key={key}><rect x={barX} y={y} width={Math.max(2, barWidth)} height="32" rx="5" fill={item.status === "completed" ? "var(--primary)" : priorityColors[task.priority]??task.color} opacity={item.status === "rejected" ? 0.3 : 0.85} style={{ cursor: editable ? "grab" : "default", touchAction: "none" }} role={editable ? "button" : undefined} aria-label={editable ? `Планирование ${task.title} ${item.date}` : undefined} tabIndex={editable ? 0 : undefined} onPointerDown={(event) => pointerDown(event, task, item, "move")} {...pointer} onKeyDown={(event) => { if (editable && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelection({ task, item }); } }}><title>{label}</title></rect>{editable && <><path d={`M ${barX + 1} ${y + 5} v 22`} stroke="var(--foreground)" strokeWidth="6" opacity="0.6" style={{ cursor: "ew-resize", touchAction: "none" }} aria-label={`Изменить начало ${task.title}`} onPointerDown={(event) => pointerDown(event, task, item, "start")} {...pointer} /><path d={`M ${barX + Math.max(2, barWidth) - 1} ${y + 5} v 22`} stroke="var(--foreground)" strokeWidth="6" opacity="0.6" style={{ cursor: "ew-resize", touchAction: "none" }} aria-label={`Изменить конец ${task.title}`} onPointerDown={(event) => pointerDown(event, task, item, "end")} {...pointer} /></>}<text x={Math.max(left + 3, barX)} y={y + 48} fontSize="9" fill="var(--muted-foreground)" pointerEvents="none">{item.starts_at ? `${instantLabel(toInstant(start), settings.timezone, settings.time_format)} · ${duration} мин` : "Без времени"}</text></g>;
  })}</g></g>)}</svg><div className="sticky left-0 z-10 border-r border-border bg-card" style={{ width: left, height, marginTop: -height }}><div className="h-[50px] border-b border-border bg-muted px-4 py-4 text-xs font-semibold text-muted-foreground">Задача</div>{tasks.map((task) => <div key={task.id} className="flex h-[72px] items-center gap-3 border-b border-border/60 px-4">{completion && <TaskCheckbox task={task} occurrence={todayOccurrences.find((item) => item.task.id === task.id)} busy={taskBusy} toggle={(completed) => completion(task, completed)} />}<div className="min-w-0 flex-1 space-y-1"><button className="block w-full truncate text-left text-sm font-medium hover:text-primary" title={task.title} aria-label={`Редактировать ${task.title}`} onClick={() => edit(task)}>{task.title}</button><div className="flex max-w-full items-center gap-1 overflow-hidden">{task.tags.slice(0, 2).map((name) => <TagChip key={name} name={name} color={tags.find((tag) => tag.name === name)?.color} />)}{now !== undefined && <span className="shrink-0 text-[10px] text-muted-foreground">{isTaskOverdue(task,now,settings.timezone,todayOccurrences.find(o=>o.task.id===task.id))?"Просрочена":taskTiming(task, now, settings.timezone)?.text}</span>}</div></div></div>)}</div></div></div>{!tasks.length && <p className="text-sm text-muted-foreground">Создайте задачу с расписанием.</p>}<p className="shrink-0 text-xs leading-5 text-muted-foreground">Колесо — масштаб, Shift + колесо — прокрутка. Перетаскивание привязывается к 15 минутам. Нажмите полосу или Enter для точного ввода. У повторяющейся задачи изменяется вся серия; сохранённые результаты остаются в истории и показаны без возможности перетаскивания. Задачи без расписания не имеют полосы, без времени — редактируются через название задачи.</p>{selection && <PlanDialog key={`${selection.task.id}-${selection.item.date}`} task={selection.task} item={selection.item} busy={action.busy} error={action.error} close={() => setSelection(null)} save={(interval) => void persist(selection.task, selection.item, interval)} />}</div>;
}
function PlanDialog({ task, item, busy, error, close, save }: { task: Task; item: TaskOccurrence; busy: boolean; error: string | null; close: () => void; save: (interval: Interval) => void }) {
  const { settings } = usePreferences();
  const [value,setValue]=useState<Planning>(()=>{const start=zonedDateTimeInput(item.starts_at!,settings.timezone);const end=zonedDateTimeInput(Date.parse(item.starts_at!)+(task.schedule?.duration_minutes??60)*60_000,settings.timezone);return {startDate:start.slice(0,10),startTime:start.slice(11),endDate:end.slice(0,10),endTime:end.slice(11)};});
  const [validation,setValidation]=useState<string|null>(null);
  function submit(event:FormEvent){event.preventDefault();setValidation(null);try{const result=buildPlanning(value,settings.timezone,task.schedule);const start=localDateTimeToInstant(`${value.startDate}T${value.startTime}`,settings.timezone);if(!result.schedule||start===null)throw new Error("Укажите начало и конец интервала.");save({start,duration:result.schedule.duration_minutes});}catch(failure){setValidation(failure instanceof Error?failure.message:"Проверьте даты");}}
  return <Dialog title={`Планирование: ${task.title}`} onClose={close}><form onSubmit={submit} className="space-y-5"><PlanningFields value={value} change={setValue} prefix="gantt-plan"/>{(error||validation)&&<p role="alert" className="text-sm text-destructive">{validation||error}</p>}<Button type="submit" disabled={busy}>Сохранить планирование</Button></form></Dialog>;
}
