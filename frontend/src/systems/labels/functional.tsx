import {EditorForm} from "@/systems/forms/editor";
import {useEditorState,useEditorField} from "@/systems/forms/use-editor";
import {editorSchemas} from "@/systems/forms/schemas";
import {ChoiceField} from "@/components/ui/choice-picker";
import {SaveButton} from "@/components/ui/save";
import {Children, useContext, useState, type ReactNode} from "react";
import {cn} from "@/lib/utils";
import {Dialog} from "@/components/dialog";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {FormField} from "@/components/form-field";
import {ErrorState, LoadingState} from "@/components/resource-state";
import {createPortal} from "react-dom";
import type {AiAccess} from "./context";
import {useResource} from "@/hooks/use-resource";
import {useAction} from "@/hooks/use-action";
import {api} from "@/lib/api";
import {revalidateActiveResources} from "@/systems/loading/cache";
import {t, useLanguage} from "@/systems/i18n/locale";
import {useLabelCatalog, FunctionalValues, ExtraSubjectTags, type LabelValue, type LabelSubject} from "./context";
import type {Label} from "./types";
import {TagChip, TagSelection} from "./inputs";
import {normalizeCost} from "./functional-values";

const isSingle=(label:Label)=>label.function_key==="ai_access"||label.repeatable===false;
const valueName=(label:Label|undefined,value:LabelValue)=>value.value.enabled?label?labelName(label):t("AI Доступ"):`${label?labelName(label):t("Стоимость")}: ${value.value.amount} ${value.value.currency}`;
const labelName = (label: Label) => label.is_system && ["Стоимость", "AI Доступ"].includes(label.name) ? t(label.name) : label.name;

/** All kinds of labels share the same metadata row and selection flow. */
export function SubjectLabels({subject, children, className,manage=false,tagsChanged}: {tagsChanged?:(tags:string[])=>void;subject: LabelSubject; children?: ReactNode; className?: string;manage?:boolean}) {
  useLanguage();
  const values = useContext(FunctionalValues).filter(value => value.subject_kind === subject.kind && value.subject_id === subject.id);
  const tags = useContext(ExtraSubjectTags).find(item => item.subject_kind === subject.kind && item.subject_id === subject.id)?.tags ?? [];
  const labels = useLabelCatalog();
  const [editing, setEditing] = useState(false);
  if (!manage && !values.length && !tags.length && !Children.toArray(children).length) return null;
  return <div data-subject-labels className={cn("mt-3 flex min-w-0 flex-wrap items-center gap-1.5", className)}>
    {children}{tags.map(name => <TagChip key={name} name={name}/>)}
    {values.map(value => {
      const label = labels.find(label => label.id === value.label_id);
      const name = valueName(label,value);
      return <button type="button" key={value.id} aria-label={t("Изменить метку {name}", {name})} onClick={() => setEditing(true)} className="max-w-full rounded-md focus-visible:outline-2 focus-visible:outline-ring"><TagChip name={name} color={label?.color} icon={label?.icon ?? (value.value.enabled?"tabler:brain":"tabler:coin")}/></button>;
    })}
    {manage&&<Button size="sm" variant="outline" onClick={()=>setEditing(true)}>{t("Метки")}</Button>}
    {editing && <SubjectLabelEditor tagsChanged={tagsChanged} subject={subject} close={() => setEditing(false)}/>}
  </div>;
}

type SubjectData = {tags: string[]; values: LabelValue[]; ai_access: AiAccess | null};
export function SubjectLabelEditor({subject, close,tagsChanged}: {tagsChanged?:(tags:string[])=>void;subject: LabelSubject; close: () => void}) {
  useLanguage();
  const path = `/labels/subjects/${subject.kind}/${subject.id}`;
  const source = useResource<SubjectData>(path);
  const labels = useLabelCatalog();
  const action = useAction();
  const [adding, setAdding] = useState<Label | null>(null);
  const data = source.resource.status === "ready" ? source.resource.data : null;
  const refresh = () => {
    source.retry();
    revalidateActiveResources([`/${subject.kind}`, "/tasks", "/today", "/calendar", "/boards", "/habits", "/notes", "/ai"]);
  };
  return createPortal(<Dialog title={t("Метки")} onClose={close}>
    {source.resource.status === "loading" ? <LoadingState/> : source.resource.status === "error" ? <ErrorState message={source.resource.message} retry={source.retry}/> : data && <div className="space-y-5">
      <fieldset disabled={action.busy} className="space-y-3"><legend className="mb-3 text-sm font-medium">{t("Метки")}</legend>
        <TagSelection functionalCreated={setAdding} value={data.tags} tags={labels.filter(label => (label.kind ?? "tag") === "tag")} change={tags => void action.run(() => api(path, {method: "PUT", body: {tags, previous_tags: data.tags}}), () => {source.mutate(current => ({...current, tags}));tagsChanged?.(tags); refresh();})}/>
      </fieldset>
      <div className="flex flex-wrap gap-2">{labels.filter(label=>label.kind==="functional").map(label=>{
        const assigned=data.values.some(value=>value.label_id===label.id);
        return <button key={label.id} type="button" disabled={action.busy||(isSingle(label)&&assigned)} onClick={()=>{
          if(label.function_key==="ai_access")void action.run(()=>api(path,{method:"PUT",body:{label_id:label.id,value:{enabled:true},revision:data.ai_access?.ai_access_revision}}),refresh);
          else setAdding(label);
        }} className="max-w-full rounded-md border border-border p-1 hover:bg-muted disabled:opacity-40" aria-label={t("Добавить метку {name}",{name:labelName(label)})}><TagChip name={labelName(label)} color={label.color} icon={label.icon}/><span className="px-1" aria-hidden="true">+</span><span className="px-1 text-xs">{t(isSingle(label)?"Единоразовая":"Многоразовая")}</span></button>;
      })}</div>
      {adding&&<CostValueEditor key={`new:${adding.id}`} path={path} label={adding} saved={()=>{setAdding(null);refresh();}} cancel={()=>setAdding(null)}/>}
      {data.values.map(value=>{const label=labels.find(label=>label.id===value.label_id);return label&&<FunctionalAssignment key={`${value.id}:${value.revision}`} path={path} label={label} initial={value} saved={refresh}/>;})}
      {action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}
    </div>}
  </Dialog>,document.body);
}

