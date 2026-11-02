import { useRef, useState } from "react";
import { Link } from "react-router";
import { BookUser, Download, Plus, RefreshCw, ShieldCheck, Upload } from "lucide-react";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Markdown } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";
import { confirmAction } from "@/lib/feedback";
import { dateLabel } from "@/lib/dates";
import { ContactEditor } from "./contact-editor";
import { ContactImport } from "./contact-import";
import { devicePicker, parseContactFile, selectDeviceContacts } from "./import";
import { contactName, phoneKey, type Contact, type ContactData } from "./types";

function Labels({ contacts, close, saved }: { contacts: Contact[]; close: () => void; saved: () => void }) {
  const [kind, setKind] = useState<"categories" | "tags">("categories"); const [name, setName] = useState(""); const [replacement, setReplacement] = useState("");
  const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const labels = [...new Set(contacts.flatMap(c => c.data[kind]))].sort();
  async function change(remove: boolean) {
    if (remove && !await confirmAction(`Удалить ${kind === "tags" ? "тег" : "категорию"} «${name}» у всех контактов? Контакты сохранятся.`)) return;
    setBusy(true); setError(null);
    try { await api("/contacts/labels", { method: "POST", body: { kind, name, replacement: remove ? null : replacement } }); saved(); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  return <Dialog title="Категории и теги контактов" onClose={() => { if (!busy) close(); }}><div className="space-y-4"><p className="text-sm text-muted-foreground">Новые категории и теги создаются в редакторе контакта. Здесь можно переименовать или удалить их сразу у всех контактов.</p><Select aria-label="Вид метки контактов" value={kind} onChange={e => { setKind(e.target.value as typeof kind); setName(""); }}><option value="categories">Категории</option><option value="tags">Теги</option></Select><Select aria-label="Метка контактов" value={name} onChange={e => setName(e.target.value)}><option value="">Выберите метку</option>{labels.map(label => <option key={label}>{label}</option>)}</Select><FormField id="contact-label-replacement" label="Новое название метки"><Input id="contact-label-replacement" maxLength={64} value={replacement} onChange={e => setReplacement(e.target.value)} /></FormField><div className="flex flex-wrap gap-2"><Button disabled={busy || !name || !replacement.trim()} onClick={() => void change(false)}>Переименовать метку</Button><Button variant="outline" disabled={busy || !name} onClick={() => void change(true)}>Удалить метку</Button></div>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}</div></Dialog>;
}
export function ContactsPage() {
  const source = useResource<Contact[]>("/contacts"); const contacts = source.resource.status === "ready" ? source.resource.data : [];
  const [deleting, setDeleting] = useState<Contact | null>(null); const [deleteEvents, setDeleteEvents] = useState("keep");
  const [editor, setEditor] = useState<Contact | "new" | null>(null); const [taxonomy, setTaxonomy] = useState(false);
  const [query, setQuery] = useState(""); const [category, setCategory] = useState(""); const [tag, setTag] = useState(""); const [sort, setSort] = useState("name");
  const [error, setError] = useState<string | null>(null); const [message, setMessage] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [incoming, setIncoming] = useState<{ contacts: ContactData[]; warnings: string[] } | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const categories = [...new Set(contacts.flatMap(c => c.data.categories))].sort(); const tags = [...new Set(contacts.flatMap(c => c.data.tags))].sort();
  const filtered = contacts.filter(c => {
    const q = query.trim().toLocaleLowerCase(); const digits = phoneKey(q);
    const matches = [contactName(c.data), ...c.data.phones, c.data.relationship, c.data.profession, c.data.activity, c.data.description, ...c.data.tags, ...c.data.categories].join(" ").toLocaleLowerCase().includes(q) || digits.length >= 3 && c.data.phones.some(p => phoneKey(p).includes(digits));
    return (!category || c.data.categories.includes(category)) && (!tag || c.data.tags.includes(tag)) && matches;
  }).sort((a, b) => sort === "recent" ? b.updated_at.localeCompare(a.updated_at) : sort === "birthday" ? (a.data.birth_date?.slice(5) ?? "99").localeCompare(b.data.birth_date?.slice(5) ?? "99") : contactName(a.data).localeCompare(contactName(b.data), "ru"));
  async function remove(c: Contact) {
    setBusy(true); setError(null);
    try { await api(`/contacts/${c.id}`, { method: "DELETE", body: { revision: c.revision, events: deleteEvents } }); setDeleting(null); source.retry(); setMessage("Контакт удалён."); }
    catch (failure) { setError(errorMessage(failure)); } finally { setBusy(false); }
  }
  async function readFile(value: File) {
    setError(null); setMessage(null);
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
    <div className="space-y-3"><FormField id="contact-search" label="Поиск контактов"><Input id="contact-search" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Имя, телефон, профессия…" /></FormField><details className="rounded-xl border border-border p-3"><summary className="cursor-pointer text-sm">Фильтры и сортировка</summary><div className="mt-3 grid gap-3 sm:grid-cols-3"><FormField id="contact-category-filter" label="Категория контактов"><Select id="contact-category-filter" value={category} onChange={e => setCategory(e.target.value)}><option value="">Все категории</option>{categories.map(c => <option key={c}>{c}</option>)}</Select></FormField><FormField id="contact-tag-filter" label="Тег контактов"><Select id="contact-tag-filter" value={tag} onChange={e => setTag(e.target.value)}><option value="">Все теги</option>{tags.map(c => <option key={c}>{c}</option>)}</Select></FormField><FormField id="contact-sort" label="Сортировка контактов"><Select id="contact-sort" value={sort} onChange={e => setSort(e.target.value)}><option value="name">По имени</option><option value="birthday">По месяцу рождения</option><option value="recent">Недавно изменённые</option></Select></FormField></div></details></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-primary">{message}</p>}
    {source.resource.status === "loading" ? <LoadingState /> : source.resource.status === "error" ? <ErrorState message={source.resource.message} retry={source.retry} /> : !filtered.length ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><BookUser className="mx-auto mb-3 size-8 text-primary" /><p>{contacts.length ? "Нет контактов с такими условиями поиска." : "Добавьте первого человека или импортируйте контакты."}</p></div> : <><p className="text-sm text-muted-foreground">Показано {filtered.length} из {contacts.length}</p><div className="grid gap-4 md:grid-cols-2">{filtered.map(c => <article key={c.id} className="min-w-0 space-y-3 rounded-2xl border border-border bg-card p-5"><h2 className="break-words text-lg font-semibold">{contactName(c.data)}</h2>{c.data.birth_date && <p className="text-sm">День рождения: {dateLabel(c.data.birth_date, { day: "numeric", month: "long", year: "numeric" })}</p>}{c.data.birthday_enabled && <p className="text-xs text-primary">{c.data.birth_date ? "День рождения связан с отсчётами" : "День рождения приостановлен: укажите дату"}</p>}{c.data.phones.map(phone => <p key={phone} className="break-words text-sm">{phone}</p>)}{[c.data.relationship, c.data.profession, c.data.activity].filter(Boolean).map((s, i) => <p key={i} className="break-words text-sm text-muted-foreground">{s}</p>)}{c.data.description && <details><summary className="cursor-pointer text-sm">Описание контакта</summary><Markdown value={c.data.description} allowImages={false} /></details>}<div className="flex flex-wrap gap-2">{c.data.categories.map(t => <span key={`category-${t}`} className="max-w-full break-words rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{t}</span>)}{c.data.tags.map(t => <span key={`tag-${t}`} className="max-w-full break-words rounded-full bg-muted px-3 py-1 text-xs">#{t}</span>)}</div>{c.data.source_keys.length > 0 && <p className="text-xs text-muted-foreground">Импортирован · обновление доступно при повторном импорте</p>}<div className="flex flex-wrap gap-2"><Link className="inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-sm" to={`/countdowns?contact=${c.id}`}>События контакта</Link><Button variant="outline" size="sm" disabled={busy} onClick={() => setEditor(c)}>Изменить контакт</Button><Button variant="outline" size="sm" disabled={busy} onClick={() => { setDeleting(c); setDeleteEvents("keep"); setError(null); }}>Удалить контакт</Button></div></article>)}</div></>}
    {deleting && <Dialog title="Удалить контакт" onClose={() => { if (!busy) setDeleting(null); }}><div className="space-y-4"><p className="break-words">Удалить «{contactName(deleting.data)}» безвозвратно?</p><FormField id="contact-delete-events" label="Что сделать со связанными событиями"><Select id="contact-delete-events" disabled={busy} value={deleteEvents} onChange={e => setDeleteEvents(e.target.value)}><option value="keep">Сохранить как самостоятельные события</option><option value="delete">Удалить связанные события</option></Select></FormField><p className="text-xs text-muted-foreground">При сохранении события получают зашифрованный снимок сведений на момент удаления. Остальные контакты и события сохранятся.</p>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button disabled={busy} onClick={() => void remove(deleting)}>{busy ? "Удаляем…" : "Подтвердить удаление контакта"}</Button></div></Dialog>}
    {editor && <ContactEditor contact={editor === "new" ? undefined : editor} close={() => setEditor(null)} saved={() => { setEditor(null); source.retry(); setMessage("Контакт сохранён."); }} />}
    {incoming && <ContactImport contacts={contacts} incoming={incoming.contacts} warnings={incoming.warnings} close={() => setIncoming(null)} saved={message => { setIncoming(null); source.retry(); setMessage(message); }} />}
    {taxonomy && <Labels contacts={contacts} close={() => setTaxonomy(false)} saved={() => { setTaxonomy(false); setCategory(""); setTag(""); source.retry(); setMessage("Метки обновлены."); }} />}
  </main>;
}
