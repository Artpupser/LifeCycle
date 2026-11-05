import {SelectionGesture} from "@/systems/selection/gestures";
import {useSelection} from "@/systems/selection/state";
import {useHistorySelectionActions} from "./selection";
import {ObjectActions} from "@/systems/actions/action-menu";
import {useState,type ReactNode} from "react";
import {Button} from "@/components/ui/button";
import {api,errorMessage} from "@/lib/api";
import {confirmAction} from "@/lib/feedback";
import {t,useLanguage} from "@/systems/i18n/locale";
import {SelectionActions} from "@/systems/selection/selection";
import {selectionMenuActions} from "@/systems/selection/actions";
import type {ContextAction} from "@/systems/actions/context";
export type HistoryKind="task"|"habit"|"pomodoro"|"workout"|"ai"|"activity";
export function HistoryRemove({kind,itemKey,removed,disabled=false,children,actions=[]}:{actions?:ContextAction[];children?:ReactNode;kind:HistoryKind;itemKey:string;removed:()=>void;disabled?:boolean}){
 useLanguage();const [busy,setBusy]=useState(false);const [error,setError]=useState<string|null>(null);
 async function remove(){if(!await confirmAction({title:t("Убрать запись из истории"),message:t("Запись исчезнет из истории. Результаты, статистика и уже применённые изменения сохранятся."),confirmLabel:t("Убрать запись"),destructive:true}))return;setBusy(true);setError(null);try{await api(`/history/${kind}/${encodeURIComponent(itemKey)}`,{method:"DELETE"});removed();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}}
 return <div className="space-y-2"><ObjectActions actions={actions}>{children}<Button size="sm" variant="ghost" className="text-destructive" disabled={busy||disabled} onClick={()=>void remove()}>{t("Убрать из истории")}</Button></ObjectActions>{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}</div>;
}
export function HistoryEntries<T>({items,itemKey,kind,render,removed,scope="",selectable=()=>true}:{items:T[];itemKey:(item:T)=>string;kind:HistoryKind;render:(item:T)=>ReactNode;removed:()=>void;scope?:string;selectable?:(item:T)=>boolean}){
 useLanguage();const selection=useSelection({items,itemKey,scope,selectable});const batch=useHistorySelectionActions(kind,selection,itemKey,removed);
 return <SelectionGesture selection={selection} items={items} itemKey={itemKey} scope={scope} disabled={batch.busy}><div data-action-subject="history-list" tabIndex={0} className="space-y-3"><SelectionActions selection={selection} disabled={batch.busy} actions={batch.actions} allLabel={t("Выбрать показанные")} contribute/>{items.map(item=><article key={itemKey(item)} data-selection-key={itemKey(item)} data-selected={selection.has(item)||undefined} className="space-y-3 rounded-xl border border-border p-4 data-[selected=true]:border-primary data-[selected=true]:ring-2 data-[selected=true]:ring-primary/30">{render(item)}<HistoryRemove kind={kind} itemKey={itemKey(item)} removed={removed} disabled={batch.busy||!selectable(item)} actions={selectionMenuActions(selection,{item,disabled:batch.busy,selectable:selectable(item),allLabel:t("Выбрать показанные"),actions:batch.actions})}/></article>)}</div></SelectionGesture>;
}
