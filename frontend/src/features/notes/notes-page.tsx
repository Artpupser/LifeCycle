import { FolderPlus, NotebookPen, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { AiVisibility, type AiAccess } from "@/components/ai-visibility";
import { Dialog } from "@/components/dialog";
import { FormField } from "@/components/form-field";
import { Markdown, MarkdownEditor } from "@/components/markdown";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { useResource } from "@/hooks/use-resource";
import { api, errorMessage } from "@/lib/api";

export type Folder = { id: string; name: string; color: string };
export type NoteInput = { title: string; content: string; tags: string[]; color: string; folder_id: string | null };
type Note = NoteInput & AiAccess & { id: string; updated_at: string };
const emptyNote = (folder: string): NoteInput => ({ title: "", content: "", tags: [], color: "#2A9D8F", folder_id: folder || null });

export function NoteEditor({ initial, folders, saved, close, submitDraft }: { initial: NoteInput & { id?: string }; folders: Folder[]; saved: () => void; close: () => void; submitDraft?: (value: NoteInput) => Promise<void> }) {
  const [value, setValue] = useState(initial);
  const [tags, setTags] = useState(initial.tags.join(", "));
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    const body: NoteInput = { title: value.title.trim(), content: value.content, color: value.color, folder_id: value.folder_id, tags: [...new Set(tags.split(",").map((tag) => tag.trim()).filter(Boolean))] };
    try { await (submitDraft ? submitDraft(body) : api(initial.id ? `/notes/${initial.id}` : "/notes", { method: initial.id ? "PUT" : "POST", body })); saved(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Dialog title={initial.id ? "Редактировать заметку" : "Новая заметка"} onClose={close}><form onSubmit={(event) => void submit(event)} className="space-y-5"><fieldset disabled={busy} className="space-y-5"><FormField id="note-title" label="Название заметки"><Input id="note-title" autoFocus required maxLength={200} value={value.title} onChange={(event) => setValue({ ...value, title: event.target.value })} /></FormField><div className="grid gap-4 sm:grid-cols-2"><FormField id="note-folder" label="Папка"><Select id="note-folder" value={value.folder_id ?? ""} onChange={(event) => setValue({ ...value, folder_id: event.target.value || null })}><option value="">Без папки</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</Select></FormField><FormField id="note-color" label="Цвет заметки"><Input id="note-color" type="color" value={value.color} onChange={(event) => setValue({ ...value, color: event.target.value })} /></FormField></div><FormField id="note-tags" label="Теги заметки" hint="Через запятую, до 30 тегов по 64 символа."><Input id="note-tags" value={tags} maxLength={1950} onChange={(event) => setTags(event.target.value)} /></FormField><FormField id="note-content" label="Содержание"><MarkdownEditor id="note-content" value={value.content} onChange={(content) => setValue((current) => ({ ...current, content }))} onUploading={setUploading} /></FormField></fieldset>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap gap-3"><Button type="submit" disabled={busy || uploading}>{busy ? "Сохраняем…" : "Сохранить заметку"}</Button><Button variant="outline" onClick={close} disabled={busy || uploading}>Отмена</Button></div></form></Dialog>;
}

function FolderEditor({ initial, saved, close }: { initial: { id?: string; name: string; color: string }; saved: () => void; close: () => void }) {
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await api(initial.id ? `/notes/folders/${initial.id}` : "/notes/folders", { method: initial.id ? "PUT" : "POST", body: { name: value.name.trim(), color: value.color } }); saved(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Dialog title={initial.id ? "Редактировать папку" : "Новая папка"} onClose={close}><form className="space-y-5" onSubmit={(event) => void submit(event)}><FormField id="folder-name" label="Название папки"><Input id="folder-name" required autoFocus maxLength={100} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} /></FormField><FormField id="folder-color" label="Цвет папки"><Input id="folder-color" type="color" value={value.color} onChange={(event) => setValue({ ...value, color: event.target.value })} /></FormField>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<Button type="submit" disabled={busy}>{busy ? "Сохраняем…" : "Сохранить папку"}</Button></form></Dialog>;
}

export function NotesPage() {
  const [query, setQuery] = useState("");
  const [folderId, setFolderId] = useState("");
  const [editor, setEditor] = useState<(NoteInput & { id?: string }) | null>(null);
  const [folderEditor, setFolderEditor] = useState<{ id?: string; name: string; color: string } | null>(null);
  const [selected, setSelected] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const folders = useResource<Folder[]>("/notes/folders");
  const params = new URLSearchParams({ q: query, ...(folderId ? { folder_id: folderId } : {}) });
  const notes = useResource<Note[]>(`/notes?${params}`);
  const folderList = folders.resource.status === "ready" ? folders.resource.data : [];
  const currentFolder = folderList.find((item) => item.id === folderId);
  async function remove(path: string) {
    if (!window.confirm(path.includes("/folders/") ? "Удалить папку безвозвратно? Заметки сохранятся без папки." : "Удалить заметку безвозвратно?")) return;
    setBusy(true); setError(null);
    try { await api(path, { method: "DELETE" }); setSelected(null); if (path.includes("/folders/")) { setFolderId(""); folders.retry(); } notes.retry(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><p className="mb-2 text-sm text-primary">Записывайте важное</p><h1 className="text-3xl font-semibold">Заметки</h1><p className="mt-3 text-sm text-muted-foreground">Тексты, изображения и идеи в ваших папках.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setFolderEditor({ name: "", color: "#2A9D8F" })}><FolderPlus aria-hidden="true" />Новая папка</Button><Button onClick={() => setEditor(emptyNote(folderId))}><Plus aria-hidden="true" />Новая заметка</Button></div></header><div className="grid gap-4 sm:grid-cols-2"><FormField id="notes-search" label="Поиск заметок"><div className="relative"><Search className="absolute left-3 top-3.5 size-4 text-muted-foreground" aria-hidden="true" /><Input id="notes-search" className="pl-9" type="search" maxLength={200} placeholder="Название или текст" value={query} onChange={(event) => setQuery(event.target.value)} /></div></FormField><FormField id="notes-folder-filter" label="Папка заметок"><Select id="notes-folder-filter" value={folderId} onChange={(event) => setFolderId(event.target.value)}><option value="">Все папки</option>{folderList.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}</Select></FormField></div>{folders.resource.status === "error" && <ErrorState message={folders.resource.message} retry={folders.retry} />}{currentFolder && <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"><span className="size-3 rounded-full" style={{ backgroundColor: currentFolder.color }} /><span className="mr-auto font-medium">{currentFolder.name}</span><Button size="sm" variant="outline" onClick={() => setFolderEditor(currentFolder)}><Pencil aria-hidden="true" />Изменить папку</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void remove(`/notes/folders/${currentFolder.id}`)}><Trash2 aria-hidden="true" />Удалить папку</Button><p className="w-full text-xs text-muted-foreground">При удалении папки заметки сохранятся без папки.</p></div>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notes.resource.status === "loading" ? <LoadingState /> : notes.resource.status === "error" ? <ErrorState message={notes.resource.message} retry={notes.retry} /> : notes.resource.data.length === 0 ? <div className="rounded-2xl border border-dashed border-border p-10 text-center"><NotebookPen className="mx-auto mb-4 size-8 text-primary" aria-hidden="true" /><p>{query ? "Заметки не найдены." : "Здесь появятся ваши заметки."}</p></div> : <div className="grid items-start gap-4 md:grid-cols-2">{notes.resource.data.map((note) => <article key={note.id} className="min-w-0 rounded-2xl border border-border border-t-4 bg-card p-5" style={{ borderTopColor: note.color }}><button className="mb-3 block w-full break-words text-left text-lg font-semibold hover:text-primary focus-visible:outline-ring" onClick={() => setSelected(note)}>{note.title}</button><AiVisibility kind="notes" id={note.id} title={note.title} access={note} saved={(next) => { notes.mutate((items) => items.map((n) => n.id === note.id ? { ...n, ...next } : n)); setSelected((current) => current?.id === note.id ? { ...current, ...next } : current); }} />{note.tags.length > 0 && <div className="mb-4 flex flex-wrap gap-2">{note.tags.map((tag) => <span key={tag} className="rounded-md bg-muted px-2 py-1 text-xs">#{tag}</span>)}</div>}<div className="max-h-48 overflow-hidden"><Markdown value={note.content} /></div><div className="mt-5 flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => setEditor(note)}><Pencil aria-hidden="true" />Редактировать</Button><Button size="sm" variant="outline" disabled={busy} onClick={() => void remove(`/notes/${note.id}`)}><Trash2 aria-hidden="true" />Удалить</Button></div></article>)}</div>}{selected && <Dialog title={selected.title} onClose={() => setSelected(null)}><Markdown value={selected.content} /><Button className="mt-5" onClick={() => { setEditor(selected); setSelected(null); }}>Редактировать заметку</Button></Dialog>}{editor && <NoteEditor initial={editor} folders={folderList} close={() => setEditor(null)} saved={() => { setEditor(null); setSelected(null); notes.retry(); }} />}{folderEditor && <FolderEditor initial={folderEditor} close={() => setFolderEditor(null)} saved={() => { setFolderEditor(null); folders.retry(); }} />}</main>;
}
