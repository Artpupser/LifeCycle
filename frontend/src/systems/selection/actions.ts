import type {ContextAction} from "@/systems/actions/context";
import {notify} from "@/lib/feedback";
import {errorMessage} from "@/lib/api";
import {t} from "@/systems/i18n/locale";
import type {Selection} from "./state";

/** The same declarations serve object right-click, keyboard and the touch trigger. */
export function selectionMenuActions<T>(selection:Selection<T>,{item,disabled=false,selectable=true,allLabel,actions=[]}:{item?:T;disabled?:boolean;selectable?:boolean;allLabel?:string;actions?:ContextAction[]}={}):ContextAction[]{
 const unavailable=disabled||selection.loading;
 const select=(count:number|null)=>{void selection.first(count).then(total=>{if(total!==undefined)notify(t("Выбрано: {count}",{count:total}));}).catch(failure=>notify(errorMessage(failure),"error"));};
 const first:ContextAction[]=[10,50,100].map(count=>({id:`first-${count}`,label:t("Первые {count}",{count}),disabled:unavailable||count>selection.limit,run:()=>select(count)}));
 const commands:ContextAction[]=[...first,{id:"first-n",label:t("Первые N…"),disabled:unavailable,run:()=>{},numberInput:{label:t("Количество для выбора"),min:1,max:Number.isFinite(selection.limit)?selection.limit:undefined,initial:Math.min(10,selection.limit),submit:select}},{id:"all",label:allLabel??t("Выбрать все"),disabled:unavailable,run:()=>select(null)},{id:"clear",label:t("Снять выбор"),disabled:disabled||(!selection.count&&!selection.loading),run:selection.clear},...actions];
 if(Number.isFinite(selection.limit))commands.push({id:"limit",label:t("Предел выбора: {count}",{count:selection.limit}),disabled:true,run:()=>{}});
 return [...(item===undefined?[]:[{id:"select-object",label:t(selection.has(item)?"Снять выбор записи":"Выбрать запись"),icon:selection.has(item)?"tabler:square-check":"tabler:square",disabled:unavailable||!selectable||(!selection.has(item)&&selection.count>=selection.limit),run:()=>selection.toggle(item,!selection.has(item))}]),{id:"selection",label:selection.loading?t("Загрузка выбора…"):t("Множественный выбор ({count})",{count:selection.count}),icon:"tabler:list-check",children:commands,run:()=>{}}];
}
