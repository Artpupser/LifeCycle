import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePreferences } from "@/features/settings/preferences-context";
import { localDate } from "@/lib/dates";
import type { Planning } from "./task-planning";
export function PlanningFields({ value, change, prefix = "plan" }: { value: Planning; change: (value: Planning) => void; prefix?: string }) {
  const {settings}=usePreferences();
  function update(key: keyof Planning, next: string) {
    const result={...value,[key]:next};
    if((key==="startTime" || key==="endTime") && next && !result.startDate && !result.endDate) {result.startDate=localDate(settings.timezone);result.endDate=result.startDate;}
    if(key==="startDate" && next && !result.endDate)result.endDate=next;
    if(key==="startTime" && next && !result.endTime) { const minutes=Number(next.slice(0,2))*60+Number(next.slice(3))+60; result.endTime=`${String(Math.floor(minutes/60)%24).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`; if(minutes>=1440 && result.endDate===result.startDate) {const date=new Date(`${result.startDate}T12:00Z`);if(Number.isFinite(date.getTime())){date.setUTCDate(date.getUTCDate()+1);result.endDate=date.toISOString().slice(0,10);}} }
    change(result);
  }
  return <section className="space-y-3" aria-label="Планирование задачи"><div className="flex items-center justify-between"><h3 className="text-sm font-medium">Когда</h3>{(value.startDate || value.endDate) && <Button size="sm" variant="ghost" onClick={() => change({startDate:"",endDate:"",startTime:"",endTime:""})}>Без дат</Button>}</div><div className="grid grid-cols-2 gap-3"><FormField id={`${prefix}-start-date`} label="Дата начала"><Input id={`${prefix}-start-date`} type="date" value={value.startDate} onChange={(event)=>update("startDate",event.target.value)}/></FormField><FormField id={`${prefix}-end-date`} label="Дата конца"><Input id={`${prefix}-end-date`} type="date" min={value.startDate || undefined} value={value.endDate} onChange={(event)=>update("endDate",event.target.value)}/></FormField><FormField id={`${prefix}-start-time`} label="Время начала"><Input id={`${prefix}-start-time`} type="time" value={value.startTime} onChange={(event)=>update("startTime",event.target.value)}/></FormField><FormField id={`${prefix}-end-time`} label="Время конца"><Input id={`${prefix}-end-time`} type="time" value={value.endTime} onChange={(event)=>update("endTime",event.target.value)}/></FormField></div></section>;
}
