import {EditorForm} from "@/systems/forms/editor";
import {useEditorState} from "@/systems/forms/use-editor";
import {editorSchemas} from "@/systems/forms/schemas";
import {IntegrationsPanel} from "@/systems/integrations/integrations-panel";
import {genders,genderName,genderIcon,normalizeGender} from "@/systems/icons/gender";
import {ChoiceField} from "@/components/ui/choice-picker";
import {ZodiacBadge} from "@/systems/icons/zodiac-badge";
import {SaveButton} from "@/components/ui/save";
import { t, useLanguage } from "@/systems/i18n/locale";
import { CountryInput } from "@/systems/phone/country-input";
import { LoaderCircle, Save, UserRound } from "@/components/icons";
import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {Input,Textarea} from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { usePreferences } from "@/features/settings/preferences-context";
import { localDate } from "@/lib/dates";
import { FirstFields, HarmfulHabitsFields, OriginFields } from "./history-fields";
import { useAuth } from "@/features/auth/auth-context";
import { draftToProfile, profileToDraft, type MedicalKey, type NumericProfileKey, type Profile, type ProfileDraft } from "./types";

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  useLanguage();
  return <Card className="min-w-0"><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid min-w-0 grid-cols-1 gap-5 sm:grid-cols-2">{children}</CardContent></Card>;
}

function OptionalBoolean({ id, label, value, onChange }: { id: string; label: string; value: boolean | null; onChange: (value: boolean | null) => void }) {
  useLanguage();
  return <FormField id={id} label={t(label)}><ChoiceField id={id} value={value === null ? "" : String(value)} change={(next) => onChange(next === "" ? null : next === "true")}><option value="">{t("Не указано")}</option><option value="true">{t("Да")}</option><option value="false">{t("Нет")}</option></ChoiceField></FormField>;
}

