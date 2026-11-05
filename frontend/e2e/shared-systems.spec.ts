import {chooseAction} from "./upgrade-helpers";
import {expect,test,type Page} from "@playwright/test";
import type {Settings} from "../src/features/settings/types";
import {emptyContact} from "../src/features/contacts/types";
import type {Countdown} from "../src/features/countdowns/types";
const stamp="2026-11-02T12:00:00Z";
const imageId="123e4567-e89b-12d3-a456-426614174000";
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGNQMHAAAAEEAJGibWOuAAAAAElFTkSuQmCC","base64");
const defaults:Settings={timezone:"Europe/Moscow",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,sounds_enabled:false,sound_ui:true,sound_notifications:true,sound_volume:25,sound_theme:"soft",background_image:null,background_dim:85};
test.use({viewport:{width:390,height:844}});
async function setup(page:Page){
  const state={settings:{...defaults},authenticated:true,uploads:[] as string[],note:{id:"note",title:"Работа",content:"**Личный текст**",tags:[],color:"#6366f1",folder_id:null,updated_at:stamp,ai_shared:false,ai_access_revision:0}};
  const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/**",async route=>{
    const request=route.request(),url=new URL(request.url()),path=url.pathname;
    if(path==="/api/auth/me"){await route.fulfill({json:{user:state.authenticated?{id:"systems-user",email:"systems@example.test"}:null}});return;}
    if(path==="/api/auth/logout"){state.authenticated=false;await route.fulfill({status:204});return;}
    if(path==="/api/settings"){if(request.method()==="PUT")state.settings={...state.settings,...request.postDataJSON()};await route.fulfill({json:state.settings});return;}
    if(path==="/api/navigation"){const links=["/settings","/notes","/contacts","/tasks","/habits","/countdowns"];await route.fulfill({json:{ordering:links,pinned:links,revision:1}});return;}
    if(path==="/api/ai/settings"){await route.fulfill({json:{provider:"openai",auth_mode:"api_key",active_account_id:null,login_available:false,model:"gpt-4.1-mini",enabled:false,permissions:{analytics:false,tasks:false,habits:false,workouts:false,notes:false,profile:false,intimacy:false,changes:false},key_present:false,openai_key_present:false,openrouter_key_present:false,revision:1}});return;}
    if(path==="/api/media"&&request.method()==="POST"){state.uploads.push(request.headers()["content-type"]);await route.fulfill({status:201,json:{id:imageId,url:`/api/media/${imageId}`}});return;}
    if(path===`/api/media/${imageId}`){await route.fulfill({contentType:"image/png",body:png});return;}
    if(path==="/api/notes"){await route.fulfill({json:[state.note]});return;}
    if(path==="/api/notes/note"){state.note={...state.note,...request.postDataJSON()};await route.fulfill({json:state.note});return;}
    if(path==="/api/today"){await route.fulfill({json:{date:"2026-11-02",timezone:"Europe/Moscow",tasks:[],events:[]}});return;}
    await route.fulfill({json:[]});
  });
  return {state,errors};
}
async function chooseIcon(page:Page,trigger:string,query:string,id:string){
  await page.getByRole("button",{name:trigger,exact:true}).click();
  const picker=page.getByRole("dialog",{name:"Все значки",exact:true});
  await picker.getByLabel("Поиск значков",{exact:true}).fill(query);
  await picker.getByRole("button",{name:id,exact:true}).click();
  await expect(picker).toHaveCount(0);
}

test("a journal form waits for concurrent uploads when an idle editor is removed",async({page})=>{
  const {errors}=await setup(page);
  const finish:Array<()=>void>=[];
  await page.route("**/api/media",async route=>{
    await new Promise<void>(resolve=>finish.push(resolve));
    await route.fulfill({status:201,json:{id:imageId,url:`/api/media/${imageId}`}});
  });
  const answers={yes:0,no:0,unknown:0};
  await page.route("**/api/sex?**",route=>route.fulfill({json:{total:0,entries:[],statistics:{total:0,sex:0,masturbation:0,active_days:0,duration_minutes:0,duration_answers:0,average_duration_minutes:null,with_toys:0,ejaculations:0,repeat_desired:answers,lubricant_used:answers,protection_used:answers,days:{},emotions:{}}}}));
  await page.goto("/sex");
  await page.getByRole("button",{name:"Новое событие",exact:true}).click();
  const inputs=page.getByLabel("Загрузить изображение",{exact:true});
  await inputs.nth(0).setInputFiles({name:"main.png",mimeType:"image/png",buffer:png});
  await inputs.nth(1).setInputFiles({name:"step.png",mimeType:"image/png",buffer:png});
  await expect.poll(()=>finish.length).toBe(2);
  const save=page.getByRole("button",{name:"Сохранить событие",exact:true});
  await expect(save).toBeDisabled();
  finish[0]();
  await expect(page.getByLabel("Ощущения после (Markdown)",{exact:true})).toHaveValue(/main\.png/);
  await expect(save).toBeDisabled();
  finish[1]();
  await expect(save).toBeEnabled();
  // Removing an idle editor must not clear another editor's active upload.
  await inputs.nth(1).setInputFiles({name:"again.png",mimeType:"image/png",buffer:png});
  await expect.poll(()=>finish.length).toBe(3);
  await page.getByLabel("Тип события",{exact:true}).selectOption("sex");
  await page.getByRole("alertdialog").getByRole("button").last().click();
  await expect(save).toBeDisabled();
  finish[2]();
  await expect(save).toBeEnabled();
  expect(errors).toEqual([]);
});

