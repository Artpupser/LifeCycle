import {Input} from "@/components/ui/input";
import {useResource} from "@/hooks/use-resource";
import {LoadingState,ErrorState} from "@/components/resource-state";
import {toggleKeys} from "@/systems/selection/state";
import {useState} from "react";
import {AppIcon} from "@/systems/icons/app-icon";
import {ObjectActions} from "@/systems/actions/action-menu";
import {Button} from "@/components/ui/button";
import {Link} from "react-router";
import {useLabelCatalog} from "./context";
import {t,useLanguage} from "@/systems/i18n/locale";
import {collectionOptions,collectionDefinition,type CollectionKind,type CollectionOption} from "./collection-catalog";
import {CollectionEditor} from "./collection-editor";
import {CollectionReference,CollectionReferenceDialog} from "./collection-reference";
import type {Label} from "./types";
export function CollectionPicker({kind,label,value,change,single=false}:{kind:CollectionKind;label:string;value:string[];change:(value:string[])=>void;single?:boolean}){
 useLanguage();const cached=useLabelCatalog();const source=useResource<Label[]>("/labels");const catalog=source.resource.status==="ready"?source.resource.data:cached;const definition=collectionDefinition(kind);const options=collectionOptions(kind,catalog,value);
 const [editor,setEditor]=useState<Label|"new"|null>(null);const [view,setView]=useState<CollectionOption|null>(null);
 return <fieldset className="space-y-3 rounded-xl border border-border bg-muted/20 p-4"><legend className="px-1 text-sm font-medium">{label}</legend>{source.resource.status==="loading"&&<LoadingState/>}{source.resource.status==="error"&&<ErrorState message={source.resource.message} retry={source.retry}/>} {!options.length&&source.resource.status==="ready"&&<p className="text-sm text-muted-foreground">{t("В коллекции пока пусто. Добавьте то, чем пользуетесь.")}</p>}<div className="grid max-h-72 gap-2 overflow-y-auto sm:grid-cols-2">{options.map(item=><div data-action-subject="collection-option" key={item.value} className={`min-w-0 space-y-2 rounded-xl border p-3 pr-12 ${value.includes(item.value)?"border-primary bg-primary/10":"border-border bg-card"}`}><label className="flex cursor-pointer items-start gap-2 text-sm"><Input type="checkbox" className="mt-1 accent-primary" checked={value.includes(item.value)} disabled={!value.includes(item.value)&&!single&&value.length>=30} onChange={event=>change(single?(event.target.checked?[item.value]:[]):toggleKeys(value,item.value,event.target.checked))}/><AppIcon icon={item.icon??definition.icon} className="mt-0.5 size-4 shrink-0"/><span className="break-words">{item.name}</span></label>{(item.description||item.image_id||item.legacy)&&<CollectionReference item={item} compact/>}<ObjectActions actions={[{id:"reference",label:t("Справочная информация"),run:()=>setView(item)},...(definition.expandable&&item.label?[{id:"edit",label:t("Редактировать"),run:()=>setEditor(item.label!)}]:[])]}/></div>)}</div><div className="flex flex-wrap items-center gap-3">{definition.expandable&&<Button size="sm" variant="outline" disabled={!single&&value.length>=30} onClick={()=>setEditor("new")}>{t("Добавить в коллекцию")}</Button>}<Link className="text-xs text-primary underline" to={`/collections?kind=${kind}`} target="_blank" rel="noopener noreferrer">{t("Настроить коллекцию")}</Link></div>{!definition.expandable&&<p className="text-xs text-muted-foreground">{t("Фиксированная коллекция: доступны готовые варианты.")}</p>}{editor&&<CollectionEditor kind={kind} initial={editor==="new"?undefined:editor} close={()=>setEditor(null)} saved={label=>{const previous=editor==="new"?undefined:editor.name;if(previous&&!value.includes(previous))return;const current=previous?value.filter(item=>item!==previous):value;change(single?[label.name]:[...new Set([...current,label.name])].slice(0,30));}}/>}{view&&<CollectionReferenceDialog item={view} close={()=>setView(null)}/>}</fieldset>;
}
