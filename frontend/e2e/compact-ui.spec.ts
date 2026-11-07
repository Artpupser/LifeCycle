import {expect,test,type Page} from "@playwright/test";
import catalog from "../../shared/collections.json" with {type:"json"};
import {emptyOrigin,emptyFirsts} from "../src/features/profile/types";
import {emptyContact} from "../src/features/contacts/types";
import {defaultSchedule,type Task} from "../src/features/planning/types";
import type {Settings} from "../src/features/settings/types";
import {newEntry} from "../src/features/intimacy/types";
import {chooseChoice,expectChoiceValue} from "./choice-helpers";
const defaults:Settings={timezone:"UTC",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,animations_enabled:false,effects_enabled:false,sounds_enabled:false};
async function setup(page:Page){
 const state={settings:{...defaults},starts:[] as unknown[]};const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 const task=(id:string,title:string,status:Task["status"]="todo",recurring=false):Task=>({id,title,status,description:"",tags:[],priority:"normal",color:"",parent_id:null,due_at:null,schedule:recurring?{...defaultSchedule("UTC"),recurrence:"daily"}:null,source_kind:"manual",source_id:null,created_at:"",updated_at:""});
 const tasks=[task("open","Открытая задача"),task("done","Готовая задача","completed"),task("daily","Повтор уже выполнен","todo",true),task("rejected","Отменённая задача","rejected")];
 await page.route("**/api/**",async route=>{
  const path=new URL(route.request().url()).pathname;let data:unknown=[];
  if(path==="/api/auth/me")data={user:{id:"user",email:"ui@example.test"}};
  else if(path==="/api/settings"){if(route.request().method()==="PUT")state.settings=route.request().postDataJSON();data=state.settings;}
  else if(path==="/api/navigation")data={ordering:["/tree","/collections","/pomodoro","/sex","/contacts"],pinned:[],revision:1};
  else if(path==="/api/profile")data={revision:1,name:"Профиль",gender:"unspecified",origin:emptyOrigin,firsts:emptyFirsts};
  else if(path==="/api/contacts")data=[{id:"person",data:{...emptyContact(),first_name:"Контакт"},revision:1,created_at:"",updated_at:""}];
  else if(path==="/api/labels")data=catalog.filter(item=>!item.expandable).flatMap(item=>item.entries.map(entry=>({id:entry.value,name:entry.name,value:entry.value,kind:item.id,revision:1,in_collection:true,is_system:true,color:""})));
  else if(path==="/api/tasks")data=tasks;
  else if(path==="/api/today")data={date:"2026-11-07",timezone:"UTC",events:[],tasks:[{task:tasks[2],date:"2026-11-07",status:"completed",editable:true,starts_at:null}]};
  else if(path==="/api/pomodoro"){data=null;if(route.request().method()==="POST"){state.starts.push(route.request().postDataJSON());data={id:"timer",task_id:"open",phase:"work",status:"running",duration_seconds:1500,elapsed_seconds:0};}}
  else if(path==="/api/pomodoro/history")data={items:[],next_offset:null};
  else if(path==="/api/analytics/privacy")data={include_profile:false,include_intimacy:false};
  else if(path==="/api/analytics")data={from:"2026-11-01",to:"2026-11-07",timezone:"UTC",generated_at:"2026-11-07T12:00:00Z",privacy:{include_profile:false,include_intimacy:false},event_count:4,active_days:1,event_types:{},days:[{date:"2026-11-07",events:4,tasks_completed:2,habits_completed:0,focus_seconds:1500,workouts_completed:0}],tasks:{scheduled:3,completed:2,rejected:0,in_progress:0,pending:1,missed:0,future:0,planned_minutes:25,completion_rate:100},habits:{expected:0,completed:0,skipped:0,cancelled:0,missed:0,pending:0,completion_rate:null,ranking:[]},pomodoro:{completed:1,cancelled:0,seconds:1500},workouts:{completed:0,partial:0,cancelled:0,exercise_steps:0,repetitions:0,seconds:0}};
  else if(path==="/api/sex")data={from:"2026-11-01",to:"2026-11-30",timezone:"UTC",total:1,offset:0,limit:50,statistics:{total:1,sex:0,masturbation:1,active_days:1,duration_minutes:10,duration_answers:1,average_duration_minutes:10,ejaculations:0,ejaculation_answers:0,with_toys:0,repeat_desired:{yes:0,no:0,unknown:1},lubricant_used:{yes:0,no:0,unknown:1},protection_used:{yes:0,no:0,unknown:0},emotions:{},emotions_before:{},days:{}},entries:[{id:"entry",started_at:"2026-11-07T12:00:00Z",revision:1,created_at:"",updated_at:"",data:{...newEntry("UTC"),libido_level:0,satisfaction_level:10}}]};
  await route.fulfill({json:data});
 });return {state,errors};
}
test("private collections stay hidden after reload and do not remove journal choices",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/collections");
 await expect(page.getByRole("region",{name:"Лубриканты",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Скрыть приватные коллекции",exact:true}).click();
 await expect(page.getByRole("region",{name:"Лубриканты",exact:true})).toHaveCount(0);
 expect(state.settings.hidden_collections).toContain("lubricant");
 await page.reload();await expect(page.getByRole("button",{name:"Показать приватные коллекции",exact:true})).toBeVisible();
 await expect(page.getByRole("region",{name:"Лубриканты",exact:true})).toHaveCount(0);
 await page.goto("/sex");await page.getByRole("button",{name:"Новое событие",exact:true}).click();
 await expect(page.getByRole("group",{name:"Лубриканты",exact:true})).toBeVisible();expect(errors).toEqual([]);
});
test("Pomodoro excludes completed tasks including recurring occurrences and invalid deep links",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/pomodoro?task=done");
 const control=page.getByLabel("Задача для фокуса",{exact:true});await expectChoiceValue(control,"");await expect(control).toHaveAttribute("role","radiogroup");
 await expect(page.getByRole("radio",{name:"Готовая задача",exact:true})).toHaveCount(0);await expect(page.getByRole("radio",{name:"Повтор уже выполнен",exact:true})).toHaveCount(0);
 await chooseChoice(control,"open");
 await page.getByRole("button",{name:"Начать фокус",exact:true}).click();
 await expect.poll(()=>state.starts.length).toBe(1);expect(state.starts[0]).toMatchObject({task_id:"open"});
 await expect(page.getByRole("timer")).toBeVisible();expect(errors).toEqual([]);
});
test("compact journal scales keep zero, keyboard editing and mobile width",async({page},info)=>{
 const {errors}=await setup(page);await page.setViewportSize({width:390,height:844});await page.goto("/sex");
 const meters=page.getByRole("meter");await expect(meters).toHaveCount(2);await expect(meters.first()).toHaveAttribute("aria-valuenow","0");await expect(meters.last()).toHaveAttribute("aria-valuenow","10");
 await expect(page.getByText("Эякуляций",{exact:true})).toHaveCount(0);
 await page.screenshot({path:info.outputPath("compact-journal.png"),fullPage:true});
 await page.getByRole("button",{name:"Новое событие",exact:true}).click();
 const libido=page.getByRole("dialog").last().getByLabel("Уровень либидо (0–10)",{exact:true});await libido.focus();await libido.press("Home");await expect(libido).toHaveValue("0");await libido.press("ArrowRight");await expect(libido).toHaveValue("1");
 await expect(libido).toHaveAttribute("aria-valuetext",/1 — Низкое либидо/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);expect(errors).toEqual([]);
});

test("analytics keeps key outcomes visible and calculation notes collapsed on mobile",async({page},info)=>{
 const {errors}=await setup(page);await page.setViewportSize({width:390,height:844});await page.goto("/analytics");
 const tasks=page.getByRole("region",{name:"Задачи",exact:true});await expect(tasks).toContainText("Выполнено2");
 const note=tasks.getByText(/Процент: выполненные/);await expect(note).not.toBeVisible();
 await tasks.locator("summary").click();await expect(note).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
 await page.screenshot({path:info.outputPath("compact-analytics.png"),fullPage:true});expect(errors).toEqual([]);
});
