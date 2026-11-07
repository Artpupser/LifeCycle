import {Input} from "@/components/ui/input";
import {GenderBadge} from "@/systems/icons/gender-badge";
import {EntitySelectionArea,SelectionItem} from "@/systems/selection/entities";
import {SubjectLabels} from "@/systems/labels/functional";
import {ZodiacBadge} from "@/systems/icons/zodiac-badge";
import {ObjectActions} from "@/systems/actions/action-menu";
import { ContactActions } from "@/systems/links/contact-actions";
import { contactLinkActions } from "@/systems/links/contact-menu";
import { OperatorBadge } from "@/systems/operators/operator-badge";
import { t, useLanguage } from "@/systems/i18n/locale";
import { TagChip } from "@/systems/labels/inputs";
import { FilterSearch } from "@/components/filter-search";
import { parseFilterQuery, matchesFilter, filterValue, tagFilter, categoryFilter, type FilterSpec } from "@/lib/filter-query";
import { useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { BookUser, Download, Plus, RefreshCw, ShieldCheck, Upload } from "@/components/icons";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { confirmAction, notify } from "@/lib/feedback";
import { dateLabel } from "@/lib/dates";
import { ContactEditor } from "./contact-editor";
import { ContactImport } from "./contact-import";
import { devicePicker, parseContactFile, selectDeviceContacts } from "./import";
import { contactName, phoneKey, type Contact, type ContactData } from "./types";
import {removeContact} from "./contact-actions";

export function ContactsPage() {
  useLanguage();
  const source = useResource<Contact[]>("/contacts"); const contacts = source.resource.status === "ready" ? source.resource.data : [];
  const [editor, setEditor] = useState<Contact | "new" | null>(null);
  const [params,setParams]=useSearchParams();
  const focused=params.get("contact");
  const activeEditor=editor??contacts.find(contact=>contact.id===focused)??null;
  function closeEditor(){setEditor(null);if(focused)setParams(current=>{const next=new URLSearchParams(current);next.delete("contact");return next;},{replace:true});}
  const [query, setQuery] = useState("");
  const specs: FilterSpec[] = [categoryFilter, tagFilter, {key:"sort", aliases:["порядок"], label:t("Сортировка"), example:"порядок:имя", values:["имя","рождение","новые","name","birthday","recent"], control:true}];
  const filters = parseFilterQuery(query, specs);
  const sort = filterValue(filters,"sort").toLocaleLowerCase("ru-RU");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [incoming, setIncoming] = useState<{ contacts: ContactData[]; warnings: string[] } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const filtered = contacts.filter(c => {
    const text = [contactName(c.data), ...c.data.phones, c.data.relationship, c.data.profession, c.data.activity, c.data.description, ...c.data.tags, ...c.data.categories].join(" ");
    const digits = phoneKey(filters.text);
    const phoneMatch = digits.length >= 3 && /^[+\d\s()−-]+$/.test(filters.text) && c.data.phones.some(p => phoneKey(p).includes(digits));
    return matchesFilter({...filters, text: phoneMatch ? "" : filters.text, terms: filters.terms.filter(term=>term.key!=="sort")}, text, {category:c.data.categories, tag:c.data.tags});
  }).sort((a, b) => ["recent","новые"].includes(sort) ? b.updated_at.localeCompare(a.updated_at) : ["birthday","рождение"].includes(sort) ? (a.data.birth_date?.slice(5) ?? "99").localeCompare(b.data.birth_date?.slice(5) ?? "99") : contactName(a.data).localeCompare(contactName(b.data), "ru"));
  async function remove(c: Contact) {
    setBusy(true); setError(null);
    try { if(await removeContact(c))source.retry(); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function readFile(value: File) {
    setError(null);
    try {
      if (value.size > 2_000_000) throw new Error(t("Файл слишком большой: максимум 2 МБ."));
      setIncoming(parseContactFile(await value.text()));
    } catch (failure) { setError(failure instanceof Error ? failure.message : t("Не удалось прочитать файл.")); }
  }
  async function pick() {
    setError(null);
    try { setIncoming({ contacts: await selectDeviceContacts(), warnings: [] }); }
    catch (failure) { if (!(failure instanceof DOMException && failure.name === "AbortError")) setError(failure instanceof Error ? failure.message : t("Не удалось выбрать контакты.")); }
  }
  async function exportContacts() {
    if (!await confirmAction(t("Скачать контактную книжку в JSON? Файл содержит открытые персональные данные; сохраните его в надёжном месте."))) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, contacts: contacts.map(c => c.data) }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "lifecycle-contacts.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const ready = source.resource.status === "ready";
  return <main id="main" className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:px-10">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">{t("Люди рядом")}</p><h1 className="text-3xl font-semibold">{t("Контакты")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("Личная контактная книжка и памятные даты.")}</p></div><Button disabled={!ready} onClick={() => setEditor("new")}><Plus />{t("Новый контакт")}</Button></header>
    <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><ShieldCheck className="size-5 shrink-0 text-primary" />{t("Только для вас · хранение зашифровано. Контакты и связанные события закрыты для AI.")}</p>
    <details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-medium">{t("Импорт, экспорт и метки")}</summary><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={!ready || busy} onClick={() => file.current?.click()}><Upload />{t("Импорт vCard / JSON")}</Button><Button variant="outline" disabled={!ready || busy || !devicePicker()} onClick={() => void pick()}>{t("Из адресной книги")}</Button><Button variant="outline" disabled={!ready || !contacts.length} onClick={() => void exportContacts()}><Download />{t("Экспорт")}</Button><Button variant="outline" asChild><Link to="/labels">{t("Теги и категории")}</Link></Button><Button size="icon" variant="outline" aria-label={t("Обновить контакты")} onClick={source.retry}><RefreshCw /></Button><Input ref={file} type="file" accept=".vcf,.vcard,.json,text/vcard,application/json" className="sr-only" aria-label={t("Файл контактов")} onChange={e => { const value = e.target.files?.[0]; if (value) void readFile(value); e.target.value = ""; }} /></div>
    <p className="text-xs text-muted-foreground">{t("Импорт запускается вами, без фонового доступа к устройству. Если системный выбор недоступен, экспортируйте контакты устройства в .vcf. Повторный импорт позволяет обновить выбранные совпадения.")}</p></details>
    <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/tree">{t("Древо")}</Link></Button></div>
    <FilterSearch label={t("Поиск контактов")} value={query} change={setQuery} specs={specs} placeholder={t("Имя, телефон, профессия или фильтр…")} />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {source.resource.status === "loading" ? <LoadingState /> : source.resource.status === "error" ? <ErrorState message={source.resource.message} retry={source.retry} /> : !filtered.length ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><BookUser className="mx-auto mb-3 size-8 text-primary" /><p>{contacts.length ? t("Нет контактов с такими условиями поиска.") : t("Добавьте первого человека или импортируйте контакты.")}</p></div> : <><p className="text-sm text-muted-foreground">{t("Показано ")}{filtered.length} {t(" из ")}{contacts.length}</p><EntitySelectionArea items={filtered} itemKey={c=>c.id} scope={query} disabled={busy||!!activeEditor||!!incoming} refresh={source.retry} subjectKind="contacts" remove={c=>api(`/contacts/${c.id}`,{method:"DELETE",body:{revision:c.revision,events:"keep"}})} removeMessage={t("Удалить выбранные контакты? Связанные события сохранятся самостоятельно со снимком сведений контакта.")}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map(c => <SelectionItem key={c.id} id={c.id}><article className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="flex items-center gap-2 break-words text-lg font-semibold"><GenderBadge gender={c.data.gender}/>{contactName(c.data)}</h2>{c.data.birth_date && <p className="text-sm">{t("День рождения: ")}{dateLabel(c.data.birth_date, { day: "numeric", month: "long", year: "numeric" })}</p>}<ZodiacBadge birthDate={c.data.birth_date}/>{c.data.birthday_enabled && <p className="text-xs text-primary">{c.data.birth_date ? t("День рождения связан с отсчётами") : t("День рождения приостановлен: укажите дату")}</p>}{c.data.phones.map(phone => <div key={phone} className="space-y-2"><p className="break-words text-sm">{phone}</p><OperatorBadge phone={phone}/><ContactActions phone={phone}/></div>)}{[c.data.relationship, c.data.activity].filter(Boolean).map((s, i) => <p key={i} className="break-words text-sm text-muted-foreground">{s}</p>)}{c.data.description && <details><summary className="cursor-pointer text-sm">{t("Описание контакта")}</summary><Markdown value={c.data.description} /></details>}{c.data.source_keys.length > 0 && <p className="text-xs text-muted-foreground">{t("Импортирован · обновление доступно при повторном импорте")}</p>}<SubjectLabels subject={{kind:"contacts",id:c.id}}>{c.data.tags.map(t => <TagChip key={`tag-${t}`} name={t}/>)}</SubjectLabels><ObjectActions subject={{kind:"contacts",id:c.id}} actions={contactLinkActions(c.data.phones)}><Link className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm" to={`/tree?contact=${encodeURIComponent(c.id)}`}>{t("Найти в древе")}</Link><Link className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm" to={`/countdowns?contact=${c.id}`}>{t("События контакта")}</Link><Button variant="outline" size="sm" disabled={busy} onClick={() => setEditor(c)}>{t("Изменить контакт")}</Button><Button variant="outline" size="sm" className="text-destructive" disabled={busy} onClick={() => void remove(c)}>{t("Удалить контакт")}</Button></ObjectActions></article></SelectionItem>)}</div></EntitySelectionArea></>}

    {activeEditor && <ContactEditor key={activeEditor==="new"?"new":activeEditor.id} contact={activeEditor === "new" ? undefined : activeEditor} close={closeEditor} saved={() => { closeEditor(); source.retry(); notify(t("Контакт сохранён.")); }} />}
    {incoming && <ContactImport contacts={contacts} incoming={incoming.contacts} warnings={incoming.warnings} close={() => setIncoming(null)} saved={message => { setIncoming(null); source.retry(); notify(message); }} />}
  </main>;
}
