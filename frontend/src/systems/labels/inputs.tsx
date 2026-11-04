import {AppIcon} from "@/systems/icons/app-icon";
import { useLabelCatalog } from "./context";
import { t, useLanguage } from "@/systems/i18n/locale";
import { useId, useState, type ChangeEvent } from "react";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { useResource } from "@/hooks/use-resource";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import type { Label } from "./types";
import { formatLabels, normalizeLabels } from "./values";

function readableTagText(color: string) {
  const value = color.replace("#", "");
  const channel = (index: number) => { const n = parseInt(value.slice(index, index + 2), 16) / 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; };
  return .2126 * channel(0) + .7152 * channel(2) + .0722 * channel(4) > .179 ? "#111827" : "#ffffff";
}

export function TagChip({ name, color, icon, kind="tag",displayName }: { displayName?:string;name: string; color?: string; icon?:string|null;kind?:string }) {
  useLanguage();
  const catalog=useLabelCatalog();
  const label=catalog.find(item=>(item.kind??"tag")===kind&&item.name.toLowerCase()===name.toLowerCase());
  color??=label?.color;icon??=label?.icon;
  return <span className="inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium" style={color?{ backgroundColor: color, color: readableTagText(color) }:{backgroundColor:"var(--muted)",color:"var(--foreground)"}}>{icon&&<AppIcon icon={icon} className="size-3.5"/>}<span className="truncate">{displayName??name}</span></span>;
}

type LabelInputProps = {
  id: string;
  label?: string;
  value: string;
  change: (value: string) => void;
  suggestions?: string[];
  single?: boolean;
  required?: boolean;
  multiline?: boolean;
  freeform?: boolean;
};

/** All label editors share validation; line mode preserves legacy contact punctuation. */
export function LabelInput({ id, label, value, change, suggestions = [], single = false, required = false, multiline = false, freeform = false }: LabelInputProps) {
  useLanguage();
  const catalog=useLabelCatalog();
  const available=[...suggestions,...(freeform?[]:catalog.filter(item=>(item.kind??"tag")==="tag").map(item=>item.name))];
  const labels = single ? (value.trim() ? [value.trim()] : []) : normalizeLabels(value, multiline ? "lines" : "comma");
  const error = required && !labels.length ? t("Укажите метку.") : labels.length > 30 ? t("Не более 30 меток.") : labels.some(item => [...item].length > 64) ? t("Не более 64 символов в метке.") : "";
  const Component = multiline ? Textarea : Input;
  if (!single && !freeform) return <TagSelection id={id} label={label} required={required} value={labels} change={next=>change(multiline?next.join("\n"):formatLabels(next))} tags={normalizeLabels(available).map(name=>({name}))}/>;
  return <div className="space-y-2">
    <Component id={id} aria-label={t(label)} required={required} maxLength={single ? 128 : 3900}
      list={!multiline && available.length ? `${id}-suggestions` : undefined} value={value}
      aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
      ref={(element: HTMLInputElement | HTMLTextAreaElement | null) => { element?.setCustomValidity(error); }}
      onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => change(event.target.value)} />
    {available.length > 0 && <datalist id={`${id}-suggestions`}>{normalizeLabels(available).map(item => <option key={item} value={single||multiline?item:formatLabels([item])} />)}</datalist>}
    {error && <p id={`${id}-error`} role="status" className="text-xs text-destructive">{error}</p>}
  </div>;
}

type TagOption = {name: string; color?: string; icon?: string | null};

