import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { dateLabel, localDate, shiftDate } from "@/lib/dates";
import { OccurrenceList } from "./occurrence-list";
import type { CalendarPlan } from "./types";

export function CalendarPage() {
  const { settings } = usePreferences();
  const [selected, setSelected] = useState(() => localDate(settings.timezone));
  const month = selected.slice(0, 7);
  const first = `${month}-01`;
  const day = new Date(`${first}T12:00:00Z`).getUTCDay();
  const offset = settings.week_starts_on === "monday" ? (day + 6) % 7 : day;
  const gridStart = shiftDate(first, -offset);
  const dates = Array.from({ length: 42 }, (_, index) => shiftDate(gridStart, index));
  const { resource, retry } = useResource<CalendarPlan>(`/calendar?from=${gridStart}&to=${dates[41]}`);
  const labels = settings.week_starts_on === "monday" ? ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"] : ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
  function changeMonth(delta: number) { const value = new Date(`${first}T12:00:00Z`); value.setUTCMonth(value.getUTCMonth() + delta); setSelected(value.toISOString().slice(0, 10)); }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header><p className="mb-2 text-sm text-primary">Расписание · {settings.timezone}</p><h1 className="text-3xl font-semibold">Календарь</h1><p className="mt-2 text-sm text-muted-foreground">Выберите день, чтобы увидеть план и отметить результат.</p></header>
    <div className="flex flex-wrap items-center gap-2"><Button variant="outline" aria-label="Предыдущий месяц" onClick={() => changeMonth(-1)}><ChevronLeft /></Button><h2 className="min-w-40 text-center font-semibold">{dateLabel(first, { month: "long", year: "numeric" })}</h2><Button variant="outline" aria-label="Следующий месяц" onClick={() => changeMonth(1)}><ChevronRight /></Button><Input type="date" aria-label="Дата календаря" className="w-auto" value={selected} onChange={(event) => { if (event.target.value) setSelected(event.target.value); }} /><Button variant="outline" onClick={() => setSelected(localDate(settings.timezone))}>Сегодня</Button></div>
    {resource.status === "loading" ? <LoadingState /> : resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : <><div className="overflow-x-auto rounded-xl border border-border"><div className="grid min-w-80 grid-cols-7">{labels.map((label) => <div key={label} className="bg-muted p-2 text-center text-xs text-muted-foreground">{label}</div>)}{dates.map((date) => {
      const occurrences = resource.data.occurrences.filter((item) => (item.starts_at ? localDate(resource.data.timezone, new Date(item.starts_at)) : item.date) === date);
      return <button type="button" key={date} aria-label={dateLabel(date, { day: "numeric", month: "long", year: "numeric" })} aria-pressed={selected === date} onClick={() => setSelected(date)} className={`min-h-22 min-w-0 border-t border-border p-2 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-28 ${selected === date ? "bg-primary/12 ring-1 ring-inset ring-primary" : "hover:bg-muted"} ${date.slice(0, 7) !== month ? "text-muted-foreground" : ""}`}><span className={`mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm ${date === localDate(settings.timezone) ? "bg-primary text-primary-foreground" : ""}`}>{Number(date.slice(8))}</span><span className="block text-xs text-muted-foreground">{occurrences.length ? `${occurrences.length} задач` : ""}</span><div className="hidden space-y-1 sm:block">{occurrences.slice(0, 2).map((item) => <p key={`${item.task.id}-${item.date}`} className="truncate text-xs" style={{ borderLeft: `3px solid ${item.task.color}`, paddingLeft: 4 }}>{item.task.title}</p>)}</div></button>;
    })}</div></div><section aria-label="План выбранного дня" className="space-y-4"><h2 className="text-xl font-semibold">{dateLabel(selected, { weekday: "long", day: "numeric", month: "long" })}</h2><OccurrenceList occurrences={resource.data.occurrences.filter((item) => (item.starts_at ? localDate(resource.data.timezone, new Date(item.starts_at)) : item.date) === selected)} timezone={resource.data.timezone} changed={retry} /></section></>}
  </main>;
}
