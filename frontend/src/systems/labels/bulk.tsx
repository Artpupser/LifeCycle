import {useState} from "react";
import {Dialog} from "@/components/dialog";
import {Button} from "@/components/ui/button";
import {api} from "@/lib/api";
import {t,useLanguage} from "@/systems/i18n/locale";
import {TagSelection} from "./inputs";
import {useLabelCatalog,type LabelSubject} from "./context";

/** Apply only the requested tag delta, retaining each subject's other labels and concurrency guard. */
export function BulkSubjectTags({mode,busy,apply,close}:{mode:"add"|"remove";busy:boolean;apply:(operation:(subject:LabelSubject)=>Promise<unknown>)=>Promise<boolean>;close:()=>void}){
  useLanguage();const labels=useLabelCatalog();const [chosen,setChosen]=useState<string[]>([]);
  return <Dialog title={t(mode==="add"?"Добавить теги выбранным":"Убрать теги у выбранных")} onClose={close}><div className="space-y-4"><TagSelection value={chosen} change={setChosen} disabled={busy} tags={labels.filter(label=>(label.kind??"tag")==="tag")}/><Button disabled={busy||!chosen.length} onClick={()=>void apply(async subject=>{
    const path=`/labels/subjects/${subject.kind}/${subject.id}`;const current=await api<{tags:string[]}>(path);
    const tags=mode==="add"?[...new Set([...current.tags,...chosen])]:current.tags.filter(tag=>!chosen.includes(tag));
    if(tags.length===current.tags.length&&tags.every((tag,index)=>tag===current.tags[index]))return;
    await api(path,{method:"PUT",body:{tags,previous_tags:current.tags}});
  })}>{t("Применить")}</Button></div></Dialog>;
}
