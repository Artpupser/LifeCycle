import {SelectionGesture} from "@/systems/selection/gestures";
import {useSelection} from "@/systems/selection/state";
import {operationNames,operationLabel,historySection} from "./operations";
import {useState} from "react";
import {usePreferences} from "@/features/settings/preferences-context";
import {useResource} from "@/hooks/use-resource";
import {FilterSearch} from "@/components/filter-search";
import {parseFilterQuery,filterRange,filterValue,rangeFilters,type FilterSpec} from "@/lib/filter-query";
import {localDate,shiftDate,dateTimeLabel} from "@/lib/dates";
import {t,useLanguage} from "@/systems/i18n/locale";
import {navigationCatalog} from "@/systems/icons/navigation";
import {AppIcon} from "@/systems/icons/app-icon";
import {Button} from "@/components/ui/button";
import {ErrorState,LoadingState} from "@/components/resource-state";
import {useHistorySelectionActions} from "./selection";
import {HistoryRemove} from "./history";
import {SelectionActions} from "@/systems/selection/selection";
import {selectionMenuActions} from "@/systems/selection/actions";
import {api} from "@/lib/api";

type Item={id:string;section:string;operation:string;entity_key:string;occurred_at:string};type Feed={items:Item[];next_before:string|null;next_id:string|null};
export function HistoryPage(){useLanguage();const {settings}=usePreferences();const today=localDate(settings.timezone);const [query,setQuery]=useState("");const [cursor,setCursor]=useState<{before:string;before_id:string}|null>(null);const specs:FilterSpec[]=[...rangeFilters,{key:"section",aliases:["раздел"],label:t("Раздел"),example:"section:tasks",values:navigationCatalog.map(item=>item.to.slice(1))},{key:"operation",aliases:["действие"],label:t("Действие"),example:"operation:deleted",values:Object.keys(operationNames)}];const filters=parseFilterQuery(query,specs);const range=filterRange(filters,{from:shiftDate(today,-29),to:today});const params=new URLSearchParams({from:range.from,to:range.to,...(cursor??{}),...(filters.text?{text:filters.text}:{}),...(filterValue(filters,"section")?{section:filterValue(filters,"section")}:{}),...(filterValue(filters,"operation")?{operation:filterValue(filters,"operation")}:{} )});const source=useResource<Feed>(range.error?null:`/history?${params}`);
 const items=source.resource.status==="ready"?source.resource.data.items:[];
 async function loadSelection(count:number|null,signal?:AbortSignal){
   const result:Item[]=[];const seen=new Set<string>();
   const start=new URLSearchParams(params);start.delete("before");start.delete("before_id");let path=`/history?${start}`;
   while(count===null||result.length<count){
     const page=await api<Feed>(path,{signal});
     for(const item of page.items)if(!seen.has(item.id)){seen.add(item.id);result.push(item);}
     if(!page.next_before||!page.next_id)break;
     start.set("before",page.next_before);start.set("before_id",page.next_id);path=`/history?${start}`;
   }
   return count===null?result:result.slice(0,count);
 }
 const selection=useSelection({items,itemKey:(item:Item)=>item.id,scope:query,load:loadSelection});
 const batch=useHistorySelectionActions("activity",selection,(item:Item)=>item.id,source.retry);
 return <main data-action-subject="history-feed" tabIndex={0} id="main" className="mx-auto max-w-4xl space-y-6 px-5 py-10 sm:px-10"><header><h1 className="text-3xl font-semibold">{t("История действий")}</h1><p className="mt-3 text-sm text-muted-foreground">{t("Сохранённые действия во всех разделах. Содержимое личных записей в журнал не попадает.")}</p></header><FilterSearch label={t("Поиск истории действий")} value={query} change={value=>{setQuery(value);setCursor(null);}} specs={specs}/><SelectionActions selection={selection} disabled={!!range.error||batch.busy} actions={batch.actions} contribute/>{range.error?<p role="alert">{range.error}</p>:source.resource.status==="loading"?<LoadingState/>:source.resource.status==="error"?<ErrorState message={source.resource.message} retry={source.retry}/>:<><SelectionGesture selection={selection} items={items} itemKey={item=>item.id} scope={`${query}:${cursor?.before_id??""}`} disabled={batch.busy}><div className="space-y-3">{items.map(item=>{const nav=navigationCatalog.find(nav=>nav.to===`/${historySection(item.section)}`);return <article key={item.id} data-selection-key={item.id} data-selected={selection.has(item)||undefined} className="data-[selected=true]:border-primary data-[selected=true]:ring-2 data-[selected=true]:ring-primary/30 flex flex-wrap items-center gap-4 rounded-card border border-line bg-surface p-4"><AppIcon icon={nav?.icon??"tabler:history"}/><div className="min-w-0 flex-1"><p className="text-sm font-medium">{nav?t(nav.label):t(item.section)} · {operationLabel(item.operation)}</p><p className="mt-1 text-xs text-muted-foreground">{dateTimeLabel(item.occurred_at,settings.timezone,settings.time_format)}</p></div><HistoryRemove kind="activity" itemKey={item.id} removed={source.retry} disabled={batch.busy} actions={selectionMenuActions(selection,{item,disabled:!!range.error||batch.busy,actions:batch.actions})}/></article>;})}{!source.resource.data.items.length&&<p className="rounded-xl border border-dashed border-border p-8 text-sm text-muted-foreground">{t("В выбранном периоде нет действий.")}</p>}</div></SelectionGesture><div className="flex gap-3"><Button variant="outline" onClick={()=>{setCursor(null);source.retry();}}>{t("Последние действия")}</Button><Button disabled={!source.resource.data.next_before} onClick={()=>{if(source.resource.status==="ready")setCursor({before:source.resource.data.next_before!,before_id:source.resource.data.next_id!});}}>{t("Ранее")}</Button></div></>}</main>;}
