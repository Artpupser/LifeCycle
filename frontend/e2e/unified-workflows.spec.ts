import {chooseAction} from "./upgrade-helpers";
import {expect,test,type Page} from "@playwright/test";
import {emptyContact} from "../src/features/contacts/types";
import type {Settings} from "../src/features/settings/types";
import type {Countdown} from "../src/features/countdowns/types";
import type {Label} from "../src/systems/labels/types";

const stamp="2026-11-03T12:00:00Z";
const eventId="123e4567-e89b-42d3-a456-426614174001";
const tagId="123e4567-e89b-42d3-a456-426614174002";
const sessionId="123e4567-e89b-42d3-a456-426614174003";
const categoryId="123e4567-e89b-42d3-a456-426614174004";
const paths=["/today","/habits","/workouts","/sex","/tasks","/calendar","/notes","/countdowns","/contacts","/pomodoro","/labels","/analytics","/ai","/profile","/settings","/status"];
const defaults:Settings={timezone:"Europe/Moscow",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,animations_enabled:true,effects_enabled:false};
const birthday:Countdown={id:eventId,title:"Личный день рождения",category:"birthday",icon:"tabler:cake",tags:["Старый"],target_date:"2000-11-04",target_time:null,timezone:"Europe/Moscow",recurrence:"yearly",description:"",contact_id:null,details:{full_name:"",phone:"",occupation:"",relationship:"",notes:""},display:{clock:"both",show_years:true,show_repetitions:true},repeat_yearly:true,next_date:"2026-11-04",next_at:"2026-11-03T21:00:00Z",original_at:"2000-11-03T21:00:00Z",days_remaining:1,full_years:26,repetitions:26,updated_at:stamp,contact_name:null,contact_birthday:false,suspended:false,computed_at:stamp};
test.use({viewport:{width:390,height:844},timezoneId:"America/Los_Angeles"});
async function setup(page:Page){
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date(stamp));
 const state={settings:{...defaults},event:{...birthday},labels:[{id:tagId,name:"Старый",kind:"tag",color:"#2563EB",revision:1}] as Label[],contact:{id:"contact",data:{...emptyContact(),first_name:"Анна",profession:"Архитектор",categories:["Друзья, коллеги"],tags:["Старый"],phones:["+79161234567"]},revision:1,created_at:stamp,updated_at:stamp},operatorRequests:0,contactReads:0,historyRemoved:false,settingsWrites:0};
 await page.route("**/api/**",async route=>{
  const req=route.request(),url=new URL(req.url()),path=url.pathname,method=req.method();
  let data:unknown=[];
  if(path==="/api/auth/me")data={user:{id:"workflow-user",email:"workflow@example.test"}};
  else if(path==="/api/navigation")data={ordering:paths,pinned:paths,revision:1};
  else if(path==="/api/settings"){if(method==="PUT"){state.settings={...state.settings,...req.postDataJSON()};state.settingsWrites++;}data=state.settings;}
  else if(path==="/api/profile")data={residence_country:"RU"};
  else if(path==="/api/countdowns")data=[state.event];
  else if(path===`/api/countdowns/${eventId}`){state.event={...state.event,...req.postDataJSON()};data=state.event;}
  else if(path==="/api/labels"){if(method==="POST")state.labels.push({id:categoryId,...req.postDataJSON(),revision:1});data=state.labels;}
  else if(path===`/api/labels/${tagId}`){const body=req.postDataJSON(),old=state.labels[0].name;state.labels[0]={...state.labels[0],...body,revision:2};state.event.tags=state.event.tags?.map(name=>name===old?body.name:name);state.contact.data.tags=state.contact.data.tags.map(name=>name===old?body.name:name);data=state.labels[0];}
  else if(path==="/api/contacts"){state.contactReads++;data=[state.contact];}
  else if(path==="/api/contacts/contact"){state.contact={...state.contact,...req.postDataJSON(),revision:2};data=state.contact;}
  else if(path==="/api/operators/settings")data={enabled:true,configured:true};
  else if(path==="/api/operators/lookup"){state.operatorRequests++;data={operator:"t2",source:"online",ported:true,checked_at:stamp};}
  else if(path==="/api/ai/settings")data={provider:"openai",auth_mode:"api_key",enabled:false,permissions:{},revision:1,model:"",key_present:false};
  else if(path==="/api/today")data={date:url.searchParams.get("date"),timezone:state.settings.timezone,tasks:[],events:[]};
  else if(path==="/api/calendar")data={from:url.searchParams.get("from"),to:url.searchParams.get("to"),timezone:state.settings.timezone,occurrences:[],events:[]};
  else if(path==="/api/pomodoro")data=null;
  else if(path==="/api/pomodoro/history")data={items:state.historyRemoved?[]:[{id:sessionId,task_id:null,phase:"work",status:"completed",duration_seconds:1500,elapsed_seconds:1500,started_at:"2026-11-03T11:35:00Z",ended_at:stamp,run_id:null,interval_index:null,interval_kind:null,program_name:null,program:null}],next_offset:null};
  else if(path===`/api/history/pomodoro/${sessionId}`){state.historyRemoved=true;await route.fulfill({status:204});return;}
  await route.fulfill({json:data});
 });
 return {state,errors};
}
test.afterEach(async({page},info)=>{if(info.status!=="passed")return;expect(await page.locator("html").evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(page.viewportSize()!.width);});

test("independent birthday shows both ages and saves enum categories and multiple shared tags",async({page},info)=>{
 const {state,errors}=await setup(page);await page.goto("/countdowns");
 const card=page.locator("article");await expect(card).toContainText("Сейчас: 25 лет");await expect(card).toContainText("Будет: 26 лет");
 await chooseAction(page,"Изменить",card);
 const category=page.getByLabel("Категория события",{exact:true});await expect(category).toHaveJSProperty("tagName","SELECT");await category.selectOption("personal");
 const tags=page.getByLabel("Теги события",{exact:true});await tags.fill("");await tags.pressSequentially("Дом, Семья");await expect(tags).toHaveValue("Дом, Семья");
 await page.getByRole("button",{name:"Сохранить событие",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
 expect(state.event.category).toBe("personal");expect(state.event.tags).toEqual(["Дом","Семья"]);
 await page.screenshot({path:info.outputPath("birthday-and-tags-mobile.png"),fullPage:true});expect(errors).toEqual([]);
});

test("global labels rename across features and create reusable category choices",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/labels");
 await chooseAction(page,"Редактировать",page.locator('li[data-action-subject="label"]').filter({hasText:"Старый"}));await page.getByLabel("Название метки Старый",{exact:true}).fill("Общий");await page.getByRole("button",{name:"Сохранить метку",exact:true}).click();
 await expect.poll(()=>state.contact.data.tags).toEqual(["Общий"]);await expect.poll(()=>state.event.tags).toEqual(["Общий"]);await expect(page.getByRole("dialog")).toHaveCount(0);
 await page.getByLabel("Новая метка",{exact:true}).fill("Путешествие");await page.getByLabel("Вид метки",{exact:true}).selectOption("category");await page.getByRole("button",{name:"Создать метку",exact:true}).click();
 await expect(page.locator('li[data-action-subject="label"]').filter({hasText:"Путешествие"})).toBeVisible();
 await page.getByRole("navigation",{name:"Главная навигация",exact:true}).locator('a[href="/countdowns"]').click();
 await chooseAction(page,"Изменить",page.locator("article"));
 await expect(page.getByLabel("Теги события",{exact:true})).toHaveValue("Общий");
 await page.getByLabel("Категория события",{exact:true}).selectOption(`custom:${categoryId}`);await page.getByRole("button",{name:"Сохранить событие",exact:true}).click();
 await expect(page.locator("article")).toContainText("Путешествие");expect(errors).toEqual([]);
});

test("calendar and Today share residence-country and worldwide holiday data",async({page})=>{
 const {errors}=await setup(page);await page.goto("/calendar");await page.getByLabel("Дата календаря",{exact:true}).fill("2026-11-04");
 await expect(page.getByRole("region",{name:"План выбранного дня",exact:true}).getByRole("heading",{name:"День народного единства",exact:true})).toBeVisible({timeout:20000});
 await page.getByRole("navigation",{name:"Главная навигация",exact:true}).locator('a[href="/today"]').click();await page.getByLabel("Дата плана",{exact:true}).fill("2026-11-04");
 await expect(page.getByRole("region",{name:"Праздники дня",exact:true})).toContainText("День народного единства");
 await page.getByLabel("Дата плана",{exact:true}).fill("2026-11-19");await expect(page.getByRole("region",{name:"Праздники дня",exact:true})).toContainText("Всемирный день туалета");expect(errors).toEqual([]);
});

test("contact links have icons, legacy fields stay preserved, operator is deduplicated and works offline",async({page,context})=>{
 const {state,errors}=await setup(page);await page.goto("/contacts");const card=page.locator("article");
 await expect(card).toContainText("t2 · Проверено онлайн");expect(state.operatorRequests).toBe(1);
 for(const href of ["tel:+79161234567","sms:+79161234567","https://wa.me/79161234567","https://t.me/+79161234567","viber://chat?number=%2B79161234567"]){const link=card.locator(`a[href="${href}"]`);await expect(link).toBeVisible();await expect(link.locator("svg[data-icon]")).toHaveCount(1);}
 await chooseAction(page,"Изменить контакт",card);await expect(page.getByLabel("Профессия",{exact:true})).toHaveCount(0);await expect(page.getByLabel("Категории контакта",{exact:true})).toHaveCount(0);
 await expect.poll(()=>state.operatorRequests).toBe(1);await page.getByRole("button",{name:"Сохранить контакт",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
 expect(state.contact.data.profession).toBe("Архитектор");expect(state.contact.data.categories).toEqual(["Друзья, коллеги"]);
 await context.setOffline(true);await chooseAction(page,"Изменить контакт",card);await page.getByLabel("Телефон 1",{exact:true}).fill("+79261234567");
 await expect(page.getByRole("dialog")).toContainText("МегаФон · Архивный диапазон; перенос номера не учтён");expect(state.operatorRequests).toBe(1);
 await context.setOffline(false);await expect(page.getByRole("dialog")).toContainText("t2 · Проверено онлайн");expect(state.operatorRequests).toBe(2);expect(errors).toEqual([]);
});

test("Pomodoro uses shared history removal with a persistent confirmation",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/pomodoro");const history=page.getByRole("region",{name:"История Pomodoro",exact:true});
 await chooseAction(page,"Убрать из истории",history);const confirmation=page.getByRole("alertdialog");
 await expect(confirmation).toContainText("Результаты, статистика и уже применённые изменения сохранятся.");await page.keyboard.press("Escape");expect(state.historyRemoved).toBe(false);
 await chooseAction(page,"Убрать из истории",history);await confirmation.getByRole("button",{name:"Убрать запись",exact:true}).click();
 await expect(history.getByRole("button",{name:"Убрать из истории",exact:true})).toHaveCount(0);expect(state.historyRemoved).toBe(true);await page.reload();await expect(history).toContainText("Завершённые и остановленные интервалы появятся здесь.");expect(errors).toEqual([]);
});

test("settings save remains within viewport at both ends of the page",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/settings");await page.getByLabel("Анимации интерфейса",{exact:true}).uncheck();
 const save=page.getByRole("button",{name:"Сохранить настройки",exact:true});
 for(const end of [true,false]){await page.locator(".app-content").evaluate((element,end)=>element.scrollTop=end?element.scrollHeight:0,end);await expect(save).toBeInViewport();const box=await save.boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(844);}
 await save.click();await expect.poll(()=>state.settingsWrites).toBe(1);await expect(save).toBeDisabled();expect(errors).toEqual([]);
});

test("refresh preserves content and route revisits reuse loaded resources",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/contacts");await expect(page.getByRole("heading",{name:"Анна",exact:true})).toBeVisible();
 let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});let held=false;
 await page.route("**/api/contacts",async route=>{held=true;await gate;await route.fulfill({json:[state.contact]});});
 await page.getByText("Импорт, экспорт и метки",{exact:true}).click();await page.getByRole("button",{name:"Обновить контакты",exact:true}).click();await expect.poll(()=>held).toBe(true);
 await expect(page.getByRole("heading",{name:"Анна",exact:true})).toBeVisible();await expect(page.getByText("Загрузка…",{exact:true})).toHaveCount(0);
 release();await page.getByRole("navigation",{name:"Главная навигация",exact:true}).locator('a[href="/countdowns"]').click();await expect(page.getByRole("heading",{name:"Обратный отсчёт",exact:true})).toBeVisible();
 await page.getByRole("navigation",{name:"Главная навигация",exact:true}).locator('a[href="/contacts"]').click();await expect(page.getByRole("heading",{name:"Анна",exact:true})).toBeVisible();expect(errors).toEqual([]);
});