test("language and theme persist, user text stays unchanged, and preferences reset on logout",async({page},info)=>{
  const {state,errors}=await setup(page);
  await page.goto("/settings");
  await expect(page.getByLabel("Язык интерфейса",{exact:true})).toBeInViewport();
  await page.getByRole("radio",{name:"Океан",exact:true}).click();
  await page.getByLabel("Язык интерфейса",{exact:true}).selectOption("en");
  await page.getByRole("button",{name:"Сохранить настройки",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Settings",exact:true})).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang","en");
  await expect(page.locator("html")).toHaveAttribute("data-theme","ocean");
  expect(state.settings.language).toBe("en");
  await page.reload();await expect(page.getByRole("radio",{name:"Ocean",exact:true})).toHaveAttribute("aria-checked","true");
  await page.goto("/notes");await expect(page.getByRole("button",{name:"Работа",exact:true})).toBeVisible();
  await expect(page.getByRole("heading",{name:"Notes",exact:true})).toBeVisible();
  await page.screenshot({path:info.outputPath("english-ocean-notes.png"),fullPage:true});
  await page.getByRole("button",{name:"Sign out",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Sign in or create an account",exact:true})).toBeVisible();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme","ocean");expect(errors).toEqual([]);
});

test("custom themes validate contrast and sound settings can all be disabled",async({page})=>{
  const {state,errors}=await setup(page);await page.goto("/settings");
  await page.getByRole("radio",{name:"Своя тема",exact:true}).click();
  await page.getByLabel("Текст",{exact:true}).fill("#ffffff");
  await expect(page.getByRole("button",{name:"Сохранить настройки",exact:true})).toBeDisabled();
  await page.getByLabel("Текст",{exact:true}).fill("#111111");
  await page.getByLabel("Звуки приложения",{exact:true}).check();
  await page.getByLabel("Отклик интерфейса",{exact:true}).uncheck();
  await page.getByLabel("Характер звука",{exact:true}).selectOption("glass");
  await page.getByRole("button",{name:"Послушать звук",exact:true}).click();
  await page.getByRole("button",{name:"Сохранить настройки",exact:true}).click();
  await expect(page.getByText("Настройки сохранены",{exact:true})).toBeVisible();
  expect(state.settings.sound_ui).toBe(false);expect(state.settings.sound_theme).toBe("glass");expect(state.settings.theme).toBe("custom");
  await page.reload();await expect(page.getByLabel("Звуки приложения",{exact:true})).toBeChecked();
  await page.getByLabel("Звуки приложения",{exact:true}).uncheck();
  await expect(page.getByRole("button",{name:"Послушать звук",exact:true})).toBeDisabled();
  await page.getByRole("button",{name:"Сохранить настройки",exact:true}).click();
  await expect(page.getByText("Настройки сохранены",{exact:true})).toBeVisible();
  expect(state.settings.sounds_enabled).toBe(false);expect(errors).toEqual([]);
});

test("background and Markdown share private image upload and survive reload",async({page},info)=>{
  const {state,errors}=await setup(page);await page.goto("/settings");
  await page.getByLabel("Загрузить изображение",{exact:true}).setInputFiles({name:"private.png",mimeType:"image/png",buffer:png});
  await expect(page.getByRole("img",{name:"Фон темы",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Сохранить настройки",exact:true}).click();
  await expect(page.getByText("Настройки сохранены",{exact:true})).toBeVisible();
  await page.reload();await expect(page.locator('.pointer-events-none.fixed.inset-0 img')).toHaveCount(1);
  await page.goto("/notes");await page.getByRole("button",{name:"Работа",exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>Boolean(document.elementFromPoint(24,24)?.closest('[aria-label="Редактор заметки"]')))).toBe(true);
  await page.getByLabel("Загрузить изображение",{exact:true}).setInputFiles({name:"private.png",mimeType:"image/png",buffer:png});
  await expect(page.getByLabel("Содержание",{exact:true})).toHaveValue(new RegExp(`/api/media/${imageId}`));
  await page.getByRole("button",{name:"Просмотр",exact:true}).click();
  await expect(page.getByRole("img",{name:"private.png",exact:true})).toBeVisible();
  await page.getByRole("button",{name:"Сохранить заметку",exact:true}).click();
  await expect(page.getByText("Заметка сохранена",{exact:true})).toBeVisible();
  expect(state.uploads).toEqual(["image/png","image/png"]);expect(state.note.content).toContain("**Личный текст**");
  await page.screenshot({path:info.outputPath("private-images-and-background.png"),fullPage:true});
  expect(errors).toEqual([]);
});

test("phone country picker shows flags and formats a country-specific number",async({page})=>{
  const {errors}=await setup(page);
  let contact={id:"anna",revision:1,created_at:stamp,updated_at:stamp,data:{...emptyContact(),first_name:"Анна",phones:["+12025550123"]}};
  await page.route("**/api/contacts**",async route=>{if(route.request().method()==="PUT")contact={...contact,...route.request().postDataJSON()};await route.fulfill({json:route.request().method()==="PUT"?contact:[contact]});});
  await page.goto("/contacts");await chooseAction(page,"Изменить контакт");
  await page.getByRole("button",{name:"Страна телефона",exact:true}).click();
  const picker=page.getByRole("dialog",{name:"Выберите страну",exact:true});
  await picker.getByLabel("Поиск страны",{exact:true}).fill("Germany");
  const germany=picker.getByRole("button",{name:/Германия/});await expect(germany.locator('svg[data-icon="circle-flags:de"]')).toBeVisible();await germany.click();
  await page.getByLabel("Телефон 1",{exact:true}).fill("030 12345678");
  await page.getByLabel("Телефон 1",{exact:true}).press("Tab");
  await expect(page.getByLabel("Телефон 1",{exact:true})).toHaveValue("+49 30 12345678");
  await page.getByRole("button",{name:"Сохранить контакт",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);expect(contact.data.phones).toEqual(["+49 30 12345678"]);expect(errors).toEqual([]);
});

test("boards, habits and countdowns reuse the full visual icon catalog",async({page},info)=>{
  const {errors}=await setup(page);
  let boardState={board:{id:"board",name:"Моя доска",emoji:"",view:"kanban",zoom:"week",revision:1},columns:[{id:"column",name:"Начало",color:"#6366f1",position:0}],items:[]};
  let createdBoard=false;let habitInput:Record<string,unknown>|null=null;let eventInput:Record<string,unknown>|null=null;
  await page.route("**/api/boards**",async route=>{const path=new URL(route.request().url()).pathname;if(route.request().method()==="POST"){boardState={...boardState,board:{...boardState.board,...route.request().postDataJSON()}};createdBoard=true;await route.fulfill({json:boardState});}else await route.fulfill({json:path.endsWith("memberships")?[]:path==="/api/boards"?(createdBoard?[boardState.board]:[]):boardState});});
  await page.route("**/api/habits**",async route=>{if(route.request().method()==="POST"){habitInput=route.request().postDataJSON();await route.fulfill({json:{id:"habit",...habitInput}});}else if(route.request().url().includes("statistics"))await route.fulfill({status:503,json:{error:{code:"unavailable"}}});else await route.fulfill({json:[]});});
  await page.route("**/api/countdowns**",async route=>{if(route.request().method()==="POST"){eventInput=route.request().postDataJSON();await route.fulfill({json:{id:"event",...eventInput}});}else await route.fulfill({json:[] as Countdown[]});});
  await page.goto("/tasks");await page.getByRole("button",{name:"Новая доска",exact:true}).click();await page.getByLabel("Название доски",{exact:true}).fill("Моя доска");
  await chooseIcon(page,"Выбрать значок доски","github","simple-icons:github");
  await page.getByRole("button",{name:"Сохранить доску",exact:true}).click();
  await expect(page.locator('svg[data-icon="simple-icons:github"]').first()).toBeVisible();expect(boardState.board.emoji).toBe("simple-icons:github");
  await page.goto("/habits");await page.getByRole("button",{name:"Новая привычка",exact:true}).click();await page.getByLabel("Название привычки",{exact:true}).fill("Привычка с флагом");
  await chooseIcon(page,"Выбрать значок привычки","Japan","circle-flags:jp");
  await page.getByRole("button",{name:"Сохранить привычку",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((habitInput as unknown as {habit:{icon:string}}).habit.icon).toBe("circle-flags:jp");
  await page.goto("/countdowns");await page.getByRole("button",{name:"Новое событие",exact:true}).click();await page.getByLabel("Название события",{exact:true}).fill("Событие с логотипом");
  await chooseIcon(page,"Выбрать значок события","LifeCycle","lifecycle:mark");
  await page.screenshot({path:info.outputPath("shared-icon-editor.png"),fullPage:true});
  await page.getByRole("button",{name:"Сохранить событие",exact:true}).click();await expect(page.getByRole("dialog")).toHaveCount(0);
  expect((eventInput as unknown as {icon:string}).icon).toBe("lifecycle:mark");expect(errors).toEqual([]);
});

test("selection uses the shared context menu for first N, all pages and batch removal",async({page})=>{
 const {errors}=await setup(page);
 const entries=Array.from({length:72},(_,index)=>({id:`00000000-0000-4000-8000-${String(index+1).padStart(12,"0")}`,section:"notes",operation:"created",entity_key:`note-${index}`,occurred_at:new Date(Date.parse(stamp)-index*1000).toISOString()}));
 let remaining=[...entries];const removed:string[][]=[];
 await page.route("**/api/history**",async route=>{
  const request=route.request();const url=new URL(request.url());
  if(url.pathname==="/api/history/remove"){
   const body=request.postDataJSON() as {confirmed:boolean;items:{kind:string;item_key:string}[]};expect(body.confirmed).toBe(true);expect(body.items.every(item=>item.kind==="activity")).toBe(true);
   const ids=body.items.map(item=>item.item_key);removed.push(ids);remaining=remaining.filter(item=>!ids.includes(item.id));await route.fulfill({status:204});return;
  }
  const after=url.searchParams.get("before_id");const start=after?remaining.findIndex(item=>item.id===after)+1:0;const items=remaining.slice(start,start+50);const last=items.at(-1);const more=remaining.length>start+items.length;
  await route.fulfill({json:{items,next_before:more?last!.occurred_at:null,next_id:more?last!.id:null}});
 });
 await page.goto("/history");const cards=page.locator("main article");await expect(cards).toHaveCount(50);await expect(cards.getByRole("checkbox")).toHaveCount(0);await expect(page.getByRole("button",{name:"Первые 10",exact:true})).toHaveCount(0);
 const popup=page.getByRole("menu",{name:"Действия",exact:true});
 async function openSelection(){await cards.first().click({button:"right"});await popup.getByRole("menuitem",{name:/^Множественный выбор/}).click();}
 await openSelection();await popup.getByRole("menuitem",{name:"Первые 10",exact:true}).click();await expect(page.locator("main article[data-selected=true]")).toHaveCount(10);
 await cards.first().locator("button[data-context-ignore]").click();await popup.getByRole("menuitem",{name:"Снять выбор записи",exact:true}).click();await expect(page.locator("main article[data-selected=true]")).toHaveCount(9);
 await cards.first().locator("button[data-context-ignore]").focus();await page.keyboard.press("Shift+F10");await popup.getByRole("menuitem",{name:/^Множественный выбор/}).focus();await page.keyboard.press("ArrowRight");await popup.getByRole("menuitem",{name:"Первые N…",exact:true}).click();
 const amount=popup.getByLabel("Количество для выбора",{exact:true});await expect(amount).toBeFocused();await amount.fill("55");await amount.press("Enter");await expect(popup).toHaveCount(0);await expect(page.locator("main article[data-selected=true]")).toHaveCount(50);
 await cards.first().click({button:"right"});await expect(popup.getByRole("menuitem",{name:"Множественный выбор (55)",exact:true})).toBeVisible();await popup.getByRole("menuitem",{name:/^Множественный выбор/}).click();await expect(popup.getByRole("menuitem",{name:"Убрать выбранные из истории",exact:true})).toBeEnabled();await page.keyboard.press("Escape");
 await openSelection();await popup.getByRole("menuitem",{name:"Выбрать все",exact:true}).click();
 await openSelection();await popup.getByRole("menuitem",{name:"Убрать выбранные из истории",exact:true}).click();const confirm=page.getByRole("alertdialog");await expect(confirm).toContainText("72");await page.keyboard.press("Escape");expect(removed).toHaveLength(0);
 await openSelection();await popup.getByRole("menuitem",{name:"Убрать выбранные из истории",exact:true}).click();await confirm.getByRole("button",{name:"Убрать запись",exact:true}).click();await expect(cards).toHaveCount(0);expect(removed.flat()).toHaveLength(72);expect(new Set(removed.flat()).size).toBe(72);expect(errors).toEqual([]);
});

async function gallerySetup(page:Page){
 const base=await setup(page);
 const task=(id:string)=>({id,title:`Задача ${id}`,description:"Описание карточки",tags:[],color:"#6366f1",priority:"normal",parent_id:null,due_at:null,schedule:null,status:"todo",source_kind:"manual",source_id:null,created_at:stamp,updated_at:stamp});
 const contacts=Array.from({length:3},(_,i)=>({id:`c${i+1}`,revision:i+3,created_at:stamp,updated_at:stamp,data:{...emptyContact(),first_name:`Человек ${i+1}`,activity:"Описание карточки",tags:[i===0?"Личный":"Работа"]}}));
 const notes=Array.from({length:9},(_,i)=>({...base.state.note,id:`n${i+1}`,title:`Заметка ${i+1}`,content:"Текст карточки для выделения"}));
 const labels=[{id:"tag1",name:"Общий",kind:"tag",color:"#6366f1",revision:1},{id:"tag2",name:"Особый",kind:"category",color:"#6366f1",revision:2},{id:"system",name:"AI Доступ",kind:"functional",function_key:"ai_access",is_system:true,repeatable:false,color:"#6366f1",revision:1}];
 const workouts=Array.from({length:3},(_,i)=>({id:`w${i}`,data:{title:`План ${i}`,description:"Техника",tags:[],rounds:[]},revision:1,ai_shared:false,ai_access_revision:0}));
 const exercises=Array.from({length:2},(_,i)=>({id:`e${i}`,data:{title:`Упражнение ${i}`,description:"Техника",kind:"repetitions",sources:[],images:[]},revision:1,ai_shared:false,ai_access_revision:0}));
 const entries=Array.from({length:3},(_,i)=>({id:`s${i}`,revision:1,created_at:stamp,updated_at:stamp,started_at:stamp,data:{kind:"masturbation",local_start:"2026-11-02T15:00",timezone:"Europe/Moscow",time_occurrence:"earlier",duration_minutes:10,toys:[],lubricant_used:null,setting:"",was_clothed:null,emotions:[],repeat_desired:null,note:"",partner:null,solo:{porn_sources:[],feelings_after:""}}}));
 const answers={yes:0,no:0,unknown:3};
 const statistics={total:3,sex:0,masturbation:3,active_days:1,duration_minutes:30,duration_answers:3,average_duration_minutes:10,ejaculations:0,ejaculation_answers:0,with_toys:0,repeat_desired:answers,lubricant_used:answers,protection_used:answers,emotions:{},days:{}};
 const tasks=Array.from({length:3},(_,i)=>task(`t${i}`));
 await page.route("**/api/**",async route=>{
  const path=new URL(route.request().url()).pathname;
  const data:Record<string,unknown>={"/api/contacts":contacts,"/api/notes":notes,"/api/labels":labels,"/api/tasks":tasks,"/api/workouts":workouts,"/api/exercises":exercises,"/api/workout-sessions/active":null,"/api/workouts/preferences":{revision:1,data:{goals:"",equipment:"",restrictions:""}},"/api/sex":{entries,total:entries.length,statistics,offset:0,limit:50,from:"2026-10-01",to:"2026-11-05",timezone:"Europe/Moscow"},"/api/habits":[{...task("h1"),source_kind:"habit",schedule:{start_date:"2026-11-01",time:null,timezone:"Europe/Moscow",duration_minutes:1,recurrence:"daily",interval_days:1,weekdays:[],end_date:null},habit:{icon:"tabler:leaf"}}],"/api/pomodoro/configs":[]};
  if(Object.hasOwn(data,path)){await route.fulfill({json:data[path]});return;}
  await route.fallback();
 });
 return {...base,contacts,notes,labels};
}
async function galleryMenu(page:Page,card:import('@playwright/test').Locator){
 await card.click({button:"right",position:{x:7,y:12}});
 const popup=page.getByRole("menu",{name:"Действия",exact:true});
 await popup.getByRole("menuitem",{name:/^Множественный выбор/}).click();return popup;
}

test("gallery selection is shared by entity lists and protects system labels",async({page})=>{
 const {errors}=await gallerySetup(page);
 for(const [path,count,selectable] of [["/tasks",3,3],["/notes",9,9],["/contacts",3,3],["/workouts",5,3],["/sex",3,3],["/labels",3,2],["/habits",1,1]] as const){
  await page.goto(path);const cards=page.locator("main [data-selection-key]");await expect(cards).toHaveCount(count);
  const popup=await galleryMenu(page,cards.first());await popup.getByRole("menuitem",{name:"Первые 10",exact:true}).click();
  await expect(page.locator("main [data-selection-key][data-selected=true]")).toHaveCount(selectable);
  const clear=await galleryMenu(page,cards.first());await clear.getByRole("menuitem",{name:"Снять выбор",exact:true}).click();await expect(page.locator("main [data-selection-key][data-selected=true]")).toHaveCount(0);
 }
 expect(errors).toEqual([]);
});

test("gallery selection applies tag deltas and keeps only failed deletions selected",async({page})=>{
 const {errors,contacts}=await gallerySetup(page);const tagWrites:Array<{tags:string[];previous_tags:string[]}>=[];const deleted:string[]=[];
 await page.route("**/api/labels/subjects/contacts/*",async route=>{
  const id=new URL(route.request().url()).pathname.split("/").at(-1)!;const contact=contacts.find(item=>item.id===id)!;
  if(route.request().method()==="PUT"){const body=route.request().postDataJSON();tagWrites.push(body);contact.data.tags=body.tags;}
  await route.fulfill({json:{tags:contact.data.tags,values:[],ai_access:null}});
 });
 await page.route("**/api/contacts/*",async route=>{
  if(route.request().method()!=="DELETE"){await route.fallback();return;}
  const id=new URL(route.request().url()).pathname.split("/").at(-1)!;const contact=contacts.find(item=>item.id===id)!;expect(route.request().postDataJSON()).toEqual({revision:contact.revision,events:"keep"});
  if(id==="c2"){await route.fulfill({status:409,json:{error:{code:"contact_stale"}}});return;}
  deleted.push(id);contacts.splice(contacts.findIndex(item=>item.id===id),1);await route.fulfill({status:204});
 });
 await page.goto("/contacts");const cards=page.locator("main [data-selection-key]");await expect(cards).toHaveCount(3);
 let menu=await galleryMenu(page,cards.first());await menu.getByRole("menuitem",{name:"Выбрать показанные",exact:true}).click();
 menu=await galleryMenu(page,cards.first());await menu.getByRole("menuitem",{name:"Добавить теги выбранным",exact:true}).click();
 const dialog=page.getByRole("dialog",{name:"Добавить теги выбранным",exact:true});await dialog.getByRole("checkbox",{name:"Общий",exact:true}).check();await dialog.getByRole("button",{name:"Применить",exact:true}).click();await expect(dialog).toHaveCount(0);
 expect(tagWrites.map(item=>item.previous_tags)).toEqual([["Личный"],["Работа"],["Работа"]]);expect(tagWrites.map(item=>item.tags)).toEqual([["Личный","Общий"],["Работа","Общий"],["Работа","Общий"]]);
 menu=await galleryMenu(page,cards.first());await menu.getByRole("menuitem",{name:"Выбрать показанные",exact:true}).click();
 menu=await galleryMenu(page,cards.first());await menu.getByRole("menuitem",{name:"Удалить выбранные записи",exact:true}).click();await page.getByRole("alertdialog").getByRole("button",{name:"Продолжить",exact:true}).click();
 await expect(cards).toHaveCount(1);await expect(cards.first()).toHaveAttribute("data-selected","true");expect(deleted).toEqual(["c1","c3"]);expect(errors).toEqual([]);
});

test("gallery selection uses mouse marquee, additive modifiers and cancellation without stealing inputs",async({page})=>{
 await page.setViewportSize({width:1440,height:1000});const {errors}=await gallerySetup(page);await page.goto("/notes");
 const cards=page.locator("main [data-selection-key]");await expect(cards).toHaveCount(9);
 const selected=page.locator("main [data-selection-key][data-selected=true]");const first=(await cards.nth(0).boundingBox())!,second=(await cards.nth(1).boundingBox())!;
 await page.mouse.move(first.x+6,first.y+8);await page.mouse.down();await page.mouse.move(second.x+second.width-6,second.y+second.height-8,{steps:8});await expect(page.locator("[data-selection-marquee]")).toHaveCount(1);await page.mouse.up();await expect(selected).toHaveCount(2);await expect(page.locator("[data-selection-marquee]")).toHaveCount(0);
 const third=(await cards.nth(2).boundingBox())!;await page.keyboard.down("Control");await page.mouse.move(third.x+6,third.y+8);await page.mouse.down();await page.mouse.move(third.x+20,third.y+third.height-8,{steps:3});await page.mouse.up();await page.keyboard.up("Control");await expect(selected).toHaveCount(3);
 const fourth=(await cards.nth(3).boundingBox())!;await page.mouse.move(fourth.x+6,fourth.y+8);await page.mouse.down();await page.mouse.move(fourth.x+20,fourth.y+fourth.height-8,{steps:3});await page.keyboard.press("Escape");await page.mouse.up();await expect(selected).toHaveCount(3);
 await cards.first().getByRole("button",{name:"Заметка 1",exact:true}).click();await expect(page.getByRole("button",{name:"Заметка 1",exact:true}).first()).toBeVisible();await expect(page.locator("[data-selection-marquee]")).toHaveCount(0);
 const search=page.getByLabel("Поиск заметок",{exact:true});await search.fill("Заметка 2");await expect(cards).toHaveCount(1);await expect(selected).toHaveCount(0);expect(errors).toEqual([]);
});

test.describe("gallery touch selection",()=>{
 test.use({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
 test("hold and drag selects cards while a quick swipe still scrolls",async({page})=>{
  const {errors}=await gallerySetup(page);await page.goto("/contacts");const cards=page.locator("main [data-selection-key]");await expect(cards).toHaveCount(3);await cards.first().scrollIntoViewIfNeeded();
  const client=await page.context().newCDPSession(page);let first=(await cards.first().boundingBox())!;
  const point={x:Math.round(first.x+8),y:Math.round(first.y+30)};
  await client.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[point]});await client.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:point.x,y:point.y-65}]});await client.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await expect(page.locator("main [data-selected=true]")).toHaveCount(0);await expect(page.locator("[data-selection-marquee]")).toHaveCount(0);
  await cards.first().scrollIntoViewIfNeeded();first=(await cards.first().boundingBox())!;const second=(await cards.nth(1).boundingBox())!;
  await client.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x:Math.round(first.x+8),y:Math.round(first.y+30)}]});await page.waitForTimeout(450);await expect(cards.first()).toHaveAttribute("data-selected","true");
  await client.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x:Math.round(second.x+second.width-10),y:Math.round(Math.min(780,second.y+second.height-15))}]});await client.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
  await expect(page.locator("main [data-selected=true]")).toHaveCount(2);await expect(page.locator("[data-selection-marquee]")).toHaveCount(0);expect(errors).toEqual([]);
 });
});
