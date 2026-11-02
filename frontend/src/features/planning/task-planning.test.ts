import { expect, it } from "vitest";
import { buildPlanning, planningFromTask } from "./task-planning";
import { isTaskOverdue, occurrenceCoversDate, sortedTasks, taskTiming } from "./task-timing";
import { changedInterval } from "./gantt-time";
import type { Task } from "./types";
const fields={startDate:"2026-10-31",endDate:"2026-11-02",startTime:"09:00",endTime:"18:00"};
it("roundtrips a multiday interval in the account timezone and covers intermediate days",()=>{
  const plan=buildPlanning(fields,"Europe/Moscow");
  expect(plan.schedule?.duration_minutes).toBe(3420);
  expect(plan.due_at).toBeNull();
  expect(planningFromTask(plan,"Europe/Moscow")).toEqual(fields);
  const occurrence={date:fields.startDate,starts_at:"2026-10-31T06:00Z",task:plan};
  expect(occurrenceCoversDate(occurrence,"2026-11-01","UTC")).toBe(true);
  expect(occurrenceCoversDate(occurrence,"2026-11-03","UTC")).toBe(false);
});
it("keeps all-day dates inclusive and handles elapsed time across DST",()=>{
  const plan=buildPlanning({...fields,startTime:"",endTime:""},"Europe/Berlin");
  expect(plan.schedule?.duration_minutes).toBe(4320);
  expect(planningFromTask(plan,"Europe/Berlin")).toEqual({...fields,startTime:"",endTime:""});
  expect(taskTiming({...plan} as Task,Date.parse("2026-11-01T12:00Z"),"Europe/Berlin")?.text).toBe("Сегодня");
  const dst=buildPlanning({startDate:"2026-10-25",endDate:"2026-10-25",startTime:"01:30",endTime:"03:30"},"Europe/Berlin");
  expect(dst.schedule?.duration_minutes).toBe(180);
  expect(()=>buildPlanning({startDate:"2026-03-29",endDate:"2026-03-29",startTime:"02:30",endTime:"03:30"},"Europe/Berlin")).toThrow();
  expect(()=>buildPlanning({...fields,endDate:"2026-10-30"},"UTC")).toThrow();
  expect(()=>buildPlanning(fields,"UTC",{...plan.schedule!,recurrence:"daily"})).toThrow();
});
it("keeps deadline-only legacy tasks editable through their end fields",()=>{
  const plan={schedule:null,due_at:"2026-11-01T12:00:00.000Z"};
  const projected=planningFromTask(plan,"Europe/Moscow");
  expect(projected).toMatchObject({startDate:"",endDate:"2026-11-01",endTime:"15:00"});
  expect(buildPlanning(projected,"Europe/Moscow")).toEqual(plan);
});
it("groups overdue, completed/cancelled and active independently of priority",()=>{
  const now=Date.parse("2026-11-01T12:00Z");
  const task=(id:string,status:string,due_at:string|null,priority="normal")=>({id,status,due_at,priority,schedule:null} as Task);
  const tasks=[task("active","todo",null,"urgent"),task("done","completed","2020-01-01Z"),task("late","todo","2026-11-01T10:00Z","low"),task("cancelled","rejected","2020-01-01Z"),task("active2","todo",null)];
  expect(sortedTasks(tasks,now,"UTC").map(t=>t.id)).toEqual(["late","done","cancelled","active","active2"]);
  expect(isTaskOverdue(tasks[3],now,"UTC")).toBe(false);
});
it("snaps absolute Gantt times to quarters, retaining the other edge on resize",()=>{
  const start=Date.parse("2026-11-01T12:59Z");
  expect(new Date(changedInterval(start,60,1,"move",15).start).toISOString()).toBe("2026-11-01T13:00:00.000Z");
  const end=changedInterval(start,60,2,"end",15);
  expect(new Date(end.start+end.duration*60_000).toISOString()).toBe("2026-11-01T14:00:00.000Z");
  const first=changedInterval(start,60,10,"start",15);
  expect(first.start+first.duration*60_000).toBe(start+60*60_000);
});
