import { Cake, CalendarClock, Flag, PartyPopper, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { dateLabel, localDate } from "@/lib/dates";

type CountdownInput = { title: string; category: string; icon: string; target_date: string; repeat_yearly: boolean };
type Countdown = CountdownInput & { id: string; next_date: string; next_at: string; days_remaining: number };
const icons = { cake: Cake, party: PartyPopper, flag: Flag, calendar: CalendarClock };

function CountdownEditor({ initial, close, saved }: { initial: CountdownInput & { id?: string }; close: () => void; saved: () => void }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await api(initial.id ? `/countdowns/${initial.id}` : "/countdowns", { method: initial.id ? "PUT" : "POST", body: { title: value.title.trim(), category: value.category.trim(), icon: value.icon, target_date: value.target_date, repeat_yearly: value.repeat_yearly } }); saved(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Dialog title={initial.id ? "Редактировать событие" : "Новое событие"} onClose={close}><form className="space-y-5" onSubmit={(event) => void submit(event)}><fieldset className="space-y-5" disabled={busy}><FormField id="countdown-title" label="Название события"><Input id="countdown-title" required autoFocus maxLength={200} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} /></FormField><FormField id="countdown-category" label="Категория события" hint="Например: день рождения, праздник или личная цель."><Input id="countdown-category" required maxLength={64} value={value.category} onChange={(event) => setValue({ ...value, category: event.target.value })} /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField id="countdown-date" label="Дата события"><Input id="countdown-date" type="date" min="1900-01-01" max="9998-12-31" required value={value.target_date} onChange={(event) => setValue({ ...value, target_date: event.target.value })} /></FormField><FormField id="countdown-icon" label="Значок события"><Select id="countdown-icon" value={value.icon} onChange={(event) => setValue({ ...value, icon: event.target.value })}><option value="cake">День рождения</option><option value="party">Праздник</option><option value="flag">Цель</option><option value="calendar">Календарь</option>{!(value.icon in icons) && <option value={value.icon}>Другой значок</option>}</Select></FormField></div><label className="flex items-center gap-3 text-sm"><input className="size-4 accent-primary" type="checkbox" checked={value.repeat_yearly} onChange={(event) => setValue({ ...value, repeat_yearly: event.target.checked })} />Повторять каждый год</label></fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить событие"}</Button></form></Dialog>;
}

function Remaining({ countdown }: { countdown: Countdown }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 1000); return () => window.clearInterval(interval); }, []);
  const seconds = Math.max(0, Math.ceil((Date.parse(countdown.next_at) - now) / 1000));
  if (countdown.days_remaining === 0) return <p className="text-3xl font-semibold text-primary">Сегодня</p>;
  if (countdown.days_remaining < 0) return <p className="text-xl font-medium text-muted-foreground">Событие прошло</p>;
  return <div><p className="text-3xl font-semibold tabular-nums text-primary">{Math.floor(seconds / 86400)} д.</p><p className="mt-2 text-sm tabular-nums text-muted-foreground">{String(Math.floor(seconds / 3600) % 24).padStart(2, "0")}:{String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}</p></div>;
}

export function CountdownsPage() {
  const { settings } = usePreferences();
  const [now, setNow] = useState(Date.now);
  useEffect(() => { const interval = window.setInterval(() => setNow(Date.now()), 60000); return () => window.clearInterval(interval); }, []);
  const today = localDate(settings.timezone, new Date(now));
  const resource = useResource<Countdown[]>(`/countdowns?date=${today}&timezone=${encodeURIComponent(settings.timezone)}`);
  const [editor, setEditor] = useState<(CountdownInput & { id?: string }) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function remove(id: string) {
    if (!window.confirm("Удалить событие безвозвратно?")) return;
    setBusy(true); setError(null);
    try { await api(`/countdowns/${id}`, { method: "DELETE" }); resource.retry(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">В ожидании важного</p><h1 className="text-3xl font-semibold">Обратный отсчёт</h1><p className="mt-3 text-sm text-muted-foreground">События и ежегодные даты в часовом поясе {settings.timezone}.</p></div><Button onClick={() => setEditor({ title: "", category: "Событие", icon: "calendar", target_date: localDate(settings.timezone), repeat_yearly: false })}><Plus aria-hidden="true" />Новое событие</Button></header>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{resource.resource.status === "loading" ? <LoadingState /> : resource.resource.status === "error" ? <ErrorState message={resource.resource.message} retry={resource.retry} /> : resource.resource.data.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><CalendarClock className="mx-auto mb-4 size-8 text-primary" aria-hidden="true" /><p>Добавьте событие, которого ждёте.</p></div> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[...resource.resource.data].sort((a, b) => a.next_date.localeCompare(b.next_date)).map((countdown) => { const Icon = icons[countdown.icon as keyof typeof icons] ?? Flag; return <article key={countdown.id} className="min-w-0 rounded-2xl border border-border bg-card p-6"><div className="mb-5 flex items-start gap-3"><span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><p className="break-words text-xs text-muted-foreground">{countdown.category}</p><h2 className="mt-1 break-words font-semibold">{countdown.title}</h2></div></div><Remaining countdown={countdown} /><p className="mt-4 text-sm">{dateLabel(countdown.next_date, { day: "numeric", month: "long", year: "numeric" })}</p>{countdown.repeat_yearly && <p className="mt-1 text-xs text-muted-foreground">Каждый год</p>}<div className="mt-5 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditor(countdown)}><Pencil aria-hidden="true" />Изменить</Button><Button size="sm" variant="outline" aria-label={`Удалить событие ${countdown.title}`} disabled={busy} onClick={() => void remove(countdown.id)}><Trash2 aria-hidden="true" /></Button></div></article>; })}</div>}{editor && <CountdownEditor initial={editor} close={() => setEditor(null)} saved={() => { setEditor(null); resource.retry(); }} />}</main>;
}
