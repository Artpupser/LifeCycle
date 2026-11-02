import { t, useLanguage } from "@/systems/i18n/locale";
import { ThemeEditor } from "@/systems/themes/theme-editor";
import { validTheme } from "@/systems/themes/themes";
import { SoundSettings } from "@/systems/sounds/sound-settings";
import { supportedTimezones } from "@/lib/dates";
import { LoaderCircle, Save, SlidersHorizontal } from "@/components/icons";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { AiSettings } from "@/features/ai/ai-settings";
import { api, errorMessage } from "@/lib/api";
import { usePreferences } from "./preferences-context";
import type { Settings } from "./types";

const timezones = supportedTimezones();

export function SettingsPage() {
  useLanguage();
  const { settings, updateSettings } = usePreferences();
  const [draft, setDraft] = useState(settings);
  const [uploading,setUploading]=useState(false);
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
    <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><SlidersHorizontal className="size-4" aria-hidden="true" />{t("Под ваш ритм")}</p><h1 className="text-3xl font-semibold tracking-tight">{t("Настройки")}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("Предпочтения сохраняются в вашем аккаунте.")}</p></div>
    <form onSubmit={(event) => void submit(event)} className="space-y-6">
      <fieldset disabled={pending} className="space-y-6">
        <Card><CardHeader><CardTitle>{t("Внешний вид")}</CardTitle><CardDescription>{t("Выберите тему и свой фон.")}</CardDescription></CardHeader><CardContent className="space-y-5"><ThemeEditor value={draft} change={value=>{setDraft(value);setSaved(false);}} uploading={setUploading}/><FormField id="language" label={t("Язык интерфейса")}><Select id="language" value={draft.language} onChange={event=>update("language",event.target.value as Settings["language"])}><option value="ru">{t("Русский")}</option><option value="en">English</option></Select></FormField></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Звуки")}</CardTitle><CardDescription>{t("Отклик интерфейса и уведомления.")}</CardDescription></CardHeader><CardContent><SoundSettings value={draft} change={value=>{setDraft(current=>({...current,...value}));setSaved(false);}}/></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Время и календарь")}</CardTitle><CardDescription>{t("Часовой пояс определяет границы вашего дня.")}</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField id="timezone" label={t("Часовой пояс")} hint={t("Например, Europe/Moscow или UTC.")}><Input id="timezone" list="timezones" value={draft.timezone} required maxLength={100} onChange={(event) => update("timezone", event.target.value)} aria-describedby="timezone-hint" /><datalist id="timezones"><option value="UTC" />{timezones.map((zone) => <option key={zone} value={zone} />)}</datalist></FormField>
          <FormField id="week_starts_on" label={t("Первый день недели")}><Select id="week_starts_on" value={draft.week_starts_on} onChange={(event) => update("week_starts_on", event.target.value as Settings["week_starts_on"])}><option value="monday">{t("Понедельник")}</option><option value="sunday">{t("Воскресенье")}</option></Select></FormField>
          <FormField id="time_format" label={t("Формат времени")}><Select id="time_format" value={draft.time_format} onChange={(event) => update("time_format", event.target.value as Settings["time_format"])}><option value="24h">{t("24 часа")}</option><option value="12h">{t("12 часов (AM/PM)")}</option></Select></FormField>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Напоминания")}</CardTitle><CardDescription>{t("Напоминания привычек появляются в открытом приложении. При закрытом браузере доставка не выполняется.")}</CardDescription></CardHeader><CardContent className="grid items-center gap-5 sm:grid-cols-2">
          <label htmlFor="reminders_enabled" className="flex cursor-pointer items-center gap-3 text-sm font-medium"><input id="reminders_enabled" type="checkbox" className="size-5 accent-primary focus-visible:outline-2 focus-visible:outline-ring" checked={draft.reminders_enabled} onChange={(event) => update("reminders_enabled", event.target.checked)} />{t("Включить напоминания")}</label>
          <FormField id="reminder_minutes_before" label={t("За сколько минут напоминать")}><Input id="reminder_minutes_before" type="number" min={0} max={1440} required value={Number.isNaN(draft.reminder_minutes_before) ? "" : draft.reminder_minutes_before} onChange={(event) => update("reminder_minutes_before", event.target.valueAsNumber)} /></FormField>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Pomodoro</CardTitle><CardDescription>{t("Длительность периода работы и короткого отдыха.")}</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField id="pomodoro_work_minutes" label={t("Работа, минут")}><Input id="pomodoro_work_minutes" type="number" min={1} max={180} required value={Number.isNaN(draft.pomodoro_work_minutes) ? "" : draft.pomodoro_work_minutes} onChange={(event) => update("pomodoro_work_minutes", event.target.valueAsNumber)} /></FormField>
          <FormField id="pomodoro_break_minutes" label={t("Отдых, минут")}><Input id="pomodoro_break_minutes" type="number" min={1} max={180} required value={Number.isNaN(draft.pomodoro_break_minutes) ? "" : draft.pomodoro_break_minutes} onChange={(event) => update("pomodoro_break_minutes", event.target.valueAsNumber)} /></FormField>
        </CardContent></Card>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4">
        <div className="text-sm" aria-live="polite">{error ? <span className="text-destructive" role="alert">{error}</span> : saved ? <span className="text-primary">{t("Настройки сохранены")}</span> : <span className="text-muted-foreground">{dirty ? t("Есть несохранённые изменения") : t("Все изменения сохранены")}</span>}</div>
        <Button type="submit" disabled={pending || uploading || !dirty || (draft.theme==="custom"&&!validTheme(draft.custom_theme!))}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{pending ? t("Сохраняем…") : t("Сохранить настройки")}</Button>
      </div>
    </form>
    <AiSettings />
  </main>;
}
