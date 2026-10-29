import { LoaderCircle, Save, SlidersHorizontal } from "lucide-react";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { AiSettings } from "@/features/ai/ai-settings";
import { api, errorMessage } from "@/lib/api";
import { usePreferences } from "./preferences-context";
import type { Settings } from "./types";

const timezones = Intl.supportedValuesOf("timeZone");

export function SettingsPage() {
  const { settings, updateSettings } = usePreferences();
  const [draft, setDraft] = useState(settings);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(settings) !== JSON.stringify(draft);

  function update<K extends keyof Settings>(key: K, value: Settings[K]) { setDraft((current) => ({ ...current, [key]: value })); setSaved(false); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setSaved(false);
    try {
      const next = await api<Settings>("/settings", { method: "PUT", body: draft });
      updateSettings(next); setDraft(next); setSaved(true);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  return <main id="main" className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-10">
    <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><SlidersHorizontal className="size-4" aria-hidden="true" />Под ваш ритм</p><h1 className="text-3xl font-semibold tracking-tight">Настройки</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Предпочтения сохраняются в вашем аккаунте.</p></div>
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <fieldset disabled={pending} className="space-y-6">
        <Card><CardHeader><CardTitle>Внешний вид</CardTitle><CardDescription>Выберите комфортное оформление приложения.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField id="theme" label="Тема"><Select id="theme" value={draft.theme} onChange={(event) => update("theme", event.target.value as Settings["theme"])}><option value="system">Как в системе</option><option value="light">Светлая</option><option value="dark">Тёмная</option></Select></FormField>
          <FormField id="language" label="Язык интерфейса"><Input id="language" value="Русский" readOnly /></FormField>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Время и календарь</CardTitle><CardDescription>Часовой пояс определяет границы вашего дня.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField id="timezone" label="Часовой пояс" hint="Например, Europe/Moscow или UTC."><Input id="timezone" list="timezones" value={draft.timezone} required maxLength={100} onChange={(event) => update("timezone", event.target.value)} aria-describedby="timezone-hint" /><datalist id="timezones"><option value="UTC" />{timezones.map((zone) => <option key={zone} value={zone} />)}</datalist></FormField>
          <FormField id="week_starts_on" label="Первый день недели"><Select id="week_starts_on" value={draft.week_starts_on} onChange={(event) => update("week_starts_on", event.target.value as Settings["week_starts_on"])}><option value="monday">Понедельник</option><option value="sunday">Воскресенье</option></Select></FormField>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Напоминания</CardTitle><CardDescription>Напоминания привычек появляются в открытом приложении. При закрытом браузере доставка не выполняется.</CardDescription></CardHeader><CardContent className="grid items-center gap-5 sm:grid-cols-2">
          <label htmlFor="reminders_enabled" className="flex cursor-pointer items-center gap-3 text-sm font-medium"><input id="reminders_enabled" type="checkbox" className="size-5 accent-primary focus-visible:outline-2 focus-visible:outline-ring" checked={draft.reminders_enabled} onChange={(event) => update("reminders_enabled", event.target.checked)} />Включить напоминания</label>
          <FormField id="reminder_minutes_before" label="За сколько минут напоминать"><Input id="reminder_minutes_before" type="number" min={0} max={1440} required value={Number.isNaN(draft.reminder_minutes_before) ? "" : draft.reminder_minutes_before} onChange={(event) => update("reminder_minutes_before", event.target.valueAsNumber)} /></FormField>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Pomodoro</CardTitle><CardDescription>Длительность периода работы и короткого отдыха.</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField id="pomodoro_work_minutes" label="Работа, минут"><Input id="pomodoro_work_minutes" type="number" min={1} max={180} required value={Number.isNaN(draft.pomodoro_work_minutes) ? "" : draft.pomodoro_work_minutes} onChange={(event) => update("pomodoro_work_minutes", event.target.valueAsNumber)} /></FormField>
          <FormField id="pomodoro_break_minutes" label="Отдых, минут"><Input id="pomodoro_break_minutes" type="number" min={1} max={180} required value={Number.isNaN(draft.pomodoro_break_minutes) ? "" : draft.pomodoro_break_minutes} onChange={(event) => update("pomodoro_break_minutes", event.target.valueAsNumber)} /></FormField>
        </CardContent></Card>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="text-sm" aria-live="polite">{error ? <span className="text-destructive" role="alert">{error}</span> : saved ? <span className="text-primary">Настройки сохранены</span> : <span className="text-muted-foreground">{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</span>}</div>
        <Button type="submit" disabled={pending || !dirty}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{pending ? "Сохраняем…" : "Сохранить настройки"}</Button>
      </div>
    </form>
    <AiSettings />
  </main>;
}
