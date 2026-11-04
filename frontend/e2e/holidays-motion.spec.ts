import {expect,test,type Page} from "@playwright/test";
import type {Settings} from "../src/features/settings/types";
const stamp="2026-11-03T12:00:00Z";
const defaults:Settings={timezone:"Asia/Tokyo",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,animations_enabled:true,effects_enabled:true};
test.use({viewport:{width:390,height:844},timezoneId:"America/Los_Angeles"});
async function setup(page:Page,options:{country?:string;language?:"ru"|"en";effects?:boolean;calendarError?:boolean}={}){
 const task={id:"task",title:"Проверить результат",description:"",status:"todo",source_kind:"task",tags:[],color:"#3d6e14",priority:"normal",schedule:null,updated_at:stamp};
 const state={settings:{...defaults,language:options.language??"ru",effects_enabled:options.effects??true},country:options.country??"RU",status:"todo",fail:false,completeRequests:0,created:0};
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date(stamp));
 await page.route("**/api/**",async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname;
  const occurrence={task:{...task,status:state.status},date:"2026-11-03",starts_at:null,status:state.status,editable:true,habit_mark:null};
  if(path==="/api/auth/me"){await route.fulfill({json:{user:{id:"holiday-user",email:"holidays@example.test"}}});return;}
  if(path==="/api/settings"){if(request.method()==="PUT")state.settings={...state.settings,...request.postDataJSON()};await route.fulfill({json:state.settings});return;}
  if(path==="/api/profile"){await route.fulfill({json:{residence_country:state.country}});return;}
  if(path==="/api/navigation"){const paths=["/today","/habits","/workouts","/sex","/tasks","/calendar","/notes","/countdowns","/contacts","/pomodoro","/analytics","/ai","/profile","/settings","/status"];await route.fulfill({json:{ordering:paths,pinned:paths,revision:1}});return;}
  if(path==="/api/calendar"){await route.fulfill(options.calendarError?{status:503,json:{error:{code:"unavailable"}}}:{json:{timezone:state.settings.timezone,from:url.searchParams.get("from"),to:url.searchParams.get("to"),occurrences:[],events:[]}});return;}
  if(path==="/api/today"){await route.fulfill({json:{date:"2026-11-03",timezone:state.settings.timezone,tasks:[occurrence],events:[]}});return;}
  if(path.startsWith("/api/tasks/task/occurrences/")){
   state.completeRequests++;if(state.fail){await route.fulfill({status:503,json:{error:{code:"unavailable"}}});return;}
   state.status=request.postDataJSON().status;await route.fulfill({json:{...occurrence,status:state.status}});return;
  }
  if(path==="/api/notes"&&request.method()==="POST"){state.created++;await route.fulfill({status:201,json:{id:"new-note",...request.postDataJSON(),updated_at:stamp,ai_shared:false,ai_access_revision:0}});return;}
  if(path==="/api/ai/settings"){await route.fulfill({json:{provider:"openai",auth_mode:"api_key",enabled:false,permissions:{},revision:1,model:"",key_present:false}});return;}
  await route.fulfill({json:[]});
 });
 return {state,errors};
}
async function selectDate(page:Page,date:string){await page.getByLabel("Дата календаря",{exact:true}).fill(date);}
test.afterEach(async({page})=>{expect(await page.locator("html").evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(390);});

test("calendar prioritizes the residence country and includes rare worldwide observances",async({page},info)=>{
 const {errors}=await setup(page);await page.goto("/calendar");await selectDate(page,"2026-11-04");
 await expect(page.getByLabel("Поиск праздников",{exact:true})).toHaveValue("страна:RU");
 const day=page.getByRole("region",{name:"План выбранного дня",exact:true});
 await expect(day.getByRole("heading",{name:"День народного единства",exact:true})).toBeVisible({timeout:20000});
 const month=page.getByRole("region",{name:"Праздники месяца",exact:true});
 await expect(month.getByRole("heading",{name:"Всемирный день туалета",exact:true})).toBeVisible();
 await expect(month.locator('[data-holiday-id*="Thanksgiving"]')).toHaveCount(0);
 await page.locator('[data-calendar-date="2026-11-19"]').click();
 await expect(day.getByRole("heading",{name:"Всемирный день туалета",exact:true})).toBeVisible();
 await page.getByLabel("Поиск праздников",{exact:true}).fill("country:US Thanksgiving");
 await expect(month.locator('[data-holiday-id*="country:US:Thanksgiving Day:"]')).toHaveCount(1);
 await page.getByLabel("Поиск праздников",{exact:true}).fill("country:JP");
 await expect(month.locator('[data-holiday-id*="country:JP:Culture Day"]')).toHaveCount(1);
 await page.screenshot({path:info.outputPath("calendar-holidays-mobile.png"),fullPage:true});
 expect(errors).toEqual([]);
});

test("one shared holiday exposes its countries instead of duplicated country cards",async({page})=>{
 const {errors}=await setup(page);await page.goto("/calendar");await selectDate(page,"2026-01-01");
 await page.getByRole("button",{name:"Весь мир",exact:true}).click();
 const month=page.getByRole("region",{name:"Праздники месяца",exact:true});
 const holiday=month.locator('[data-holiday-id="shared:New Year\'s Day"]').first();
 await expect(holiday).toBeVisible({timeout:20000});
 await holiday.getByText(/Ещё \d+ стран/).click();
 await expect(holiday.getByText("Россия",{exact:true})).toBeVisible();
 await expect(holiday.locator('[data-icon="circle-flags:us"]')).toBeVisible();
 expect(errors).toEqual([]);
});

test("English holidays use a legacy profile country name and stay separate from personal API failures",async({page})=>{
 const {errors}=await setup(page,{country:"Япония",language:"en",calendarError:true});await page.goto("/calendar");
 await expect(page.getByLabel("Search holidays",{exact:true})).toHaveValue("страна:JP");
 await page.getByLabel("Calendar date",{exact:true}).fill("2026-11-19");
 const day=page.getByRole("region",{name:"Selected day plan",exact:true});
 await expect(day.getByRole("heading",{name:"World Toilet Day",exact:true})).toBeVisible({timeout:20000});
 await expect(day.getByRole("button",{name:"Try again",exact:true})).toBeVisible();
 expect(errors).toEqual([]);
});

test("completion emits particles after save while a failed update rolls back",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/today");
 const checkbox=page.getByRole("checkbox",{name:"Выполнено: Проверить результат",exact:true});
 await checkbox.check();await expect.poll(()=>state.completeRequests).toBe(1);
 await expect(page.locator('canvas[data-effect="complete"]')).toBeVisible({timeout:10000});
 await expect.poll(()=>page.locator('canvas[data-effect="complete"]').evaluate(async(node:HTMLCanvasElement)=>{
  if(!node.width||!node.height)return false;
  const snapshot=await createImageBitmap(node);
  const copy=document.createElement("canvas");copy.width=node.width;copy.height=node.height;
  const context=copy.getContext("2d")!;context.drawImage(snapshot,0,0);snapshot.close();
  return context.getImageData(0,0,copy.width,copy.height).data.some((value,index)=>index%4===3&&value>0);
 }),{intervals:[25,50,100],timeout:1000}).toBe(true);
 await expect(page.locator('canvas[data-effect="complete"]')).toHaveCount(0,{timeout:5000});
 await checkbox.uncheck();await expect.poll(()=>state.status).toBe("todo");
 state.fail=true;await checkbox.check();
 await expect(checkbox).not.toBeChecked();await expect(page.getByRole("alert").first()).toBeVisible();
 await expect(page.locator('canvas[data-effect="complete"]')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test("creation uses the same effect layer and account switches persist",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/notes");
 await page.getByRole("button",{name:"Новая заметка",exact:true}).click();
 await page.getByLabel("Название новой заметки",{exact:true}).fill("Новая запись");
 await page.getByRole("button",{name:"Создать",exact:true}).click();
 await expect.poll(()=>state.created).toBe(1);
 await expect(page.locator('canvas[data-effect="create"]')).toBeVisible({timeout:10000});
 await page.goto("/settings");await page.getByLabel("Анимации интерфейса",{exact:true}).uncheck();await page.getByLabel("Эффекты действий",{exact:true}).uncheck();
 await page.getByRole("button",{name:"Сохранить настройки",exact:true}).click();
 await expect(page.locator("html")).toHaveAttribute("data-animations","off");
 await page.reload();await expect(page.getByLabel("Эффекты действий",{exact:true})).not.toBeChecked();
 await expect(page.getByLabel("Анимации интерфейса",{exact:true})).not.toBeChecked();
 await page.goto("/today");await page.getByRole("checkbox",{name:"Выполнено: Проверить результат",exact:true}).check();
 await expect.poll(()=>state.status).toBe("completed");
 await expect(page.locator('canvas[data-effect]')).toHaveCount(0);
 expect(errors).toEqual([]);
});

test("system reduced motion suppresses particles and sidebar icons are distinct",async({page})=>{
 const {state,errors}=await setup(page);await page.emulateMedia({reducedMotion:"reduce"});await page.goto("/today");
 await page.getByRole("checkbox",{name:"Выполнено: Проверить результат",exact:true}).check();await expect.poll(()=>state.status).toBe("completed");
 await expect(page.locator('canvas[data-effect]')).toHaveCount(0);
 const navigation=page.getByRole("navigation",{name:"Главная навигация",exact:true});
 const icons=await navigation.locator("a svg[data-icon]").evaluateAll(elements=>elements.map(element=>element.getAttribute("data-icon")));
 expect(icons).toHaveLength(15);expect(new Set(icons).size).toBe(15);
 await expect(navigation.locator('a[href="/habits"] svg')).toHaveAttribute("data-icon","tabler:seedling");
 await expect(navigation.locator('a[href="/ai"] svg')).toHaveAttribute("data-icon","tabler:brain");
 expect(errors).toEqual([]);
});

test("holiday loading can be retried without blocking the personal calendar",async({page})=>{
 await setup(page);let block=true;
 await page.route(/holidays\.worker-.*\.js$/,async route=>{if(block){block=false;await route.abort();}else await route.continue();});
 await page.goto("/calendar");await selectDate(page,"2026-11-19");
 const month=page.getByRole("region",{name:"Праздники месяца",exact:true});
 await expect(month.getByRole("alert")).toHaveText("Не удалось загрузить каталог праздников.");
 await expect(page.getByRole("region",{name:"План выбранного дня",exact:true})).toBeVisible();
 await month.getByRole("button",{name:"Попробовать снова",exact:true}).click();
 await expect(month.getByRole("heading",{name:"Всемирный день туалета",exact:true})).toBeVisible({timeout:20000});
});

test("newly mounted buttons receive Motion feedback and reduction clears an active burst",async({page})=>{
 await setup(page);await page.goto("/notes");
 const button=page.getByRole("button",{name:"Новая заметка",exact:true});
 const box=await button.boundingBox();expect(box).not.toBeNull();
 await page.mouse.move(box!.x+box!.width/2,box!.y+box!.height/2);await page.mouse.down();
 await expect.poll(()=>button.evaluate(element=>{const style=getComputedStyle(element);return style.transform!=="none"||style.scale!=="none";})).toBe(true);
 await page.mouse.up();await page.goto("/today");
 await page.getByRole("checkbox",{name:"Выполнено: Проверить результат",exact:true}).check();
 await expect(page.locator('canvas[data-effect="complete"]')).toBeVisible({timeout:10000});
 await page.emulateMedia({reducedMotion:"reduce"});
 await expect(page.locator('canvas[data-effect]')).toHaveCount(0);
});
