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
