import { t, useLanguage } from "@/systems/i18n/locale";
import {useContext,type ComponentProps} from "react";
import {CalendarDays,Clock3} from "@/components/icons";
import {PreferencesContext} from "@/features/settings/preferences-context";
import {dateTimePresets} from "@/lib/dates";
import {useActionMenu} from "@/systems/actions/context";
import {cn} from "@/lib/utils";
import {useControlState} from "./control-state";
import {Button} from "./button";
export function DateTimeInput({className,ref:forwarded,...props}:ComponentProps<"input">){
 useLanguage();const preferences=useContext(PreferencesContext);const open=useActionMenu();const [bindRef,inputRef,blocked,isDisabled]=useControlState(props.disabled,forwarded);const kind=props.type;
 function choose(value:string){
  const element=inputRef.current;if(!element||isDisabled())return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(element,value);
  element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));element.focus();
 }
 return <div className={cn("relative min-w-0",className?.includes("w-auto")?"w-auto":"w-full")}><input {...props} ref={bindRef} className={cn("lc-input h-11 w-full px-3 pr-12 text-sm",className)}/><Button type="button" size="icon" variant="ghost" disabled={blocked||props.readOnly} className="absolute right-1 top-1 size-9" aria-label={t("Быстрый выбор {v0}: {v1}",{v0:kind==="time"?t("времени"):t("даты"),v1:props["aria-label"]??props.id??t("Поле")})} aria-haspopup="menu" onClick={event=>{
  if(isDisabled()||props.readOnly)return;const box=event.currentTarget.getBoundingClientRect();
  open([...dateTimePresets(kind,Date.now(),preferences?.settings.timezone??"UTC",preferences?.settings.time_format??"24h",props.step===1||props.step==="1").map(([label,value])=>({id:label,label:t(label),disabled:Boolean(props.min&&value<String(props.min)||props.max&&value>String(props.max)),run:()=>choose(value)})),{id:"calendar",label:t(kind==="time"?"Выбрать время…":"Выбрать дату…"),run:()=>{if(isDisabled())return;try{inputRef.current?.showPicker();}catch{inputRef.current?.focus();}}}],box.left,box.bottom,event.currentTarget);
 }}>{kind==="time"?<Clock3 className="size-4"/>:<CalendarDays className="size-4"/>}</Button></div>;
}
