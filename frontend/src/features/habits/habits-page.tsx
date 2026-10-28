import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OccurrenceList } from "@/features/planning/occurrence-list";
import { defaultSchedule, type TaskOccurrence } from "@/features/planning/types";
import { usePreferences } from "@/features/settings/preferences-context";
import { useAction } from "@/hooks/use-action";
import { useResource } from "@/hooks/use-resource";
import { api } from "@/lib/api";
import { localDate, shiftDate } from "@/lib/dates";
import { HabitEditor } from "./habit-editor";
import { habitChanged, type Habit, type HabitInput, type HabitStatistics } from "./types";

function HabitHistory({ id, close }: { id: string; close: () => void }) {
  const { settings } = usePreferences();
  const history = useResource<TaskOccurrence[]>(`/habits/${id}/history`);
  return <Dialog title="История привычки" onClose={close}>{history.resource.status === "loading" ? <LoadingState /> : history.resource.status === "error" ? <ErrorState message={history.resource.message} retry={history.retry} /> : history.resource.data.length ? <OccurrenceList occurrences={history.resource.data} timezone={settings.timezone} changed={history.retry} /> : <p className="text-sm text-muted-foreground">Сохранённых отметок пока нет.</p>}</Dialog>;
}
function HabitDetail({ id, close }: { id: string; close: () => void }) {
  const detail = useResource<Habit>(`/habits/${id}`);
  return <Dialog title="Привычка" onClose={close}>{detail.resource.status === "loading" ? <LoadingState /> : detail.resource.status === "error" ? <ErrorState message={detail.resource.message} retry={detail.retry} /> : <div className="space-y-4"><h2 className="text-xl font-semibold">{detail.resource.data.habit.icon} {detail.resource.data.title}</h2><Markdown value={detail.resource.data.description} /><p className="text-sm text-muted-foreground">История и статистика доступны в разделе привычек, включая архивные записи.</p><Button asChild><Link to="/today">Открыть Today</Link></Button></div>}</Dialog>;
}
const statisticsLabels: [keyof HabitStatistics, string][] = [["expected", "Появлений"], ["completed", "Выполнено"], ["skipped", "Явных пропусков"], ["missed", "Без результата после срока"], ["cancelled", "Отменено"], ["pending", "Ожидают результата"], ["current_streak", "Текущая серия"], ["best_streak", "Лучшая серия"], ["longest_missed_streak", "Максимальная серия пропусков"], ["shortest_missed_streak", "Минимальная серия пропусков"], ["last_missed_streak", "Последняя серия пропусков"]];