function ProfileEditor({ initial }: { initial: Profile }) {
  useLanguage();
  const { user } = useAuth();
  const { settings } = usePreferences();
  const today = localDate(settings.timezone);
  const [saved, setSaved] = useState(() => profileToDraft(initial));
  const [draft, setDraft, draftEditor] = useEditorState(() => profileToDraft(initial), editorSchemas.profile);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value })); setSuccess(false);
  }

  function numberField(key: NumericProfileKey, label: string, min: number, max: number, step = "1") {
    return <FormField key={key} id={key} label={t(label)}><Input id={key} name={key} type="number" inputMode={step === "1" ? "numeric" : "decimal"} min={min} max={max} step={step} value={draft[key] ?? ""} placeholder={t("Не указано")} onChange={(event) => update(key, Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber)} /></FormField>;
  }

  function textField(key: "nickname" | "name" | "birth_country" | "residence_country" | "eye_color" | "hair_color" | "skin_color" | "breast_size", label: string, maxLength = 100) {
    return <FormField key={key} id={key} label={t(label)}>{key==="birth_country"||key==="residence_country"?<CountryInput id={key} value={draft[key]} change={value=>update(key,value)}/>:<Input id={key} name={key} maxLength={maxLength} value={draft[key]} onChange={(event) => update(key, event.target.value)} />}</FormField>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setSuccess(false);
    const profile = draftToProfile(draft);
    if ([profile.conditions, profile.daily_medications, profile.past_medications, profile.surgeries].some((items) => items.length > 100 || items.some((item) => item.length > 500))) {
      setError(t("В каждом медицинском списке допускается до 100 записей по 500 символов.")); setPending(false); return;
    }
    try {
      const result = await api<Profile>("/profile", { method: "PUT", body: profile });
      const next = profileToDraft(result); setSaved(next); setDraft(next); setSuccess(true);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  const medicalFields: { key: MedicalKey; label: string }[] = [{ key: "conditions", label: t("Заболевания") }, { key: "daily_medications", label: t("Лекарства на ежедневной основе") }, { key: "past_medications", label: t("Лекарства, которые принимали раньше") }, { key: "surgeries", label: t("Перенесённые операции") }];

  return <EditorForm editor={draftEditor} onSubmit={(event) => void submit(event)} className="space-y-6">
    <fieldset disabled={pending} className="min-w-0 space-y-6">
      <Section title={t("Основное")} description={t("Все поля анкеты необязательны. Заполняйте только то, что хотите сохранить в своём профиле.")}>
        {textField("nickname", t("Псевдоним"), 80)}{textField("name", t("Имя"), 80)}
        <FormField id="profile-email" label={t("Электронная почта")} hint={t("Адрес, который используется для входа.")}><Input id="profile-email" type="email" value={user?.email ?? ""} readOnly aria-describedby="profile-email-hint" /></FormField>
        <FormField id="gender" label={t("Пол")}><ChoiceField id="gender" presentation="radio" value={normalizeGender(draft.gender)} options={genders.map(value=>({value,label:genderName(value),icon:genderIcon(value)}))} change={next=>update("gender",next as Profile["gender"])}/></FormField>
        {textField("residence_country", t("Страна проживания"))}
      </Section>
      <Section title={t("Рождение и происхождение")} description={t("Исторические сведения хранятся отдельно от текущего имени, пола и страны проживания. Их можно исправить или очистить явно.")}>
        <FormField id="birth_date" label={t("Дата рождения")}><Input id="birth_date" type="date" min="1900-01-01" max={today} value={draft.birth_date ?? ""} onChange={event => update("birth_date", event.target.value || null)} /><ZodiacBadge birthDate={draft.birth_date}/></FormField>
        {textField("birth_country", t("Страна рождения"))}
        <OriginFields value={draft.origin} change={origin => update("origin", origin)} />
      </Section>
      <Section title={t("Физические данные")} description={t("Личные параметры и особенности.")}>
        {numberField("height_cm", t("Рост, см"), 1, 300, "0.1")}{numberField("weight_kg", t("Вес, кг"), 1, 700, "0.1")}
        {numberField("arms_count", t("Количество рук"), 0, 10)}{numberField("legs_count", t("Количество ног"), 0, 10)}
        {textField("eye_color", t("Цвет глаз"))}{textField("hair_color", t("Цвет волос"))}{textField("skin_color", t("Цвет кожи"))}
      </Section>
      <Section title={t("Социальные данные")} description={t("Люди вокруг вас и близкие отношения.")}>
        {numberField("colleagues_count", t("Количество коллег"), 0, 1_000_000)}{numberField("friends_count", t("Количество друзей"), 0, 1_000_000)}{numberField("acquaintances_count", t("Количество знакомых"), 0, 1_000_000)}
        <OptionalBoolean id="has_family" label={t("Есть семья")} value={draft.has_family} onChange={(value) => update("has_family", value)} />
        <OptionalBoolean id="has_partner" label={t("Есть партнёр")} value={draft.has_partner} onChange={(value) => update("has_partner", value)} />
      </Section>
      <Section title={t("Вредные привычки")} description={t("Курение, алкоголь и другие привычки: Да / Нет / Не указано. Сохраняйте отдельные периоды и историю прекращения или возвращения.")}>
        <HarmfulHabitsFields value={draft.harmful_habits} change={habits => update("harmful_habits", habits)} today={today} />
      </Section>
      <Section title={t("Первые события и достижения")} description={t("Факты жизненной истории. Изменение текущей работы, имени или страны не перезаписывает эти записи. Любое поле можно очистить.")}>
        <FirstFields value={draft.firsts} change={firsts => update("firsts", firsts)} year={Number(today.slice(0, 4))} />
      </Section>
      <Section title={t("Здоровье")} description={t("Одна запись на строку. Сведения зашифрованы на сервере. Полная анкета, включая историю, доступна AI только при разрешении «Полная анкета профиля». Проверьте точный предпросмотр перед отправкой.")}>
        {medicalFields.map(({ key, label }) => <FormField key={key} id={key} label={t(label)}><Textarea id={key} name={key} maxLength={50_099} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></FormField>)}
      </Section>
      <Section title={t("Личные сведения")} description={t("Необязательные сведения. Значения скрытых полей сохраняются при смене пола.")}>
        {draft.gender !== "female" && <>{numberField("penis_length_cm", t("Длина полового органа, см"), 0, 100, "0.1")}{numberField("penis_width_cm", t("Ширина полового органа, см"), 0, 100, "0.1")}</>}
        {draft.gender !== "male" && <>{textField("breast_size", t("Размер груди"))}<OptionalBoolean id="pregnant" label={t("Беременность")} value={draft.pregnant} onChange={(value) => update("pregnant", value)} /></>}
      </Section>
    </fieldset>
    <div className="rounded-card border border-line bg-surface p-3">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm" aria-live="polite">{error ? <span className="text-destructive" role="alert">{error}</span> : success ? <span className="text-primary">{t("Профиль сохранён")}</span> : <span className="text-muted-foreground">{dirty ? t("Есть несохранённые изменения") : t("Все изменения сохранены")}</span>}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={pending || !dirty} onClick={() => { setDraft(saved); setError(null); setSuccess(false); }}>{t("Отменить")}</Button><SaveButton type="submit" disabled={pending || !dirty}>{pending ? <LoaderCircle className="" aria-hidden="true" /> : <Save aria-hidden="true" />}{pending ? t("Сохраняем…") : t("Сохранить профиль")}</SaveButton></div>
      </div>
    </div>
  </EditorForm>;
}

export function ProfilePage() {
  useLanguage();
  const { resource, retry } = useResource<Profile>("/profile");
  return <main id="main" className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-10">
    <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><UserRound className="size-4" aria-hidden="true" />{t("Личное пространство")}</p><h1 className="text-3xl font-semibold tracking-tight">{t("Мой профиль")}</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">{t("Начните с информации о себе. К ней всегда можно вернуться.")}</p></div>
    <IntegrationsPanel/>
    <div className="mt-8">{resource.status === "loading" ? <LoadingState /> : resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : <ProfileEditor initial={resource.data} />}</div>
  </main>;
}
