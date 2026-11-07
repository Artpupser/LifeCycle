import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton,SaveForm} from "@/components/ui/save";
import {CollectionPicker} from "@/systems/labels/collections";
import { useUploadActivity } from "@/systems/media/use-upload-activity";
import { t, useLanguage } from "@/systems/i18n/locale";
import { confirmAction } from "@/lib/feedback";
import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import {Input,RatingScale} from "@/components/ui/input";
import { ApiError, api, errorMessage } from "@/lib/api";
import { usePreferences } from "@/features/settings/preferences-context";
import { zonedDateTimeInput, localDateTimeCandidates } from "@/lib/dates";
import { type Entry, type EntryData, type Partner, type Solo, type Kind } from "./types";

export function AnswerInput({ id, label, value, change }: { id: string; label: string; value: boolean | null; change: (value: boolean | null) => void }) {
  useLanguage();
  return <FormField id={id} label={t(label)}><ChoiceField id={id} value={value === null ? "" : String(value)} change={(next) => change(next === "" ? null : next === "true")}><option value="">{t("Не указано")}</option><option value="true">{t("Да")}</option><option value="false">{t("Нет")}</option></ChoiceField></FormField>;
}
export function EntryEditor({ initial, record, close, saved, conflict }: { initial: EntryData; record?: Entry; close: () => void; saved: () => void; conflict: () => void }) {
  useLanguage();
  const { settings } = usePreferences();
  const [value, setValue] = useState(() => {
    if (!record) return { ...initial, timezone: settings.timezone };
    const local = zonedDateTimeInput(record.started_at, settings.timezone);
    const candidates = localDateTimeCandidates(local, settings.timezone);
    const instant = Date.parse(record.started_at);
    const occurrence = candidates.findIndex((candidate) => instant >= candidate && instant < candidate + 60_000);
    return { ...initial, local_start: zonedDateTimeInput(record.started_at, settings.timezone, true), timezone: settings.timezone, time_occurrence: occurrence > 0 ? "later" as const : "earlier" as const };
  });
  const [busy, setBusy] = useState(false);
  const {uploading, setUploading} = useUploadActivity();
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const partner: Partner = value.partner ?? { protection_used: null, gender: "", name: "", positions: [], sex_types: [] };
  const solo: Solo = value.solo ?? { porn_sources: [] };
  const change = <K extends keyof EntryData>(key: K, field: EntryData[K]) => setValue((current) => ({ ...current, [key]: field }));
  const changePartner = (fields: Partial<Partner>) => change("partner", { ...partner, ...fields });
  const changeSolo = (fields: Partial<Solo>) => change("solo", { ...solo, ...fields });
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const data: EntryData = { ...value, local_start: value.local_start.length === 16 ? `${value.local_start}:00` : value.local_start, partner: value.kind === "sex" ? partner : null, solo: value.kind === "masturbation" ? solo : null };
    try { await api(record ? `/sex/${record.id}` : "/sex", { method: record ? "PUT" : "POST", body: record ? { revision: record.revision, data } : data }); saved(); }
    catch (failure) { setError(errorMessage(failure)); if (failure instanceof ApiError && failure.code === "stale_intimacy") { setStale(true); conflict(); } }
    finally { setBusy(false); }
  }
  async function changeKind(kind: Kind) {
    if (kind === value.kind) return;
    if (!await confirmAction(t("Сменить тип события? Поля партнёра или мастурбации будут очищены, общие поля сохранятся."))) return;
    setValue({ ...value, kind, partner: null, solo: null, contraception: [] });
  }
  const closeEditor = () => { if (!busy && !uploading) close(); };
  return <Dialog title={record ? t("Редактировать событие") : t("Новое интимное событие")} onClose={closeEditor}><SaveForm onSubmit={(event) => void submit(event)} className="space-y-6" autoComplete="off"><p className="rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground">{t("Одна запись — одно событие. Достаточно выбрать тип и время; остальное можно заполнить позже.")}</p><fieldset disabled={busy || stale} className="min-w-0 space-y-5">
    <FormField id="intimacy-kind" label={t("Тип события")}><ChoiceField id="intimacy-kind" value={value.kind} change={(next) => changeKind(next as Kind)}><option value="masturbation">{t("Мастурбация")}</option><option value="sex">{t("Секс")}</option></ChoiceField></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="intimacy-start" label={t("Местное время начала")}><Input id="intimacy-start" type="datetime-local" required min="1900-01-01T00:00" step={60} value={value.local_start.slice(0,16)} onChange={(event) => setValue({...value,local_start:event.target.value,time_occurrence:"earlier"})} /></FormField><FormField id="intimacy-duration" label={t("Длительность, минут")}><Input id="intimacy-duration" type="number" min={1} max={1440} step={1} value={value.duration_minutes ?? ""} onChange={(event) => change("duration_minutes", event.target.value === "" ? null : Number(event.target.value))} /></FormField></div>
    <CollectionPicker kind="toy" label={t("Игрушки")} value={value.toys} change={field=>change("toys",field)}/>
    <div className="grid gap-4 sm:grid-cols-2"><AnswerInput id="intimacy-lubricant" label={t("Использовалась смазка")} value={value.lubricant_used} change={field=>setValue(current=>({...current,lubricant_used:field,lubricants:field===false?[]:current.lubricants}))} /><AnswerInput id="intimacy-clothing" label={t("Была одежда")} value={value.was_clothed} change={(field) => change("was_clothed", field)} /></div>
    <CollectionPicker kind="lubricant" label={t("Лубриканты")} value={value.lubricants??[]} change={items=>setValue(current=>({...current,lubricants:items,lubricant_used:items.length?true:current.lubricant_used}))}/>
    <CollectionPicker kind="setting" label={t("Обстановка")} single value={value.setting?[value.setting]:[]} change={items=>change("setting",items[0]??"")}/>
    {value.kind === "sex" ? <section key="partner" className="space-y-5 rounded-xl border border-border p-4"><h3 className="font-semibold">{t("Сведения о сексе")}</h3><AnswerInput id="intimacy-protection" label={t("Использовались средства защиты")} value={partner.protection_used} change={field=>setValue(current=>({...current,partner:{...partner,protection_used:field},contraception:field===false?[]:current.contraception}))} /><CollectionPicker kind="contraception" label={t("Контрацепция")} value={value.contraception??[]} change={items=>setValue(current=>({...current,contraception:items,partner:{...partner,protection_used:items.length?true:partner.protection_used}}))}/><div className="grid gap-4 sm:grid-cols-2"><FormField id="intimacy-partner-name" label={t("Имя партнёра")}><Input id="intimacy-partner-name" maxLength={200} value={partner.name} onChange={(event) => changePartner({ name: event.target.value })} /></FormField><FormField id="intimacy-partner-gender" label={t("Пол партнёра")}><ChoiceField id="intimacy-partner-gender" value={partner.gender} change={(next) => changePartner({ gender: next })}><option value="">{t("Не указано")}</option><option value="female">{t("Женский")}</option><option value="male">{t("Мужской")}</option><option value="other">{t("Другой")}</option><option value="unspecified">{t("Предпочитаю не указывать")}</option></ChoiceField></FormField></div><CollectionPicker kind="position" label={t("Позы")} value={partner.positions} change={positions=>changePartner({positions})}/><CollectionPicker kind="sex_type" label={t("Виды секса")} value={partner.sex_types} change={sex_types=>changePartner({sex_types})}/></section> : <section key="solo" className="space-y-5 rounded-xl border border-border p-4"><h3 className="font-semibold">{t("Сведения о мастурбации")}</h3><CollectionPicker kind="porn_source" label={t("Источники порно")} value={solo.porn_sources} change={porn_sources=>changeSolo({porn_sources})}/></section>}
    <div className="grid gap-4 sm:grid-cols-2"><RatingScale id="intimacy-libido" kind="libido" label={t("Уровень либидо (0–10)")} value={value.libido_level??null} change={field=>change("libido_level",field)}/><RatingScale id="intimacy-satisfaction" label={t("Удовлетворённость (0–10)")} value={value.satisfaction_level??null} change={field=>change("satisfaction_level",field)}/></div>
    <AnswerInput id="intimacy-planned" label={t("Запланированное")} value={value.planned??null} change={planned=>change("planned",planned)}/>
    <CollectionPicker kind="emotion" label={t("Эмоции до")} value={value.emotions_before??[]} change={field=>change("emotions_before",field)}/>
    <CollectionPicker kind="emotion" label={t("Эмоции после")} value={value.emotions_after} change={field=>change("emotions_after",field)}/>
    <AnswerInput id="intimacy-repeat" label={t("Хочу повторить")} value={value.repeat_desired} change={(field) => change("repeat_desired", field)} />
    <FormField id="intimacy-note" label={t("Заметка о событии")}><MarkdownEditor id="intimacy-note" value={value.note} onChange={(field) => change("note",field)} onUploading={setUploading} /></FormField>
  </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{stale && <p className="text-sm">{t("Закройте форму и откройте сохранённую версию из обновлённого списка. Ваш черновик пока остаётся в этой форме.")}</p>}<div className="flex flex-wrap gap-3"><SaveButton type="submit" disabled={busy || uploading || stale}>{busy ? t("Сохраняем…") : t("Сохранить событие")}</SaveButton><Button variant="outline" disabled={busy || uploading} onClick={closeEditor}>{t("Отмена")}</Button></div></SaveForm></Dialog>;
}
