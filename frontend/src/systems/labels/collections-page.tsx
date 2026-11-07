import {useState} from "react";
import {Link,useSearchParams} from "react-router";
import {FilterSearch} from "@/components/filter-search";
import {ErrorState,LoadingState} from "@/components/resource-state";
import {Button} from "@/components/ui/button";
import {useResource} from "@/hooks/use-resource";
import {useAction} from "@/hooks/use-action";
import {api} from "@/lib/api";
import {confirmAction} from "@/lib/feedback";
import {parseFilterQuery,matchesFilter,filterValue,type FilterSpec} from "@/lib/filter-query";
import {AppIcon} from "@/systems/icons/app-icon";
import {ObjectActions} from "@/systems/actions/action-menu";
import {EntitySelectionArea,SelectionItem} from "@/systems/selection/entities";
import {t,useLanguage} from "@/systems/i18n/locale";
import {collectionCatalog,collectionOptions,isCollectionKind,type CollectionKind,type CollectionOption} from "./collection-catalog";
import {CollectionEditor} from "./collection-editor";
import {refreshCollectionResources} from "./collection-resources";
import {CollectionReference,CollectionReferenceDialog} from "./collection-reference";
import type {Label} from "./types";

export function CollectionsPage(){
 useLanguage();const [params]=useSearchParams();const initialKind=params.get("kind");const [query,setQuery]=useState(initialKind&&isCollectionKind(initialKind)?`kind:${initialKind}`:"");
 const source=useResource<Label[]>("/labels");const action=useAction();const [editor,setEditor]=useState<{kind:CollectionKind;label?:Label}|null>(null);const [view,setView]=useState<CollectionOption|null>(null);
 const specs:FilterSpec[]=[{key:"kind",aliases:["коллекция","тип"],label:t("Коллекция"),example:"kind:toy",values:collectionCatalog.flatMap(item=>[item.id,t(item.name)])},{key:"mode",aliases:["режим"],label:t("Тип коллекции"),example:"mode:expandable",values:["fixed","expandable","фиксированная","расширяемая"]}];
 const filters=parseFilterQuery(query,specs);const activeKind=filterValue(filters,"kind");const active=collectionCatalog.find(item=>item.id===activeKind||t(item.name).toLowerCase()===activeKind.toLowerCase());
 const catalog=source.resource.status==="ready"?source.resource.data:[];
 const groups=collectionCatalog.map(definition=>({definition,items:collectionOptions(definition.id,catalog).filter(item=>matchesFilter(filters,`${item.name} ${item.description}`,{kind:[definition.id,t(definition.name)],mode:definition.expandable?["expandable","расширяемая"]:["fixed","фиксированная"]}))}));
 const visible=groups.flatMap(group=>group.items.flatMap(item=>group.definition.expandable&&item.label?[item.label]:[]));
 const deletion=t("Убрать выбранные элементы из коллекций? Значения в сохранённых записях журнала останутся.");
 async function remove(label:Label){if(await confirmAction({title:t("Убрать из коллекции"),message:t("Убрать «{name}» из коллекции? Значения в сохранённых записях журнала останутся.",{name:label.name}),confirmLabel:t("Убрать"),destructive:true}))await action.run(()=>api(`/labels/${label.id}`,{method:"DELETE",body:{revision:label.revision}}),refreshCollectionResources);}
 return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{t("Коллекции")}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("Ваши вещи и личные варианты со справочной информацией. В формах показывается только ваша коллекция.")}</p><Link to="/labels" className="mt-3 inline-block text-sm text-primary underline">{t("Теги и категории")}</Link></div>{(!active||active.expandable)&&<Button disabled={source.resource.status!=="ready"} onClick={()=>setEditor({kind:active?.id??"toy"})}>{t("Добавить в коллекцию")}</Button>}</header><FilterSearch label={t("Поиск коллекций")} value={query} change={setQuery} specs={specs}/>{source.resource.status==="loading"&&<LoadingState/>}{source.resource.status==="error"&&<ErrorState message={source.resource.message} retry={source.retry}/>} {action.error&&<p role="alert" className="text-sm text-destructive">{action.error}</p>}<EntitySelectionArea items={visible} itemKey={label=>label.id} scope={query} disabled={action.busy||!!editor} refresh={refreshCollectionResources} remove={label=>api(`/labels/${label.id}`,{method:"DELETE",body:{revision:label.revision}})} removeMessage={deletion}>
 {groups.map(({definition,items})=>{
  const showEmpty=!filters.text&&matchesFilter(filters,"",{kind:[definition.id,t(definition.name)],mode:definition.expandable?["expandable","расширяемая"]:["fixed","фиксированная"]});
  if(!items.length&&!showEmpty)return null;
  return <section data-action-subject="collection" key={definition.id} aria-label={t(definition.name)} className="space-y-4"><header className="flex items-center gap-3"><AppIcon icon={definition.icon} className="size-6"/><div><h2 className="text-xl font-semibold">{t(definition.name)}</h2><p className="text-xs text-muted-foreground">{t(definition.expandable?"Расширяемая коллекция":"Фиксированная коллекция")}</p></div>{definition.expandable&&<ObjectActions actions={[{id:"new",label:t("Добавить в коллекцию"),disabled:source.resource.status!=="ready",run:()=>setEditor({kind:definition.id})}]}/>}</header>{items.length?<div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=>{
   const card=<article className="min-w-0 space-y-3 rounded-xl border border-border bg-card p-5"><h3 className="flex items-start gap-2 break-words pr-8 font-semibold"><AppIcon icon={item.icon??definition.icon}/>{item.name}</h3><CollectionReference item={item} compact/><ObjectActions actions={[{id:"reference",label:t("Справочная информация"),run:()=>setView(item)},...(definition.expandable&&item.label?[{id:"edit",label:t("Редактировать"),disabled:action.busy,run:()=>setEditor({kind:definition.id,label:item.label})},{id:"remove",label:t("Убрать из коллекции"),danger:true,disabled:action.busy,run:()=>void remove(item.label!)}]:[])]}/></article>;
   return definition.expandable&&item.label?<SelectionItem key={item.label.id} id={item.label.id}>{card}</SelectionItem>:<div key={item.value} className="contents">{card}</div>;
  })}</div>:<p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">{t("В коллекции пока пусто. Добавьте то, чем пользуетесь.")}</p>}</section>;
 })}
 {!groups.some(group=>group.items.length)&&filters.text&&<p className="text-sm text-muted-foreground">{t("Ничего не найдено")}</p>}
 </EntitySelectionArea>{editor&&<CollectionEditor kind={editor.kind} initial={editor.label} chooseKind={!editor.label&&!active} close={()=>setEditor(null)}/>} {view&&<CollectionReferenceDialog item={view} close={()=>setView(null)}/>}<p className="text-xs text-muted-foreground">{t("Эмоции, виды секса, лубриканты и контрацепция — фиксированные справочники. Создание своих вариантов в них недоступно.")}</p></main>;
}
