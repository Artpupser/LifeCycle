import {defaultItemColor} from "@/systems/themes/themes";
import {MetricList,MetricDetails} from "@/components/ui/card";
import {EntitySelectionArea,SelectionItem} from "@/systems/selection/entities";
import {SubjectLabels} from "@/systems/labels/functional";
import {ObjectActions} from "@/systems/actions/action-menu";
import {HabitControls} from "./habit-controls";
import {useHistory} from "@/systems/history/use-history";
import { HistoryEntries } from "@/systems/history/history";
import { t, useLanguage } from "@/systems/i18n/locale";
import { AppIcon } from "@/systems/icons/app-icon";
import { TagChip } from "@/systems/labels/inputs";
import { FilterSearch } from "@/components/filter-search";
import { parseFilterQuery, matchesFilter, filterValue, tagFilter, type FilterSpec } from "@/lib/filter-query";
import { confirmAction } from "@/lib/feedback";
import { useState } from "react";
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
import { localDate, shiftDate } from "@/lib/dates";
import { HabitEditor } from "./habit-editor";
import { habitChanged, type Habit, type HabitInput, type HabitStatistics } from "./types";

function HabitHistory({ id, close }: { id: string; close: () => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const history = useHistory<TaskOccurrence[]>({kind:"habit",id});
  return <Dialog title={t("История привычки")} onClose={close}>{history.resource.status === "loading" ? <LoadingState /> : history.resource.status === "error" ? <ErrorState message={history.resource.message} retry={history.retry} /> : history.resource.data.length ? <HistoryEntries items={history.resource.data} itemKey={item=>`${id}:${item.date}`} kind="habit" scope={id} removed={history.retry} render={item=><OccurrenceList occurrences={[item]} timezone={settings.timezone} changed={history.retry} embedded/>}/> : <p className="text-sm text-muted-foreground">{t("Сохранённых отметок пока нет.")}</p>}</Dialog>;
}
function HabitDetail({ habit, close }: { habit: Habit; close: () => void }) {
  useLanguage();
  return <Dialog title={t("Привычка")} onClose={close}><div className="space-y-4"><h2 className="text-xl font-semibold"><AppIcon icon={habit.habit.icon} className="mr-2"/> {habit.title}</h2><Markdown value={habit.description} /><p className="text-sm text-muted-foreground">{t("История и статистика доступны в разделе привычек, включая сохранённые результаты удалённых объектов.")}</p><Button asChild><Link to="/today">{t("Открыть Today")}</Link></Button></div></Dialog>;
}
const statisticsLabels: [keyof HabitStatistics, string][] = [["expected", "Появлений"], ["completed", "Выполнено"], ["skipped", "Явных пропусков"], ["missed", "Без результата после срока"], ["cancelled", "Отменено"], ["pending", "Ожидают результата"], ["current_streak", "Текущая серия"], ["best_streak", "Лучшая серия"], ["longest_missed_streak", "Максимальная серия пропусков"], ["shortest_missed_streak", "Минимальная серия пропусков"], ["last_missed_streak", "Последняя серия пропусков"]];

const habitFilters:FilterSpec[]=[tagFilter,{key:"stats_from",aliases:["статистика_с"],get label() { return t("Статистика с"); },example:"статистика_с:2026-11-01",type:"date"},{key:"stats_to",aliases:["статистика_по"],get label() { return t("Статистика по"); },example:"статистика_по:2026-11-30",type:"date"},{key:"repeat",aliases:["повтор"],get label() { return t("Повторение"); },example:"повтор:ежедневно",values:["daily","weekly","interval","ежедневно","неделя","интервал"]},{key:"from",aliases:["с"],get label() { return t("Начало с"); },example:"с:2026-11-01"},{key:"to",aliases:["по"],get label() { return t("Начало по"); },example:"по:2026-11-30"}];
export function HabitsPage() {
  useLanguage();
  const { settings } = usePreferences();

  const [params, setParams] = useSearchParams();
  const selected = params.get("habit");
  const [query, setQuery] = useState(""); const filters=parseFilterQuery(query,habitFilters);
  const [editor, setEditor] = useState<(HabitInput & { id?: string }) | null>(null);
  const [history, setHistory] = useState<string | null>(null);
  const today = localDate(settings.timezone);
  const from=filterValue(filters,"stats_from")||shiftDate(today,-29);
  const to=filterValue(filters,"stats_to")||today;
  const rangeError=to<from||Date.parse(to)-Date.parse(from)>365*86400000?t("Статистика: выберите от 1 до 366 дней."):null;
  const habits = useResource<Habit[]>("/habits");
  const stats = useResource<HabitStatistics[]>(rangeError?null:`/habits/statistics?from=${from}&to=${to}`);
  const action = useAction();
  const visibleHabits=habits.resource.status==="ready"?habits.resource.data.filter(habit=>matchesFilter({...filters,terms:filters.terms.filter(term=>!term.key.startsWith("stats_"))},`${habit.title} ${habit.description}`,{tag:habit.tags,repeat:[habit.schedule.recurrence,({once:"один раз",daily:"ежедневно",weekly:"неделя",interval:"интервал"})[habit.schedule.recurrence]],from:habit.schedule.start_date,to:habit.schedule.start_date})):[];
  const selectedHabit = habits.resource.status === "ready" ? habits.resource.data.find((habit) => habit.id === selected) : undefined;
  function refresh() { habits.retry(); stats.retry(); day.retry(); }
  const day=useResource<import("@/features/planning/types").DayPlan>(`/today?date=${localDate(settings.timezone)}`);
  function create() { setEditor({ title: "", description: "", tags: [], color: defaultItemColor, schedule: { ...defaultSchedule(settings.timezone), recurrence: "daily",time:null,duration_minutes:1 }, habit: { icon: "🌱",  } }); }
  async function remove(id: string) {
    if (!await confirmAction(t("Удалить привычку безвозвратно? Будущие появления прекратятся. Сохранённые результаты останутся в аналитике; её можно удалить отдельно. Без отметок аналитика исчезнет автоматически."))) return;
    await action.run(() => api(`/habits/${id}`, { method: "DELETE" }), () => { habitChanged(); refresh(); });
  }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">{t("Повторения, которые имеют значение")}</p><h1 className="text-3xl font-semibold">{t("Привычки")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Планируйте ритм, отмечайте результат в Today и наблюдайте за прогрессом.")}</p></div><Button onClick={create}>{t("Новая привычка")}</Button></header><FilterSearch label={t("Поиск привычек")} value={query} change={setQuery} specs={habitFilters}/>{action.error && <p role="alert" className="text-destructive">{action.error}</p>}{habits.resource.status === "loading" ? <LoadingState /> : habits.resource.status === "error" ? <ErrorState message={habits.resource.message} retry={habits.retry} /> : visibleHabits.length ? <EntitySelectionArea items={visibleHabits} itemKey={item=>item.id} scope={query} subjectKind="habits" disabled={action.busy||!!editor} refresh={()=>{habitChanged();refresh();}} remove={item=>api(`/habits/${item.id}`,{method:"DELETE"})} removeMessage={t("Удалить выбранные привычки? Будущие появления прекратятся, сохранённые результаты останутся в аналитике.")}><div className="grid items-start gap-4 md:grid-cols-2">{visibleHabits.map((habit) => <SelectionItem key={habit.id} id={habit.id}><article className="min-w-0 space-y-4 rounded-xl border border-border border-t-4 bg-card p-5" style={{ borderTopColor: habit.color }}><h2 className="break-words text-lg font-semibold"><AppIcon icon={habit.habit.icon} className="mr-2"/> {habit.title}</h2>{day.resource.status==="ready"&&day.resource.data.tasks.filter(item=>item.task.id===habit.id).map(item=><HabitControls key={item.date} occurrence={item} changed={day.retry}/>)}<Markdown value={habit.description} /><p className="text-sm text-muted-foreground">{({ daily: t("Каждый день"), weekly: t("По дням недели"), interval: t("Каждые {v0} дней", {v0: habit.schedule.interval_days}), once: t("Один раз") })[habit.schedule.recurrence]}</p><SubjectLabels subject={{kind:"habits",id:habit.id}}>{habit.tags.map(name=><TagChip key={name} name={name}/>)}</SubjectLabels><ObjectActions subject={{kind:"habits",id:habit.id}}><Button size="sm" variant="outline" onClick={() => setEditor(habit)}>{t("Изменить привычку")}</Button><Button size="sm" variant="outline" onClick={() => setHistory(habit.id)}>{t("История привычки")}</Button><Button size="sm" variant="outline" disabled={action.busy} onClick={() => void remove(habit.id)}>{t("Удалить привычку")}</Button><Button size="sm" variant="outline" asChild><Link to="/today">{t("В Today")}</Link></Button></ObjectActions></article></SelectionItem>)}</div></EntitySelectionArea> : <p className="rounded-xl border border-dashed border-border p-8 text-muted-foreground">{t("Привычки не найдены. Создайте первую привычку или измените поиск.")}</p>}
    <section aria-label={t("Статистика привычек")} className="space-y-4"><h2 className="text-2xl font-semibold">{t("Статистика и лучшие привычки")}</h2><p className="text-sm text-muted-foreground">{t("Период: ")}{from} — {to}{t(". Измените его фильтрами «статистика_с» и «статистика_по» в строке поиска.")}</p><MetricDetails>{t("Диапазон — до 366 дней, включая границы, Будущие появления не учитываются. Серии считаются по плановым появлениям, дни отдыха их не прерывают. Отмены исключены из процента и не прерывают серию. Текущее незавершённое появление до конца занятия не считается пропуском. Рейтинг — по проценту выполнения, затем по числу выполнений. Историю удалённых привычек можно удалить из аналитики.")}</MetricDetails>{rangeError ? <p role="alert" className="text-sm text-destructive">{rangeError}</p> : stats.resource.status === "loading" ? <LoadingState /> : stats.resource.status === "error" ? <ErrorState message={stats.resource.message} retry={stats.retry} /> : <EntitySelectionArea items={stats.resource.data} itemKey={stat=>stat.id} scope={`${from}:${to}`} disabled={action.busy} selectable={stat=>!stat.active} refresh={()=>{habitChanged();refresh();}} remove={stat=>api(`/habits/${stat.id}/history`,{method:"DELETE",body:{confirmed:true}})} removeMessage={t("Удалить аналитику выбранных удалённых привычек и все их отметки? Сохранённые тренировки останутся.")}><div className="grid gap-4 md:grid-cols-2">{stats.resource.data.map((stat, index) => <SelectionItem key={stat.id} id={stat.id}><article className="min-w-0 rounded-xl border border-border p-4"><h3 className="break-words font-semibold">{index + 1}. {stat.title}</h3><p className="my-2 text-xl font-semibold text-primary">{stat.completion_rate.toFixed(1)}%</p><MetricList tiles values={[[t("Выполнено"),stat.completed],[t("Текущая серия"),stat.current_streak],[t("Лучшая серия"),stat.best_streak]]}/><details className="mt-2 text-xs"><summary className="min-h-8 cursor-pointer py-2 text-primary">{t("Подробная статистика")}</summary><MetricList values={statisticsLabels.filter(([key])=>!["completed","current_streak","best_streak"].includes(key)).map(([key,label])=>[t(label),stat[key]])}/></details><ObjectActions><Button size="sm" variant="outline" className="mt-4" onClick={() => setHistory(stat.id)}>{t("Открыть историю")}</Button>{!stat.active && <Button size="sm" variant="ghost" className="mt-4 text-destructive" disabled={action.busy} onClick={async ()=>{if(await confirmAction(t("Удалить аналитику и все отметки привычки «{v0}»? Это действие необратимо. Сохранённые тренировки останутся.", {v0: stat.title}))) void action.run(()=>api(`/habits/${stat.id}/history`,{method:"DELETE",body:{confirmed:true}}),()=>{habitChanged();refresh();});}}>{t("Удалить аналитику")}</Button>}</ObjectActions></article></SelectionItem>)}</div></EntitySelectionArea>}</section>{editor && <HabitEditor initial={editor} close={() => setEditor(null)} saved={() => { setEditor(null); refresh(); }} />}{history && <HabitHistory id={history} close={() => { setHistory(null); refresh(); }} />}{selected && habits.resource.status === "ready" && (selectedHabit ? <HabitDetail habit={selectedHabit} close={() => setParams({})} /> : <HabitHistory id={selected} close={() => setParams({})} />)}</main>;
}
