import {useState} from "react";
import {Dialog} from "@/components/dialog";
import {AppIcon} from "@/systems/icons/app-icon";
import {EditorForm} from "@/systems/forms/editor";
import {useEditorState} from "@/systems/forms/use-editor";
import {birthdayAnchor,withoutBirthYear,replaceDateYear,calendarMonth,clockInputFields,clockInputValue,dateInputError,dateLabel,dateTimePresets,isCalendarDate,isMonthDay,localDate,shiftDate,shiftMonth,weekday,zonedDateTimeInput} from "@/lib/dates";
import {numberLabel,t,useLanguage} from "@/systems/i18n/locale";
import {Button} from "./button";
import {Input} from "./input";
import {ChoiceField} from "./choice-picker";

type Props={value:string;kind:string;min?:string|number;max?:string|number;step?:string|number;required?:boolean;allowUnknownYear?:boolean;disabled?:boolean;timezone:string;format:"12h"|"24h";weekStartsOn:"monday"|"sunday";choose:(value:string)=>void;close:()=>void};
export function DateTimePicker({value,kind,min,max,step,required,allowUnknownYear,disabled,timezone,format,weekStartsOn,choose,close}:Props){
 useLanguage();const [now]=useState(Date.now);const today=localDate(timezone,now),partial=isMonthDay(value),seconds=Number(step)<60||value.split(":").length>2;
 const initialDate=partial?birthdayAnchor(value):isCalendarDate(value.slice(0,10))?value.slice(0,10):today;
 const initialTime=kind==="time"?value:value.slice(11);
 const [draft,setDraft,editor]=useEditorState(()=>({date:initialDate,clock:clockInputFields(initialTime||zonedDateTimeInput(now,timezone,seconds).slice(11),format),unknownYear:partial}));
 const [month,setMonth]=useState(initialDate.slice(0,7)),[yearText,setYearText]=useState<string|null>(null);
 const time=clockInputValue(draft.clock,format,seconds);
 const hasDate=kind!=="time",hasTime=kind!=="date";
 const result=draft.unknownYear?withoutBirthYear(draft.date):kind==="date"?draft.date:kind==="time"?time:`${draft.date}T${time}`;
 const validation=hasTime&&!time?t("Укажите корректную дату или время."):dateInputError(result,kind,min,max,step,allowUnknownYear);
 const dayDisabled=(date:string)=>disabled||Boolean(!draft.unknownYear&&(min&&date<String(min).slice(0,10)||max&&date>String(max).slice(0,10)))||kind==="date"&&Boolean(dateInputError(draft.unknownYear?withoutBirthYear(date):date,kind,min,max,step,allowUnknownYear));
 function updateTime(part:"hour"|"minute"|"second"|"period",next:string){setDraft({...draft,clock:{...draft.clock,[part]:next}});}
 function selectDate(date:string){setMonth(date.slice(0,7));setDraft({...draft,date});}
 function focusDate(date:string){if(!isCalendarDate(date)||dayDisabled(date))return;selectDate(date);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`[data-calendar-day="${date}"]`)?.focus());}
 return <Dialog className="max-w-md" bodyClassName="p-4" title={t(kind==="time"?"Выбрать время…":"Выбрать дату…")} onClose={close}><EditorForm saveControls={false} editor={editor} className="min-w-0 space-y-4" onSubmit={event=>{event.preventDefault();if(!disabled&&!validation)choose(result);}}>
  <fieldset disabled={disabled} className="min-w-0 space-y-4">
   {allowUnknownYear&&<label className="flex min-h-11 items-center gap-2 text-sm"><Input type="checkbox" checked={draft.unknownYear} onChange={event=>{const unknownYear=event.target.checked;const date=replaceDateYear(draft.date,unknownYear?2000:Number(today.slice(0,4)));setDraft({...draft,date,unknownYear});setMonth(date.slice(0,7));}}/>{t("Год рождения неизвестен")}</label>}
   {!allowUnknownYear&&<div className="flex flex-wrap gap-2">{dateTimePresets(kind,now,timezone,format,seconds).map(([label,next])=><Button key={label} size="sm" variant="outline" disabled={Boolean(dateInputError(next,kind,min,max,step))} onClick={()=>{if(!disabled)choose(next);}}>{label}</Button>)}</div>}
   {hasDate&&<div className="min-w-0 space-y-3">
    <div className="flex min-w-0 items-center gap-1"><Button size="icon" variant="ghost" aria-label={t("Предыдущий месяц")} disabled={month<=(draft.unknownYear?"2000-01":String(min??"0001-01").slice(0,7))} onClick={()=>setMonth(shiftMonth(`${month}-01`,-1).slice(0,7))}><AppIcon icon="tabler:chevron-left"/></Button><div className="min-w-0 flex-1"><ChoiceField aria-label={t("Месяц")} presentation="picker" value={month.slice(5)} options={Array.from({length:12},(_,index)=>{const value=String(index+1).padStart(2,"0");return {value,label:dateLabel(`2000-${value}-01`,{month:"long"})};})} change={next=>setMonth(`${month.slice(0,4)}-${next}`)}/></div>{!draft.unknownYear&&<Input aria-label={t("Год")} type="number" className="w-24 shrink-0" min={Number(String(min??"0001").slice(0,4))} max={Number(String(max??"9998").slice(0,4))} value={yearText??Number(month.slice(0,4))} onBlur={()=>setYearText(null)} onChange={event=>{setYearText(event.target.value);const year=event.target.valueAsNumber;if(Number.isInteger(year)&&year>=1&&year<=9998)setMonth(`${String(year).padStart(4,"0")}-${month.slice(5)}`);}}/>}<Button size="icon" variant="ghost" aria-label={t("Следующий месяц")} disabled={month>=(draft.unknownYear?"2000-12":String(max??"9998-12").slice(0,7))} onClick={()=>setMonth(shiftMonth(`${month}-01`,1).slice(0,7))}><AppIcon icon="tabler:chevron-right"/></Button></div>
    <div className="space-y-0.5" role="grid" aria-label={dateLabel(`${month}-01`,{month:"long",...draft.unknownYear?{}:{year:"numeric"}})}>
     <div role="row" className="grid grid-cols-7 gap-0.5">{calendarMonth(`${month}-01`,weekStartsOn).slice(0,7).map(date=><span key={date} role="columnheader" className="py-2 text-center text-xs text-fg-muted">{dateLabel(date,{weekday:"short"})}</span>)}</div>
     {Array.from({length:6},(_,row)=><div role="row" key={row} className="grid grid-cols-7 gap-0.5">{calendarMonth(`${month}-01`,weekStartsOn).slice(row*7,row*7+7).map(date=><button key={date} type="button" role="gridcell" data-calendar-day={date} aria-label={dateLabel(date,{day:"numeric",month:"long",...draft.unknownYear?{}:{year:"numeric"}})} aria-selected={date===draft.date} aria-current={date===today?"date":undefined} tabIndex={date===(draft.date.startsWith(month)?draft.date:`${month}-01`)?0:-1} disabled={dayDisabled(date)||draft.unknownYear&&!date.startsWith("2000-")} className={`min-h-11 min-w-0 rounded-control text-sm disabled:opacity-30 ${date===draft.date?"bg-accent text-accent-fg":date.startsWith(month)?"text-fg hover:bg-surface-2":"text-fg-muted hover:bg-surface-2"}`} onClick={()=>selectDate(date)} onKeyDown={event=>{const offset=({ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-((weekday(date)+(weekStartsOn==="monday"?6:0))%7),End:6-((weekday(date)+(weekStartsOn==="monday"?6:0))%7)})[event.key];if(offset!==undefined){event.preventDefault();focusDate(shiftDate(date,offset));}else if(event.key==="PageUp"||event.key==="PageDown"){event.preventDefault();focusDate(shiftMonth(date,event.key==="PageUp"?-1:1));}}}>{numberLabel(Number(date.slice(8)))}</button>)}</div>)}
    </div>
   </div>}
   {hasTime&&<div className="flex flex-wrap items-end gap-3">{[{key:"hour" as const,label:t("Часы"),max:format==="12h"?12:23,min:format==="12h"?1:0},{key:"minute" as const,label:t("Минуты"),max:59,min:0},...(seconds?[{key:"second" as const,label:t("Секунды"),max:59,min:0}]:[])].map(field=><label key={field.key} className="min-w-0 flex-1 space-y-2 text-sm"><span>{field.label}</span><Input aria-label={field.label} type="number" min={field.min} max={field.max} required value={draft.clock[field.key]} onChange={event=>updateTime(field.key,event.target.value)}/></label>)}{format==="12h"&&<ChoiceField aria-label={t("Период суток")} value={draft.clock.period} options={[{value:"am",label:t("До полудня")},{value:"pm",label:t("После полудня")}]} change={next=>updateTime("period",next)}/>}</div>}
   {validation&&<p role="status" className="text-sm text-destructive">{validation}</p>}
   <div className="flex flex-wrap justify-end gap-2">{!required&&<Button variant="ghost" onClick={()=>{if(!disabled)choose("");}}>{t("Очистить")}</Button>}<Button variant="outline" onClick={close}>{t("Отмена")}</Button><Button type="submit" disabled={disabled||!!validation}>{t("Выбрать")}</Button></div>
  </fieldset>
 </EditorForm></Dialog>;
}
