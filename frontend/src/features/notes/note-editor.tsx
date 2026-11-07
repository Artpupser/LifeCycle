import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton,SaveForm} from "@/components/ui/save";
import { formatLabels } from "@/systems/labels/values";
import { t, useLanguage } from "@/systems/i18n/locale";
import { LabelInput,TagChip } from "@/systems/labels/inputs";
import { normalizeLabels } from "@/features/planning/types";
import {useEffect,useState,type FormEvent} from "react";
import {X} from "@/components/icons";
import {SubjectLabels} from "@/systems/labels/functional";
import type {AiAccess} from "@/systems/labels/context";
import {Dialog} from "@/components/dialog";
import {FormField} from "@/components/form-field";
import {MarkdownEditor} from "@/components/markdown";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {api,errorMessage} from "@/lib/api";
import {confirmAction,notify} from "@/lib/feedback";
import type {Folder,Note,NoteInput} from "./note-types";
function input(value:NoteInput):NoteInput{return {title:value.title,content:value.content,tags:value.tags,color:value.color,folder_id:value.folder_id};}
export function NoteEditor({initial,folders,saved,close,submitDraft,embedded=false,dirtyChanged}:{initial:NoteInput&{id?:string;ai_shared?:boolean;ai_access_revision?:number};folders:Folder[];saved:(note?:Note)=>void;close:()=>void;submitDraft?:(value:NoteInput)=>Promise<void>;embedded?:boolean;dirtyChanged?:(dirty:boolean)=>void;accessChanged?:(next:AiAccess)=>void}) {
  useLanguage();
  const [value,setValue]=useState(()=>input(initial));const [tags,setTags]=useState(formatLabels(initial.tags));
  const [baseline,setBaseline]=useState(()=>JSON.stringify(input(initial)));
  const [tab,setTab]=useState<"content"|"properties">("content");
  const [busy,setBusy]=useState(false);const [uploading,setUploading]=useState(false);const [error,setError]=useState<string|null>(null);
  const body={...value,title:value.title.trim(),tags:normalizeLabels(tags)};
  const dirty=JSON.stringify(body)!==baseline;
  useEffect(()=>{dirtyChanged?.(dirty);},[dirty,dirtyChanged]);
  async function requestClose(){if(busy||uploading)return;if(dirty&&!await confirmAction({title:t("Несохранённые изменения"),message:t("Закрыть заметку без сохранения изменений?"),confirmLabel:t("Закрыть без сохранения"),destructive:true}))return;close();}
  async function submit(event:FormEvent){event.preventDefault();setBusy(true);setError(null);try{let note:Note|undefined;if(submitDraft)await submitDraft(body);else note=await api<Note>(initial.id?`/notes/${initial.id}`:"/notes",{method:initial.id?"PUT":"POST",body});setBaseline(JSON.stringify(body));notify(t("Заметка сохранена"));saved(note);}catch(failure){const message=errorMessage(failure);setError(message);notify(message,"error");}finally{setBusy(false);}}
  const form=<SaveForm onSubmit={event=>void submit(event)} className={`flex min-h-0 flex-1 flex-col ${embedded?"h-full":"max-h-[75svh]"}`}><div className="shrink-0 space-y-4 border-b border-border p-5"><div className="flex items-start justify-between gap-3 [&>div:first-child]:min-w-0 [&>div:first-child]:flex-1"><FormField id="note-title" label={t("Название заметки")}><Input id="note-title" autoFocus required disabled={busy} maxLength={200} value={value.title} onChange={event=>setValue(current=>({...current,title:event.target.value}))}/></FormField>{embedded&&<Button variant="ghost" size="icon" aria-label={t("Закрыть редактор заметки")} disabled={busy||uploading} onClick={()=>void requestClose()}><X/></Button>}</div><div className="flex gap-2" role="tablist" aria-label={t("Разделы заметки")}><Button size="sm" role="tab" aria-selected={tab==="content"} aria-controls="note-content-panel" variant={tab==="content"?"default":"ghost"} onClick={()=>setTab("content")}>{t("Содержание")}</Button><Button size="sm" role="tab" aria-selected={tab==="properties"} aria-controls="note-properties-panel" variant={tab==="properties"?"default":"ghost"} onClick={()=>setTab("properties")}>{t("Характеристики")}</Button></div></div><div className="workspace-scroll min-h-0 flex-1 overflow-y-auto p-5"><fieldset disabled={busy} className="min-w-0 space-y-5">{tab==="content"?<section id="note-content-panel" role="tabpanel" aria-label={t("Содержание заметки")} className="space-y-5 [&_textarea]:min-h-[42svh] [&_textarea]:resize-y"><FormField id="note-content" label={t("Содержание")}><MarkdownEditor id="note-content" value={value.content} onChange={content=>setValue(current=>({...current,content}))} onUploading={setUploading}/></FormField><FormField id="note-tags" label={t("Теги заметки")}><LabelInput id="note-tags" value={tags} change={setTags}/></FormField></section>:<section id="note-properties-panel" role="tabpanel" aria-label={t("Характеристики заметки")} className="space-y-5"><FormField id="note-folder" label={t("Папка")}><ChoiceField id="note-folder" value={value.folder_id??""} change={next=>setValue(current=>({...current,folder_id:next||null}))}><option value="">{t("Без папки")}</option>{folders.map(folder=><option key={folder.id} value={folder.id}>{folder.name}</option>)}</ChoiceField></FormField><FormField id="note-color" label={t("Цвет заметки")}><Input id="note-color" type="color" value={value.color} onChange={event=>setValue(current=>({...current,color:event.target.value}))}/></FormField></section>}</fieldset></div><footer className="shrink-0 space-y-3 border-t border-border bg-card p-4">{initial.id&&<SubjectLabels manage={!submitDraft} tagsChanged={tags=>{setTags(formatLabels(tags));setBaseline(current=>JSON.stringify({...JSON.parse(current),tags}));}} subject={{kind:"notes",id:initial.id}}>{normalizeLabels(tags).map(name=><TagChip key={name} name={name}/>)}</SubjectLabels>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap items-center gap-3"><span className="mr-auto text-xs text-muted-foreground">{dirty?t("Есть несохранённые изменения"):t("Сохранено")}</span><Button variant="outline" disabled={busy||uploading} onClick={()=>void requestClose()}>{t("Закрыть")}</Button><SaveButton type="submit" disabled={busy||uploading}>{busy?t("Сохраняем…"):t("Сохранить заметку")}</SaveButton></div></footer></SaveForm>;
  return embedded?<aside role="region" aria-label={t("Редактор заметки")} className="fixed inset-0 z-50 flex min-h-0 flex-col border-l border-border bg-card shadow-xl lg:static lg:z-auto lg:min-w-0 lg:flex-1 lg:rounded-2xl lg:border lg:shadow-sm">{form}</aside>:<Dialog title={initial.id?t("Редактировать заметку"):t("Новая заметка")} onClose={()=>void requestClose()}>{form}</Dialog>;
}