function FunctionalAssignment({path,label,initial,saved}:{path:string;label:Label;initial:LabelValue;saved:()=>void}){
 useLanguage();const action=useAction();
 if(!initial.value.enabled)return <CostValueEditor path={path} label={label} initial={initial} saved={saved}/>;
 return <div className="space-y-3 rounded-xl border border-border p-3"><div className="flex flex-wrap items-start gap-2"><TagChip name={valueName(label,initial)} color={label.color} icon={label.icon}/><Button className="ml-auto" size="sm" variant="ghost" disabled={action.busy} onClick={()=>void action.run(()=>api(path,{method:"PUT",body:{label_id:label.id,assignment_id:initial.id,revision:initial.revision,value:null}}),saved)}>{t("Снять метку")}</Button></div>{action.error&&<p role="alert" className="text-sm text-destructive">{action.error}</p>}</div>;
}

function CostValueEditor({path, label, initial, saved, cancel}: {path: string; label: Label; initial?: LabelValue; saved: () => void; cancel?: () => void}) {
  useLanguage();
  const [editorValues,setEditorValues,formEditor]=useEditorState(()=>({amount:initial?.value.amount ?? "",currency:initial?.value.currency ?? "RUB"}),editorSchemas.record);
const [amount, setAmount] = useEditorField(editorValues,setEditorValues,"amount");
  const [currency, setCurrency] = useEditorField(editorValues,setEditorValues,"currency");
  const [editing, setEditing] = useState(!initial);
  const action = useAction();
  const value = normalizeCost(amount, currency);
  const name = labelName(label);
  const amountId = `label-amount-${initial?.id ?? label.id}`;
  const currencyId = `label-currency-${initial?.id ?? label.id}`;
  return <EditorForm editor={formEditor} className="space-y-3 rounded-xl border border-border p-3" onSubmit={event => {
    event.preventDefault();
    if (!value) return;
    void action.run(() => api(path, {method: initial ? "PUT" : "POST", body: {label_id: label.id, value, ...(initial ? {assignment_id: initial.id, revision: initial.revision} : {})}}), () => {setEditing(false); saved();});
  }}>
    <div className="flex flex-wrap items-start gap-2"><button type="button" className="min-w-0 max-w-full rounded-md" onClick={() => setEditing(!editing)} aria-expanded={editing}><TagChip name={initial ? `${name}: ${initial.value.amount} ${initial.value.currency}` : name} color={label.color} icon={label.icon}/></button>
      {initial && <Button className="ml-auto" size="sm" variant="ghost" disabled={action.busy} onClick={() => void action.run(() => api(path, {method: "PUT", body: {assignment_id: initial.id, label_id: label.id, revision: initial.revision, value: null}}), saved)}>{t("Снять метку")}</Button>}
    </div>
    {editing && <fieldset disabled={action.busy} className="space-y-3"><div className="grid grid-cols-2 gap-3"><FormField id={amountId} label={t("Сумма")}><Input id={amountId} inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} placeholder="100.00"/></FormField><FormField id={currencyId} label={t("Валюта")}><ChoiceField id={currencyId} value={currency} change={next => setCurrency(next)}>{["RUB", "USD", "EUR"].map(code => <option key={code}>{code}</option>)}</ChoiceField></FormField></div><div className="flex gap-2"><SaveButton type="submit" size="sm" disabled={!value || action.busy}>{t("Сохранить")}</SaveButton>{cancel && <Button size="sm" variant="ghost" onClick={cancel}>{t("Отмена")}</Button>}</div></fieldset>}
    {action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}
  </EditorForm>;
}
