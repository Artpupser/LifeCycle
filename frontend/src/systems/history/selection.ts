import {useState} from "react";
import {api,errorMessage} from "@/lib/api";
import {confirmAction,notify} from "@/lib/feedback";
import {t,useLanguage} from "@/systems/i18n/locale";
import type {ContextAction} from "@/systems/actions/context";
import type {Selection} from "@/systems/selection/state";
import type {HistoryKind} from "./history";
async function removeHistory(kind:HistoryKind,keys:string[],removed:(keys:string[])=>void){
 if(!keys.length||!await confirmAction({title:t("Убрать запись из истории"),message:t("Убрать записей: {count}? Результаты, статистика и уже применённые изменения сохранятся.",{count:keys.length}),confirmLabel:t("Убрать запись"),destructive:true}))return false;
 for(let index=0;index<keys.length;index+=500){const chunk=keys.slice(index,index+500);await api("/history/remove",{method:"POST",body:{confirmed:true,items:chunk.map(item_key=>({kind,item_key}))}});removed(chunk);}
 return true;
}
export function useHistorySelectionActions<T>(kind:HistoryKind,selection:Selection<T>,itemKey:(item:T)=>string,removed:()=>void){
 useLanguage();const [busy,setBusy]=useState(false);
 async function run(){setBusy(true);try{const done=await removeHistory(kind,selection.selected.map(itemKey),keys=>{selection.remove(keys);removed();});if(done)notify(t("Записи убраны из истории"));}catch(failure){notify(errorMessage(failure),"error");removed();}finally{setBusy(false);}}
 const actions:ContextAction[]=[{id:"remove-selected",label:t("Убрать выбранные из истории"),icon:"tabler:trash",danger:true,disabled:busy||selection.loading||!selection.count,run:()=>void run()}];
 return {actions,busy};
}
