import {EditorForm} from "@/systems/forms/editor";
import {useEditorState} from "@/systems/forms/use-editor";
import {editorSchemas} from "@/systems/forms/schemas";
import {NotificationSettings} from "@/components/notification-settings";
import {ChoiceInput,ChoiceField} from "@/components/ui/choice-picker";
import {LanguageInput} from "@/systems/i18n/language-input";
import {SaveButton} from "@/components/ui/save";
import { OperatorSettings } from "@/systems/operators/settings";
import { t, useLanguage, resolveLanguage } from "@/systems/i18n/locale";
import { ThemeEditor } from "@/systems/themes/theme-editor";
import { validTheme } from "@/systems/themes/themes";
import { SoundSettings } from "@/systems/sounds/sound-settings";
import { supportedTimezones } from "@/lib/dates";
import { LoaderCircle, Save, SlidersHorizontal } from "@/components/icons";
import { useState, type FormEvent } from "react";
import { FormField } from "@/components/form-field";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import { AiSettings } from "@/features/ai/ai-settings";
import { api, errorMessage } from "@/lib/api";
import { usePreferences } from "./preferences-context";
import type { Settings } from "./types";

const timezones = supportedTimezones();

export function SettingsPage() {
  useLanguage();
  const { settings, updateSettings } = usePreferences();
  const [draft, setDraft, draftEditor] = useEditorState(()=>({...settings,language:resolveLanguage(settings.language).language}), editorSchemas.settings);
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

  return <main id="main" className="mx-auto w-full max-w-4xl px-5 pb-10 pt-10 sm:px-10">
    <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><SlidersHorizontal className="size-4" aria-hidden="true" />{t("Под ваш ритм")}</p><h1 className="text-3xl font-semibold tracking-tight">{t("Настройки")}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("Предпочтения сохраняются в вашем аккаунте.")}</p></div>
    <EditorForm editor={draftEditor} onSubmit={(event) => void submit(event)} className="space-y-6">
      <fieldset disabled={pending} className="space-y-6">
        <Card><CardHeader><CardTitle>{t("Язык интерфейса")}</CardTitle><CardDescription>{t("Выберите язык. Изменение применяется после сохранения настроек.")}</CardDescription></CardHeader><CardContent><FormField id="language" label={t("Язык интерфейса")}><LanguageInput id="language" value={draft.language??settings.language??"ru"} change={language=>update("language",language)}/></FormField></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Внешний вид")}</CardTitle><CardDescription>{t("Выберите тему и свой фон.")}</CardDescription></CardHeader><CardContent className="space-y-5"><ThemeEditor value={draft} change={value=>{setDraft(value);setSaved(false);}} uploading={setUploading}/></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Движение и эффекты")}</CardTitle><CardDescription>{t("Короткие анимации и отклик действий. Уменьшение движения в системе учитывается автоматически.")}</CardDescription></CardHeader><CardContent className="space-y-4"><label className="flex items-center gap-3 text-sm"><Input type="checkbox" checked={draft.animations_enabled!==false} onChange={event=>update("animations_enabled",event.target.checked)}/>{t("Анимации интерфейса")}</label><label className="flex items-center gap-3 text-sm"><Input type="checkbox" checked={draft.effects_enabled!==false} onChange={event=>update("effects_enabled",event.target.checked)}/>{t("Эффекты действий")}</label></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Звуки")}</CardTitle><CardDescription>{t("Отклик интерфейса и уведомления.")}</CardDescription></CardHeader><CardContent><SoundSettings value={draft} change={value=>{setDraft(current=>({...current,...value}));setSaved(false);}}/></CardContent></Card>
        <Card><CardHeader><CardTitle>{t("Время и календарь")}</CardTitle><CardDescription>{t("Часовой пояс определяет границы вашего дня.")}</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField id="timezone" label={t("Часовой пояс")} hint={t("Например, Europe/Moscow или UTC.")}><ChoiceInput id="timezone" icon="tabler:clock" value={draft.timezone} displayValue={draft.timezone} changeText={timezone=>update("timezone",timezone)} choose={timezone=>update("timezone",timezone)} inputProps={{required:true,maxLength:100,"aria-describedby":"timezone-hint"}} options={[...new Set(["UTC",...timezones])].map(zone=>({value:zone,label:zone}))} title={t("Выберите часовой пояс")} searchLabel={t("Поиск часового пояса")} empty={t("Часовой пояс не найден")}/></FormField>
          <FormField id="week_starts_on" label={t("Первый день недели")}><ChoiceField id="week_starts_on" value={draft.week_starts_on} change={(next) => update("week_starts_on", next as Settings["week_starts_on"])}><option value="monday">{t("Понедельник")}</option><option value="sunday">{t("Воскресенье")}</option></ChoiceField></FormField>
          <FormField id="time_format" label={t("Формат времени")}><ChoiceField id="time_format" value={draft.time_format} change={(next) => update("time_format", next as Settings["time_format"])}><option value="24h">{t("24 часа")}</option><option value="12h">{t("12 часов (AM/PM)")}</option></ChoiceField></FormField>
        </CardContent></Card>
        <Card><CardHeader><CardTitle>Pomodoro</CardTitle><CardDescription>{t("Длительность периода работы и короткого отдыха.")}</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
          <FormField id="pomodoro_work_minutes" label={t("Работа, минут")}><Input id="pomodoro_work_minutes" type="number" min={1} max={180} required value={Number.isNaN(draft.pomodoro_work_minutes) ? "" : draft.pomodoro_work_minutes} onChange={(event) => update("pomodoro_work_minutes", event.target.valueAsNumber)} /></FormField>
          <FormField id="pomodoro_break_minutes" label={t("Отдых, минут")}><Input id="pomodoro_break_minutes" type="number" min={1} max={180} required value={Number.isNaN(draft.pomodoro_break_minutes) ? "" : draft.pomodoro_break_minutes} onChange={(event) => update("pomodoro_break_minutes", event.target.valueAsNumber)} /></FormField>
        </CardContent></Card>
      </fieldset>
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="text-sm" aria-live="polite">{error ? <span className="text-destructive" role="alert">{error}</span> : saved ? <span className="text-primary">{t("Настройки сохранены")}</span> : <span className="text-muted-foreground">{dirty ? t("Есть несохранённые изменения") : t("Все изменения сохранены")}</span>}</div>
        <SaveButton type="submit" disabled={pending || uploading || !dirty || (draft.theme==="custom"&&!validTheme(draft.custom_theme!))}>{pending ? <LoaderCircle className="" aria-hidden="true" /> : <Save aria-hidden="true" />}{pending ? t("Сохраняем…") : t("Сохранить настройки")}</SaveButton>
      </div>
    </EditorForm>
    <div className="my-6"><NotificationSettings/></div>
    <section id="integrations" className="space-y-6">
    <OperatorSettings />
    <AiSettings />
    </section>
  </main>;
}
