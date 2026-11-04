import {localDate,shiftDate} from "@/lib/dates";
import {api,errorMessage} from "@/lib/api";
import {notify} from "@/lib/feedback";
import {revalidateActiveResources} from "@/systems/loading/cache";
import {t} from "@/systems/i18n/locale";
import {scheduleInZone} from "./schedule-time";
import {taskInput,type Task,type Schedule} from "./types";
export const quickDateChoices=[[0,"Сегодня"],[1,"Завтра"],[-1,"Вчера"],[7,"Через неделю"],[null,"Без даты"]] as const;
export function quickSchedule(task:Task,date:string|null,timezone:string):Schedule|null{if(!date)return null;const old=task.schedule?scheduleInZone(task.schedule,timezone):null;if(!old)return {start_date:date,time:null,timezone,duration_minutes:1,recurrence:"once",interval_days:1,weekdays:[],end_date:null};const delta=Math.round((Date.parse(date)-Date.parse(old.start_date))/86400000);return {...old,start_date:date,end_date:old.end_date?shiftDate(old.end_date,delta):null,weekdays:old.weekdays.map(day=>((day-1+delta)%7+7)%7+1)};}
export async function moveTaskDate(task:Task,offset:number|null,timezone:string){await api(`/tasks/${task.id}`,{method:"PUT",body:{...taskInput(task),schedule:quickSchedule(task,offset===null?null:shiftDate(localDate(timezone),offset),timezone),due_at:null}});revalidateActiveResources(["/tasks","/today","/calendar"]);notify(t("Дата задачи обновлена"));}

export function taskDateActions(task:Task,timezone:string,busy:boolean,edit:()=>void){return [{id:"edit",label:t("Редактировать"),run:edit},...quickDateChoices.map(([offset,label])=>({id:String(offset),label:t(label),disabled:busy,run:()=>void moveTaskDate(task,offset,timezone).catch(error=>notify(errorMessage(error),"error"))}))];}
