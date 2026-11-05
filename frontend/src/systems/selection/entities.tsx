import {cloneElement,createContext,useContext,useState,type ReactElement,type ReactNode,type HTMLAttributes} from "react";
import {ObjectActions} from "@/systems/actions/action-menu";
import type {ContextAction} from "@/systems/actions/context";
import {t,useLanguage} from "@/systems/i18n/locale";
import {BulkSubjectTags} from "@/systems/labels/bulk";
import type {LabelSubject} from "@/systems/labels/context";
import {useSelection,type Selection} from "./state";
import {selectionMenuActions} from "./actions";
import {SelectionActions} from "./selection";
import {SelectionGesture} from "./gestures";
import {useSelectionBatch} from "./batch";

type ItemContext={props:(id:string)=>Record<string,unknown>;actions:(id:string)=>ContextAction[];subjectKind?:LabelSubject["kind"]};
const Items=createContext<ItemContext|null>(null);
/** Declarative marker: geometry and menu contributions refer to the same registered entity. */
export function SelectionItem({id,children}:{id:string;children:ReactElement<HTMLAttributes<HTMLElement>>}){
  const context=useContext(Items);const props=context?.props(id);if(!context||!props?.["data-selection-key"])return children;
  return cloneElement(children,{...props,children:<>{children.props.children}<ObjectActions contribute alias={context.subjectKind?`${context.subjectKind}:${id}`:undefined} actions={context.actions(id)}/></>});
}
export function EntitySelectionArea<T>({items,itemKey,scope="",disabled=false,remove,removeMessage,refresh,subjectKind,selectable,actions,children,className}: {
  items:T[];itemKey:(item:T)=>string;scope?:string;disabled?:boolean;remove?:(item:T)=>Promise<unknown>;removeMessage?:string;refresh:()=>void;
  subjectKind?:LabelSubject["kind"];selectable?:(item:T)=>boolean;
  actions?:(selection:Selection<T>,run:ReturnType<typeof useSelectionBatch<T>>["run"],busy:boolean)=>ContextAction[];children:ReactNode;className?:string;
}){
  useLanguage();const selection=useSelection({items,itemKey,scope,selectable,prune:true});const batch=useSelectionBatch(selection,itemKey,refresh,scope);
  const [tagState,setTags]=useState<{scope:string;mode:"add"|"remove"}|null>(null);const tags=tagState?.scope===scope?tagState.mode:null;const locked=disabled||batch.busy;
  const bulk:ContextAction[]=[
    ...(subjectKind?[{id:"tags-add",label:t("Добавить теги выбранным"),disabled:locked||!selection.count,run:()=>setTags({scope,mode:"add"})},{id:"tags-remove",label:t("Убрать теги у выбранных"),disabled:locked||!selection.count,run:()=>setTags({scope,mode:"remove"})}]:[]),
    ...(actions?.(selection,batch.run,locked)??[]),
    ...(remove?[{id:"delete-selected",label:t("Удалить выбранные записи"),danger:true,disabled:locked||!selection.count,run:()=>void batch.run(remove,removeMessage??t("Удалить выбранные записи безвозвратно?"))}]:[])
  ];
  const byId=new Map(items.map(item=>[itemKey(item),item]));
  const context:ItemContext={subjectKind,props:id=>{const item=byId.get(id);return item===undefined?{}:{"data-selection-key":id,"data-selected":selection.has(item)||undefined};},actions:id=>{
    const item=byId.get(id);return item===undefined?[]:selectionMenuActions(selection,{item,disabled:locked,selectable:!selectable||selectable(item),allLabel:t("Выбрать показанные"),actions:bulk});
  }};
  return <Items.Provider value={context}><SelectionGesture selection={selection} items={items} itemKey={itemKey} scope={scope} disabled={locked} className={className??"contents"}><div className="contents" data-action-subject="selection-list" tabIndex={0}><SelectionActions contribute selection={selection} disabled={locked} allLabel={t("Выбрать показанные")} actions={bulk}/>{children}</div></SelectionGesture>{tags&&subjectKind&&<BulkSubjectTags mode={tags} busy={batch.busy} close={()=>{if(!batch.busy)setTags(null);}} apply={operation=>batch.run(item=>operation({kind:subjectKind,id:itemKey(item)})).then(ok=>{if(ok)setTags(null);return ok;})}/>}</Items.Provider>;
}
