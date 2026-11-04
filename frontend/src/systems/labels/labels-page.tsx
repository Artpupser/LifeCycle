import {Dialog} from "@/components/dialog";
import {ObjectActions} from "@/systems/actions/action-menu";
import {IconPicker} from "@/systems/icons/icon-picker";
import { FilterSearch } from "@/components/filter-search";
import { parseFilterQuery,matchesFilter,type FilterSpec } from "@/lib/filter-query";
import {categoryName,eventCategories} from "./categories";
import { t, useLanguage } from "@/systems/i18n/locale";
import { confirmAction } from "@/lib/feedback";
import { useState, type FormEvent } from "react";
import {useSearchParams} from "react-router";
import { Link } from "react-router";
import { ArrowLeft, Plus } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { FormField } from "@/components/form-field";
import { ErrorState, LoadingState } from "@/components/resource-state";
import { useResource } from "@/hooks/use-resource";
import { useAction } from "@/hooks/use-action";
import { api } from "@/lib/api";
import { TagChip, LabelInput } from "@/systems/labels/inputs";
export type TaskTag = import("@/systems/labels/types").Label;
const defaultIcon="tabler:tags";
const palette = ["#6366F1", "#2563EB", "#0891B2", "#16A34A", "#CA8A04", "#EA580C", "#DC2626", "#DB2777"];
function ColorChoice({ value, change, label }: { value: string; change: (value: string) => void; label: string }) {
  useLanguage();
  return <div className="flex flex-wrap items-center gap-2">{palette.map((color) => <button key={color} type="button" aria-label={`${label} ${color}`} aria-pressed={value.toUpperCase() === color.toUpperCase()} className={`size-7 rounded-full border-2 ${value.toUpperCase() === color.toUpperCase() ? "border-foreground ring-2 ring-background" : "border-transparent"}`} style={{ backgroundColor: color }} onClick={() => change(color)} />)}<Input type="color" aria-label={t(label)} className="h-8 w-10 p-1" value={value} onChange={(event) => change(event.target.value)} /></div>;
}
export function LabelsPage() {
  useLanguage();
  const tags = useResource<TaskTag[]>("/labels");
  const [params]=useSearchParams();const initialKind=params.get("kind");
  const [kind,setKind]=useState(initialKind&&["toy","emotion","setting","category"].includes(initialKind)?initialKind:"tag");
  const [icon,setIcon]=useState(defaultIcon);
  const [name, setName] = useState(""); const [color, setColor] = useState(palette[0]);
  const [query,setQuery]=useState(initialKind?`kind:${initialKind}`:"");
  const specs:FilterSpec[]=[{key:"kind",aliases:["тип"],label:t("Вид метки"),example:"kind:tag",values:["tag","category","тег","категория","toy","emotion","setting","functional"]}];
  const filters=parseFilterQuery(query,specs);
  const action = useAction();
  function create(event: FormEvent) { event.preventDefault(); void action.run(() => api("/labels", { method: "POST", body: { name: name.trim(), color, kind, icon } }), () => { setName(""); tags.retry(); }); }
  return <main id="main" className="mx-auto w-full max-w-5xl space-y-7 px-5 py-10 sm:px-10"><header><Link to="/tasks" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="size-4" />{t("К задачам и доскам")}</Link><h1 className="text-3xl font-semibold">{t("Теги и категории")}</h1><p className="mt-2 text-sm text-muted-foreground">{t("Единые метки для задач, привычек, заметок, контактов, тренировок и событий.")}</p></header><form onSubmit={create} className="space-y-4 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-end gap-3"><div className="min-w-40 flex-1"><FormField id="new-tag-name" label={t("Новая метка")}><LabelInput id="new-tag-name" required single value={name} change={setName} /></FormField></div><Button type="submit" disabled={action.busy}><Plus className="size-4" />{t("Создать метку")}</Button></div><FormField id="label-kind" label={t("Вид метки")}><Select id="label-kind" value={kind} onChange={event=>setKind(event.target.value)}><option value="tag">{t("Тег")}</option><option value="category">{t("Категория")}</option><option value="toy">{t("Игрушки")}</option><option value="emotion">{t("Эмоции")}</option><option value="setting">{t("Обстановка")}</option></Select></FormField><IconPicker value={icon} change={setIcon}/><ColorChoice label={t("Цвет новой метки")} value={color} change={setColor} /></form>{action.error && <p role="alert" className="text-sm text-destructive">{action.error}</p>}<FilterSearch label={t("Поиск меток")} value={query} change={setQuery} specs={specs}/><section className="space-y-2"><h2 className="text-sm font-semibold">{t("Системные категории событий")}</h2><div className="flex flex-wrap gap-2">{eventCategories.map(code=><TagChip key={code} name={categoryName(code)}/>)}</div></section>{tags.resource.status === "loading" ? <LoadingState /> : tags.resource.status === "error" ? <ErrorState message={tags.resource.message} retry={tags.retry} /> : <ul className="grid gap-4 xl:grid-cols-2">{tags.resource.data.filter(tag=>matchesFilter(filters,tag.name,{kind:[tag.kind??"tag",tag.kind==="category"?"категория":"тег"]})).map((tag) => <TagRow key={`${tag.id}-${tag.revision}`} tag={tag} busy={action.busy} save={(name, color, icon) => void action.run(() => api(`/labels/${tag.id}`, { method: "PUT", body: { name, color, icon, kind:tag.kind, revision: tag.revision } }), tags.retry)} remove={async () => { if (await confirmAction(t("Удалить метку «{name}» во всех разделах? Сами записи сохранятся.", {name: tag.name}))) void action.run(() => api(`/labels/${tag.id}`, { method: "DELETE", body: { revision: tag.revision } }), tags.retry); }} />)}</ul>}</main>;
}
function TagRow({tag,busy,save,remove}:{tag:TaskTag;busy:boolean;save:(name:string,color:string,icon:string|null)=>void;remove:()=>void}){
 useLanguage();const [editing,setEditing]=useState(false);const [name,setName]=useState(tag.name);const [color,setColor]=useState(tag.color);const [icon,setIcon]=useState(tag.icon??defaultIcon);
 return <li data-action-subject="label" className="space-y-3 rounded-2xl border border-border bg-card p-5"><div className="flex items-center justify-between gap-3"><TagChip name={tag.function_key&&["AI Доступ","Стоимость"].includes(tag.name)?t(tag.name):tag.name} color={tag.color} icon={tag.icon}/><ObjectActions actions={[{id:"edit",label:t("Редактировать"),run:()=>setEditing(true)},{id:"delete",label:t("Удалить"),danger:true,disabled:busy||!!tag.function_key,run:remove}]}/></div><p className="text-xs text-muted-foreground">{t(({tag:"Тег",category:"Категория",toy:"Игрушки",emotion:"Эмоции",setting:"Обстановка",functional:"Функциональная метка"})[tag.kind??"tag"])}</p>{tag.function_key&&<p className="text-sm text-muted-foreground">{t(tag.function_key==="ai_access"?"Управляет доступом AI к заметкам, тренировкам и упражнениям в рамках разрешений раздела.":"Хранит сумму и валюту объекта для будущих финансовых интеграций.")}</p>}{editing&&<Dialog title={t("Редактировать метку")} onClose={()=>setEditing(false)}><form className="space-y-4" onSubmit={event=>{event.preventDefault();save(name.trim(),color,icon);}}><LabelInput id={`tag-name-${tag.id}`} label={t("Название метки {v0}",{v0:tag.name})} required single value={name} change={setName}/><IconPicker value={icon} change={setIcon}/><ColorChoice label={t("Цвет метки {v0}",{v0:tag.name})} value={color} change={setColor}/><Button type="submit" disabled={busy||!name.trim()}>{t("Сохранить метку")}</Button></form></Dialog>}</li>;
}
