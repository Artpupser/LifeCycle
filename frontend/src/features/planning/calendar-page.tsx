import { t, useLanguage } from "@/systems/i18n/locale";
import { DayEvents } from "@/features/countdowns/day-events";
import { ChevronLeft, ChevronRight } from "@/components/icons";
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { FilterSearch } from "@/components/filter-search";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { dateLabel, localDate, shiftDate, weekday, shiftMonth } from "@/lib/dates";
import { parseFilterQuery } from "@/lib/filter-query";
import { countryCode, countryFlag, countryName } from "@/systems/phone/countries";
import { AppIcon } from "@/systems/icons/app-icon";
import { useHolidays } from "@/systems/holidays/use-holidays";
import { holidayFilters, holidayName, matchesHoliday } from "@/systems/holidays/holidays";
import { HolidayList } from "@/systems/holidays/holiday-list";
import { firstHolidayYear, lastHolidayYear, type HolidayOccurrence } from "@/systems/holidays/types";
import { calendarOccurrenceVisible, occurrenceCoversDate } from "./task-timing";
import { OccurrenceList } from "./occurrence-list";
import type { CalendarPlan } from "./types";

export function CalendarPage() {
  useLanguage();
  const { settings } = usePreferences();
  const [selected, setSelected] = useState(() => localDate(settings.timezone));
  const [query,setQuery]=useState<string|null>(null);
  const profile=useResource<{residence_country:string}>("/profile");
  const home=profile.resource.status==="ready"?countryCode(profile.resource.data.residence_country??""):null;
  const search=query??(home?`страна:${home}`:"");
  const month = selected.slice(0, 7);
  const first = `${month}-01`;
  const day = weekday(first);
  const offset = settings.week_starts_on === "monday" ? (day + 6) % 7 : day;
  const gridStart = shiftDate(first, -offset);
  const dates = useMemo(()=>Array.from({ length: 42 }, (_, index) => shiftDate(gridStart, index)),[gridStart]);
  const { resource, retry } = useResource<CalendarPlan>(`/calendar?from=${gridStart}&to=${dates[41]}`);
  const holidays=useHolidays(gridStart,dates[41]);
  const visible=useMemo(()=>{const filters=parseFilterQuery(search,holidayFilters);return holidays.items.filter(item=>matchesHoliday(filters,item));},[holidays.items,search]);
  const byDay=useMemo(()=>{
    const map=new Map<string,HolidayOccurrence[]>();
    for(const date of dates)map.set(date,visible.filter(item=>item.date<=date&&item.through>=date));
    return map;
  },[dates,visible]);
  const labels = settings.week_starts_on === "monday" ? [t("Пн"), t("Вт"), t("Ср"), t("Чт"), t("Пт"), t("Сб"), t("Вс")] : [t("Вс"), t("Пн"), t("Вт"), t("Ср"), t("Чт"), t("Пт"), t("Сб")];
  function changeMonth(delta: number) { setSelected(shiftMonth(first, delta)); }
  const selectedHolidays=byDay.get(selected)??[];
  return <main id="main" data-layout="workspace" className="space-y-7"><header><p className="mb-2 text-sm text-primary">{t("Расписание и праздники мира")}</p><h1 className="text-3xl font-semibold">{t("Календарь")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("Личные планы и важные даты — рядом, без смешивания.")}</p></header>
    <section className="space-y-3 rounded-card border border-line bg-surface p-4" aria-label={t("Праздники мира")}><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="flex items-center gap-2 font-semibold"><AppIcon icon="tabler:world"/>{t("Праздники мира")}</h2><div className="flex flex-wrap gap-2">{home&&<Button size="sm" variant="ghost" onClick={()=>setQuery(`страна:${home}`)}><AppIcon icon={countryFlag(home)}/>{countryName(home)}</Button>}<Button size="sm" variant="outline" onClick={()=>setQuery("")}>{t("Весь мир")}</Button></div></div><FilterSearch label={t("Поиск праздников")} value={search} change={setQuery} specs={holidayFilters} placeholder={t("Название, страна:RU или тип:памятный")}/><p className="text-xs leading-5 text-muted-foreground">{home?t("Страна проживания из профиля: {country}. Международные даты включены.",{country:countryName(home)}):t("Укажите страну проживания в профиле, чтобы видеть местные праздники в первую очередь.")} <Link to="/profile" className="text-primary underline">{t("Открыть профиль")}</Link></p>{profile.resource.status==="error"&&<p role="status" className="text-xs text-muted-foreground">{t("Страну профиля загрузить не удалось. Доступен поиск по всему миру.")}</p>}</section>
    <div className="flex flex-wrap items-center gap-2"><Button variant="outline" aria-label={t("Предыдущий месяц")} disabled={month<=`${firstHolidayYear}-01`} onClick={() => changeMonth(-1)}><ChevronLeft /></Button><h2 className="min-w-40 text-center font-semibold">{dateLabel(first, { month: "long", year: "numeric" })}</h2><Button variant="outline" aria-label={t("Следующий месяц")} disabled={month>=`${lastHolidayYear}-12`} onClick={() => changeMonth(1)}><ChevronRight /></Button><Input type="date" min={`${firstHolidayYear}-01-01`} max={`${lastHolidayYear}-12-31`} aria-label={t("Дата календаря")} className="w-auto" value={selected} onChange={(event) => { if (event.target.validity.valid&&event.target.value) setSelected(event.target.value); }} /><Button variant="outline" onClick={() => setSelected(localDate(settings.timezone))}>{t("Сегодня")}</Button></div>
    <div className="overflow-x-auto rounded-xl border border-border"><div className="grid grid-cols-7">{labels.map(label=><div key={label} className="bg-muted p-2 text-center text-xs text-muted-foreground">{label}</div>)}{dates.map(date=>{
      const events=resource.status==="ready"?resource.data.events.filter(e=>e.date===date):[];
      const occurrences=resource.status==="ready"?resource.data.occurrences.filter(item=>calendarOccurrenceVisible(item)&&occurrenceCoversDate(item,date,resource.data.timezone)):[];
      const celebrations=byDay.get(date)??[];
      return <button type="button" key={date} data-calendar-date={date} aria-describedby={celebrations.length?`holidays-${date}`:undefined} aria-label={dateLabel(date,{day:"numeric",month:"long",year:"numeric"})} aria-pressed={selected===date} onClick={()=>setSelected(date)} className={`min-h-22 min-w-0 border-t border-border p-1.5 text-left focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-ring sm:min-h-28 sm:p-2 ${selected===date?"bg-primary/12 ring-1 ring-inset ring-primary":"hover:bg-muted"} ${date.slice(0,7)!==month?"text-muted-foreground":""}`}><span className={`mb-1 inline-flex size-7 items-center justify-center rounded-full text-sm ${date===localDate(settings.timezone)?"bg-primary text-primary-foreground":""}`}>{Number(date.slice(8))}</span><span className="block text-[10px] text-muted-foreground sm:text-xs">{occurrences.length?t("{v0} задач",{v0:occurrences.length}):""}{events.length?t(" · {v0} событий",{v0:events.length}):""}</span>{celebrations.length>0&&<span className="flex items-center gap-1 text-[10px] text-primary sm:text-xs" title={celebrations.slice(0,3).map(item=>holidayName(item.holiday)).join(" · ")}><AppIcon icon="tabler:sparkles" className="size-3"/><span className="truncate">{celebrations.length}</span><span id={`holidays-${date}`} className="sr-only">{celebrations.slice(0,3).map(item=>holidayName(item.holiday)).join(" · ")}</span></span>}<div className="hidden space-y-1 sm:block">{events.slice(0,1).map(e=><p key={e.countdown.id} className="truncate text-xs text-primary">{e.countdown.title}</p>)}{occurrences.slice(0,2).map(item=><p key={`${item.task.id}-${item.date}`} className="truncate text-xs" style={{borderLeft:`3px solid ${item.task.color}`,paddingLeft:4}}>{item.task.title}</p>)}</div></button>;
    })}</div></div>
    <section aria-label={t("План выбранного дня")} className="space-y-4"><h2 className="text-xl font-semibold">{dateLabel(selected,{weekday:"long",day:"numeric",month:"long"})}</h2>{holidays.status==="ready"&&selectedHolidays.length>0&&<div className="space-y-3"><h3 className="text-sm font-medium text-primary">{t("Праздники выбранного дня")}</h3><HolidayList key={selected} items={selectedHolidays} preferredCountry={home??undefined} compact/></div>}{resource.status==="loading"?<LoadingState/>:resource.status==="error"?<ErrorState message={resource.message} retry={retry}/>:<><DayEvents events={resource.data.events.filter(e=>e.date===selected)} timezone={resource.data.timezone}/><OccurrenceList occurrences={resource.data.occurrences.filter(item=>calendarOccurrenceVisible(item)&&occurrenceCoversDate(item,selected,resource.data.timezone))} timezone={resource.data.timezone} changed={retry}/></>}</section>
    <section aria-label={t("Праздники месяца")} className="space-y-4"><div><h2 className="text-xl font-semibold">{t("Праздники месяца")}</h2><p className="mt-2 text-xs text-muted-foreground">{t("Государственные, культурные и менее известные памятные даты. Региональные исключения и объявления могут отсутствовать.")}</p></div>{holidays.status==="loading"?<LoadingState/>:holidays.status==="error"?<ErrorState message={t("Не удалось загрузить каталог праздников.")} retry={holidays.retry}/>:<HolidayList key={`${month}/${search}`} items={visible.filter(item=>item.date<=shiftDate(shiftMonth(first,1),-1)&&item.through>=first)} preferredCountry={home??undefined} onDate={date=>setSelected(date<first?first:date)}/>}</section>
  </main>;
}
