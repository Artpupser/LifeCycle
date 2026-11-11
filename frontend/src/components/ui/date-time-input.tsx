import {useContext,useLayoutEffect,useState,type ComponentProps} from "react";
import {createPortal} from "react-dom";
import {CalendarDays,Clock3} from "@/components/icons";
import {FormFieldContext} from "../form-field-context";
import {PreferencesContext} from "@/features/settings/preferences-context";
import {dateInputError} from "@/lib/dates";
import {t,useLanguage} from "@/systems/i18n/locale";
import {cn} from "@/lib/utils";
import {useControlState} from "./control-state";
import {Button} from "./button";
import {DateTimePicker} from "./date-time-picker";

export type DateTimeInputProps=ComponentProps<"input">&{allowUnknownYear?:boolean};
/** All Input date/time fields use this picker, including fields inside disabled fieldsets. */
export function DateTimeInput({className,ref:forwarded,allowUnknownYear=false,...props}:DateTimeInputProps){
 useLanguage();const field=useContext(FormFieldContext);const preferences=useContext(PreferencesContext);
 const [bindRef,inputRef,blocked,isDisabled]=useControlState(props.disabled,forwarded);
 const [opened,setOpened]=useState(false),[host,setHost]=useState<HTMLElement|null>(null);
 const kind=props.type??"date",value=String(props.value??props.defaultValue??"");
 const [pickerValue,setPickerValue]=useState(value);
 const error=(next:string)=>dateInputError(next,kind,props.min,props.max,props.step,allowUnknownYear);
 useLayoutEffect(()=>{inputRef.current?.setCustomValidity(dateInputError(value,kind,props.min,props.max,props.step,allowUnknownYear));},[value,kind,props.min,props.max,props.step,allowUnknownYear,inputRef]);
 function show(){if(isDisabled()||props.readOnly)return;setPickerValue(inputRef.current?.value??value);setHost(inputRef.current?.closest<HTMLElement>("[data-dialog-root]")??document.body);setOpened(true);}
 function choose(next:string){
  const element=inputRef.current;if(!element||isDisabled()||props.readOnly)return;
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(element,next);
  element.setCustomValidity(error(next));
  element.dispatchEvent(new Event("input",{bubbles:true}));element.dispatchEvent(new Event("change",{bubbles:true}));
  setOpened(false);element.focus();
 }
 const title=t(kind==="time"?"Выбрать время…":"Выбрать дату…");
 return <div className={cn("relative min-w-0",className?.includes("w-auto")?"w-auto":"w-full")}>
  <input {...props} type="text" ref={bindRef} inputMode="text" placeholder={props.placeholder??(kind==="date"?"YYYY-MM-DD":kind==="time"?"HH:mm":"YYYY-MM-DDTHH:mm")} className={cn("lc-input h-11 w-full min-w-0 px-3 pr-12 text-sm",className)} onChange={event=>{event.currentTarget.setCustomValidity(error(event.currentTarget.value));props.onChange?.(event);}} onKeyDown={event=>{props.onKeyDown?.(event);if(!event.defaultPrevented&&event.key==="ArrowDown"){event.preventDefault();show();}}} aria-haspopup="dialog" aria-expanded={opened}/>
  <Button type="button" size="icon" variant="ghost" disabled={blocked||props.readOnly} className="absolute right-1 top-0 size-11" aria-label={`${title} ${props["aria-label"]??field?.label??t("Поле")}`} title={title} aria-haspopup="dialog" aria-expanded={opened} onClick={show}>{kind==="time"?<Clock3 className="size-4"/>:<CalendarDays className="size-4"/>}</Button>
  {opened&&createPortal(<DateTimePicker value={pickerValue} kind={kind} min={props.min} max={props.max} step={props.step} required={props.required} allowUnknownYear={allowUnknownYear} disabled={blocked||props.readOnly} timezone={preferences?.settings.timezone??"UTC"} format={preferences?.settings.time_format??"24h"} weekStartsOn={preferences?.settings.week_starts_on??"monday"} choose={choose} close={()=>{setOpened(false);inputRef.current?.focus();}}/>,host??document.body)}
 </div>;
}
