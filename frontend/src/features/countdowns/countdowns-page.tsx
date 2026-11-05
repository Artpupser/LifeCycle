import {EntitySelectionArea,SelectionItem} from "@/systems/selection/entities";
import {SubjectLabels} from "@/systems/labels/functional";
import {CategoryChip} from "@/systems/labels/category-chip";
import {ObjectActions} from "@/systems/actions/action-menu";
import { formatLabels } from "@/systems/labels/values";
import {useLabelCatalog} from "@/systems/labels/context";
import { normalizeLabels } from "@/systems/labels/values";
import { EventCategorySelect } from "@/systems/labels/category-select";
import { eventCategory,categoryTerms } from "@/systems/labels/categories";
import { TagChip } from "@/systems/labels/inputs";
import { t, useLanguage } from "@/systems/i18n/locale";
import { AppIcon } from "@/systems/icons/app-icon";
import { IconPicker } from "@/systems/icons/icon-picker";
import { resolveIcon } from "@/systems/icons/catalog";
import { LabelInput } from "@/systems/labels/inputs";
import { FilterSearch } from "@/components/filter-search";
import { parseFilterQuery, matchesFilter, categoryFilter, tagFilter, filterLiteral, type FilterSpec } from "@/lib/filter-query";
import { CalendarClock, Pencil, Plus, Trash2 } from "@/components/icons";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ContactEditor } from "@/features/contacts/contact-editor";
import { contactName, emptyContact, type ContactData, type Contact } from "@/features/contacts/types";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Markdown, MarkdownEditor } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { toInstant,countdownAmount,birthdayAges, countdownParts, clockFields, durationClock, instantLabel, dateLabel, localDate } from "@/lib/dates";
import { } from "@/components/icons";
import { confirmAction } from "@/lib/feedback";
import { GreetingDialog } from "./greeting-dialog";
import { recurrenceLabels, type Countdown, type CountdownInput, type EventOccurrence } from "./types";

