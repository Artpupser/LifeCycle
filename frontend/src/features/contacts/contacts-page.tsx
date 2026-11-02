import { LabelManager, TagChip } from "@/features/planning/tag-chip";
import { FilterSearch } from "@/components/filter-search";
import { parseFilterQuery, matchesFilter, filterValue, tagFilter, categoryFilter, type FilterSpec } from "@/lib/filter-query";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { BookUser, Download, Plus, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { confirmAction, confirmChoice, notify } from "@/lib/feedback";
import { dateLabel } from "@/lib/dates";
import { ContactEditor } from "./contact-editor";
import { ContactImport } from "./contact-import";
import { devicePicker, parseContactFile, selectDeviceContacts } from "./import";
import { contactName, phoneKey, type Contact, type ContactData } from "./types";

function Labels({ contacts, close, saved }: { contacts: Contact[]; close: () => void; saved: () => void }) {
  const [kind, setKind] = useState<"categories" | "tags">("categories");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const labels = [...new Set(contacts.flatMap(c => c.data[kind]))].sort();
  async function change(name: string, replacement: string | null) {
    if (replacement === null && !await confirmAction(`Удалить ${kind === "tags" ? "тег" : "категорию"} «${name}» у всех контактов? Контакты сохранятся.`)) return;
    setBusy(true); setError(null);
    try { await api("/contacts/labels", { method: "POST", body: { kind, name, replacement } }); saved(); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <Dialog title="Категории и теги контактов" onClose={() => { if (!busy) close(); }}><div className="space-y-4"><p className="text-sm text-muted-foreground">Новые категории и теги создаются в редакторе контакта. Здесь можно переименовать или удалить их сразу у всех контактов.</p><Select aria-label="Вид метки контактов" value={kind} onChange={e => { setKind(e.target.value as typeof kind); }}><option value="categories">Категории</option><option value="tags">Теги</option></Select><LabelManager label="Метка контактов" key={kind} labels={labels} busy={busy} rename={(name,replacement)=>void change(name,replacement)} remove={name=>void change(name,null)}/>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></Dialog>;
}
export function ContactsPage() {
  const source = useResource<Contact[]>("/contacts"); const contacts = source.resource.status === "ready" ? source.resource.data : [];
  const [editor, setEditor] = useState<Contact | "new" | null>(null); const [taxonomy, setTaxonomy] = useState(false);
  const [query, setQuery] = useState("");
  const specs: FilterSpec[] = [categoryFilter, tagFilter, {key:"sort", aliases:["порядок"], label:"Сортировка", example:"порядок:имя", values:["имя","рождение","новые","name","birthday","recent"], control:true}];
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
    const events = await confirmChoice({title:"Удалить контакт",message:`Удалить «${contactName(c.data)}» безвозвратно? При сохранении связанные события получат снимок сведений контакта.`,confirmLabel:"Подтвердить удаление контакта",destructive:true,choiceLabel:"Что сделать со связанными событиями",choices:[{value:"keep",label:"Сохранить как самостоятельные события"},{value:"delete",label:"Удалить связанные события"}]});
    if (events === null) return;
    setBusy(true); setError(null);
    try { await api(`/contacts/${c.id}`, { method: "DELETE", body: { revision: c.revision, events } }); source.retry(); notify("Контакт удалён."); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function readFile(value: File) {
    setError(null);
    try {
      if (value.size > 2_000_000) throw new Error("Файл слишком большой: максимум 2 МБ.");
      setIncoming(parseContactFile(await value.text()));
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Не удалось прочитать файл."); }
  }
  async function pick() {
    setError(null);
    try { setIncoming({ contacts: await selectDeviceContacts(), warnings: [] }); }
    catch (failure) { if (!(failure instanceof DOMException && failure.name === "AbortError")) setError(failure instanceof Error ? failure.message : "Не удалось выбрать контакты."); }
  }
  async function exportContacts() {
    if (!await confirmAction("Скачать контактную книжку в JSON? Файл содержит открытые персональные данные; сохраните его в надёжном месте.")) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 1, contacts: contacts.map(c => c.data) }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "lifecycle-contacts.json"; link.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const ready = source.resource.status === "ready";
  return <main id="main" className="mx-auto max-w-6xl space-y-6 px-5 py-10 sm:px-10">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">Люди рядом</p><h1 className="text-3xl font-semibold">Контакты</h1><p className="mt-2 text-sm text-muted-foreground">Личная контактная книжка и памятные даты.</p></div><Button disabled={!ready} onClick={() => setEditor("new")}><Plus />Новый контакт</Button></header>
    <p className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm"><ShieldCheck className="size-5 shrink-0 text-primary" />Только для вас · хранение зашифровано. Контакты и связанные события закрыты для AI.</p>
    <details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm font-medium">Импорт, экспорт и метки</summary><div className="mt-3 flex flex-wrap gap-2"><Button variant="outline" disabled={!ready || busy} onClick={() => file.current?.click()}><Upload />Импорт vCard / JSON</Button><Button variant="outline" disabled={!ready || busy || !devicePicker()} onClick={() => void pick()}>Из адресной книги</Button><Button variant="outline" disabled={!ready || !contacts.length} onClick={() => void exportContacts()}><Download />Экспорт</Button><Button variant="outline" disabled={!ready} onClick={() => setTaxonomy(true)}>Категории и теги</Button><Button size="icon" variant="outline" aria-label="Обновить контакты" onClick={source.retry}><RefreshCw /></Button><input ref={file} type="file" accept=".vcf,.vcard,.json,text/vcard,application/json" className="sr-only" aria-label="Файл контактов" onChange={e => { const value = e.target.files?.[0]; if (value) void readFile(value); e.target.value = ""; }} /></div>
    <p className="text-xs text-muted-foreground">Импорт запускается вами, без фонового доступа к устройству. Если системный выбор недоступен, экспортируйте контакты устройства в .vcf. Повторный импорт позволяет обновить выбранные совпадения.</p></details>
    <FilterSearch label="Поиск контактов" value={query} change={setQuery} specs={specs} placeholder="Имя, телефон, профессия или фильтр…" />
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {source.resource.status === "loading" ? <LoadingState /> : source.resource.status === "error" ? <ErrorState message={source.resource.message} retry={source.retry} /> : !filtered.length ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><BookUser className="mx-auto mb-3 size-8 text-primary" /><p>{contacts.length ? "Нет контактов с такими условиями поиска." : "Добавьте первого человека или импортируйте контакты."}</p></div> : <><p className="text-sm text-muted-foreground">Показано {filtered.length} из {contacts.length}</p><div className="grid gap-4 md:grid-cols-2">{filtered.map(c => <article key={c.id} className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="break-words text-lg font-semibold">{contactName(c.data)}</h2>{c.data.birth_date && <p className="text-sm">День рождения: {dateLabel(c.data.birth_date, { day: "numeric", month: "long", year: "numeric" })}</p>}{c.data.birthday_enabled && <p className="text-xs text-primary">{c.data.birth_date ? "День рождения связан с отсчётами" : "День рождения приостановлен: укажите дату"}</p>}{c.data.phones.map(phone => <p key={phone} className="break-words text-sm">{phone}</p>)}{[c.data.relationship, c.data.profession, c.data.activity].filter(Boolean).map((s, i) => <p key={i} className="break-words text-sm text-muted-foreground">{s}</p>)}{c.data.description && <details><summary className="cursor-pointer text-sm">Описание контакта</summary><Markdown value={c.data.description} allowImages={false} /></details>}<div className="flex flex-wrap gap-2">{c.data.categories.map(t => <TagChip key={`category-${t}`} name={t}/>)}{c.data.tags.map(t => <TagChip key={`tag-${t}`} name={t}/>)}</div>{c.data.source_keys.length > 0 && <p className="text-xs text-muted-foreground">Импортирован · обновление доступно при повторном импорте</p>}<div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm" to={`/countdowns?contact=${c.id}`}>События контакта</Link><Button variant="outline" size="sm" disabled={busy} onClick={() => setEditor(c)}>Изменить контакт</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => void remove(c)}>Удалить контакт</Button></div></article>)}</div></>}

    {editor && <ContactEditor contact={editor === "new" ? undefined : editor} close={() => setEditor(null)} saved={() => { setEditor(null); source.retry(); notify("Контакт сохранён."); }} />}
    {incoming && <ContactImport contacts={contacts} incoming={incoming.contacts} warnings={incoming.warnings} close={() => setIncoming(null)} saved={message => { setIncoming(null); source.retry(); notify(message); }} />}
    {taxonomy && <Labels contacts={contacts} close={() => setTaxonomy(false)} saved={() => { setTaxonomy(false);  source.retry(); notify("Метки обновлены."); }} />}
  </main>;
}