/** One selector for existing tags and inline registry creation; names are never split on punctuation. */
export function TagSelection({ value, change, tags = [], id, label, required = false, disabled = false, functionalCreated }: { functionalCreated?: (label: Label) => void; value: string[]; change: (value: string[]) => void; tags?: TagOption[]; id?: string; label?: string; required?: boolean; disabled?: boolean }) {
  useLanguage();
  const generatedId=useId();
  const inputId=id??`tag-selection-${generatedId}`;
  const registry=useResource<Label[]>("/labels");
  const catalog=useLabelCatalog();
  const options=[...tags,...(registry.resource.status==="ready"?registry.resource.data:catalog).filter(item=>(item.kind??"tag")==="tag")];
  const [draft,setDraft]=useState("");
  const [creationKind,setCreationKind]=useState<"tag"|"functional">("tag");
  const action=useAction();
  const names=normalizeLabels([...options.map(tag=>tag.name),...value]);
  const key=(name:string)=>name.toLocaleLowerCase("ru-RU");
  const name=draft.trim();
  const invalid=required&&!value.length?t("Укажите метку."):value.length>30?t("Не более 30 меток."):value.some(item=>[...item].length>64)?t("Не более 64 символов в метке."):"";
  const nameError=[...name].length>64?t("Не более 64 символов в метке."):"";
  const unavailable=disabled||action.busy;
  async function add() {
    if(unavailable||!name||nameError||(creationKind==="tag"&&value.length>=30))return;
    const existing=creationKind==="tag"?options.find(option=>key(option.name)===key(name)):undefined;
    if(existing){change(normalizeLabels([...value,existing.name]));setDraft("");return;}
    await action.run(async()=>{
      const created=await api<Label>("/labels",{method:"POST",body:{name,kind:creationKind,icon:creationKind==="functional"?"tabler:coin":"tabler:tags",...(creationKind==="functional"?{function_key:"cost"}:{})}});
      if(creationKind==="functional")functionalCreated?.(created);else change(normalizeLabels([...value,created.name]));
      setDraft("");
    },registry.retry);
  }
  return <div className="space-y-3">
    <div className="flex flex-wrap items-center gap-2">{functionalCreated&&<Select aria-label={t("Вид метки")} className="w-auto" value={creationKind} disabled={unavailable} onChange={event=>setCreationKind(event.target.value as "tag"|"functional")}><option value="tag">{t("Тег")}</option><option value="functional">{t("Функциональная метка")}</option></Select>}<Input id={inputId} aria-label={label??(!id?t("Найти или создать метку"):undefined)} placeholder={t("Найти или создать метку")} className="min-w-40 flex-1" value={draft} disabled={disabled} aria-disabled={action.busy} maxLength={128} aria-invalid={!!(invalid||nameError)} aria-describedby={invalid||nameError?`${inputId}-error`:undefined} ref={element=>element?.setCustomValidity(invalid||nameError||(action.busy?t("Сохранение…"):""))} onChange={event=>{if(!action.busy)setDraft(event.target.value);}} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();void add();}}}/><Button disabled={unavailable||!name||!!nameError||(creationKind==="tag"&&value.length>=30)} onClick={()=>void add()}>{t("Добавить метку")}</Button></div>
    <div className="flex max-h-52 flex-wrap gap-3 overflow-y-auto">{names.filter(item=>!name||key(item).includes(key(name))||value.some(selected=>key(selected)===key(item))).map(item=>{
      const same=(candidate:string)=>key(candidate)===key(item);
      const selected=value.some(same);
      const option=options.find(option=>same(option.name));
      return <label key={key(item)} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={selected} disabled={unavailable||(!selected&&value.length>=30)} onChange={event=>change(event.target.checked?normalizeLabels([...value,item]):value.filter(candidate=>!same(candidate)))}/><TagChip name={item} color={option?.color} icon={option?.icon}/></label>;
    })}</div>
    {registry.resource.status==="loading"&&!names.length&&<LoadingState/>}
    {registry.resource.status==="error"&&<ErrorState message={registry.resource.message} retry={registry.retry}/>}
    {(invalid||nameError)&&<p id={`${inputId}-error`} role="status" className="text-xs text-destructive">{invalid||nameError}</p>}
    {action.error&&<p role="alert" className="text-xs text-destructive">{action.error}</p>}
  </div>;
}

export function LabelManager({ labels, busy, rename, remove, label = t("Метка") }: { labels: string[]; busy: boolean; rename: (name: string, replacement: string) => void; remove: (name: string) => void; label?: string }) {
  useLanguage();
  const [name, setName] = useState("");
  const [replacement, setReplacement] = useState("");
  return <div className="space-y-4">
    <Select aria-label={t(label)} value={name} disabled={busy} onChange={event => { setName(event.target.value); setReplacement(event.target.value); }}>
      <option value="">{t("Выберите метку")}</option>{normalizeLabels(labels).sort().map(item => <option key={item}>{item}</option>)}
    </Select>
    <FormField id="label-replacement" label={t("Новое название метки")}><LabelInput id="label-replacement" single value={replacement} change={setReplacement} /></FormField>
    <div className="flex flex-wrap gap-2">
      <Button disabled={busy || !name || !replacement.trim() || [...replacement.trim()].length > 64} onClick={() => rename(name, replacement.trim())}>{t("Переименовать метку")}</Button>
      <Button variant="outline" disabled={busy || !name} onClick={() => remove(name)}>{t("Удалить метку")}</Button>
    </div>
  </div>;
}
