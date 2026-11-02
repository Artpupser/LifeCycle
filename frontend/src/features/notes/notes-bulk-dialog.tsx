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
 const [folder,setFolder]=useState("");const [tags,setTags]=useState("");const [color,setColor]=useState("#2a9d8f");const action=useAction();
 const labels:Record<BulkKind,string>={move:"Переместить заметки",tags_add:"Добавить теги",tags_remove:"Убрать теги",color:"Изменить цвет заметок",delete:"Удалить выбранные заметки",ai_on:"Разрешить AI выбранным",ai_off:"Закрыть доступ AI"};const count=Object.keys(selection).length;
 async function apply(){
  const sharing=kind==="ai_on"||kind==="ai_off";
  if((sharing||kind==="delete")&&!await confirmAction({title:labels[kind],message:kind==="delete"?`Безвозвратно удалить заметки (${count})? Их содержимое будет удалено.`:`${kind==="ai_on"?"Разрешить":"Закрыть"} доступ AI к заметкам (${count})? Ранее переданные провайдеру данные не удаляются при отзыве.`,confirmLabel:kind==="delete"?"Удалить заметки":"Применить",destructive:kind==="delete"}))return;
  await action.run(async()=>{if(sharing)await api("/notes/ai-access",{method:"PUT",body:{items:Object.entries(selection).map(([id,value])=>({id,revision:value.ai_access_revision})),ai_shared:kind==="ai_on",confirmed:true}});else await api("/notes/bulk",{method:"POST",body:{items:Object.entries(selection).map(([id,value])=>({id,updated_at:value.updated_at})),action:kind,folder_id:folder||null,tags:[...new Set(tags.split(",").map(tag=>tag.trim()).filter(Boolean))],color,confirmed:kind==="delete"}});},()=>{notify(`Обновлено заметок: ${count}`);saved();});
 }
 return <Dialog title={labels[kind]} onClose={()=>{if(!action.busy)close();}}><form className="space-y-5" onSubmit={event=>{event.preventDefault();void apply();}}><p className="text-sm text-muted-foreground">Выбрано заметок: {count}. Изменение применяется ко всему набору.</p>{kind==="move"&&<FormField id="bulk-note-folder" label="Новая папка"><Select id="bulk-note-folder" value={folder} onChange={event=>setFolder(event.target.value)}><option value="">Без папки</option>{folders.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</Select></FormField>}{(kind==="tags_add"||kind==="tags_remove")&&<FormField id="bulk-note-tags" label="Теги через запятую"><Input id="bulk-note-tags" required maxLength={1950} value={tags} onChange={event=>setTags(event.target.value)}/></FormField>}{kind==="color"&&<FormField id="bulk-note-color" label="Новый цвет"><Input id="bulk-note-color" type="color" value={color} onChange={event=>setColor(event.target.value)}/></FormField>}{action.error&&<p className="text-sm text-destructive" role="alert">{action.error}</p>}<div className="flex justify-end gap-2"><Button variant="outline" disabled={action.busy} onClick={close}>Отмена</Button><Button type="submit" disabled={action.busy}>{action.busy?"Применяем…":"Применить к выбранным"}</Button></div></form></Dialog>;
}
