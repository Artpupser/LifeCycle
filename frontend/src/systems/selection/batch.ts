import {useLayoutEffect,useRef,useState} from "react";
import {errorMessage} from "@/lib/api";
import {confirmAction,notify} from "@/lib/feedback";
import {t} from "@/systems/i18n/locale";
import type {Selection} from "./state";

/** Keep failed snapshots selected and never repeat successful writes after a partial failure. */
export function useSelectionBatch<T>(selection:Selection<T>,itemKey:(item:T)=>string,refresh:()=>void,scope:string){
  const [busy,setBusy]=useState(false);const locked=useRef(false);const version=useRef(0);
  useLayoutEffect(()=>{const token=version;token.current++;return()=>{token.current++;};},[scope]);
  async function run(operation:(item:T)=>Promise<unknown>,message?:string){
    if(locked.current||!selection.count)return false;
    locked.current=true;setBusy(true);
    const token=version.current,chosen=[...selection.selected];const succeeded:string[]=[];let failed=0;let reason="";
    try{
      if(message&&!await confirmAction({title:t("Действие с выбранными записями"),message:t("Выбрано: {count}",{count:chosen.length})+". "+message,confirmLabel:t("Продолжить"),destructive:true}))return false;
      for(const item of chosen){
        if(token!==version.current)break;
        try{await operation(item);succeeded.push(itemKey(item));}catch(failure){failed++;reason=errorMessage(failure);}
      }
      if(token===version.current){selection.remove(succeeded);if(failed)notify(t("Выполнено: {done}; ошибок: {failed}. {reason}",{done:succeeded.length,failed,reason}),"error");else if(succeeded.length)notify(t("Обработано записей: {count}",{count:succeeded.length}));}
      if(succeeded.length||failed)refresh();
      return failed===0&&succeeded.length===chosen.length;
    }finally{locked.current=false;setBusy(false);}
  }
  return {busy,run};
}
