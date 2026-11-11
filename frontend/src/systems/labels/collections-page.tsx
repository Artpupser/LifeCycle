import {usePreferences} from "@/features/settings/preferences-context";
import type {Settings} from "@/features/settings/types";
import {DragScope,DragItem,type DragData} from "@/systems/animations/drag-drop";
import {reorder} from "@/systems/animations/drag-order";
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
import {visibleCollectionCatalog,orderedCollectionCatalog,collectionCatalog,collectionOptions,isCollectionKind,type CollectionKind,type CollectionOption} from "./collection-catalog";
import {CollectionEditor} from "./collection-editor";
import {refreshCollectionResources} from "./collection-resources";
import {CollectionReference,CollectionReferenceDialog} from "./collection-reference";
import type {Label} from "./types";

export function CollectionsPage(){
 useLanguage();const {settings,updateSettings}=usePreferences();const [params]=useSearchParams();const initialKind=params.get("kind");const [query,setQuery]=useState(initialKind&&isCollectionKind(initialKind)?`kind:${initialKind}`:"");
 const source=useResource<Label[]>("/labels");const action=useAction();const [editor,setEditor]=useState<{kind:CollectionKind;label?:Label}|null>(null);const [view,setView]=useState<CollectionOption|null>(null);
 const hidden=settings.hidden_collections??[];
 const privateKinds=collectionCatalog.filter(item=>item.sensitive).map(item=>item.id);
 const allPrivateHidden=privateKinds.length>0&&privateKinds.every(kind=>hidden.includes(kind));
 async function savePreferences(patch:Partial<Settings>){return action.run(async()=>{const saved=await api<Settings>("/settings",{method:"PUT",body:{...settings,...patch}});updateSettings(saved);});}
 async function saveHidden(next:string[]){await savePreferences({hidden_collections:[...new Set(next)]});}
 const order=orderedCollectionCatalog(settings.collection_order).map(item=>item.id);
 function moveCollection(source:DragData,target:DragData){if(action.busy||source.kind!=="collection"||target.kind!=="collection")return;const from=order.indexOf(source.id as CollectionKind),to=order.indexOf(target.id as CollectionKind);if(from<0||to<0||from===to)return;void savePreferences({collection_order:reorder(order,from,to)});}
 function moveBy(kind:CollectionKind,direction:number){const index=order.indexOf(kind),next=index+direction;if(next>=0&&next<order.length)void savePreferences({collection_order:reorder(order,index,next)});}
 const visibleCatalog=visibleCollectionCatalog(hidden,settings.collection_order);
 const specs:FilterSpec[]=[{key:"kind",aliases:["коллекция","тип"],label:t("Коллекция"),example:"kind:toy",values:visibleCatalog.flatMap(item=>[item.id,t(item.name)])},{key:"mode",aliases:["режим"],label:t("Тип коллекции"),example:"mode:expandable",values:["fixed","expandable","фиксированная","расширяемая"]}];
 const filters=parseFilterQuery(query,specs);const activeKind=filterValue(filters,"kind");const active=visibleCatalog.find(item=>item.id===activeKind||t(item.name).toLowerCase()===activeKind.toLowerCase());
 const catalog=source.resource.status==="ready"?source.resource.data:[];
 const groups=visibleCatalog.map(definition=>({definition,items:collectionOptions(definition.id,catalog).filter(item=>matchesFilter(filters,`${item.name} ${item.description}`,{kind:[definition.id,t(definition.name)],mode:definition.expandable?["expandable","расширяемая"]:["fixed","фиксированная"]}))}));
 const visible=groups.flatMap(group=>group.items.flatMap(item=>group.definition.expandable&&item.label?[item.label]:[]));
 const deletion=t("Убрать выбранные элементы из коллекций? Значения в сохранённых записях журнала останутся.");
 async function remove(label:Label){if(await confirmAction({title:t("Убрать из коллекции"),message:t("Убрать «{name}» из коллекции? Значения в сохранённых записях журнала останутся.",{name:label.name}),confirmLabel:t("Убрать"),destructive:true}))await action.run(()=>api(`/labels/${label.id}`,{method:"DELETE",body:{revision:label.revision}}),refreshCollectionResources);}
 return <main id="main" className="mx-auto max-w-6xl space-y-7 px-5 py-10 sm:px-10"><header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">{t("Коллекции")}</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("Ваши вещи и личные варианты со справочной информацией. В формах показывается только ваша коллекция.")}</p><Link to="/labels" className="mt-3 inline-block text-sm text-primary underline">{t("Теги и категории")}</Link></div><div className="flex flex-wrap items-center gap-2"><Button variant="outline" disabled={action.busy} aria-pressed={allPrivateHidden} onClick={()=>void saveHidden(allPrivateHidden?hidden.filter(kind=>!privateKinds.includes(kind as CollectionKind)):[...hidden,...privateKinds])}><AppIcon icon={allPrivateHidden?"tabler:eye":"tabler:eye-off"}/>{t(allPrivateHidden?"Показать приватные коллекции":"Скрыть приватные коллекции")}</Button>{hidden.length>0&&<ObjectActions actions={[{id:"restore",label:t("Скрытые коллекции"),children:collectionCatalog.filter(item=>hidden.includes(item.id)).map(item=>({id:item.id,label:t(item.name),icon:item.icon,disabled:action.busy,run:()=>void saveHidden(hidden.filter(kind=>kind!==item.id))})),run:()=>{}}]}/>} {(active?.expandable||!active&&visibleCatalog.some(item=>item.expandable))&&<Button disabled={source.resource.status!=="ready"} onClick={()=>setEditor({kind:active?.id??visibleCatalog.find(item=>item.expandable)?.id??"emotion"})}>{t("Добавить в коллекцию")}</Button>}</div></header><FilterSearch label={t("Поиск коллекций")} value={query} change={setQuery} specs={specs}/>{source.resource.status==="loading"&&<LoadingState/>}{source.resource.status==="error"&&<ErrorState message={source.resource.message} retry={source.retry}/>} {action.error&&<p role="alert" className="text-sm text-destructive">{action.error}</p>}<EntitySelectionArea items={visible} itemKey={label=>label.id} scope={`${query}:${hidden.join(",")}`} disabled={action.busy||!!editor} refresh={refreshCollectionResources} remove={label=>api(`/labels/${label.id}`,{method:"DELETE",body:{revision:label.revision}})} removeMessage={deletion}>
 <DragScope drop={moveCollection}><div className="space-y-7">{groups.map(({definition,items})=>{
  const showEmpty=!filters.text&&matchesFilter(filters,"",{kind:[definition.id,t(definition.name)],mode:definition.expandable?["expandable","расширяемая"]:["fixed","фиксированная"]});
  if(!items.length&&!showEmpty)return null;
  return <DragItem key={definition.id} data={{kind:"collection",id:definition.id}} disabled={action.busy||!!editor}><section data-action-subject="collection" aria-label={t(definition.name)} className="space-y-4"><header className="flex min-w-0 items-center gap-3"><Button data-drag-handle variant="ghost" size="icon" className="shrink-0 touch-none cursor-grab" disabled={action.busy} aria-label={t("Перетащить коллекцию {name}",{name:t(definition.name)})}><AppIcon icon="tabler:grip-vertical"/></Button><AppIcon icon={definition.icon} className="size-6 shrink-0"/><div className="min-w-0 flex-1"><h2 className="break-words text-xl font-semibold">{t(definition.name)}</h2><p className="text-xs text-muted-foreground">{t(definition.expandable?"Расширяемая коллекция":"Фиксированная коллекция")}</p></div><ObjectActions placement="inline" actions={[{id:"move-up",label:t("Переместить выше"),icon:"tabler:arrow-up",disabled:action.busy||order.indexOf(definition.id)===0,run:()=>moveBy(definition.id,-1)},{id:"move-down",label:t("Переместить ниже"),icon:"tabler:arrow-down",disabled:action.busy||order.indexOf(definition.id)===order.length-1,run:()=>moveBy(definition.id,1)},{id:"hide",label:t("Скрыть коллекцию"),icon:"tabler:eye-off",disabled:action.busy,run:()=>void saveHidden([...hidden,definition.id])},...(definition.expandable?[{id:"new",label:t("Добавить в коллекцию"),disabled:source.resource.status!=="ready",run:()=>setEditor({kind:definition.id})}]:[])]}/></header>{items.length?<div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(item=>{
   const card=<article className="min-w-0 space-y-3 rounded-card border border-line bg-surface p-5"><h3 className="flex items-start gap-2 break-words pr-8 font-semibold"><AppIcon icon={item.icon??definition.icon}/>{item.name}</h3><CollectionReference item={item} compact/><ObjectActions actions={[{id:"reference",label:t("Справочная информация"),run:()=>setView(item)},...(definition.expandable&&item.label?[{id:"edit",label:t("Редактировать"),disabled:action.busy,run:()=>setEditor({kind:definition.id,label:item.label})},{id:"remove",label:t("Убрать из коллекции"),danger:true,disabled:action.busy,run:()=>void remove(item.label!)}]:[])]}/></article>;
   return definition.expandable&&item.label?<SelectionItem key={item.label.id} id={item.label.id}>{card}</SelectionItem>:<div key={item.value} className="contents">{card}</div>;
  })}</div>:<p className="rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">{t("В коллекции пока пусто. Добавьте то, чем пользуетесь.")}</p>}</section></DragItem>;
 })}</div></DragScope>
 {!groups.some(group=>group.items.length)&&filters.text&&<p className="text-sm text-muted-foreground">{t("Ничего не найдено")}</p>}
 </EntitySelectionArea>{editor&&<CollectionEditor kind={editor.kind} initial={editor.label} chooseKind={!editor.label&&!active} hiddenKinds={hidden} close={()=>setEditor(null)}/>} {view&&<CollectionReferenceDialog item={view} close={()=>setView(null)}/>}<p className="text-xs text-muted-foreground">{t("Скрытие действует на этой странице. Данные и выбор в журнале сохраняются.")}</p><p className="text-xs text-muted-foreground">{t("Эмоции, виды секса, лубриканты и контрацепция — фиксированные справочники. Создание своих вариантов в них недоступно.")}</p></main>;
}