function CountdownEditor({ initial, close, saved }: { initial: CountdownInput & { id?: string; updated_at?: string; contact_birthday?: boolean; original_at?: string | null }; close: () => void; saved: () => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const contacts = useResource<Contact[]>("/contacts");
  const [initialClock] = useState(() => initial.target_time && initial.original_at ? clockFields(initial.original_at, settings.timezone) : { target_date: initial.target_date, target_time: initial.target_time });
  const [seed, setSeed] = useState<ContactData | null>(null);
  const [tags, setTags] = useState(() => formatLabels(initial.tags ?? []));
  const [value, setValue] = useState({ ...initial, ...initialClock,tags:initial.tags??[],category:eventCategory(initial.category),icon:resolveIcon(initial.icon,"tabler:calendar") }); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || uploading) return; setBusy(true); setError(null);
    const { title, category, icon, recurrence, description, contact_id, contact_birthday } = value;
    const clockUnchanged = value.target_date === initialClock.target_date && value.target_time === initialClock.target_time;
    const target_date = clockUnchanged ? initial.target_date : value.target_date;
    const target_time = clockUnchanged ? initial.target_time : value.target_time;
    const timezone = clockUnchanged ? initial.timezone : settings.timezone;
    try { await api(initial.id ? `/countdowns/${initial.id}` : "/countdowns", { method: initial.id ? "PUT" : "POST", body: { title: value.contact_birthday ? t("День рождения") : title.trim(), category, tags:normalizeLabels(tags),display:value.display, icon, target_date: target_date || "1900-01-01", target_time, timezone, recurrence, description, contact_id: contact_id || null, contact_birthday: Boolean(contact_birthday), ...(initial.updated_at ? { expected_updated_at: initial.updated_at } : {}) } }); saved(); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <><Dialog title={initial.id ? t("Редактировать событие") : t("Новое событие")} onClose={() => { if (!busy && !uploading) close(); }}><form className="space-y-5" onSubmit={event => void submit(event)}><fieldset className="space-y-5" disabled={busy}>
    <FormField id="countdown-title" label={t("Название события")}><Input disabled={value.contact_birthday} id="countdown-title" required autoFocus maxLength={200} value={value.title} onChange={e => setValue({ ...value, title: e.target.value })} /></FormField>
    <FormField id="countdown-category" label={t("Категория события")}><EventCategorySelect id="countdown-category" value={value.category} change={category=>setValue({...value,category})}/></FormField>
    <FormField id="countdown-tags" label={t("Теги события")}><LabelInput id="countdown-tags" value={tags} change={setTags}/></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="countdown-date" label={t("Дата события")}><Input disabled={value.contact_birthday} id="countdown-date" type="date" min={initialClock.target_date < "1900-01-01" ? initialClock.target_date : "1900-01-01"} max={initialClock.target_date > "9998-12-31" ? initialClock.target_date : "9998-12-31"} required value={value.target_date} onChange={e => setValue({ ...value, target_date: e.target.value })} /></FormField><FormField id="countdown-time" label={t("Время события")} hint={t("Необязательно. Без времени — на весь день.")}><Input disabled={value.contact_birthday} id="countdown-time" type="time" step={1} value={value.target_time ?? ""} onChange={e => setValue({ ...value, target_time: e.target.value || null })} /></FormField></div>
    <FormField id="event-contact" label={t("Связанный контакт")} hint={t("Данные контакта заполняются в контактной книжке.")}><Select id="event-contact" disabled={Boolean(initial.contact_birthday) || contacts.resource.status !== "ready"} value={value.contact_id ?? ""} onChange={e => setValue({ ...value, contact_id: e.target.value || null, contact_birthday: e.target.value ? value.contact_birthday : false })}><option value="" disabled={Boolean(initial.contact_id)}>{t("Без связи")}</option>{contacts.resource.status === "ready" && contacts.resource.data.map(c => <option key={c.id} value={c.id}>{contactName(c.data)}</option>)}</Select></FormField>
    {contacts.resource.status === "error" && <ErrorState message={contacts.resource.message} retry={contacts.retry} />}
    {value.contact_id && !initial.contact_birthday && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={Boolean(value.contact_birthday)} onChange={e => setValue({ ...value, contact_birthday: e.target.checked, recurrence: e.target.checked ? "yearly" : value.recurrence })} />{t("Синхронизировать как день рождения контакта")}</label>}
    {value.contact_birthday && <p className="text-sm text-primary">{t("Дата рождения обновляется из ")}<Link to="/contacts" className="underline">{t("контакта")}</Link>.</p>}
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="countdown-repeat" label={t("Повторение события")}><Select disabled={value.contact_birthday} id="countdown-repeat" value={value.recurrence} onChange={e => setValue({ ...value, recurrence: e.target.value as CountdownInput["recurrence"] })}>{Object.entries(recurrenceLabels).map(([key, label]) => <option key={key} value={key}>{t(label)}</option>)}</Select></FormField><FormField id="countdown-icon" label={t("Значок события")}><IconPicker id="countdown-icon" value={value.icon} change={icon=>setValue({...value,icon})} label={t("Выбрать значок события")}/></FormField></div>
    <FormField id="countdown-unit" label={t("Единица отсчёта")}><Select id="countdown-unit" value={value.display.unit??"days"} onChange={event=>setValue({...value,display:{...value.display,unit:event.target.value as import("@/lib/dates").CountdownUnit}})}>{[["days","Дни"],["seconds","Секунды"],["minutes","Минуты"],["weeks","Недели"],["months","Месяцы"]].map(([unit,label])=><option key={unit} value={unit}>{t(label)}</option>)}</Select></FormField>
    <FormField id="countdown-description" label={t("Описание события")}><MarkdownEditor id="countdown-description" value={value.description} onChange={description => setValue(v => ({ ...v, description }))} onUploading={setUploading} /></FormField>
    {!value.contact_id && value.details.full_name.trim() && <Button variant="outline" onClick={() => setSeed({ ...emptyContact(), first_name: value.details.full_name, phones: value.details.phone.split(/[·;\n]/).map(p => p.trim()).filter(Boolean), profession: value.details.occupation, relationship: value.details.relationship, description: value.details.notes, birth_date: value.recurrence === "yearly" && resolveIcon(value.icon) === "tabler:cake" ? value.target_date : null })}>{t("Перенести в контакты")}</Button>}
  </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy || uploading}>{busy ? t("Сохраняем…") : t("Сохранить событие")}</Button></form></Dialog>{seed && <ContactEditor seed={seed} close={() => setSeed(null)} saved={contact => { setSeed(null); contacts.mutate(old => [...old, contact]); setValue(v => ({ ...v, contact_id: contact.id, contact_birthday: v.recurrence === "yearly" && resolveIcon(v.icon) === "tabler:cake" })); }} />}</>;
}
function Remaining({ countdown, now, eventAt, timezone }: { countdown: Countdown; now: number; eventAt?: string; timezone: string }) {
  useLanguage();
  if (countdown.suspended || !countdown.next_at || !countdown.original_at) return <p className="text-sm text-muted-foreground">{t("Отсчёт приостановлен: укажите дату рождения в контакте или дату самостоятельного события.")}</p>;
  const remaining = (Date.parse(eventAt ?? countdown.next_at) - now) / 1000;
  const isAllDayToday = !countdown.target_time && countdown.next_date === localDate(timezone, now);
  const parts=countdownParts(remaining);
  const unit=countdown.display.unit??"days";const amount=countdownAmount(toInstant(now),eventAt??countdown.next_at,timezone,unit,Boolean(countdown.target_time));const unitName=t(({days:"дн.",seconds:"сек.",minutes:"мин.",weeks:"нед.",months:"мес."})[unit]);
  const birthday=countdown.contact_birthday||eventCategory(countdown.category)==="birthday"||resolveIcon(countdown.icon)==="tabler:cake";
  const age=birthday?birthdayAges(countdown.target_date,countdown.next_date,timezone,now):null;
  return <div className="space-y-2 py-3 tabular-nums"><p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{isAllDayToday ? t("Сегодня · весь день") : remaining >= 0 ? t("До события") : t("С момента события прошло")}</p>{!isAllDayToday&&<div className="flex flex-wrap items-end gap-x-3 gap-y-2"><p className="text-5xl font-semibold tracking-tight text-foreground">{amount}<span className="ml-2 text-sm font-normal text-muted-foreground">{unitName}</span></p>{countdown.target_time&&unit==="days"&&<p className="pb-1 font-mono text-lg text-primary">{parts.clock}</p>}</div>}{age&&<div className="flex flex-wrap gap-x-5 gap-y-2 text-sm"><p>{t("Сейчас: {age} лет",{age:age.current})}</p><p className="text-primary">{age.today?t("Сегодня исполняется {age}",{age:age.current}):t("Будет: {age} лет",{age:age.next})}</p></div>}</div>;

}
export function CountdownsPage() {
  useLanguage();
  const labelCatalog=useLabelCatalog();
  const { settings } = usePreferences(); const [now, setNow] = useState(Date.now);
  const [params] = useSearchParams(); const contactFilter = params.get("contact") ?? "";
  const today = localDate(settings.timezone, now);
  const resource = useResource<Countdown[]>("/countdowns");
  const todayResource = useResource<{ events: EventOccurrence[] }>(`/today?date=${today}`);
  const refreshEvents = resource.refresh; const refreshToday = todayResource.refresh;
  const [editor, setEditor] = useState<(CountdownInput & { id?: string; updated_at?: string; contact_birthday?: boolean }) | null>(null);
  const [greeting, setGreeting] = useState<Countdown | null>(null); const [query, setQuery] = useState(() => contactFilter ? `contact:${filterLiteral(contactFilter)} ` : "");
  const specs: FilterSpec[] = [categoryFilter,tagFilter, {key:"contact", aliases:["контакт"], label:t("Контакт (имя или ID)"), example:'контакт:"Анна"'}, {key:"period", aliases:["период"],label:t("Период"),example:"период:сегодня",values:["сегодня","прошедшие","today","past"]}, {key:"repeat",aliases:["повтор"],label:t("Повторение"),example:"повтор:yearly",values:Object.keys(recurrenceLabels)}];
  const filters = parseFilterQuery(query, specs);
  const needsToday = filters.terms.some(term=>term.key==="period" && ["сегодня","today"].includes(term.value.toLocaleLowerCase("ru-RU")));
  const todayOnly = filters.terms.some(term=>term.key==="period" && !term.negative && ["сегодня","today"].includes(term.value.toLocaleLowerCase("ru-RU")));
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const events = resource.resource.status === "ready" ? resource.resource.data : [];
  const dayEvents = todayResource.resource.status === "ready" ? todayResource.resource.data.events : [];
  const todayIds = new Set(dayEvents.map(e => e.countdown.id));
  function refresh() { refreshEvents(); refreshToday(); }
  const preciseClock=events.some(event=>Boolean(event.target_time));
  useEffect(() => { const tick = window.setInterval(() => setNow(Date.now()), preciseClock?1000:60000); return () => window.clearInterval(tick); }, [preciseClock]);
  useEffect(() => { const timer = window.setInterval(() => { refreshEvents(); refreshToday(); }, 60000); return () => window.clearInterval(timer); }, [refreshEvents, refreshToday]);
  const nextTransition = events.filter(c => c.target_time && c.recurrence !== "once" && c.next_at).reduce((min, c) => Math.min(min, Date.parse(c.next_at!)), Infinity);
  useEffect(() => {
    if (!Number.isFinite(nextTransition)) return;
    const timer = window.setTimeout(() => { refreshEvents(); refreshToday(); }, Math.max(250, Math.min(60000, nextTransition - Date.now() + 250)));
    return () => window.clearTimeout(timer);
  }, [nextTransition, refreshEvents, refreshToday]);
  const shown = events.filter(c => matchesFilter(filters, `${c.title} ${c.description} ${c.contact_name ?? ""}`, {category:categoryTerms(c.category,labelCatalog),tag:c.tags??[], contact:[c.contact_id ?? "",c.contact_name ?? ""], repeat:c.recurrence, period:[...(todayIds.has(c.id)?["today","сегодня"]:[]), ...(c.recurrence==="once" && c.next_at && Date.parse(c.next_at)<now?["past","прошедшие"]:[])]})).sort((a,b)=>(a.next_at??"9999").localeCompare(b.next_at??"9999"));
  async function remove(c: Countdown) {
    if (!await confirmAction(c.contact_birthday ? t("Удалить день рождения из отсчётов? Автосоздание для этого контакта отключится. Контакт сохранится.") : t("Удалить событие безвозвратно? Контакт сохранится."))) return;
    setBusy(true); setError(null);
    try { await api(`/countdowns/${c.id}`, { method: "DELETE" }); refresh(); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function unlink(c: Countdown) {
    if (!await confirmAction(t("Сохранить событие отдельно от контакта? Текущие сведения сохранятся зашифрованным снимком; дальнейшие изменения контакта не повлияют на событие. Контакт сохранится."))) return;
    setBusy(true); setError(null);
    try { await api(`/countdowns/${c.id}/unlink`, { method: "POST", body: { expected_updated_at: c.updated_at } }); refresh(); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">{t("Важные даты")}</p><h1 className="text-3xl font-semibold">{t("Обратный отсчёт")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Самое важное — вовремя.")}</p></div><Button onClick={() => setEditor({ title: "", category: "other", icon: "calendar", target_date: today, target_time: null, timezone: settings.timezone, recurrence: "once", description: "", contact_id: filters.terms.find(term=>term.key==="contact" && !term.negative && events.some(c=>c.contact_id===term.value))?.value || null, details: { full_name: "", phone: "", occupation: "", relationship: "", notes: "" }, display: { clock: "both", show_years: true, show_repetitions: true } })}><Plus aria-hidden="true" />{t("Новое событие")}</Button></header>
    <div className="flex flex-wrap gap-2"><Link to="/contacts" className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm">{t("Контактная книжка")}</Link><Button size="icon" variant="outline" aria-label={t("Обновить события")} title={t("Обновить события")} onClick={refresh}><AppIcon icon="tabler:refresh"/></Button></div>
    <FilterSearch label={t("Поиск событий")} value={query} change={setQuery} specs={specs} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {resource.resource.status === "loading" ? <LoadingState /> : resource.resource.status === "error" ? <ErrorState message={resource.resource.message} retry={resource.retry} /> : needsToday && todayResource.resource.status === "loading" ? <LoadingState /> : needsToday && todayResource.resource.status === "error" ? <ErrorState message={todayResource.resource.message} retry={todayResource.retry} /> : !shown.length ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><CalendarClock className="mx-auto mb-4 size-8 text-primary" aria-hidden="true" /><p>{!events.length ? t("Добавьте важное событие или включите дни рождения в контактах.") : todayOnly ? t("Сегодня событий нет.") : t("Нет событий с такими условиями.")}</p></div> : <EntitySelectionArea items={shown} itemKey={item=>item.id} scope={query} subjectKind="countdowns" disabled={busy||!!editor||!!greeting} refresh={refresh} remove={item=>api(`/countdowns/${item.id}`,{method:"DELETE"})} removeMessage={t("Удалить выбранные события? Контакты сохранятся. Автосоздание удаляемых дней рождения отключится.")}><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map(countdown => {
      const occurrence = todayOnly ? dayEvents.find(e => e.countdown.id === countdown.id) : undefined;
      const eventAt = occurrence?.event_at ?? countdown.next_at;
      const shownClock = countdown.target_time && eventAt ? clockFields(eventAt, settings.timezone) : null;
      const displayDate = shownClock?.target_date ?? occurrence?.date ?? countdown.next_date;
      return <SelectionItem key={countdown.id} id={countdown.id}><article className="counter-card flex min-w-0 flex-col rounded-2xl border border-border bg-card p-5 sm:p-6"><div className="mb-5 flex items-start gap-3"><span className="rounded-2xl bg-primary/10 p-3 text-primary"><AppIcon icon={countdown.icon} className="size-7"/></span><div className="min-w-0"><p className="break-words text-xs text-muted-foreground"><CategoryChip value={countdown.category}/></p><h2 className="mt-1 break-words text-lg font-semibold">{countdown.title}</h2>{todayIds.has(countdown.id) && <p className="mt-1 text-xs text-primary">{t("Сегодня")}</p>}</div></div>

        <Remaining countdown={countdown} now={now} timezone={settings.timezone} eventAt={occurrence?.event_at} />
        {displayDate && <p className="mt-4 text-sm">{dateLabel(displayDate, { day: "numeric", month: "long", year: "numeric" })}{shownClock && ` · ${instantLabel(eventAt!, settings.timezone, settings.time_format, true)}`}</p>}
        <p className="mt-1 text-xs text-muted-foreground">{t(recurrenceLabels[countdown.recurrence])}</p>
        <details className="mt-4 text-sm"><summary className="cursor-pointer text-muted-foreground">{t("Подробности")}</summary><div className="mt-3 space-y-3">{countdown.original_at&&Date.parse(countdown.original_at)<=now&&<p className="text-xs text-muted-foreground">{t("С первоначальной даты: ")}{durationClock((now-Date.parse(countdown.original_at))/1000,true)}</p>}{countdown.recurrence!=="once"&&<p className="text-xs text-muted-foreground">{t("Повторений: ")}{countdown.repetitions}</p>}{countdown.description&&<Markdown value={countdown.description}/>} {countdown.contact_id&&<Link to="/contacts" className="text-primary underline">{t("Открыть контакт")}</Link>}</div></details>
        <div className="mt-auto border-t border-border pt-4"><SubjectLabels subject={{kind:"countdowns",id:countdown.id}}>{countdown.tags?.map(name=><TagChip key={name} name={name}/>)}</SubjectLabels><ObjectActions label={t("Действия события {v0}",{v0:countdown.title})} subject={{kind:"countdowns",id:countdown.id}}><Button size="sm" variant="ghost" onClick={() => setEditor({ ...countdown, target_date: countdown.target_date ?? "" })}><Pencil/>{t("Изменить")}</Button><Button size="icon" variant="ghost" aria-label={t("Поздравление")} title={t("Поздравление")} onClick={() => setGreeting(countdown)}><AppIcon icon="tabler:gift"/></Button>{countdown.contact_id&&<Button size="sm" variant="ghost" className="w-full justify-start" disabled={busy} onClick={()=>void unlink(countdown)}>{t("Отвязать контакт")}</Button>}<Button size="sm" variant="ghost" className="w-full justify-start text-destructive" aria-label={t("Удалить событие {v0}", {v0: countdown.title})} disabled={busy} onClick={()=>void remove(countdown)}><Trash2/>{t("Удалить событие")}</Button></ObjectActions></div>

      </article></SelectionItem>;
    })}</div></EntitySelectionArea>}
    {editor && <CountdownEditor initial={editor} close={() => setEditor(null)} saved={() => { setEditor(null); refresh(); }} />}{greeting && <GreetingDialog close={() => setGreeting(null)} localRecipient={greeting.details.full_name} />}
  </main>;
}