test("task and column drags animate and Gantt resize keeps the pending preview",async({page},info)=>{
 const {errors}=await setup(page);await page.setViewportSize({width:1280,height:900});
 const task={id:"drag-task",title:"Задача для переноса",description:"",status:"todo",source_kind:"manual",source_id:null,tags:[],color:"#2563EB",priority:"normal",parent_id:null,due_at:null,schedule:{start_date:"2026-11-03",time:"09:00",timezone:"Europe/Moscow",duration_minutes:60,recurrence:"once",interval_days:1,weekdays:[],end_date:null},created_at:stamp,updated_at:stamp};
 const board={board:{id:"board",name:"Проект",emoji:"tabler:columns-3",view:"kanban",zoom:"day",revision:1},columns:[{id:"first",name:"План",color:"#2563EB",position:0},{id:"second",name:"В работе",color:"#16A34A",position:1}],items:[{task_id:task.id,column_id:"first",position:0}]};
 let resize:Record<string,unknown>|null=null,release:()=>void=()=>{};
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route("**/api/tasks",route=>route.fulfill({json:[task]}));
 await page.route("**/api/boards**",async route=>{
  const path=new URL(route.request().url()).pathname,req=route.request();
  if(path==="/api/boards"){await route.fulfill({json:[board.board]});return;}
  if(path==="/api/boards/memberships"){await route.fulfill({json:[{task_id:task.id,board_id:"board",column_id:board.items[0].column_id,board_name:"Проект",column_name:"План"}]});return;}
  if(req.method()==="PUT"){
   const body=req.postDataJSON();
   if(path.includes("/items/"))board.items[0].column_id=body.column_id;
   else if(path.includes("/columns/")){board.columns.reverse();board.columns.forEach((column,i)=>{column.position=i;});}
   else board.board={...board.board,...body};
   board.board.revision++;await new Promise(resolve=>setTimeout(resolve,150));
  }
  await route.fulfill({json:board});
 });
 await page.route(/\/api\/calendar\?/,route=>route.fulfill({json:{timezone:"Europe/Moscow",from:"2026-11-02",to:"2026-11-04",events:[],occurrences:[{task,date:"2026-11-03",starts_at:"2026-11-03T06:00:00Z",status:"todo",editable:true}]}}));
 await page.route("**/api/tasks/drag-task/plan",async route=>{resize=route.request().postDataJSON();await gate;task.schedule.duration_minutes=Number(resize!.duration_minutes);await route.fulfill({json:task});});
 await page.goto("/tasks?board=board");await expect(page.getByRole("region",{name:"Доска Проект",exact:true})).toBeVisible();
 await page.evaluate(()=>{const records:string[]=[];(window as unknown as {dragStyles:string[]}).dragStyles=records;new MutationObserver(mutations=>{for(const mutation of mutations){const node=mutation.target;if(node instanceof HTMLElement&&node.hasAttribute("data-drag-key")&&node.style.transform)records.push(node.getAttribute("data-drag-key")!);}}).observe(document.body,{attributes:true,subtree:true,attributeFilter:["style"]});});
 await page.locator('[data-drag-key="task-drag-task"]').dragTo(page.locator('[data-column-id="second"]'),{targetPosition:{x:150,y:200}});
 await expect(page.locator('[data-column-id="second"] [data-drag-key="task-drag-task"]')).toBeVisible();
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {dragStyles:string[]}).dragStyles.includes("task-drag-task"))).toBe(true);
 await page.getByRole("button",{name:"Перетащить колонку План",exact:true}).dragTo(page.locator('[data-column-id="second"]'),{targetPosition:{x:150,y:50}});
 await expect.poll(()=>board.columns[0].id).toBe("second");
 await expect.poll(()=>page.evaluate(()=>(window as unknown as {dragStyles:string[]}).dragStyles.some(key=>key.startsWith("column-")))).toBe(true);
 await page.getByRole("button",{name:"Gantt",exact:true}).click();
 const bar=page.locator("svg rect:has(title)");await expect(bar).toBeVisible();
 await expect(bar).toHaveCSS("width","40px");const before=await bar.boundingBox();const handle=await page.getByLabel("Изменить конец Задача для переноса",{exact:true}).boundingBox();
 await page.mouse.move(handle!.x+handle!.width/2,handle!.y+handle!.height/2);await page.mouse.down();await page.mouse.move(handle!.x+handle!.width/2+80,handle!.y+handle!.height/2,{steps:10});await page.mouse.up();
 await expect.poll(()=>resize?.duration_minutes).toBeGreaterThan(60);const targetWidth=before!.width*Number(resize!.duration_minutes)/60;await expect.poll(async()=>Math.abs((await bar.boundingBox())!.width-targetWidth)).toBeLessThan(2);
 const preview=(await bar.boundingBox())!.width;release();await expect.poll(()=>task.schedule.duration_minutes).toBeGreaterThan(60);
 await expect.poll(async()=>Math.abs((await bar.boundingBox())!.width-preview)).toBeLessThan(2);
 await page.screenshot({path:info.outputPath("animated-gantt-desktop.png"),fullPage:true});expect(errors).toEqual([]);
});
