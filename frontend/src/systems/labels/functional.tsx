import {cn} from "@/lib/utils";
import {Children,useContext,useState,type ReactNode} from "react";
import {Dialog} from "@/components/dialog";
import {Button} from "@/components/ui/button";
import {Input,Select} from "@/components/ui/input";
import {FormField} from "@/components/form-field";
import {ErrorState,LoadingState} from "@/components/resource-state";
import {AiVisibility,type AiAccess} from "@/components/ai-visibility";
import {useResource} from "@/hooks/use-resource";
import {useAction} from "@/hooks/use-action";
import {api} from "@/lib/api";
import {revalidateActiveResources} from "@/systems/loading/cache";
import {t,useLanguage} from "@/systems/i18n/locale";
import {useLabelCatalog} from "./context";
import {TagChip} from "./inputs";
import {normalizeCost} from "./functional-values";
import {FunctionalValues,type LabelValue,type LabelSubject} from "./context";
/** One metadata row for ordinary and functional labels, independent of the action trigger. */
export function SubjectLabels({subject,children,className}:{subject:LabelSubject;children?:ReactNode;className?:string}){
 const values=useContext(FunctionalValues).filter(value=>value.subject_kind===subject.kind&&value.subject_id===subject.id);
 const labels=useLabelCatalog();
 if(!values.length&&!Children.toArray(children).length)return null;
 return <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5",className)}>{children}{values.map(value=>{const label=labels.find(label=>label.id===value.label_id);return <TagChip key={value.label_id} name={`${value.value.amount} ${value.value.currency}`} color={label?.color} icon={label?.icon??"tabler:coin"}/>;})}</div>;
}
export function FunctionalLabelEditor({subject,close}:{subject:LabelSubject;close:()=>void}){useLanguage();const path=`/labels/subjects/${subject.kind}/${subject.id}`;const source=useResource<{values:LabelValue[];ai_access:AiAccess|null}>(path);const labels=useLabelCatalog();const cost=labels.find(label=>label.function_key==="cost");const data=source.resource.status==="ready"?source.resource.data:null;return <Dialog title={t("Функциональные метки")} onClose={close}>{source.resource.status==="loading"?<LoadingState/>:source.resource.status==="error"?<ErrorState message={source.resource.message} retry={source.retry}/>:<div className="space-y-6">{data?.ai_access&&["notes","workouts","exercises"].includes(subject.kind)&&<AiVisibility kind={subject.kind as "notes"|"workouts"|"exercises"} id={subject.id} title={labels.find(label=>label.function_key==="ai_access")?.name??t("AI Доступ")} access={data.ai_access} saved={()=>{source.retry();revalidateActiveResources([`/${subject.kind}`,"/ai"]);}}/>}{cost&&<CostEditor key={`${cost.id}:${data?.values[0]?.revision??"empty"}`} path={path} title={cost.name} labelId={cost.id} initial={data?.values.find(value=>value.label_id===cost.id)} saved={()=>{source.retry();revalidateActiveResources(["/labels/values"]);}}/>}</div>}</Dialog>;}
function CostEditor({path,title,labelId,initial,saved}:{path:string;title:string;labelId:string;initial?:LabelValue;saved:()=>void}){useLanguage();const [enabled,setEnabled]=useState(!!initial);const [amount,setAmount]=useState(initial?.value.amount??"");const [currency,setCurrency]=useState(initial?.value.currency??"RUB");const action=useAction();const value=normalizeCost(amount,currency);return <form className="space-y-4 rounded-xl border border-border p-4" onSubmit={event=>{event.preventDefault();if(enabled&&!value)return;void action.run(()=>api(path,{method:"PUT",body:{label_id:labelId,revision:initial?.revision??null,value:enabled?value:null}}),saved);}}><label className="flex items-center gap-2 font-medium"><input type="checkbox" className="accent-primary" checked={enabled} onChange={event=>setEnabled(event.target.checked)}/>{title==="Стоимость"?t(title):title}</label><p className="text-sm text-muted-foreground">{t("Сумма относится к этому объекту. Финансовые операции не создаются.")}</p>{enabled&&<div className="grid grid-cols-2 gap-3"><FormField id="label-cost-amount" label={t("Сумма")} hint={t("Неотрицательная сумма с точностью до двух знаков после запятой.")}><Input id="label-cost-amount" inputMode="decimal" required value={amount} onChange={event=>setAmount(event.target.value)} placeholder="100.00"/></FormField><FormField id="label-cost-currency" label={t("Валюта")}><Select id="label-cost-currency" value={currency} onChange={event=>setCurrency(event.target.value)}>{["RUB","USD","EUR"].map(code=><option key={code}>{code}</option>)}</Select></FormField></div>}{action.error&&<p role="alert" className="text-sm text-destructive">{action.error}</p>}<Button type="submit" disabled={action.busy||(enabled&&!value)}>{t("Сохранить")}</Button></form>;}
