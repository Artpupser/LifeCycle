import { t, useLanguage } from "@/systems/i18n/locale";
import { LabelInput } from "@/systems/labels/inputs";
import { normalizeLabels } from "@/features/planning/types";
import {useState} from "react";
import {Dialog} from "@/components/dialog";
import {FormField} from "@/components/form-field";
import {Input,Select} from "@/components/ui/input";
import {Button} from "@/components/ui/button";
import {useAction} from "@/hooks/use-action";
import {api} from "@/lib/api";
import {confirmAction,notify} from "@/lib/feedback";
import type {Folder,NoteSelection} from "./note-types";
export type BulkKind="move"|"tags_add"|"tags_remove"|"color"|"delete"|"ai_on"|"ai_off";
export function NotesBulkDialog({kind,selection,folders,close,saved}:{kind:BulkKind;selection:NoteSelection;folders:Folder[];close:()=>void;saved:()=>void}){
  useLanguage();
 const [folder,setFolder]=useState("");const [tags,setTags]=useState("");const [color,setColor]=useState("#2a9d8f");const action=useAction();
 const labels:Record<BulkKind,string>={move:t("Переместить заметки"),tags_add:t("Добавить теги"),tags_remove:t("Убрать теги"),color:t("Изменить цвет заметок"),delete:t("Удалить выбранные заметки"),ai_on:t("Разрешить AI выбранным"),ai_off:t("Закрыть доступ AI")};const count=Object.keys(selection).length;
 async function apply(){
  const sharing=kind==="ai_on"||kind==="ai_off";
  if((sharing||kind==="delete")&&!await confirmAction({title:labels[kind],message:kind==="delete"?t("Безвозвратно удалить заметки ({v0})? Их содержимое будет удалено.", {v0: count}):t("{v0} доступ AI к заметкам ({v1})? Ранее переданные провайдеру данные не удаляются при отзыве.", {v0: kind==="ai_on"?t("Разрешить"):t("Закрыть"), v1: count}),confirmLabel:kind==="delete"?t("Удалить заметки"):t("Применить"),destructive:kind==="delete"}))return;
  await action.run(async()=>{if(sharing)await api("/notes/ai-access",{method:"PUT",body:{items:Object.entries(selection).map(([id,value])=>({id,revision:value.ai_access_revision})),ai_shared:kind==="ai_on",confirmed:true}});else await api("/notes/bulk",{method:"POST",body:{items:Object.entries(selection).map(([id,value])=>({id,updated_at:value.updated_at})),action:kind,folder_id:folder||null,tags:normalizeLabels(tags),color,confirmed:kind==="delete"}});},()=>{notify(t("Обновлено заметок: {v0}", {v0: count}));saved();});
 }
 return <Dialog title={t(labels[kind])} onClose={()=>{if(!action.busy)close();}}><form className="space-y-5" onSubmit={event=>{event.preventDefault();void apply();}}><p className="text-sm text-muted-foreground">{t("Выбрано заметок: ")}{count}{t(". Изменение применяется ко всему набору.")}</p>{kind==="move"&&<FormField id="bulk-note-folder" label={t("Новая папка")}><Select id="bulk-note-folder" value={folder} onChange={event=>setFolder(event.target.value)}><option value="">{t("Без папки")}</option>{folders.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>}{(kind==="tags_add"||kind==="tags_remove")&&<FormField id="bulk-note-tags" label={t("Теги")}><LabelInput id="bulk-note-tags" value={tags} change={setTags} required/></FormField>}{kind==="color"&&<FormField id="bulk-note-color" label={t("Новый цвет")}><Input id="bulk-note-color" type="color" value={color} onChange={event=>setColor(event.target.value)}/></FormField>}{action.error&&<p className="text-sm text-destructive" role="alert">{action.error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={action.busy} onClick={close}>{t("Отмена")}</Button><Button type="submit" disabled={action.busy}>{action.busy?t("Применяем…"):t("Применить к выбранным")}</Button></div></form></Dialog>;
}
