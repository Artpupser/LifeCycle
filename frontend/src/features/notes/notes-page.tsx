import {defaultItemColor} from "@/systems/themes/themes";
import {SaveButton,SaveForm} from "@/components/ui/save";
import {EntitySelectionArea,SelectionItem} from "@/systems/selection/entities";
import {SelectionGesture} from "@/systems/selection/gestures";
import {useSelection} from "@/systems/selection/state";
import {SelectionActions} from "@/systems/selection/selection";
import {selectionMenuActions} from "@/systems/selection/actions";
import type {ContextAction} from "@/systems/actions/context";
import {SubjectLabels} from "@/systems/labels/functional";
import {ObjectActions} from "@/systems/actions/action-menu";
import { t, useLanguage } from "@/systems/i18n/locale";
import { TagChip } from "@/systems/labels/inputs";
import {FolderPlus,NotebookPen,Pencil,Plus,Trash2,X} from "@/components/icons";
import {useState,type FormEvent} from "react";
import {Dialog} from "@/components/dialog";
import {FormField} from "@/components/form-field";
import {Markdown} from "@/components/markdown";
import {ErrorState,LoadingState} from "@/components/resource-state";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {FilterSearch} from "@/components/filter-search";
import {useResource} from "@/hooks/use-resource";
import {api,errorMessage} from "@/lib/api";
import {confirmAction,notify} from "@/lib/feedback";
import {parseFilterQuery,matchesFilter,filterValue,tagFilter,aiFilter,type FilterSpec} from "@/lib/filter-query";
import {localDate} from "@/lib/dates";
import {usePreferences} from "@/features/settings/preferences-context";
import {NoteEditor} from "./note-editor";
import {NotesBulkDialog,type BulkKind} from "./notes-bulk-dialog";
import {emptyNote,type Folder,type Note,type NoteSelection} from "./note-types";
export {NoteEditor} from "./note-editor";
export type {Folder,NoteInput} from "./note-types";
const specs:FilterSpec[]=[tagFilter,aiFilter,{key:"folder",aliases:["папка"],get label() { return t("Папка"); },example:'папка:"Идеи"'},{key:"color",aliases:["цвет"],get label() { return t("Цвет"); },example:"цвет:#2A9D8F"},{key:"from",aliases:["с"],get label() { return t("Обновлены с"); },example:"с:2026-11-01"},{key:"to",aliases:["по"],get label() { return t("Обновлены по"); },example:"по:2026-11-30"}];
export function NotesPage(){
  useLanguage();const [foldersOpen,setFoldersOpen]=useState(false);
 const {settings}=usePreferences();const [query,setQuery]=useState("");const filters=parseFilterQuery(query,specs);
 const [editor,setEditor]=useState<Note|null>(null);const [dirty,setDirty]=useState(false);
 const [folderEditor,setFolderEditor]=useState<{id?:string;name:string;color:string}|null>(null);
 const [creating,setCreating]=useState(false);const [title,setTitle]=useState("");const [bulk,setBulk]=useState<BulkKind|null>(null);
 const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 const folders=useResource<Folder[]>("/notes/folders");const notes=useResource<Note[]>("/notes");
 const folderList=folders.resource.status==="ready"?folders.resource.data:[];
 const folderFilter=filterValue(filters,"folder");const currentFolder=folderList.find(item=>[item.id,item.name.toLocaleLowerCase()].includes(folderFilter.toLocaleLowerCase()));
 const visible=notes.resource.status==="ready"?notes.resource.data.filter(note=>{const folder=folderList.find(item=>item.id===note.folder_id);const date=localDate(settings.timezone, note.updated_at);return matchesFilter(filters,`${note.title} ${note.content}`,{tag:note.tags,ai:note.ai_shared,folder:folder?[folder.id,folder.name]:["без","без папки","none"],color:note.color,from:date,to:date});}):[];
 const selection=useSelection({items:visible,itemKey:(note:Note)=>note.id,scope:query,limit:200});
 const checked:NoteSelection=Object.fromEntries(selection.selected.map(note=>[note.id,{updated_at:note.updated_at,ai_access_revision:note.ai_access_revision}]));
 function changeQuery(value:string){setQuery(value);selection.clear();}
 async function open(note:Note){if(editor?.id!==note.id&&dirty&&!await confirmAction({title:t("Несохранённые изменения"),message:t("Открыть другую заметку без сохранения текущих изменений?"),confirmLabel:t("Открыть без сохранения"),destructive:true}))return;setCreating(false);setDirty(false);setEditor(note);}
 function close(){setEditor(null);setDirty(false);}
 async function quickCreate(event:FormEvent){event.preventDefault();if(busy||!title.trim())return;setBusy(true);setError(null);try{await api<Note>("/notes",{method:"POST",body:{...emptyNote(currentFolder?.id??""),title:title.trim()}});setTitle("");notes.refresh();notify(t("Заметка создана"));}catch(failure){const message=errorMessage(failure);setError(message);notify(message,"error");}finally{setBusy(false);}}
 async function remove(path:string){if(!await confirmAction({title:path.includes("/folders/")?t("Удалить папку"):t("Удалить заметку"),message:path.includes("/folders/")?t("Удалить папку безвозвратно? Заметки сохранятся без папки."):t("Удалить заметку безвозвратно?"),confirmLabel:t("Удалить"),destructive:true}))return;setBusy(true);setError(null);try{await api(path,{method:"DELETE"});if(path===`/notes/${editor?.id}`)close();folders.refresh();notes.refresh();selection.clear();notify(t("Удалено"));}catch(failure){setError(errorMessage(failure));}finally{setBusy(false);}}
 async function openBulk(kind:BulkKind){if(editor&&editor.id in checked&&dirty&&!await confirmAction({title:t("Несохранённые изменения"),message:t("Массовое действие затронет открытую заметку. Продолжить без сохранения черновика?"),confirmLabel:t("Продолжить"),destructive:true}))return;setBulk(kind);}
 function bulkSaved(){if(editor&&editor.id in checked)close();setBulk(null);selection.clear();notes.refresh();}
 const bulkActions:ContextAction[]=[{id:"bulk-notes",label:t("Действия с выбранными заметками"),disabled:busy||!selection.count,run:()=>{},children:([["move",t("Переместить")],["tags_add",t("Добавить теги")],["tags_remove",t("Убрать теги")],["color",t("Цвет")],["ai_on",t("Разрешить AI")],["ai_off",t("Закрыть AI")],["delete",t("Удалить")]] as [BulkKind,string][]).map(([kind,label])=>({id:kind,label,disabled:busy||!selection.count,danger:kind==="delete",run:()=>void openBulk(kind)}))}];
 return <main data-layout="workspace" data-action-subject="notes-list" tabIndex={0} id="main" className="flex h-full min-h-0 flex-col gap-4"><header className="flex shrink-0 flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">{t("Заметки")}</h1><p className="mt-1 text-sm text-muted-foreground">{t("Быстро записывайте идеи и продолжайте работать с текстом справа.")}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={()=>setFoldersOpen(true)}>{t("Папки")}</Button>{foldersOpen&&<Dialog title={t("Папки")} onClose={()=>setFoldersOpen(false)}><EntitySelectionArea items={folderList} itemKey={folder=>folder.id} refresh={()=>{folders.refresh();notes.refresh();}} disabled={busy} remove={folder=>api(`/notes/folders/${folder.id}`,{method:"DELETE"})} removeMessage={t("Удалить выбранные папки? Заметки сохранятся без папок.")}><div className="space-y-2"><Button size="sm" className="w-full justify-start" variant="ghost" onClick={()=>{setFoldersOpen(false);setFolderEditor({name:"",color:defaultItemColor});}}><FolderPlus/>{t("Новая папка")}</Button>{folderList.map(folder=><SelectionItem key={folder.id} id={folder.id}><div data-action-subject="folder" className="flex items-center gap-1 rounded-lg p-1 hover:bg-muted"><button className="flex min-w-0 flex-1 items-center gap-2 px-2 text-left text-sm" onClick={()=>{changeQuery(`папка:${JSON.stringify(folder.name)}`);setFoldersOpen(false);}}><span className="size-2 shrink-0 rounded-full" style={{backgroundColor:folder.color}}/><span className="truncate">{folder.name}</span></button><ObjectActions><Button size="icon" variant="ghost" aria-label={t("Изменить папку {v0}", {v0: folder.name})} onClick={()=>{setFoldersOpen(false);setFolderEditor(folder);}}><Pencil/></Button><Button size="icon" variant="ghost" disabled={busy} aria-label={t("Удалить папку {v0}", {v0: folder.name})} onClick={()=>{setFoldersOpen(false);void remove(`/notes/folders/${folder.id}`);}}><Trash2/></Button></ObjectActions></div></SelectionItem>)}</div></EntitySelectionArea></Dialog>}<Button onClick={()=>setCreating(true)}><Plus/>{t("Новая заметка")}</Button></div></header>
 <div className="flex shrink-0 items-start gap-3"><FilterSearch label={t("Поиск заметок")} value={query} change={changeQuery} specs={specs}/><SelectionActions selection={selection} disabled={busy} actions={bulkActions}/></div>
 {creating&&<form aria-label={t("Быстрое создание заметки")} onSubmit={event=>void quickCreate(event)} className="flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-card p-3"><Input className="min-w-40 flex-1" autoFocus required maxLength={200} aria-label={t("Название новой заметки")} placeholder={t("Название заметки…")} value={title} readOnly={busy} onChange={event=>setTitle(event.target.value)} onKeyDown={event=>{if(event.key==="Escape"){setCreating(false);setTitle("");}}}/><Button type="submit" disabled={busy||!title.trim()}>{t("Создать")}</Button><Button size="icon" variant="ghost" disabled={busy} aria-label={t("Закрыть быстрое создание заметки")} onClick={()=>{setCreating(false);setTitle("");}}><X/></Button></form>}
 {folders.resource.status==="error"&&<ErrorState message={folders.resource.message} retry={folders.retry}/>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}
 <div className="flex min-h-0 flex-1 gap-4"><SelectionGesture selection={selection} items={visible} itemKey={note=>note.id} scope={query} disabled={busy||!!bulk} className={`contents`}><section aria-label={t("Список заметок")} className={`workspace-scroll min-h-0 min-w-0 overflow-y-auto pb-4 ${editor?"w-full shrink-0 lg:w-80 xl:w-96":"flex-1"}`}>{notes.resource.status==="loading"?<LoadingState/>:notes.resource.status==="error"?<ErrorState message={notes.resource.message} retry={notes.retry}/>:!visible.length?<div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground"><NotebookPen className="mx-auto mb-4 size-8"/><p>{query?t("Заметки не найдены."):t("Здесь появятся ваши заметки.")}</p></div>:<div className={`grid items-start gap-3 ${editor?"grid-cols-1":"grid-cols-1 md:grid-cols-2 xl:grid-cols-3"}`}>{visible.map(note=><article key={note.id} data-selection-key={note.id} data-selected={selection.has(note)||undefined} className={`min-w-0 rounded-xl border border-t-4 bg-card p-4 data-[selected=true]:ring-2 data-[selected=true]:ring-primary ${editor?.id===note.id?"border-primary ring-1 ring-primary/20":"border-border"}`} style={{borderTopColor:note.color}}><div className="mb-2 flex items-start gap-3"><button className="min-w-0 flex-1 break-words text-left font-semibold hover:text-primary" onClick={()=>void open(note)}>{note.title}</button><ObjectActions actions={selectionMenuActions(selection,{item:note,disabled:busy,actions:bulkActions})} subject={{kind:"notes",id:note.id}} label={t("Действия заметки {v0}", {v0:note.title})}><Button className="w-full justify-start" size="sm" variant="ghost" onClick={()=>void open(note)}>{t("Редактировать")}</Button><Button className="w-full justify-start text-destructive" size="sm" variant="ghost" disabled={busy} onClick={()=>void remove(`/notes/${note.id}`)}>{t("Удалить заметку")}</Button></ObjectActions></div><div className="pointer-events-none max-h-24 overflow-hidden text-muted-foreground"><Markdown value={note.content} allowImages={false}/></div><SubjectLabels subject={{kind:"notes",id:note.id}} className="mt-3 text-xs text-muted-foreground">{note.tags.map(tag=><TagChip key={tag} name={tag}/>)}</SubjectLabels></article>)}</div>}</section></SelectionGesture>{editor&&<NoteEditor key={editor.id} initial={editor} folders={folderList} embedded close={close} dirtyChanged={setDirty} saved={note=>{if(note)setEditor(note);notes.refresh();selection.remove([editor.id]);}} accessChanged={next=>{setEditor(current=>current?{...current,...next}:current);notes.refresh();selection.remove([editor.id]);}}/>}</div>
 {folderEditor&&<FolderEditor initial={folderEditor} close={()=>setFolderEditor(null)} saved={()=>{setFolderEditor(null);folders.refresh();}}/>}{bulk&&<NotesBulkDialog kind={bulk} selection={checked} folders={folderList} close={()=>setBulk(null)} saved={bulkSaved}/>}</main>;
}
function FolderEditor({ initial, saved, close }: { initial: { id?: string; name: string; color: string }; saved: () => void; close: () => void }) {
  useLanguage();
  const [value, setValue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(null);
    try { await api(initial.id ? `/notes/folders/${initial.id}` : "/notes/folders", { method: initial.id ? "PUT" : "POST", body: { name: value.name.trim(), color: value.color } }); saved(); }
    catch (failure) { setError(errorMessage(failure)); }
    finally { setBusy(false); }
  }
  return <Dialog title={initial.id ? t("Редактировать папку") : t("Новая папка")} onClose={close}><SaveForm className="space-y-5" onSubmit={(event) => void submit(event)}><FormField id="folder-name" label={t("Название папки")}><Input id="folder-name" required autoFocus maxLength={100} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} /></FormField><FormField id="folder-color" label={t("Цвет папки")}><Input id="folder-color" type="color" value={value.color} onChange={(event) => setValue({ ...value, color: event.target.value })} /></FormField>{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<SaveButton type="submit" disabled={busy}>{busy ? t("Сохраняем…") : t("Сохранить папку")}</SaveButton></SaveForm></Dialog>;
}
