import "./controls.css";
import { useContext, type ComponentProps } from "react";
import {FormFieldContext} from "../form-field-context";
import { DateTimeInput } from "./date-time-input";
import { cn } from "@/lib/utils";
import { AppIcon } from "@/systems/icons/app-icon";
import { numberLabel, t, useLanguage } from "@/systems/i18n/locale";

/** The same optional 0–10 scale serves editable fields and saved measurements. */
export function RatingScale({id,label,value,change}:{id:string;label:string;value:number|null;change?:(value:number|null)=>void}) {
  useLanguage();
  const anchors=[{value:0,icon:"tabler:mood-sad",label:t("Не удовлетворён")},{value:5,icon:"tabler:mood-neutral",label:t("Нейтрально")},{value:10,icon:"tabler:mood-happy",label:t("Удовлетворён")}];
  const description=value===null?t("Не указано"):anchors[value<5?0:value===5?1:2].label;
  return <div className="min-w-0 space-y-3 rounded-xl border border-border p-4">
    <div className="flex items-start justify-between gap-2"><label id={`${id}-label`} htmlFor={id} className="text-sm font-medium">{label}</label><output htmlFor={id} className="shrink-0 text-sm text-muted-foreground">{value===null?t("Не указано"):`${numberLabel(value)} / ${numberLabel(10)}`}</output></div>
    {change?<Input id={id} aria-labelledby={`${id}-label`} aria-valuetext={value===null?description:`${numberLabel(value)} — ${description}`} type="range" min={0} max={10} step={1} value={value??5} onChange={event=>change(event.target.valueAsNumber)} className="h-6 w-full cursor-pointer accent-primary disabled:cursor-not-allowed"/>:<meter id={id} aria-labelledby={`${id}-label`} min={0} max={10} value={value??0} aria-valuetext={description} className="h-4 w-full accent-primary"/>}
    <div className="flex justify-between gap-2">{anchors.map(anchor=>change?<button key={anchor.value} type="button" aria-label={`${numberLabel(anchor.value)} — ${anchor.label}`} title={anchor.label} aria-pressed={value===anchor.value} onClick={()=>change(anchor.value)} className="flex min-h-11 flex-col items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"><AppIcon icon={anchor.icon}/>{numberLabel(anchor.value)}</button>:<span key={anchor.value} title={anchor.label} className="flex flex-col items-center gap-1 text-xs text-muted-foreground"><AppIcon icon={anchor.icon}/>{numberLabel(anchor.value)}</span>)}</div>
    {change&&value!==null&&<button type="button" className="min-h-9 text-xs text-primary underline" onClick={()=>change(null)}>{t("Очистить")}</button>}
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
