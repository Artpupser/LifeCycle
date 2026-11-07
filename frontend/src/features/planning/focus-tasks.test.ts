import {expect,it} from "vitest";
import {focusTasks,defaultSchedule,type Task,type TaskOccurrence} from "./types";
it("excludes terminal tasks and today's completed recurring occurrences but permits the next occurrence",()=>{
 const task=(id:string,status:Task["status"]="todo",recurring=false):Task=>({id,status,title:id,description:"",tags:[],color:"",priority:"normal",parent_id:null,due_at:null,source_kind:"manual",source_id:null,created_at:"",updated_at:"",schedule:recurring?{...defaultSchedule("UTC"),recurrence:"daily"}:null});
 const tasks=[task("open"),task("doing","in_progress"),task("done","completed"),task("cancelled","rejected"),task("daily","todo",true),task("future","todo",true)];
 const occurrence=(status:Task["status"]):TaskOccurrence=>({task:tasks[4],status,date:"2026-11-07",starts_at:null,editable:true});
 expect(focusTasks(tasks,[occurrence("completed")]).map(t=>t.id)).toEqual(["open","doing"]);
 expect(focusTasks(tasks,[occurrence("todo")]).map(t=>t.id)).toEqual(["open","doing","daily"]);
 expect(focusTasks(tasks,[occurrence("rejected")]).map(t=>t.id)).toEqual(["open","doing"]);
});
