import { TagChip } from "@/features/planning/tag-chip";
import { toInstant } from "@/lib/dates";
import { FilterSearch } from "@/components/filter-search";
import { parseFilterQuery, matchesFilter, filterValue, tagFilter, type FilterSpec } from "@/lib/filter-query";
import { confirmAction } from "@/lib/feedback";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { OccurrenceList } from "@/features/planning/occurrence-list";
import { defaultSchedule, type TaskOccurrence } from "@/features/planning/types";
import { usePreferences } from "@/features/settings/preferences-context";
import { useAction } from "@/hooks/use-action";
import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";
import { localDate, shiftDate, instantLabel } from "@/lib/dates";
import { upcomingStart } from "@/features/planning/task-timing";
import { scheduleInZone } from "@/features/planning/schedule-time";
import { HabitEditor } from "./habit-editor";
import { habitChanged, type Habit, type HabitInput, type HabitStatistics } from "./types";

function HabitHistory({ id, close }: { id: string; close: () => void }) {
  const { settings } = usePreferences();
  const history = useResource<TaskOccurrence[]>(`/habits/${id}/history`);
  return <Dialog title="История привычки" onClose={close}>{history.resource.status === "loading" ? <LoadingState /> : history.resource.status === "error" ? <ErrorState message={history.resource.message} retry={history.retry} /> : history.resource.data.length ? <OccurrenceList occurrences={history.resource.data} timezone={settings.timezone} changed={history.retry} /> : <p className="text-sm text-muted-foreground">Сохранённых отметок пока нет.</p>}</Dialog>;
}
function HabitDetail({ habit, close }: { habit: Habit; close: () => void }) {
  return <Dialog title="Привычка" onClose={close}><div className="space-y-4"><h2 className="text-xl font-semibold">{habit.habit.icon} {habit.title}</h2><Markdown value={habit.description} /><p className="text-sm text-muted-foreground">История и статистика доступны в разделе привычек, включая сохранённые результаты удалённых объектов.</p><Button asChild><Link to="/today">Открыть Today</Link></Button></div></Dialog>;
}
const statisticsLabels: [keyof HabitStatistics, string][] = [["expected", "Появлений"], ["completed", "Выполнено"], ["skipped", "Явных пропусков"], ["missed", "Без результата после срока"], ["cancelled", "Отменено"], ["pending", "Ожидают результата"], ["current_streak", "Текущая серия"], ["best_streak", "Лучшая серия"], ["longest_missed_streak", "Максимальная серия пропусков"], ["shortest_missed_streak", "Минимальная серия пропусков"], ["last_missed_streak", "Последняя серия пропусков"]];

