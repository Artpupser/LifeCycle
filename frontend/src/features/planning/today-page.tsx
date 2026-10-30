import { ChevronLeft, ChevronRight, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { dateLabel, localDate, shiftDate } from "@/lib/dates";
import { OccurrenceList } from "./occurrence-list";
import type { DayPlan } from "./types";

export function TodayPage() {
  const { settings } = usePreferences(); const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now);
  const date = selected || localDate(settings.timezone, new Date(now));
  const { resource, retry } = useResource<DayPlan>(`/today?date=${date}`);
  useEffect(() => {
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    const focus = () => setNow(Date.now());
    window.addEventListener("focus", focus);
    return () => { window.clearInterval(tick); window.removeEventListener("focus", focus); };
  }, []);
  return <main id="main" className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-10"><div className="mb-8 flex flex-wrap items-center justify-between gap-5"><div><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><Sun className="size-4" aria-hidden="true" />Один день за раз</p><h1 className="text-3xl font-semibold">{date === localDate(settings.timezone) ? "Сегодня" : dateLabel(date)}</h1><p className="mt-3 text-sm text-muted-foreground">{dateLabel(date, { weekday: "long", day: "numeric", month: "long" })} · {settings.timezone}</p></div><Link to="/tasks" className="rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted">Запланировать задачу</Link></div><div className="mb-7 flex flex-wrap items-center gap-2"><Button variant="outline" aria-label="Предыдущий день" onClick={() => setSelected(shiftDate(date, -1))}><ChevronLeft /></Button><Input aria-label="Дата плана" type="date" className="w-auto" value={date} onChange={(event) => { if (event.target.value) setSelected(event.target.value); }} /><Button variant="outline" aria-label="Следующий день" onClick={() => setSelected(shiftDate(date, 1))}><ChevronRight /></Button><Button variant="outline" onClick={() => setSelected(null)}>Сегодня</Button></div>{resource.status === "loading" ? <LoadingState /> : resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : <OccurrenceList occurrences={resource.data.tasks} timezone={resource.data.timezone} changed={retry} />}</main>;
}
