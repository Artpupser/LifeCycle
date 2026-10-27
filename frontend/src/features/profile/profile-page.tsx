import { LoaderCircle, Save, UserRound } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/features/auth/auth-context";
import { draftToProfile, profileToDraft, type MedicalKey, type NumericProfileKey, type Profile, type ProfileDraft } from "./types";

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">{children}</CardContent></Card>;
}

function OptionalBoolean({ id, label, value, onChange }: { id: string; label: string; value: boolean | null; onChange: (value: boolean | null) => void }) {
  return <FormField id={id} label={label}><Select id={id} value={value === null ? "" : String(value)} onChange={(event) => onChange(event.target.value === "" ? null : event.target.value === "true")}><option value="">Не указано</option><option value="true">Да</option><option value="false">Нет</option></Select></FormField>;
}

function ProfileEditor({ initial }: { initial: Profile }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState(() => profileToDraft(initial));
  const [draft, setDraft] = useState(() => profileToDraft(initial));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const dirty = JSON.stringify(saved) !== JSON.stringify(draft);

  function update<K extends keyof ProfileDraft>(key: K, value: ProfileDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value })); setSuccess(false);
  }

  function numberField(key: NumericProfileKey, label: string, min: number, max: number, step = "1") {
    return <FormField key={key} id={key} label={label}><Input id={key} name={key} type="number" inputMode={step === "1" ? "numeric" : "decimal"} min={min} max={max} step={step} value={draft[key] ?? ""} placeholder="Не указано" onChange={(event) => update(key, Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber)} /></FormField>;
  }

  function textField(key: "nickname" | "name" | "birth_country" | "residence_country" | "eye_color" | "hair_color" | "skin_color" | "breast_size", label: string, maxLength = 100) {
    return <FormField key={key} id={key} label={label}><Input id={key} name={key} maxLength={maxLength} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></FormField>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError(null); setSuccess(false);
    const profile = draftToProfile(draft);
    if ([profile.conditions, profile.daily_medications, profile.past_medications, profile.surgeries].some((items) => items.length > 100 || items.some((item) => item.length > 500))) {
      setError("В каждом медицинском списке допускается до 100 записей по 500 символов."); setPending(false); return;
    }
    try {
      const result = await api<Profile>("/profile", { method: "PUT", body: profile });
      const next = profileToDraft(result); setSaved(next); setDraft(next); setSuccess(true);
    } catch (failure) { setError(errorMessage(failure)); }
    finally { setPending(false); }
  }

  const medicalFields: { key: MedicalKey; label: string }[] = [{ key: "conditions", label: "Заболевания" }, { key: "daily_medications", label: "Лекарства на ежедневной основе" }, { key: "past_medications", label: "Лекарства, которые принимали раньше" }, { key: "surgeries", label: "Перенесённые операции" }];

  return <form onSubmit={(event) => void submit(event)} className="space-y-6">
    <fieldset disabled={pending} className="space-y-6">
      <Section title="Основное" description="Все поля анкеты необязательны. Заполняйте только то, что хотите сохранить в своём профиле.">
        {textField("nickname", "Псевдоним", 80)}{textField("name", "Имя", 80)}
        <FormField id="profile-email" label="Электронная почта" hint="Адрес, который используется для входа."><Input id="profile-email" type="email" value={user?.email ?? ""} readOnly aria-describedby="profile-email-hint" /></FormField>
        <FormField id="gender" label="Пол"><Select id="gender" value={draft.gender} onChange={(event) => update("gender", event.target.value as Profile["gender"])}><option value="unspecified">Не указан</option><option value="female">Женский</option><option value="male">Мужской</option><option value="other">Другое</option></Select></FormField>
        <FormField id="birth_date" label="Дата рождения"><Input id="birth_date" type="date" min="1900-01-01" max={new Date().toISOString().slice(0, 10)} value={draft.birth_date ?? ""} onChange={(event) => update("birth_date", event.target.value || null)} /></FormField>
        {textField("birth_country", "Страна рождения")}{textField("residence_country", "Страна проживания")}
      </Section>
      <Section title="Физические данные" description="Личные параметры и особенности.">
        {numberField("height_cm", "Рост, см", 1, 300, "0.1")}{numberField("weight_kg", "Вес, кг", 1, 700, "0.1")}
        {numberField("arms_count", "Количество рук", 0, 10)}{numberField("legs_count", "Количество ног", 0, 10)}
        {textField("eye_color", "Цвет глаз")}{textField("hair_color", "Цвет волос")}{textField("skin_color", "Цвет кожи")}
      </Section>
      <Section title="Социальные данные" description="Люди вокруг вас и близкие отношения.">
        {numberField("colleagues_count", "Количество коллег", 0, 1_000_000)}{numberField("friends_count", "Количество друзей", 0, 1_000_000)}{numberField("acquaintances_count", "Количество знакомых", 0, 1_000_000)}
        <OptionalBoolean id="has_family" label="Есть семья" value={draft.has_family} onChange={(value) => update("has_family", value)} />
        <OptionalBoolean id="has_partner" label="Есть партнёр" value={draft.has_partner} onChange={(value) => update("has_partner", value)} />
      </Section>
      <Section title="Здоровье" description="Одна запись на строку. Эти сведения сохраняются в личном профиле; доступ AI будет настраиваться отдельно.">
        {medicalFields.map(({ key, label }) => <FormField key={key} id={key} label={label}><Textarea id={key} name={key} maxLength={50_099} value={draft[key]} onChange={(event) => update(key, event.target.value)} /></FormField>)}
      </Section>
      <Section title="Личные сведения" description="Необязательные сведения. Значения скрытых полей сохраняются при смене пола.">
        {draft.gender !== "female" && <>{numberField("penis_length_cm", "Длина полового органа, см", 0, 100, "0.1")}{numberField("penis_width_cm", "Ширина полового органа, см", 0, 100, "0.1")}</>}
        {draft.gender !== "male" && <>{textField("breast_size", "Размер груди")}<OptionalBoolean id="pregnant" label="Беременность" value={draft.pregnant} onChange={(value) => update("pregnant", value)} /></>}
      </Section>
    </fieldset>
    <div className="sticky bottom-3 z-10 rounded-2xl border border-border bg-card/95 p-4 shadow-xl backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm" aria-live="polite">{error ? <span className="text-destructive" role="alert">{error}</span> : success ? <span className="text-primary">Профиль сохранён</span> : <span className="text-muted-foreground">{dirty ? "Есть несохранённые изменения" : "Все изменения сохранены"}</span>}</div>
        <div className="flex gap-2"><Button variant="outline" disabled={pending || !dirty} onClick={() => { setDraft(saved); setError(null); setSuccess(false); }}>Отменить</Button><Button type="submit" disabled={pending || !dirty}>{pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}{pending ? "Сохраняем…" : "Сохранить профиль"}</Button></div>
      </div>
    </div>
  </form>;
}

export function ProfilePage() {
  const { resource, retry } = useResource<Profile>("/profile");
  return <main id="main" className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-10">
    <div className="mb-8"><p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary"><UserRound className="size-4" aria-hidden="true" />Личное пространство</p><h1 className="text-3xl font-semibold tracking-tight">Мой профиль</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Начните с информации о себе. К ней всегда можно вернуться.</p></div>
    {resource.status === "loading" ? <LoadingState /> : resource.status === "error" ? <ErrorState message={resource.message} retry={retry} /> : <ProfileEditor initial={resource.data} />}
  </main>;
}
