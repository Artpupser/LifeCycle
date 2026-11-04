import {Children, useContext, useState, type ReactNode} from "react";
import {cn} from "@/lib/utils";
import {Dialog} from "@/components/dialog";
import {Button} from "@/components/ui/button";
import {Input, Select} from "@/components/ui/input";
import {FormField} from "@/components/form-field";
import {ErrorState, LoadingState} from "@/components/resource-state";
import {AiVisibility, type AiAccess} from "@/components/ai-visibility";
import {useResource} from "@/hooks/use-resource";
import {useAction} from "@/hooks/use-action";
import {api} from "@/lib/api";
import {revalidateActiveResources} from "@/systems/loading/cache";
import {t, useLanguage} from "@/systems/i18n/locale";
import {useLabelCatalog, FunctionalValues, ExtraSubjectTags, type LabelValue, type LabelSubject} from "./context";
import type {Label} from "./types";
import {TagChip, TagSelection} from "./inputs";
import {normalizeCost} from "./functional-values";

const labelName = (label: Label) => label.is_system && ["Стоимость", "AI Доступ"].includes(label.name) ? t(label.name) : label.name;

/** All kinds of labels share the same metadata row and selection flow. */
export function SubjectLabels({subject, children, className}: {subject: LabelSubject; children?: ReactNode; className?: string}) {
  useLanguage();
  const values = useContext(FunctionalValues).filter(value => value.subject_kind === subject.kind && value.subject_id === subject.id);
  const tags = useContext(ExtraSubjectTags).find(item => item.subject_kind === subject.kind && item.subject_id === subject.id)?.tags ?? [];
  const labels = useLabelCatalog();
  const [editing, setEditing] = useState(false);
  if (!values.length && !tags.length && !Children.toArray(children).length) return null;
  return <div className={cn("flex min-w-0 flex-wrap items-center gap-1.5", className)}>
    {children}{tags.map(name => <TagChip key={name} name={name}/>)}
    {values.map(value => {
      const label = labels.find(label => label.id === value.label_id);
      const name = `${label ? labelName(label) : t("Стоимость")}: ${value.value.amount} ${value.value.currency}`;
      return <button type="button" key={value.id} aria-label={t("Изменить метку {name}", {name})} onClick={() => setEditing(true)} className="max-w-full rounded-md focus-visible:outline-2 focus-visible:outline-ring"><TagChip name={name} color={label?.color} icon={label?.icon ?? "tabler:coin"}/></button>;
    })}
    {editing && <SubjectLabelEditor subject={subject} close={() => setEditing(false)}/>}
  </div>;
}

type SubjectData = {tags: string[]; values: LabelValue[]; ai_access: AiAccess | null};
export function SubjectLabelEditor({subject, close}: {subject: LabelSubject; close: () => void}) {
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
  return <Dialog title={t("Метки")} onClose={close}>
    {source.resource.status === "loading" ? <LoadingState/> : source.resource.status === "error" ? <ErrorState message={source.resource.message} retry={source.retry}/> : data && <div className="space-y-5">
      <fieldset disabled={action.busy} className="space-y-3"><legend className="mb-3 text-sm font-medium">{t("Метки")}</legend>
        <TagSelection functionalCreated={setAdding} value={data.tags} tags={labels.filter(label => (label.kind ?? "tag") === "tag")} change={tags => void action.run(() => api(path, {method: "PUT", body: {tags, previous_tags: data.tags}}), () => {source.mutate(current => ({...current, tags})); refresh();})}/>
      </fieldset>
      <div className="flex flex-wrap gap-2">{labels.filter(label => label.function_key === "cost").map(label => <button key={label.id} type="button" onClick={() => setAdding(label)} className="max-w-full rounded-md border border-border p-1 hover:bg-muted" aria-label={t("Добавить метку {name}", {name: labelName(label)})}><TagChip name={labelName(label)} color={label.color} icon={label.icon}/><span className="px-1" aria-hidden="true">+</span></button>)}</div>
      {adding && <CostValueEditor key={`new:${adding.id}`} path={path} label={adding} saved={() => {setAdding(null); refresh();}} cancel={() => setAdding(null)}/>}
      {data.values.map(value => {
        const label = labels.find(label => label.id === value.label_id);
        return label && <CostValueEditor key={`${value.id}:${value.revision}`} path={path} label={label} initial={value} saved={refresh}/>;
      })}
      {data.ai_access && ["notes", "workouts", "exercises"].includes(subject.kind) && <AiVisibility kind={subject.kind as "notes" | "workouts" | "exercises"} id={subject.id} title={t("AI Доступ")} access={data.ai_access} saved={refresh}/>}
      {action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}
    </div>}
  </Dialog>;
}

function CostValueEditor({path, label, initial, saved, cancel}: {path: string; label: Label; initial?: LabelValue; saved: () => void; cancel?: () => void}) {
  useLanguage();
  const [amount, setAmount] = useState(initial?.value.amount ?? "");
  const [currency, setCurrency] = useState(initial?.value.currency ?? "RUB");
  const [editing, setEditing] = useState(!initial);
  const action = useAction();
  const value = normalizeCost(amount, currency);
  const name = labelName(label);
  const amountId = `label-amount-${initial?.id ?? label.id}`;
  const currencyId = `label-currency-${initial?.id ?? label.id}`;
  return <form className="space-y-3 rounded-xl border border-border p-3" onSubmit={event => {
    event.preventDefault();
    if (!value) return;
    void action.run(() => api(path, {method: initial ? "PUT" : "POST", body: {label_id: label.id, value, ...(initial ? {assignment_id: initial.id, revision: initial.revision} : {})}}), () => {setEditing(false); saved();});
  }}>
    <div className="flex flex-wrap items-start gap-2"><button type="button" className="min-w-0 max-w-full rounded-md" onClick={() => setEditing(!editing)} aria-expanded={editing}><TagChip name={initial ? `${name}: ${initial.value.amount} ${initial.value.currency}` : name} color={label.color} icon={label.icon}/></button>
      {initial && <Button className="ml-auto" size="sm" variant="ghost" disabled={action.busy} onClick={() => void action.run(() => api(path, {method: "PUT", body: {assignment_id: initial.id, label_id: label.id, revision: initial.revision, value: null}}), saved)}>{t("Снять метку")}</Button>}
    </div>
    {editing && <fieldset disabled={action.busy} className="space-y-3"><div className="grid grid-cols-2 gap-3"><FormField id={amountId} label={t("Сумма")}><Input id={amountId} inputMode="decimal" required value={amount} onChange={event => setAmount(event.target.value)} placeholder="100.00"/></FormField><FormField id={currencyId} label={t("Валюта")}><Select id={currencyId} value={currency} onChange={event => setCurrency(event.target.value)}>{["RUB", "USD", "EUR"].map(code => <option key={code}>{code}</option>)}</Select></FormField></div><div className="flex gap-2"><Button type="submit" size="sm" disabled={!value || action.busy}>{t("Сохранить")}</Button>{cancel && <Button size="sm" variant="ghost" onClick={cancel}>{t("Отмена")}</Button>}</div></fieldset>}
    {action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}
  </form>;
}
