import {expect,test,type Page} from "@playwright/test";
import catalog from "../../shared/collections.json" with {type:"json"};
import {emptyOrigin,emptyFirsts} from "../src/features/profile/types";
import {dragObject} from "./drag-helpers";
import type {BoardState} from "../src/features/planning/board-types";
import {emptyContact} from "../src/features/contacts/types";
import {defaultSchedule,type Task} from "../src/features/planning/types";
import type {Countdown} from "../src/features/countdowns/types";
import type {Contact} from "../src/features/contacts/types";
import type {Settings} from "../src/features/settings/types";
import {newEntry} from "../src/features/intimacy/types";
import {chooseChoice,expectChoiceValue} from "./choice-helpers";
const defaults:Settings={timezone:"UTC",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,animations_enabled:false,effects_enabled:false,sounds_enabled:false};
async function setup(page:Page){
 const state={settings:{...defaults},starts:[] as unknown[],countdowns:[] as Countdown[],eventWrites:[] as Record<string,unknown>[],contacts:[{id:"person",data:{...emptyContact(),first_name:"Контакт"},revision:1,created_at:"",updated_at:""}] as Contact[]};const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 const task=(id:string,title:string,status:Task["status"]="todo",recurring=false):Task=>({id,title,status,description:"",tags:[],priority:"normal",color:"",parent_id:null,due_at:null,schedule:recurring?{...defaultSchedule("UTC"),recurrence:"daily"}:null,source_kind:"manual",source_id:null,created_at:"",updated_at:""});
 const tasks=[task("open","Открытая задача"),task("done","Готовая задача","completed"),task("daily","Повтор уже выполнен","todo",true),task("rejected","Отменённая задача","rejected")];
 const board:BoardState={board:{id:"board",name:"Тестовая доска",emoji:"tabler:columns-3",view:"kanban",zoom:"week",revision:1},columns:[{id:"column",name:"В работе",color:"var(--primary)",position:0},{id:"second",name:"Готово",color:"var(--primary)",position:1}],items:[{task_id:"open",column_id:"column",position:0}]};
 await page.route("**/api/**",async route=>{
  const path=new URL(route.request().url()).pathname;let data:unknown=[];
  if(path==="/api/auth/me")data={user:{id:"user",email:"ui@example.test"}};
  else if(path==="/api/settings"){if(route.request().method()==="PUT")state.settings=route.request().postDataJSON();data=state.settings;}
  else if(path==="/api/navigation")data={ordering:["/tree","/collections","/pomodoro","/sex","/contacts"],pinned:[],revision:1};
  else if(path==="/api/profile")data={revision:1,name:"Профиль",gender:"unspecified",origin:emptyOrigin,firsts:emptyFirsts};
  else if(path==="/api/contacts"){if(route.request().method()==="POST"){const contact={id:"created",data:route.request().postDataJSON().data,revision:1,created_at:"",updated_at:""};state.contacts.push(contact);data=contact;}else data=state.contacts;}
  else if(path==="/api/countdowns")data=state.countdowns;
  else if(path==="/api/countdowns/event"){const input=route.request().postDataJSON();state.eventWrites.push(input);Object.assign(state.countdowns[0],input);data=state.countdowns[0];}
  else if(path==="/api/boards")data=[board.board];
  else if(path==="/api/boards/memberships")data=[{task_id:"open",board_id:"board",column_id:"column",board_name:board.board.name,column_name:"В работе"}];
  else if(path==="/api/boards/board")data=board;
  else if(path==="/api/boards/board/items/open"){board.items[0].column_id=route.request().postDataJSON().column_id;board.board.revision++;data=board;}
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
 await page.getByRole("button",{name:"Показать приватные коллекции",exact:true}).click();
 await expect(page.getByRole("region",{name:"Лубриканты",exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole("region",{name:"Игрушки",exact:true})).toBeVisible();
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


test("collection dragging persists order and supports action-menu movement",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/collections");
 const toys=page.getByRole("region",{name:"Игрушки",exact:true}),setting=page.getByRole("region",{name:"Обстановка",exact:true});
 await expect(toys).toBeVisible();
 await dragObject(page,toys,setting);
 await expect.poll(()=>state.settings.collection_order?.slice(0,2)).toEqual(["setting","toy"]);
 await expect(page.locator('[data-drag-item="collection"]').first()).toHaveAttribute("data-drag-key","collection:setting");
 await page.reload();await expect(page.locator('[data-drag-item="collection"]').first()).toHaveAttribute("data-drag-key","collection:setting");
 await setting.getByRole("button",{name:"Действия",exact:true}).click();await page.getByRole("menuitem",{name:"Переместить ниже",exact:true}).click();
 await expect.poll(()=>state.settings.collection_order?.slice(0,2)).toEqual(["toy","setting"]);expect(errors).toEqual([]);
});

test("custom birthday calendar stores month and day, keeps a dark overlay and fits mobile",async({page},info)=>{
 const {state,errors}=await setup(page);state.settings.theme="dark";
 await page.setViewportSize({width:375,height:900});await page.goto("/contacts");await page.getByRole("button",{name:"Новый контакт",exact:true}).click();
 await page.getByLabel("Имя контакта",{exact:true}).fill("Без года");
 await page.getByRole("button",{name:"Выбрать дату… Дата рождения контакта",exact:true}).click();
 const picker=page.getByRole("dialog",{name:"Выбрать дату…",exact:true});await picker.getByRole("checkbox",{name:"Год рождения неизвестен",exact:true}).check();
 await chooseChoice(picker.getByLabel("Месяц",{exact:true}),"02");await picker.locator('[data-calendar-day="2000-02-29"]').click();
 expect(await picker.evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);
 const overlay=page.locator('.bg-overlay\\/30').last();expect(await overlay.evaluate(node=>getComputedStyle(node).getPropertyValue("--overlay").trim())).toBe("#08090c");expect(await overlay.evaluate(node=>getComputedStyle(node).backgroundColor)).toContain("/ 0.3");
 await page.screenshot({path:info.outputPath("birthday-calendar-dark-mobile.png")});
 await picker.getByRole("button",{name:"Выбрать",exact:true}).click();await expect(page.getByLabel("Дата рождения контакта",{exact:true})).toHaveValue("--02-29");
 expect(state.contacts).toHaveLength(1);await page.getByRole("button",{name:"Сохранить контакт",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
 expect(state.contacts.at(-1)?.data).toMatchObject({birth_date:null,birth_month_day:"02-29"});
 const contact=page.locator("article").filter({has:page.getByRole("heading",{name:"Без года",exact:true})});await expect(contact).toContainText("29 февраля");await expect(contact).not.toContainText("2000");await expect(contact).toContainText("Рыбы");
 expect(await page.locator(".app-content").evaluate(node=>node.scrollWidth-node.clientWidth)).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
});

test("board view controls do not overlap menus and task cards fill the column",async({page},info)=>{
 const {errors}=await setup(page);await page.goto("/tasks?board=board");
 const menu=page.getByRole("button",{name:"Действия доски",exact:true}),switcher=page.getByRole("button",{name:"Gantt",exact:true});
 for(const width of [375,768,1280,1920]){
  await page.setViewportSize({width,height:900});const a=(await menu.boundingBox())!,b=(await switcher.boundingBox())!;
  expect(a.x>=b.x+b.width||a.y>=b.y+b.height||a.y+a.height<=b.y).toBe(true);
  const gap=await page.locator('[data-column-id="column"] article').evaluate(node=>{const card=node.getBoundingClientRect(),column=node.closest('[data-column-id]')!.getBoundingClientRect();return column.width-card.width;});expect(gap).toBeLessThanOrEqual(3);
 }
 await page.screenshot({path:info.outputPath("board-full-width.png")});expect(errors).toEqual([]);
});


test("yearless birthday snapshots edit and transfer without inventing a year",async({page})=>{
 const {state,errors}=await setup(page);state.countdowns.push({id:"event",title:"День рождения: Без года",category:"birthday",tags:[],icon:"tabler:cake",target_date:"2000-02-29",target_time:null,timezone:"UTC",recurrence:"yearly",repeat_yearly:true,description:"",details:{full_name:"Без года",phone:"",occupation:"",relationship:"",notes:""},display:{clock:"both",show_years:true,show_repetitions:true},birth_year_unknown:true,next_date:"2027-02-28",next_at:"2027-02-28T00:00:00Z",original_at:null,days_remaining:100,full_years:null,repetitions:0,updated_at:"2026-11-11T12:00:00Z",computed_at:"2026-11-11T12:00:00Z",contact_id:null,contact_name:null,contact_birthday:false,suspended:false});
 await page.goto("/countdowns");const card=page.locator("article");await expect(card).toContainText("Год рождения неизвестен");await expect(card).not.toContainText("Сейчас:");
 const edit=async()=>{await card.getByRole("button",{name:/Действия события/}).click();await page.getByRole("menuitem",{name:"Изменить",exact:true}).click();};
 await edit();await expect(page.getByLabel("Дата события",{exact:true})).toHaveValue("--02-29");
 await page.getByRole("button",{name:"Перенести в контакты",exact:true}).click();await expect(page.getByLabel("Дата рождения контакта",{exact:true})).toHaveValue("--02-29");await page.getByRole("dialog").last().getByRole("button",{name:"Отмена",exact:true}).click();
 await page.getByLabel("Дата события",{exact:true}).fill("--03-21");await page.getByRole("button",{name:"Сохранить событие",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);expect(state.eventWrites.at(-1)).toMatchObject({target_date:"2000-03-21",birth_year_unknown:true});
 await edit();await page.getByLabel("Дата события",{exact:true}).fill("1990-03-21");await page.getByRole("button",{name:"Сохранить событие",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);expect(state.eventWrites.at(-1)).toMatchObject({target_date:"1990-03-21",birth_year_unknown:false});expect(errors).toEqual([]);
});


test("task dragging keeps selection markers and shared context actions",async({page})=>{
 const {errors}=await setup(page);const consoleErrors:string[]=[];page.on("console",message=>{if(message.type()==="error")consoleErrors.push(message.text());});await page.goto("/tasks?board=board");
 const source=page.getByRole("region",{name:"Колонка В работе",exact:true}).getByRole("article"),target=page.getByRole("region",{name:"Колонка Готово",exact:true});
 await expect(source).toHaveAttribute("data-selection-key","open");await expect(source).toHaveAttribute("data-drag-enabled","true");await dragObject(page,source,target);
 const moved=target.locator("article");await expect(moved).toHaveAttribute("data-selection-key","open");await moved.click({button:"right"});await expect(page.getByRole("menuitem",{name:/Множественный выбор/})).toBeVisible();await page.keyboard.press("Escape");
 expect(consoleErrors).toEqual([]);expect(errors).toEqual([]);
});