export function HabitsPage() {
  const { settings } = usePreferences();
  const [params, setParams] = useSearchParams();
  const selected = params.get("habit");
  const [query, setQuery] = useState(""); const [tag, setTag] = useState("");
  const [editor, setEditor] = useState<(HabitInput & { id?: string }) | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const today = localDate(settings.timezone);
  const [from, setFrom] = useState(() => shiftDate(today, -29));
  const [to, setTo] = useState(today);
  const habits = useResource<Habit[]>(`/habits?${new URLSearchParams({ q: query, ...(tag ? { tag } : {}) })}`);
  const stats = useResource<HabitStatistics[]>(`/habits/statistics?from=${from}&to=${to}`);
  const action = useAction();
  function refresh() { habits.retry(); stats.retry(); }
  function create() { setEditor({ title: "", description: "", tags: [], color: "#2A9D8F", schedule: { ...defaultSchedule(settings.timezone), recurrence: "daily" }, habit: { icon: "🌱", sub_habits: [], reminder_enabled: false, reminder_minutes_before: null } }); }
  async function archive(id: string) {
    if (!window.confirm("Архивировать привычку? История и статистика сохранятся.")) return;
    await action.run(() => api(`/habits/${id}`, { method: "DELETE" }), () => { habitChanged(); refresh(); });
  }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">Повторения, которые имеют значение</p><h1 className="text-3xl font-semibold">Привычки</h1><p className="mt-3 text-sm text-muted-foreground">Планируйте ритм, отмечайте результат в Today и наблюдайте за прогрессом.</p></div><Button onClick={create}>Новая привычка</Button></header><div className="grid gap-4 sm:grid-cols-2"><FormField id="habits-search" label="Поиск привычек"><Input id="habits-search" type="search" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} /></FormField><FormField id="habits-tag" label="Фильтр по тегу"><Input id="habits-tag" maxLength={64} value={tag} onChange={(event) => setTag(event.target.value)} /></FormField></div>{action.error && <p role="alert" className="text-destructive">{action.error}</p>}{habits.resource.status === "loading" ? <LoadingState /> : habits.resource.status === "error" ? <ErrorState message={habits.resource.message} retry={habits.retry} /> : habits.resource.data.length ? <div className="grid items-start gap-4 md:grid-cols-2">{habits.resource.data.map((habit) => <article key={habit.id} className="min-w-0 space-y-4 rounded-xl border border-border border-t-4 bg-card p-5" style={{ borderTopColor: habit.color }}><h2 className="break-words text-lg font-semibold">{habit.habit.icon} {habit.title}</h2><Markdown value={habit.description} /><p className="text-sm text-muted-foreground">{({ daily: "Каждый день", weekly: "По дням недели", interval: `Каждые ${habit.schedule.interval_days} дней`, once: "Один раз" })[habit.schedule.recurrence]} · {habit.schedule.time ?? "Без времени"} · {habit.schedule.timezone}</p>{habit.habit.sub_habits.length > 0 && <ul className="list-inside list-disc text-sm">{habit.habit.sub_habits.map((sub) => <li key={sub.id} className="break-words">{sub.title}</li>)}</ul>}<p className="break-words text-xs text-muted-foreground">{habit.tags.map((value) => `#${value}`).join(" ")}</p><div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditor(habit)}>Изменить привычку</Button><Button size="sm" variant="outline" onClick={() => setHistory(habit.id)}>История привычки</Button><Button size="sm" variant="outline" disabled={action.busy} onClick={() => void archive(habit.id)}>Архивировать привычку</Button><Button size="sm" variant="outline" asChild><Link to="/today">В Today</Link></Button></div></article>)}</div> : <p className="rounded-xl border border-dashed border-border p-8 text-muted-foreground">Привычки не найдены. Создайте первую привычку или измените поиск.</p>}
    <section aria-label="Статистика привычек" className="space-y-4"><h2 className="text-2xl font-semibold">Статистика и лучшие привычки</h2><div className="flex flex-wrap gap-4"><FormField id="habit-stats-from" label="Статистика с"><Input id="habit-stats-from" type="date" required value={from} onChange={(event) => { if (event.target.value) setFrom(event.target.value); }} /></FormField><FormField id="habit-stats-to" label="Статистика по"><Input id="habit-stats-to" type="date" min={from} required value={to} onChange={(event) => { if (event.target.value) setTo(event.target.value); }} /></FormField></div><p className="text-xs leading-6 text-muted-foreground">Диапазон — до 366 дней, включая границы, в часовом поясе профиля. Будущие появления не учитываются. Серии считаются по плановым появлениям, дни отдыха их не прерывают. Отмены исключены из процента и не прерывают серию. Текущее незавершённое появление до конца занятия не считается пропуском. Рейтинг — по проценту выполнения, затем по числу выполнений. Архивные привычки сохраняются в статистике.</p>{stats.resource.status === "loading" ? <LoadingState /> : stats.resource.status === "error" ? <ErrorState message={stats.resource.message} retry={stats.retry} /> : <div className="grid gap-4 md:grid-cols-2">{stats.resource.data.map((stat, index) => <article key={stat.id} className="min-w-0 rounded-xl border border-border p-4"><h3 className="break-words font-semibold">{index + 1}. {stat.title}</h3><p className="my-3 text-2xl font-semibold text-primary">{stat.completion_rate.toFixed(1)}%</p><dl className="space-y-1 text-sm">{statisticsLabels.map(([key, label]) => <div key={key} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-medium">{stat[key]}</dd></div>)}<div className="flex justify-between gap-3"><dt>Подпривычки выполнены</dt><dd>{stat.completed_sub_habits}/{stat.total_sub_habits}</dd></div></dl><Button size="sm" variant="outline" className="mt-4" onClick={() => setHistory(stat.id)}>Открыть историю</Button></article>)}</div>}</section>{editor && <HabitEditor initial={editor} close={() => setEditor(null)} saved={() => { setEditor(null); refresh(); }} />}{history && <HabitHistory id={history} close={() => { setHistory(null); refresh(); }} />}{selected && <HabitDetail id={selected} close={() => setParams({})} />}</main>;
}
