import { Cake, CalendarClock, Flag, PartyPopper, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { ContactEditor } from "@/features/contacts/contact-editor";
import { contactName, emptyContact, type ContactData, type Contact } from "@/features/contacts/types";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Markdown, MarkdownEditor } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { dateLabel, localDate } from "@/lib/dates";
import { confirmAction } from "@/lib/feedback";
import { GreetingDialog } from "./greeting-dialog";
import { recurrenceLabels, type Countdown, type CountdownInput, type EventOccurrence } from "./types";

const icons = { cake: Cake, party: PartyPopper, flag: Flag, calendar: CalendarClock };
function CountdownEditor({ initial, categories, close, saved }: { initial: CountdownInput & { id?: string; updated_at?: string; contact_birthday?: boolean }; categories: string[]; close: () => void; saved: () => void }) {
  const contacts = useResource<Contact[]>("/contacts");
  const [seed, setSeed] = useState<ContactData | null>(null);
  const [value, setValue] = useState(initial); const [busy, setBusy] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy || uploading) return; setBusy(true); setError(null);
    const { title, category, icon, target_date, target_time, timezone, recurrence, description, details, display, contact_id, contact_birthday } = value;
    try { await api(initial.id ? `/countdowns/${initial.id}` : "/countdowns", { method: initial.id ? "PUT" : "POST", body: { title: value.contact_birthday ? "День рождения" : title.trim(), category: category.trim(), icon, target_date: target_date || "1900-01-01", target_time, timezone, recurrence, description, ...(contact_id ? {} : { details }), contact_id: contact_id || null, contact_birthday: Boolean(contact_birthday), display, ...(initial.updated_at ? { expected_updated_at: initial.updated_at } : {}) } }); saved(); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <><Dialog title={initial.id ? "Редактировать событие" : "Новое событие"} onClose={() => { if (!busy && !uploading) close(); }}><form className="space-y-5" onSubmit={event => void submit(event)}><fieldset className="space-y-5" disabled={busy}>
    <FormField id="countdown-title" label="Название события"><Input disabled={value.contact_birthday} id="countdown-title" required autoFocus maxLength={200} value={value.title} onChange={e => setValue({ ...value, title: e.target.value })} /></FormField>
    <FormField id="countdown-category" label="Категория события" hint="Выберите прежнюю категорию или создайте свою: введите любое название."><Input id="countdown-category" list="event-categories" required maxLength={64} value={value.category} onChange={e => setValue({ ...value, category: e.target.value })} /><datalist id="event-categories">{categories.map(c => <option key={c} value={c} />)}</datalist></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="countdown-date" label="Дата события"><Input disabled={value.contact_birthday} id="countdown-date" type="date" min="1900-01-01" max="9998-12-31" required value={value.target_date} onChange={e => setValue({ ...value, target_date: e.target.value })} /></FormField><FormField id="countdown-time" label="Время события" hint="Пустое значение — событие на весь день."><Input disabled={value.contact_birthday} id="countdown-time" type="time" step={1} value={value.target_time ?? ""} onChange={e => setValue({ ...value, target_time: e.target.value || null })} /></FormField></div>
    <Button variant="outline" disabled={busy || Boolean(value.contact_birthday)} onClick={() => void api<{ birth_date: string | null }>("/profile").then(profile => { if (!profile.birth_date) { setError("В профиле не указана дата рождения."); return; } setError(null); setValue(v => ({ ...v, target_date: profile.birth_date!, title: v.title || "Мой день рождения", recurrence: "yearly", icon: "cake" })); }).catch(failure => setError(errorMessage(failure)))}>Взять дату рождения из профиля</Button>
    <FormField id="event-contact" label="Связанный контакт" hint="Сведения о человеке берутся из контактной книжки. Привязка заменяет отдельные сведения события данными контакта."><Select id="event-contact" disabled={Boolean(initial.contact_birthday) || contacts.resource.status !== "ready"} value={value.contact_id ?? ""} onChange={e => setValue({ ...value, contact_id: e.target.value || null, contact_birthday: e.target.value ? value.contact_birthday : false })}><option value="" disabled={Boolean(initial.contact_id)}>Без связи</option>{contacts.resource.status === "ready" && contacts.resource.data.map(c => <option key={c.id} value={c.id}>{contactName(c.data)}</option>)}</Select></FormField>
    {contacts.resource.status === "error" && <ErrorState message={contacts.resource.message} retry={contacts.retry} />}
    {value.contact_id && !initial.contact_birthday && <label className="flex items-start gap-3 text-sm"><input type="checkbox" checked={Boolean(value.contact_birthday)} onChange={e => setValue({ ...value, contact_birthday: e.target.checked, recurrence: e.target.checked ? "yearly" : value.recurrence })} />Синхронизировать как день рождения контакта</label>}
    {value.contact_birthday && <p className="text-sm text-primary">Имя и дата рождения синхронизируются из <Link to="/contacts" className="underline">контакта</Link>. День рождения повторяется ежегодно. Для самостоятельного события сначала отключите связь в карточке.</p>}
    <FormField id="countdown-zone" label="Часовой пояс события"><Input id="countdown-zone" required maxLength={100} placeholder="Europe/Moscow" value={value.timezone} onChange={e => setValue({ ...value, timezone: e.target.value })} /></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="countdown-repeat" label="Повторение события"><Select disabled={value.contact_birthday} id="countdown-repeat" value={value.recurrence} onChange={e => setValue({ ...value, recurrence: e.target.value as CountdownInput["recurrence"] })}>{Object.entries(recurrenceLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</Select></FormField><FormField id="countdown-icon" label="Значок события"><Select id="countdown-icon" value={value.icon} onChange={e => setValue({ ...value, icon: e.target.value })}><option value="cake">День рождения</option><option value="party">Праздник</option><option value="flag">Цель</option><option value="calendar">Календарь</option>{!(value.icon in icons) && <option value={value.icon}>Другой значок</option>}</Select></FormField></div>
    <label className="flex items-center gap-3 text-sm"><input disabled={value.contact_birthday} className="size-4 accent-primary" type="checkbox" checked={value.recurrence === "yearly"} onChange={e => setValue({ ...value, recurrence: e.target.checked ? "yearly" : "once" })} />Повторять каждый год</label>
    <p className="text-xs text-muted-foreground">В коротком месяце используется последний день, затем исходный день восстанавливается. 29 февраля в обычном году — 28 февраля. Несуществующее время сдвигается вперёд, при переводе часов назад выбирается первое вхождение.</p>
    <FormField id="countdown-description" label="Описание события"><MarkdownEditor id="countdown-description" value={value.description} onChange={description => setValue(v => ({ ...v, description }))} onUploading={setUploading} /></FormField>
    {!value.contact_id && <details className="space-y-4"><summary className="cursor-pointer text-sm font-medium">Сведения о человеке</summary><p className="text-xs text-muted-foreground">Отдельные сведения события. Чтобы использовать одну запись в нескольких событиях, выберите контакт выше.</p><Button variant="outline" onClick={() => setSeed({ ...emptyContact(), first_name: value.details.full_name, phones: value.details.phone.split(/[·;\n]/).map(p => p.trim()).filter(Boolean), profession: value.details.occupation, relationship: value.details.relationship, description: value.details.notes, birth_date: value.recurrence === "yearly" && value.icon === "cake" ? value.target_date : null })}>Создать контакт из сведений события</Button>{([["full_name", "ФИО"], ["phone", "Телефон"], ["occupation", "Род деятельности"], ["relationship", "Отношения с вами"]] as const).map(([key, label]) => <FormField key={key} id={`event-${key}`} label={label}><Input id={`event-${key}`} maxLength={200} value={value.details[key]} onChange={e => setValue({ ...value, details: { ...value.details, [key]: e.target.value } })} /></FormField>)}<FormField id="event-notes" label="Примечания о человеке"><Textarea id="event-notes" maxLength={8000} value={value.details.notes} onChange={e => setValue({ ...value, details: { ...value.details, notes: e.target.value } })} /></FormField></details>}
    <details className="space-y-4"><summary className="cursor-pointer text-sm font-medium">Отображение времени</summary><FormField id="event-clock" label="Показывать время"><Select id="event-clock" value={value.display.clock} onChange={e => setValue({ ...value, display: { ...value.display, clock: e.target.value as CountdownInput["display"]["clock"] } })}><option value="both">Оставшееся и прошедшее</option><option value="remaining">Оставшееся</option><option value="elapsed">Прошедшее</option></Select></FormField>{([["show_years", "Показывать полные годы / возраст"], ["show_repetitions", "Показывать число повторений"]] as const).map(([key, label]) => <label key={key} className="flex items-center gap-3 text-sm"><input type="checkbox" checked={value.display[key]} onChange={e => setValue({ ...value, display: { ...value.display, [key]: e.target.checked } })} />{label}</label>)}</details>
  </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy || uploading}>{busy ? "Сохраняем…" : "Сохранить событие"}</Button></form></Dialog>{seed && <ContactEditor seed={seed} close={() => setSeed(null)} saved={contact => { setSeed(null); contacts.mutate(old => [...old, contact]); setValue(v => ({ ...v, contact_id: contact.id, contact_birthday: v.recurrence === "yearly" && v.icon === "cake" })); }} />}</>;
}
function duration(seconds: number) { const n = Math.floor(Math.abs(seconds)); return `${Math.floor(n / 86400)} д. ${String(Math.floor(n / 3600) % 24).padStart(2, "0")}:${String(Math.floor(n / 60) % 60).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; }
function Remaining({ countdown, now, eventAt }: { countdown: Countdown; now: number; eventAt?: string }) {
  if (countdown.suspended || !countdown.next_at || !countdown.original_at) return <p className="text-sm text-muted-foreground">Отсчёт приостановлен: укажите дату рождения в контакте или дату самостоятельного события.</p>;
  const remaining = (Date.parse(eventAt ?? countdown.next_at) - now) / 1000;
  const elapsed = (now - Date.parse(countdown.original_at)) / 1000;
  const isAllDayToday = !countdown.target_time && countdown.next_date === localDate(countdown.timezone, new Date(now));
  return <div className="space-y-2 tabular-nums">{countdown.display.clock !== "elapsed" && <div><p className="text-xs text-muted-foreground">{isAllDayToday ? "Сегодня · весь день" : remaining >= 0 ? "До события" : "С момента события прошло"}</p>{!isAllDayToday && <p className="mt-1 break-words text-xl font-semibold text-primary">{duration(remaining)}</p>}</div>}{countdown.display.clock !== "remaining" && elapsed >= 0 && <div><p className="text-xs text-muted-foreground">С первоначальной даты прошло</p><p className="text-sm">{duration(elapsed)}</p></div>}{countdown.display.show_years && countdown.full_years !== null && <p className="text-sm">{countdown.contact_birthday ? "Возраст" : "Полных лет"}: {countdown.full_years}</p>}{countdown.display.show_repetitions && countdown.recurrence !== "once" && <p className="text-xs text-muted-foreground">Повторений после первого события: {countdown.repetitions}</p>}</div>;
}
export function CountdownsPage() {
  const { settings } = usePreferences(); const [now, setNow] = useState(Date.now);
  const [params, setParams] = useSearchParams(); const contactFilter = params.get("contact") ?? "";
  const today = localDate(settings.timezone, new Date(now));
  const resource = useResource<Countdown[]>("/countdowns");
  const todayResource = useResource<{ events: EventOccurrence[] }>(`/today?date=${today}`);
  const refreshEvents = resource.refresh; const refreshToday = todayResource.refresh;
  const [editor, setEditor] = useState<(CountdownInput & { id?: string; updated_at?: string; contact_birthday?: boolean }) | null>(null);
  const [greeting, setGreeting] = useState<Countdown | null>(null); const [filter, setFilter] = useState(""); const [query, setQuery] = useState("");
  const [tab, setTab] = useState("all"); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const events = resource.resource.status === "ready" ? resource.resource.data : [];
  const dayEvents = todayResource.resource.status === "ready" ? todayResource.resource.data.events : [];
  const todayIds = new Set(dayEvents.map(e => e.countdown.id));
  function refresh() { refreshEvents(); refreshToday(); }
  useEffect(() => { const tick = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(tick); }, []);
  useEffect(() => { const timer = window.setInterval(() => { refreshEvents(); refreshToday(); }, 60000); return () => window.clearInterval(timer); }, [refreshEvents, refreshToday]);
  const nextTransition = events.filter(c => c.target_time && c.recurrence !== "once" && c.next_at).reduce((min, c) => Math.min(min, Date.parse(c.next_at!)), Infinity);
  useEffect(() => {
    if (!Number.isFinite(nextTransition)) return;
    const timer = window.setTimeout(() => { refreshEvents(); refreshToday(); }, Math.max(250, Math.min(60000, nextTransition - Date.now() + 250)));
    return () => window.clearTimeout(timer);
  }, [nextTransition, refreshEvents, refreshToday]);
  const categories = [...new Set(events.map(c => c.category))];
  const shown = events.filter(c => (!filter || c.category === filter) && (!contactFilter || c.contact_id === contactFilter) && `${c.title} ${c.description} ${c.contact_name ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) && (tab === "all" || tab === "today" && todayIds.has(c.id) || tab === "past" && c.recurrence === "once" && c.next_at && Date.parse(c.next_at) < now)).sort((a, b) => (a.next_at ?? "9999").localeCompare(b.next_at ?? "9999"));
  async function remove(c: Countdown) {
    if (!await confirmAction(c.contact_birthday ? "Удалить день рождения из отсчётов? Автосоздание для этого контакта отключится. Контакт сохранится." : "Удалить событие безвозвратно? Контакт сохранится.")) return;
    setBusy(true); setError(null);
    try { await api(`/countdowns/${c.id}`, { method: "DELETE" }); refresh(); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function unlink(c: Countdown) {
    if (!await confirmAction("Сохранить событие отдельно от контакта? Текущие сведения сохранятся зашифрованным снимком; дальнейшие изменения контакта не повлияют на событие. Контакт сохранится.")) return;
    setBusy(true); setError(null);
    try { await api(`/countdowns/${c.id}/unlink`, { method: "POST", body: { expected_updated_at: c.updated_at } }); refresh(); } catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">Важные даты</p><h1 className="text-3xl font-semibold">Обратный отсчёт</h1><p className="mt-3 text-sm text-muted-foreground">События, памятные даты и история времени.</p></div><Button onClick={() => setEditor({ title: "", category: "Событие", icon: "calendar", target_date: today, target_time: null, timezone: settings.timezone, recurrence: "once", description: "", contact_id: contactFilter || null, details: { full_name: "", phone: "", occupation: "", relationship: "", notes: "" }, display: { clock: "both", show_years: true, show_repetitions: true } })}><Plus aria-hidden="true" />Новое событие</Button></header>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Раздел событий">{[["all", "Все события"], ["today", "Сегодня"], ["past", "Прошедшие"]].map(([value, label]) => <Button key={value} variant={tab === value ? "default" : "outline"} aria-pressed={tab === value} onClick={() => setTab(value)}>{label}</Button>)}<Link to="/contacts" className="inline-flex min-h-10 items-center rounded-lg border border-border px-4 text-sm">Контактная книжка</Link><Button variant="outline" onClick={refresh}>Обновить события</Button></div>
    {contactFilter && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-3 text-sm"><span>Показаны события выбранного контакта.</span><Button size="sm" variant="outline" onClick={() => setParams({})}>Все контакты</Button></div>}
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="event-search" label="Поиск событий"><Input id="event-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Название или контакт" /></FormField><FormField id="event-category-filter" label="Фильтр категории событий"><Select id="event-category-filter" value={filter} onChange={e => setFilter(e.target.value)}><option value="">Все категории</option>{categories.map(c => <option key={c}>{c}</option>)}</Select></FormField></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {resource.resource.status === "loading" ? <LoadingState /> : resource.resource.status === "error" ? <ErrorState message={resource.resource.message} retry={resource.retry} /> : tab === "today" && todayResource.resource.status === "loading" ? <LoadingState /> : tab === "today" && todayResource.resource.status === "error" ? <ErrorState message={todayResource.resource.message} retry={todayResource.retry} /> : !shown.length ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><CalendarClock className="mx-auto mb-4 size-8 text-primary" aria-hidden="true" /><p>{!events.length ? "Добавьте важное событие или включите дни рождения в контактах." : tab === "today" ? "Сегодня событий нет." : "Нет событий с такими условиями."}</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{shown.map(countdown => {
      const Icon = icons[countdown.icon as keyof typeof icons] ?? Flag;
      const occurrence = tab === "today" ? dayEvents.find(e => e.countdown.id === countdown.id) : undefined;
      const displayDate = occurrence?.date ?? countdown.next_date;
      return <article key={countdown.id} className="min-w-0 rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="break-words text-xs text-muted-foreground">{countdown.category}</p><h2 className="mt-1 break-words font-semibold">{countdown.title}</h2>{todayIds.has(countdown.id) && <p className="mt-1 text-xs text-primary">Сегодня</p>}</div></div>
        <Remaining countdown={countdown} now={now} eventAt={occurrence?.event_at} />
        {displayDate && <p className="mt-4 text-sm">{dateLabel(displayDate, { day: "numeric", month: "long", year: "numeric" })}{countdown.target_time && ` · ${tab === "today" && occurrence ? new Intl.DateTimeFormat("ru", { timeZone: settings.timezone, hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(occurrence.event_at)) : countdown.target_time}`}</p>}
        <p className="mt-1 text-xs text-muted-foreground"><span>{recurrenceLabels[countdown.recurrence]}</span> · {tab === "today" && countdown.target_time ? settings.timezone : countdown.timezone}</p>
        {countdown.contact_id && <p className="mt-3 break-words text-xs text-primary">Из контактной книжки: <Link to="/contacts" className="underline">{countdown.contact_name}</Link></p>}
        {countdown.description && <div className="mt-4"><Markdown value={countdown.description} /></div>}
        {Object.values(countdown.details).some(Boolean) && <details className="mt-4 text-sm"><summary className="cursor-pointer">Сведения о человеке</summary>{Object.entries(countdown.details).filter(([, v]) => v).map(([k, v]) => <p className="mt-2 whitespace-pre-wrap break-words" key={k}>{v}</p>)}</details>}
        <div className="mt-5 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditor({ ...countdown, target_date: countdown.target_date ?? "" })}><Pencil aria-hidden="true" />Изменить</Button><Button size="sm" variant="outline" onClick={() => setGreeting(countdown)}>Поздравление</Button>{countdown.contact_id && <Button size="sm" variant="outline" disabled={busy} onClick={() => void unlink(countdown)}>Отвязать контакт</Button>}<Button size="sm" variant="outline" aria-label={`Удалить событие ${countdown.title}`} disabled={busy} onClick={() => void remove(countdown)}><Trash2 aria-hidden="true" /></Button></div>
      </article>;
    })}</div>}
    {editor && <CountdownEditor initial={editor} categories={categories} close={() => setEditor(null)} saved={() => { setEditor(null); refresh(); }} />}{greeting && <GreetingDialog close={() => setGreeting(null)} localRecipient={greeting.details.full_name} />}
  </main>;
}
