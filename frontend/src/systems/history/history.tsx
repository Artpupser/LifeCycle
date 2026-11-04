import {ObjectActions} from "@/systems/actions/action-menu";
import {useState,type ReactNode} from "react";
import {Button} from "@/components/ui/button";
import {api,errorMessage} from "@/lib/api";
import {confirmAction} from "@/lib/feedback";
import {t,useLanguage} from "@/systems/i18n/locale";
export type HistoryKind="task"|"habit"|"pomodoro"|"workout"|"ai"|"activity";
export function HistoryRemove({kind,itemKey,removed,disabled=false,children}:{children?:ReactNode;kind:HistoryKind;itemKey:string;removed:()=>void;disabled?:boolean}){
 useLanguage();const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 async function remove(){if(!await confirmAction({title:t("Убрать запись из истории"),message:t("Запись исчезнет из истории. Результаты, статистика и уже применённые изменения сохранятся."),confirmLabel:t("Убрать запись"),destructive:true}))return;setBusy(true);setError(null);try{await api(`/history/${kind}/${encodeURIComponent(itemKey)}`,{method:"DELETE"});removed();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
 return <div className="space-y-2"><ObjectActions>{children}<Button size="sm" variant="ghost" className="text-destructive" disabled={busy||disabled} onClick={()=>void remove()}>{t("Убрать из истории")}</Button></ObjectActions>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
export function HistoryEntries<T>({items,itemKey,kind,render,removed}:{items:T[];itemKey:(item:T)=>string;kind:HistoryKind;render:(item:T)=>ReactNode;removed:()=>void}){return <div className="space-y-3">{items.map(item=><article key={itemKey(item)} className="space-y-3 rounded-xl border border-border p-4">{render(item)}<HistoryRemove kind={kind} itemKey={itemKey(item)} removed={removed}/></article>)}</div>;}
