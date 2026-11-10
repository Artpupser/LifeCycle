import { t, useLanguage } from "@/systems/i18n/locale";
import {useId} from "react";
import {Search} from "@/components/icons";
import {Input} from "./ui/input";
import {filterValue,parseFilterQuery,setFilterValue,setNumericBound,numericFilter,type FilterSpec} from "@/lib/filter-query";
import {ObjectActions} from "@/systems/actions/action-menu";
import type {ContextAction} from "@/systems/actions/context";
export function FilterSearch({value,change,label,specs,placeholder=t("Название, текст или фильтр…")}:{value:string;change:(value:string)=>void;label:string;specs:FilterSpec[];placeholder?:string}){
 useLanguage();const id=useId(),query=parseFilterQuery(value,specs);
 const actions:ContextAction[]=specs.map(spec=>{
  const choices:FilterSpec["choices"]=spec.choices??spec.values?.map(value=>({value,label:value}));
  let children:ContextAction[]|undefined=choices?.map(choice=>({id:choice.value,label:choice.label,icon:"icon" in choice?choice.icon:undefined,run:()=>change(setFilterValue(value,specs,spec.key,choice.value))}));
  if(spec.type==="number"){
   const current=numericFilter(filterValue(query,spec.key),spec);
   children=(["min","max"] as const).map(bound=>({id:bound,label:t(bound==="min"?"От значения":"До значения"),numberInput:{label:spec.label,min:spec.min??0,max:spec.max,step:0.01,initial:current?.[bound]??spec.min??0,submit:number=>change(setNumericBound(value,specs,spec.key,bound,number))},run:()=>{}}));
  }
  if(children&&filterValue(query,spec.key))children.push({id:"clear",label:t("Убрать фильтр"),icon:"tabler:x",run:()=>change(setFilterValue(value,specs,spec.key,null))});
  return {id:spec.key,label:spec.label,children,run:()=>{const example=parseFilterQuery(spec.example,[spec]).terms[0];if(example)change(setFilterValue(value,specs,spec.key,example.value));}};
 });
 return <div data-action-subject="filter-search" data-action-search className="min-w-0 flex-1 space-y-2"><div className="relative"><Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"/><Input type="search" maxLength={1000} className="pl-9 pr-14" aria-label={t(label)} aria-invalid={Boolean(query.errors.length)} aria-describedby={query.errors.length?`${id}-errors`:undefined} placeholder={placeholder} value={value} onChange={event=>change(event.target.value)}/>{specs.length>0&&<span className="absolute right-0 top-0"><ObjectActions placement="inline" label={t("Фильтры: {v0}",{v0:label})} actions={actions}/></span>}</div>{query.errors.length>0&&<p id={`${id}-errors`} className="text-xs text-destructive" role="status">{query.errors[0]}</p>}</div>;
}
