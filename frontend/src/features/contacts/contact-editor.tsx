import { t, useLanguage } from "@/systems/i18n/locale";
import { PhoneInput } from "@/systems/phone/phone-input";
import { MarkdownEditor } from "@/components/markdown";
import { LabelInput } from "@/features/planning/tag-chip";
import { normalizeLabels } from "@/features/planning/types";
import { useState } from "react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { api, errorMessage } from "@/lib/api";
import { localDate } from "@/lib/dates";
import { confirmAction } from "@/lib/feedback";
import { emptyContact, type Contact, type ContactData } from "./types";

export function ContactEditor({ contact, seed, close, saved }: { contact?: Contact; seed?: ContactData; close: () => void; saved: (contact: Contact) => void }) {
  useLanguage();
  const [data, setData] = useState<ContactData>(() => contact?.data ?? seed ?? emptyContact());
  const [uploading,setUploading]=useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const [allowDuplicate, setAllowDuplicate] = useState(false); const [duplicate, setDuplicate] = useState(false);
  const [categories, setCategories] = useState(data.categories.join("\n")); const [tags, setTags] = useState(data.tags.join("\n"));
  const { settings } = usePreferences();
  async function save(event: React.SubmitEvent) {
    event.preventDefault();
    if(busy || uploading) return;
    if (contact?.data.birthday_enabled && !data.birthday_enabled && !await confirmAction(t("Отключить день рождения? Связанное событие будет удалено. Контакт и остальные события сохранятся."))) return;
    setBusy(true); setError(null);
    try {
      const next = await api<Contact>(`/contacts${contact ? `/${contact.id}` : ""}`, { method: contact ? "PUT" : "POST", body: { data: { ...data, phones:data.phones.map(phone=>phone.trim()).filter(Boolean), categories: normalizeLabels(categories, "lines"), tags: normalizeLabels(tags, "lines") }, revision: contact?.revision, allow_duplicate: allowDuplicate } }); saved(next);
    } catch (failure) { setError(errorMessage(failure)); if (failure instanceof Error && "code" in failure && failure.code === "contact_duplicate") setDuplicate(true); }
    finally { setBusy(false); }
  }
  return <Dialog title={contact ? t("Изменить контакт") : t("Новый контакт")} onClose={() => { if (!busy&&!uploading) close(); }}><form onSubmit={event => void save(event)} className="space-y-5">
    <fieldset disabled={busy} className="min-w-0 space-y-4">
      <div className="grid min-w-0 gap-4 sm:grid-cols-3">{([["last_name", t("Фамилия контакта")], ["first_name", t("Имя контакта")], ["middle_name", t("Отчество контакта")]] as const).map(([key, label]) => <FormField key={key} id={`contact-${key}`} label={t(label)}><Input id={`contact-${key}`} autoFocus={key === "first_name"} maxLength={200} value={data[key]} onChange={e => setData({ ...data, [key]: e.target.value })} /></FormField>)}</div>
      <p className="text-xs text-muted-foreground">{t("Достаточно заполнить хотя бы одно поле имени.")}</p>
      <div className="space-y-3"><p className="text-sm font-medium">{t("Телефоны")}</p>{data.phones.map((phone, i) => <div key={i} className="flex min-w-0 items-end gap-2"><div className="min-w-0 flex-1"><FormField id={`contact-phone-${i}`} label={t("Телефон {v0}", {v0: i + 1})}><PhoneInput id={`contact-phone-${i}`} value={phone} change={next=>setData(current=>({...current,phones:current.phones.map((p,j)=>i===j?next:p)}))}/></FormField></div><Button variant="outline" aria-label={t("Удалить телефон {v0}", {v0: i + 1})} onClick={() => setData({ ...data, phones: data.phones.filter((_, j) => i !== j) })}>×</Button></div>)}<Button variant="outline" disabled={data.phones.length >= 20} onClick={() => setData({ ...data, phones: [...data.phones, ""] })}>{t("Добавить телефон")}</Button></div>
      <FormField id="contact-birthday" label={t("Дата рождения контакта")}><Input id="contact-birthday" type="date" min="1900-01-01" max={localDate(settings.timezone)} value={data.birth_date ?? ""} onChange={e => setData({ ...data, birth_date: e.target.value || null })} /></FormField>
      {!seed && <label className="flex items-start gap-3 text-sm"><input className="mt-1" type="checkbox" checked={data.birthday_enabled} onChange={e => setData({ ...data, birthday_enabled: e.target.checked })} />{t("Создать и обновлять день рождения в «Отсчётах»")}</label>}<p className="text-xs text-muted-foreground">{t("Данные берутся из контакта. Если дата не указана, событие приостановлено до её заполнения. Отключение удаляет только связанный день рождения.")}</p>
      {([["relationship", t("Отношения с вами")], ["profession", t("Профессия")], ["activity", t("Род деятельности")]] as const).map(([key, label]) => <FormField key={key} id={`contact-${key}`} label={t(label)}><Input id={`contact-${key}`} maxLength={200} value={data[key]} onChange={e => setData({ ...data, [key]: e.target.value })} /></FormField>)}
      <FormField id="contact-description" label={t("Описание контакта")} hint={t("Поддерживается Markdown. Сведения остаются закрыты для AI.")}><MarkdownEditor id="contact-description" maxLength={8000} value={data.description} onChange={description=>setData(current=>({...current,description}))} onUploading={setUploading}/></FormField>
      <FormField id="contact-categories" label={t("Категории контакта")} hint={t("Каждая метка с новой строки.")}><LabelInput id="contact-categories" multiline value={categories} change={setCategories}/></FormField>
      <FormField id="contact-tags" label={t("Теги контакта")} hint={t("Каждая метка с новой строки.")}><LabelInput id="contact-tags" multiline value={tags} change={setTags}/></FormField>
      {duplicate && <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={allowDuplicate} onChange={e => setAllowDuplicate(e.target.checked)} />{t("Это другой человек с совпадающими данными. Сохранить отдельно.")}</label>}
    </fieldset>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy || uploading || ![data.first_name, data.last_name, data.middle_name].some(n => n.trim())}>{busy ? t("Сохраняем…") : t("Сохранить контакт")}</Button><Button variant="outline" disabled={busy || uploading} onClick={close}>{t("Отмена")}</Button></div>
  </form></Dialog>;
}
