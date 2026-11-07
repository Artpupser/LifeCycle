import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton,SaveForm} from "@/components/ui/save";
import {ObjectActions} from "@/systems/actions/action-menu";
import {useState,type FormEvent} from "react";
import {TaskCheckbox} from "@/features/planning/task-card";
import type {TaskOccurrence} from "@/features/planning/types";
import {Dialog} from "@/components/dialog";
import {FormField} from "@/components/form-field";
import {Markdown,MarkdownEditor} from "@/components/markdown";
import {Button} from "@/components/ui/button";

import {useAction} from "@/hooks/use-action";
import {api} from "@/lib/api";
import {t,useLanguage} from "@/systems/i18n/locale";
import {emptyMark,habitChanged,habitStatusLabels,type HabitMark,type HabitStatus} from "./types";
export function HabitControls({occurrence,changed}:{occurrence:TaskOccurrence;changed:()=>void}){
 useLanguage();const [editing,setEditing]=useState(false);const [draft,setDraft]=useState<{version:string;value:HabitMark}|null>(null);const action=useAction();const actual=occurrence.habit_mark??emptyMark();const version=JSON.stringify(actual);const mark=draft?.version===version?draft.value:actual;
 async function save(next:HabitMark){setDraft({version,value:next});const ok=await action.run(()=>api(`/habits/${occurrence.task.id}/marks/${occurrence.date}`,{method:"POST",body:{status:next.status,note:next.note}}),()=>{habitChanged();changed();});if(!ok)setDraft(null);return ok;}
 const status=mark.status==="completed"?"completed":mark.status==="cancelled"||mark.status==="skipped"?"rejected":"todo";
 return <div className="space-y-3"><div className="flex flex-wrap items-center gap-3"><TaskCheckbox task={{...occurrence.task,status}} occurrence={{...occurrence,status}} busy={action.busy||!occurrence.editable} toggle={checked=>save({...mark,status:checked?"completed":"pending"})}/><span className="text-sm">{habitStatusLabels[mark.status]}</span><ObjectActions contribute><Button size="sm" variant="ghost" onClick={()=>setEditing(true)}>{t("Отметка и заметка")}</Button></ObjectActions></div>{mark.note&&<details><summary className="text-sm text-muted-foreground">{t("Заметка к отметке")}</summary><Markdown value={mark.note}/></details>}{action.error&&<p role="alert" className="text-sm text-destructive">{action.error}</p>}{editing&&<MarkEditor initial={mark} busy={action.busy} editable={occurrence.editable} close={()=>setEditing(false)} save={async next=>{if(await save(next))setEditing(false);}}/>}</div>;
}
function MarkEditor({initial,busy,editable,close,save}:{initial:HabitMark;busy:boolean;editable:boolean;close:()=>void;save:(mark:HabitMark)=>Promise<void>}){useLanguage();const [value,setValue]=useState(initial);const [uploading,setUploading]=useState(false);function submit(event:FormEvent){event.preventDefault();void save(value);}return <Dialog title={t("Отметка и заметка")} onClose={close}><SaveForm onSubmit={submit} className="space-y-5"><fieldset disabled={busy||!editable} className="space-y-5"><FormField id="habit-mark-status" label={t("Результат привычки")}><ChoiceField id="habit-mark-status" value={value.status} change={next=>setValue({...value,status:next as HabitStatus})}>{Object.entries(habitStatusLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</ChoiceField></FormField><FormField id="habit-mark-note" label={t("Заметка к отметке")}><MarkdownEditor id="habit-mark-note" value={value.note} onChange={note=>setValue({...value,note})} onUploading={setUploading}/></FormField></fieldset><SaveButton type="submit" disabled={busy||uploading||!editable}>{t("Сохранить отметку")}</SaveButton></SaveForm></Dialog>;}
