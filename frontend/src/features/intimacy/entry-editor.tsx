import { useState, type FormEvent } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { MarkdownEditor } from "@/components/markdown";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ApiError, api, errorMessage } from "@/lib/api";
import { type Entry, type EntryData, type Partner, type Solo, type Kind } from "./types";

export function AnswerInput({ id, label, value, change }: { id: string; label: string; value: boolean | null; change: (value: boolean | null) => void }) {
  return <FormField id={id} label={label}><Select id={id} value={value === null ? "" : String(value)} onChange={(event) => change(event.target.value === "" ? null : event.target.value === "true")}><option value="">Не указано</option><option value="true">Да</option><option value="false">Нет</option></Select></FormField>;
}
function Lines({ id, label, value, change }: { id: string; label: string; value: string[]; change: (value: string[]) => void }) {
  const [text, setText] = useState(value.join("\n"));
  return <FormField id={id} label={label} hint="Один пункт на строку, до 30 пунктов по 500 символов."><Textarea id={id} maxLength={15030} value={text} onChange={(event) => { setText(event.target.value); const seen = new Set<string>(); change(event.target.value.split("\n").map((v) => v.trim()).filter((v) => { if (!v || seen.has(v.toLowerCase())) return false; seen.add(v.toLowerCase()); return true; })); }} /></FormField>;
}
export function EntryEditor({ initial, record, close, saved, conflict }: { initial: EntryData; record?: Entry; close: () => void; saved: () => void; conflict: () => void }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const partner: Partner = value.partner ?? { protection_used: null, gender: "", name: "", positions: [], sex_types: [] };
  const solo: Solo = value.solo ?? { porn_sources: [], feelings_after: "" };
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
  function changeKind(kind: Kind) {
    if (kind === value.kind) return;
    if (!window.confirm("Сменить тип события? Поля партнёра или мастурбации будут очищены, общие поля сохранятся.")) return;
    setValue({ ...value, kind, partner: null, solo: null });
  }
  const closeEditor = () => { if (!busy && !uploading) close(); };
  return <Dialog title={record ? "Редактировать событие" : "Новое интимное событие"} onClose={closeEditor}><form onSubmit={(event) => void submit(event)} className="space-y-5" autoComplete="off"><p className="text-sm text-muted-foreground">Обязательны тип, время и часовой пояс. Пустое поле означает «не указано»; ноль и «нет» сохраняются отдельно.</p><fieldset disabled={busy || stale} className="min-w-0 space-y-5">
    <FormField id="intimacy-kind" label="Тип события"><Select id="intimacy-kind" value={value.kind} onChange={(event) => changeKind(event.target.value as Kind)}><option value="masturbation">Мастурбация</option><option value="sex">Секс</option></Select></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="intimacy-start" label="Местное время начала"><Input id="intimacy-start" type="datetime-local" required min="1900-01-01T00:00" step={60} value={value.local_start.slice(0,16)} onChange={(event) => change("local_start", event.target.value)} /></FormField><FormField id="intimacy-zone" label="Часовой пояс события" hint="IANA, например Europe/Moscow. Изначально — зона профиля."><Input id="intimacy-zone" required maxLength={100} value={value.timezone} onChange={(event) => change("timezone", event.target.value)} /></FormField></div>
    <FormField id="intimacy-occurrence" label="При повторе часа (DST)" hint="Несуществующее местное время сервер отклонит. Будущие события не записываются."><Select id="intimacy-occurrence" value={value.time_occurrence} onChange={(event) => change("time_occurrence", event.target.value as EntryData["time_occurrence"])}><option value="earlier">Первое вхождение</option><option value="later">Второе вхождение</option></Select></FormField>
    <div className="grid gap-4 sm:grid-cols-2"><FormField id="intimacy-duration" label="Длительность, минут"><Input id="intimacy-duration" type="number" min={1} max={1440} step={1} value={value.duration_minutes ?? ""} onChange={(event) => change("duration_minutes", event.target.value === "" ? null : Number(event.target.value))} /></FormField><FormField id="intimacy-ejaculations" label="Количество эякуляций"><Input id="intimacy-ejaculations" type="number" min={0} max={100} step={1} value={value.ejaculation_count ?? ""} onChange={(event) => change("ejaculation_count", event.target.value === "" ? null : Number(event.target.value))} /></FormField></div>
    <Lines id="intimacy-toys" label="Игрушки" value={value.toys} change={(field) => change("toys", field)} />
    <div className="grid gap-4 sm:grid-cols-2"><AnswerInput id="intimacy-lubricant" label="Использовалась смазка" value={value.lubricant_used} change={(field) => change("lubricant_used", field)} /><AnswerInput id="intimacy-clothing" label="Была одежда" value={value.was_clothed} change={(field) => change("was_clothed", field)} /></div>
    <FormField id="intimacy-setting" label="Обстановка (Markdown)"><Textarea id="intimacy-setting" maxLength={1000} value={value.setting} onChange={(event) => change("setting", event.target.value)} /></FormField>
    {value.kind === "sex" ? <section key="partner" className="space-y-5 rounded-xl border border-border p-4"><h3 className="font-semibold">Сведения о сексе</h3><AnswerInput id="intimacy-protection" label="Использовались средства защиты" value={partner.protection_used} change={(field) => changePartner({ protection_used: field })} /><div className="grid gap-4 sm:grid-cols-2"><FormField id="intimacy-partner-name" label="Имя партнёра"><Input id="intimacy-partner-name" maxLength={200} value={partner.name} onChange={(event) => changePartner({ name: event.target.value })} /></FormField><FormField id="intimacy-partner-gender" label="Пол партнёра"><Select id="intimacy-partner-gender" value={partner.gender} onChange={(event) => changePartner({ gender: event.target.value })}><option value="">Не указано</option><option value="female">Женский</option><option value="male">Мужской</option><option value="other">Другой</option><option value="unspecified">Предпочитаю не указывать</option></Select></FormField></div><Lines id="intimacy-positions" label="Позы" value={partner.positions} change={(field) => changePartner({ positions: field })} /><fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Виды секса</legend>{[["anal","Анальный"],["oral","Оральный"],["vaginal","Вагинальный"],["other","Другой"]].map(([key,label]) => <label key={key} className="mr-4 inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={partner.sex_types.includes(key)} onChange={(event) => changePartner({ sex_types: event.target.checked ? [...partner.sex_types,key] : partner.sex_types.filter((v) => v !== key) })} />{label}</label>)}</fieldset></section> : <section key="solo" className="space-y-5 rounded-xl border border-border p-4"><h3 className="font-semibold">Сведения о мастурбации</h3><Lines id="intimacy-porn" label="Источники порно" value={solo.porn_sources} change={(field) => changeSolo({ porn_sources: field })} /><FormField id="intimacy-feelings" label="Ощущения после (Markdown)"><Textarea id="intimacy-feelings" maxLength={5000} value={solo.feelings_after} onChange={(event) => changeSolo({ feelings_after: event.target.value })} /></FormField></section>}
    <Lines id="intimacy-emotions" label="Эмоции" value={value.emotions} change={(field) => change("emotions", field)} />
    <AnswerInput id="intimacy-repeat" label="Хочу повторить" value={value.repeat_desired} change={(field) => change("repeat_desired", field)} />
    <FormField id="intimacy-note" label="Заметка о событии"><MarkdownEditor id="intimacy-note" value={value.note} onChange={(field) => change("note",field)} onUploading={setUploading} /></FormField>
  </fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{stale && <p className="text-sm">Закройте форму и откройте сохранённую версию из обновлённого списка. Ваш черновик пока остаётся в этой форме.</p>}<div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || uploading || stale}>{busy ? "Сохраняем…" : "Сохранить событие"}</Button><Button variant="outline" disabled={busy || uploading} onClick={closeEditor}>Отмена</Button></div></form></Dialog>;
}
