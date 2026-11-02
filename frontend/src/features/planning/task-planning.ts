import { localDateTimeToInstant, zonedDateTimeInput, shiftDate, dayDifference } from "@/lib/dates";
import type { Schedule, TaskInput } from "./types";
export type Planning = { startDate: string; endDate: string; startTime: string; endTime: string };
export const emptyPlanning = (): Planning => ({ startDate: "", endDate: "", startTime: "", endTime: "" });
export function planningFromTask(task: Pick<TaskInput, "schedule" | "due_at">, zone: string): Planning {
  const rule = task.schedule;
  if (!rule) { if (!task.due_at) return emptyPlanning(); const end=zonedDateTimeInput(task.due_at,zone); return { ...emptyPlanning(),endDate:end.slice(0,10),endTime:end.slice(11) }; }
  if (!rule.time) return { startDate:rule.start_date,endDate:shiftDate(rule.start_date,Math.max(0,Math.ceil(rule.duration_minutes/1440)-1)),startTime:"",endTime:"" };
  const instant=localDateTimeToInstant(`${rule.start_date}T${rule.time.slice(0,5)}`,rule.timezone);
  if (instant===null) return { startDate:rule.start_date,endDate:rule.start_date,startTime:rule.time.slice(0,5),endTime:"" };
  const start=zonedDateTimeInput(instant,zone);const end=zonedDateTimeInput(instant+rule.duration_minutes*60_000,zone);
  return {startDate:start.slice(0,10),startTime:start.slice(11),endDate:end.slice(0,10),endTime:end.slice(11)};
}
export function buildPlanning(value: Planning, zone: string, original?: Schedule | null): { schedule: Schedule | null; due_at: string | null } {
  if (!value.startDate && !value.endDate) return { schedule:null,due_at:null };
  if (!value.startDate) { const end=localDateTimeToInstant(`${value.endDate}T${value.endTime || "23:59"}`,zone); if(end===null)throw new Error("Такого времени окончания нет. Выберите другое время."); return {schedule:null,due_at:new Date(end).toISOString()}; }
  const startTime=value.startTime || "00:00"; const start=localDateTimeToInstant(`${value.startDate}T${startTime}`,zone);
  const endDate=value.endDate || value.startDate;
  let end=localDateTimeToInstant(`${endDate}T${value.endTime || (value.startTime ? startTime : "23:59")}`,zone);
  if(start===null || end===null)throw new Error("Такого местного времени нет. Выберите другое время.");
  if (!value.startTime && !value.endTime) end+=60_000;
  if(!value.endDate && !value.endTime && value.startTime)end=start+60*60_000;
  const duration=!value.startTime && !value.endTime ? (dayDifference(value.startDate,endDate)+1)*1440 : Math.round((end-start)/60_000);
  const recurrence=original?.recurrence ?? "once"; const maximum=recurrence==="once" ? 366*1440 :1440;
  if(duration<1 || duration>maximum)throw new Error(recurrence==="once" ? "Окончание должно быть после начала, интервал — не более года." : "Повторяющийся интервал должен быть от минуты до суток.");
  return {due_at:null,schedule:{...(original ?? { recurrence:"once",interval_days:1,weekdays:[],end_date:null }),timezone:zone,start_date:value.startDate,time:value.startTime || value.endTime ?startTime:null,duration_minutes:duration}};
}