const habitFilters:FilterSpec[]=[tagFilter,{key:"stats_from",aliases:["статистика_с"],label:"Статистика с",example:"статистика_с:2026-11-01",type:"date"},{key:"stats_to",aliases:["статистика_по"],label:"Статистика по",example:"статистика_по:2026-11-30",type:"date"},{key:"repeat",aliases:["повтор"],label:"Повторение",example:"повтор:ежедневно",values:["once","daily","weekly","interval","один раз","ежедневно","неделя","интервал"]},{key:"from",aliases:["с"],label:"Начало с",example:"с:2026-11-01"},{key:"to",aliases:["по"],label:"Начало по",example:"по:2026-11-30"}];
export function HabitsPage() {
  const { settings } = usePreferences();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(timer); }, []);
  function habitTime(habit: Habit) { const start = upcomingStart(habit, now)?.instant; return start == null ? scheduleInZone(habit.schedule, settings.timezone).time ?? "Без времени" : instantLabel(toInstant(start), settings.timezone, settings.time_format); }
  const [params, setParams] = useSearchParams();
  const selected = params.get("habit");
  const [query, setQuery] = useState(""); const filters=parseFilterQuery(query,habitFilters);
  const [editor, setEditor] = useState<(HabitInput & { id?: string }) | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const today = localDate(settings.timezone);
  const from=filterValue(filters,"stats_from")||shiftDate(today,-29);
  const to=filterValue(filters,"stats_to")||today;
  const rangeError=to<from||Date.parse(to)-Date.parse(from)>365*86400000?"Статистика: выберите от 1 до 366 дней.":null;
  const habits = useResource<Habit[]>("/habits");
  const stats = useResource<HabitStatistics[]>(rangeError?null:`/habits/statistics?from=${from}&to=${to}`);
  const action = useAction();
  const visibleHabits=habits.resource.status==="ready"?habits.resource.data.filter(habit=>matchesFilter({...filters,terms:filters.terms.filter(term=>!term.key.startsWith("stats_"))},`${habit.title} ${habit.description}`,{tag:habit.tags,repeat:[habit.schedule.recurrence,({once:"один раз",daily:"ежедневно",weekly:"неделя",interval:"интервал"})[habit.schedule.recurrence]],from:habit.schedule.start_date,to:habit.schedule.start_date})):[];
  const selectedHabit = habits.resource.status === "ready" ? habits.resource.data.find((habit) => habit.id === selected) : undefined;
  function refresh() { habits.retry(); stats.retry(); }
  function create() { setEditor({ title: "", description: "", tags: [], color: "#2A9D8F", schedule: { ...defaultSchedule(settings.timezone), recurrence: "daily" }, habit: { icon: "🌱", sub_habits: [], reminder_enabled: false, reminder_minutes_before: null } }); }
  async function remove(id: string) {
    if (!await confirmAction("Удалить привычку безвозвратно? Будущие появления и напоминания прекратятся. Сохранённые результаты останутся в аналитике; её можно удалить отдельно. Без отметок аналитика исчезнет автоматически.")) return;
    await action.run(() => api(`/habits/${id}`, { method: "DELETE" }), () => { habitChanged(); refresh(); });
  }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">Повторения, которые имеют значение</p><h1 className="text-3xl font-semibold">Привычки</h1><p className="mt-3 text-sm text-muted-foreground">Планируйте ритм, отмечайте результат в Today и наблюдайте за прогрессом.</p></div><Button onClick={create}>Новая привычка</Button></header><FilterSearch label="Поиск привычек" value={query} change={setQuery} specs={habitFilters}/>{action.error && <p role="alert" className="text-destructive">{action.error}</p>}{habits.resource.status === "loading" ? <LoadingState /> : habits.resource.status === "error" ? <ErrorState message={habits.resource.message} retry={habits.retry} /> : visibleHabits.length ? <div className="grid items-start gap-4 md:grid-cols-2">{visibleHabits.map((habit) => <article key={habit.id} className="min-w-0 space-y-4 rounded-xl border border-border border-t-4 bg-card p-5" style={{ borderTopColor: habit.color }}><h2 className="break-words text-lg font-semibold">{habit.habit.icon} {habit.title}</h2><Markdown value={habit.description} /><p className="text-sm text-muted-foreground">{({ daily: "Каждый день", weekly: "По дням недели", interval: `Каждые ${habit.schedule.interval_days} дней`, once: "Один раз" })[habit.schedule.recurrence]} · {habitTime(habit)}</p>{habit.habit.sub_habits.length > 0 && <ul className="list-inside list-disc text-sm">{habit.habit.sub_habits.map((sub) => <li key={sub.id} className="break-words">{sub.title}</li>)}</ul>}<div className="flex flex-wrap gap-1">{habit.tags.map(name=><TagChip key={name} name={name}/>)}</div><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditor(habit)}>Изменить привычку</Button><Button size="sm" variant="outline" onClick={() => setHistory(habit.id)}>История привычки</Button><Button size="sm" variant="outline" disabled={action.busy} onClick={() => void remove(habit.id)}>Удалить привычку</Button><Button size="sm" variant="outline" asChild><Link to="/today">В Today</Link></Button></div></article>)}</div> : <p className="rounded-xl border border-dashed border-border p-8 text-muted-foreground">Привычки не найдены. Создайте первую привычку или измените поиск.</p>}
    <section aria-label="Статистика привычек" className="space-y-4"><h2 className="text-2xl font-semibold">Статистика и лучшие привычки</h2><p className="text-sm text-muted-foreground">Период: {from} — {to}. Измените его фильтрами «статистика_с» и «статистика_по» в строке поиска.</p><p className="text-xs leading-6 text-muted-foreground">Диапазон — до 366 дней, включая границы, Будущие появления не учитываются. Серии считаются по плановым появлениям, дни отдыха их не прерывают. Отмены исключены из процента и не прерывают серию. Текущее незавершённое появление до конца занятия не считается пропуском. Рейтинг — по проценту выполнения, затем по числу выполнений. Историю удалённых привычек можно удалить из аналитики.</p>{rangeError ? <p role="alert" className="text-sm text-destructive">{rangeError}</p> : stats.resource.status === "loading" ? <LoadingState /> : stats.resource.status === "error" ? <ErrorState message={stats.resource.message} retry={stats.retry} /> : <div className="grid gap-4 md:grid-cols-2">{stats.resource.data.map((stat, index) => <article key={stat.id} className="min-w-0 rounded-xl border border-border p-4"><h3 className="break-words font-semibold">{index + 1}. {stat.title}</h3><p className="my-3 text-2xl font-semibold text-primary">{stat.completion_rate.toFixed(1)}%</p><dl className="space-y-1 text-sm">{statisticsLabels.map(([key, label]) => <div key={key} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-medium">{stat[key]}</dd></div>)}<div className="flex justify-between gap-3"><dt>Подпривычки выполнены</dt><dd>{stat.completed_sub_habits}/{stat.total_sub_habits}</dd></div></dl><Button size="sm" variant="outline" className="mt-4" onClick={() => setHistory(stat.id)}>Открыть историю</Button>{!stat.active && <Button size="sm" variant="ghost" className="mt-4 text-destructive" disabled={action.busy} onClick={async ()=>{if(await confirmAction(`Удалить аналитику и все отметки привычки «${stat.title}»? Это действие необратимо. Сохранённые тренировки останутся.`)) void action.run(()=>api(`/habits/${stat.id}/history`,{method:"DELETE",body:{confirmed:true}}),()=>{habitChanged();refresh();});}}>Удалить аналитику</Button>}</article>)}</div>}</section>{editor && <HabitEditor initial={editor} close={() => setEditor(null)} saved={() => { setEditor(null); refresh(); }} />}{history && <HabitHistory id={history} close={() => { setHistory(null); refresh(); }} />}{selected && habits.resource.status === "ready" && (selectedHabit ? <HabitDetail habit={selectedHabit} close={() => setParams({})} /> : <HabitHistory id={selected} close={() => setParams({})} />)}</main>;
}
