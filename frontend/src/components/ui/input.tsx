import "./controls.css";
import { useContext, type ComponentProps, type CSSProperties } from "react";
import {FormFieldContext} from "../form-field-context";
import { DateTimeInput } from "./date-time-input";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/systems/icons/app-icon";
import { numberLabel, t, useLanguage } from "@/systems/i18n/locale";

/** The same optional 0–10 scale serves editable fields and saved measurements. */
export function RatingScale({id,label,value,change,kind="satisfaction"}:{id:string;label:string;value:number|null;change?:(value:number|null)=>void;kind?:"satisfaction"|"libido"}) {
  useLanguage();
  const anchors=[{value:0,icon:"tabler:mood-sad",label:kind==="libido"?t("Низкое либидо"):t("Не удовлетворён")},{value:5,icon:"tabler:mood-neutral",label:kind==="libido"?t("Среднее либидо"):t("Нейтрально")},{value:10,icon:"tabler:mood-happy",label:kind==="libido"?t("Высокое либидо"):t("Удовлетворён")}];
  const anchor=anchors[value===null||value===5?1:value<5?0:2];
  const description=value===null?t("Не указано"):anchor.label;
  return <div className={cn("min-w-0 rounded-xl bg-muted/30",change?"space-y-1 border border-border px-3 py-2":"space-y-2 px-3 py-2")}>
    <div className="flex items-center justify-between gap-2"><label id={`${id}-label`} htmlFor={id} className="min-w-0 text-xs font-medium">{label}</label><div className="flex shrink-0 items-center gap-1.5"><AppIcon icon={anchor.icon} className={cn("size-4",value===null?"text-muted-foreground":"text-primary")}/><output htmlFor={id} className="text-sm font-semibold tabular-nums" title={description}>{value===null?"—":<>{numberLabel(value)}<span className="text-xs font-normal text-muted-foreground"> / {numberLabel(10)}</span></>}</output>{change&&value!==null&&<button type="button" aria-label={`${t("Очистить")}: ${label}`} onClick={()=>change(null)} className="flex size-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><AppIcon icon="tabler:x" className="size-3.5"/></button>}</div></div>
    {change?<><Input id={id} aria-labelledby={`${id}-label`} aria-describedby={`${id}-anchors`} aria-valuetext={value===null?description:`${numberLabel(value)} — ${description}`} type="range" min={0} max={10} step={1} value={value??5} onChange={event=>change(event.target.valueAsNumber)} style={{"--range-progress":`${(value??5)*10}%`} as CSSProperties} className="lc-rating-range"/><div id={`${id}-anchors`} className="flex justify-between gap-2">{anchors.map(item=><button key={item.value} type="button" aria-label={`${numberLabel(item.value)} — ${item.label}`} title={item.label} aria-pressed={value===item.value} onClick={()=>change(item.value)} className="flex min-h-8 items-center gap-1 rounded-md px-1 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><AppIcon icon={item.icon} className="size-3.5"/>{numberLabel(item.value)}</button>)}</div></>:value!==null?<div className="h-1 overflow-hidden rounded-full bg-border" role="meter" id={id} aria-labelledby={`${id}-label`} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value} aria-valuetext={description}><div className="h-full rounded-full bg-primary" style={{width:`${value*10}%`}}/></div>:<p id={id} className="text-xs text-muted-foreground">{description}</p>}
  </div>;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  const field=useContext(FormFieldContext);
  const describedBy=props["aria-describedby"]??(props.id===field?.id?field?.hintId:undefined);
  if(className?.split(/\s+/).includes("sr-only"))return <input {...props} aria-describedby={describedBy} className={className}/>;
  if (["date", "time", "datetime-local"].includes(props.type ?? "")) return <DateTimeInput className={className} {...props} aria-describedby={describedBy}/>;
  if(props.type==="checkbox"||props.type==="radio")return <span className={cn("relative inline-flex size-5 shrink-0 align-middle",className)}><input {...props} aria-describedby={describedBy} className={cn("lc-toggle peer m-0 size-full",props.type==="radio"?"rounded-full":"rounded-md")}/>{props.type==="checkbox"?<AppIcon data-toggle-mark icon="tabler:check" className="pointer-events-none absolute inset-0 m-auto size-3.5 text-primary-foreground opacity-0 peer-checked:opacity-100"/>:<span data-toggle-mark className="pointer-events-none absolute inset-0 m-auto size-2.5 rounded-full bg-primary opacity-0 peer-checked:opacity-100"/>}</span>;
  if(props.type==="range")return <input {...props} aria-describedby={describedBy} className={cn("lc-range min-h-11 w-full min-w-0 accent-primary",className)}/>;
  if(props.type==="hidden")return <input {...props}/>;
  if(props.type==="file")return <input {...props} className={cn("min-h-11 max-w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-primary disabled:opacity-50",className)}/>;
  return <input {...props} aria-describedby={describedBy} inputMode={props.inputMode??(props.type==="number"?(props.step&&props.step!==1&&props.step!=="1"?"decimal":"numeric"):undefined)} className={cn("lc-input h-11 w-full px-3 text-sm placeholder:text-muted-foreground/65",props.type==="color"&&"cursor-pointer p-1.5",className)}/>;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  const field=useContext(FormFieldContext);
  return <textarea {...props} aria-describedby={props["aria-describedby"]??(props.id===field?.id?field?.hintId:undefined)} className={cn("lc-textarea min-h-28 w-full px-3 py-3 text-sm leading-6 placeholder:text-muted-foreground/65", className)}/>;
}
