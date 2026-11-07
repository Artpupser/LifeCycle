import {chooseChoice} from "./choice-helpers";
import {emptyOrigin,emptyFirsts} from "../src/features/profile/types";
import {expect,test,type Page} from "@playwright/test";
import {emptyContact,type Contact} from "../src/features/contacts/types";
import type {Countdown} from "../src/features/countdowns/types";
import type {Settings} from "../src/features/settings/types";
import {relationshipCategory,type ContactRelationship} from "../src/features/contacts/relationships";
import {chooseAction} from "./upgrade-helpers";

const stamp="2026-11-05T12:00:00Z";
const ids={parent:"11111111-1111-4111-8111-111111111111",child:"22222222-2222-4222-8222-222222222222",sibling:"33333333-3333-4333-8333-333333333333",friend:"44444444-4444-4444-8444-444444444444"};
type Relationship=ContactRelationship;
const defaults:Settings={timezone:"Europe/Moscow",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,animations_enabled:false,effects_enabled:false,sounds_enabled:false};

function contact(id:string,name:string,birthday:string|null,phones:string[]=[]):Contact {
 return {id,data:{...emptyContact(),first_name:name,birth_date:birthday,phones},revision:1,created_at:stamp,updated_at:stamp};
}
function countdown(id:string,title:string,category:string,target_date:string|null):Countdown {
 return {id,title,category,icon:category==="birthday"?"tabler:cake":"tabler:calendar",tags:[],target_date,target_time:null,timezone:"Europe/Moscow",recurrence:"yearly",description:"",contact_id:null,details:{full_name:"",phone:"",occupation:"",relationship:"",notes:""},display:{clock:"both",show_years:true,show_repetitions:true},repeat_yearly:true,next_date:target_date?`2027-${target_date.slice(5)}`:null,next_at:target_date?`2027-${target_date.slice(5)}T00:00:00Z`:null,original_at:target_date?`${target_date}T00:00:00Z`:null,days_remaining:100,full_years:26,repetitions:26,updated_at:stamp,contact_name:null,contact_birthday:false,suspended:!target_date,computed_at:stamp};
}

async function setup(page:Page){
 const state={
  contacts:[contact(ids.parent,"Ольга","1980-03-21"),contact(ids.child,"Анна","2004-04-23",["+12025550123"]),contact(ids.sibling,"Егор","2006-06-12"),contact(ids.friend,"София",null)],
  relationships:[{id:"parent-edge",source_id:ids.parent,target_id:ids.child,kind:"parent",category:"family",revision:1},{id:"friend-edge",source_id:ids.child,target_id:ids.friend,kind:"friend",category:"social",revision:1}] as Relationship[],
  countdowns:[] as Countdown[],writes:0,contactWrites:0,
 };
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date(stamp));
 await page.route("**/api/**",async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
  let data:unknown=[];
  if(path==="/api/auth/me")data={user:{id:"tree-user",email:"tree@example.test"}};
  else if(path==="/api/profile")data={revision:1,name:"Мой профиль",nickname:"",birth_date:"1990-03-21",origin:emptyOrigin,firsts:emptyFirsts};
  else if(path==="/api/settings")data=defaults;
  else if(path==="/api/navigation"){const paths=["/contacts","/tree","/countdowns","/today","/settings"];data={ordering:paths,pinned:paths,revision:1};}
  else if(path==="/api/labels")data=[];
  else if(path==="/api/operators/settings")data={enabled:false,configured:false};
  else if(path==="/api/operators/lookup")data={operator:"",source:"unavailable",ported:false};
  else if(path==="/api/contacts/relationships"){
   if(method==="POST"){
    const body=request.postDataJSON();
    const created:Relationship={...body,id:`created-edge-${++state.writes}`,category:relationshipCategory(body.kind),revision:1};
    state.relationships.push(created);await route.fulfill({status:201,json:created});return;
   }
   data=state.relationships;
  }
  else if(path.startsWith("/api/contacts/relationships/")&&method==="PUT"){
   const id=path.split("/").at(-1),edge=state.relationships.find(item=>item.id===id)!;const body=request.postDataJSON();expect(body.revision).toBe(edge.revision);
   Object.assign(edge,body.data,{category:relationshipCategory(body.data.kind),revision:edge.revision+1});state.writes++;await route.fulfill({json:edge});return;
  }
  else if(path.startsWith("/api/contacts/relationships/")&&method==="DELETE"){
   const id=path.split("/").at(-1),edge=state.relationships.find(item=>item.id===id);expect(request.postDataJSON().revision).toBe(edge?.revision);
   state.relationships=state.relationships.filter(item=>item.id!==id);state.writes++;await route.fulfill({status:204});return;
  }
  else if(path==="/api/contacts")data=state.contacts;
  else if(path.startsWith("/api/contacts/")){
   const id=path.split("/").at(-1),index=state.contacts.findIndex(item=>item.id===id);
   if(index<0){await route.fulfill({status:404,json:{error:{code:"not_found",message:"Not found"}}});return;}
   if(method==="PUT"){
    const body=request.postDataJSON();expect(body.revision).toBe(state.contacts[index].revision);
    state.contacts[index]={...state.contacts[index],data:body.data,revision:state.contacts[index].revision+1,updated_at:stamp};state.contactWrites++;
   }
   data=state.contacts[index];
  }
  else if(path==="/api/countdowns")data=state.countdowns;
  else if(path==="/api/today")data={date:url.searchParams.get("date"),timezone:defaults.timezone,tasks:[],events:[]};
  await route.fulfill({json:data});
 });
 return {state,errors};
}

test("profile participates in the tree and relationships without creating a contact copy",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/tree");
 const owner=page.locator('[data-tree-contact="tree-user"]');await expect(owner).toContainText("Вы");
 await owner.click();const selected=page.getByRole("region",{name:"Выбранный контакт",exact:true});
 await expect(selected.getByLabel("Знак зодиака")).toHaveText("Овен");
 await expect(selected.getByRole("link",{name:"Открыть профиль",exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Редактирование",exact:true}).click();
 await expect(selected.getByRole("button",{name:"Удалить контакт",exact:true})).toHaveCount(0);
 await page.getByRole("button",{name:"Добавить связь",exact:true}).first().click();
 const editor=page.getByRole("dialog",{name:"Новая связь",exact:true});
 await editor.getByRole("button",{name:"Выберите второй контакт",exact:true}).click();
 await page.getByRole("dialog",{name:"Выберите второй контакт",exact:true}).getByRole("button",{name:/Анна/}).click();
 await editor.getByRole("button",{name:"Сохранить связь",exact:true}).click();
 await expect(editor).toHaveCount(0);expect(state.relationships.at(-1)).toMatchObject({source_id:"tree-user",target_id:ids.child,kind:"parent"});
 await page.reload();await expect(page.locator('[data-tree-contact="tree-user"]')).toHaveCount(1);
 await page.goto("/contacts");const cards=page.locator("main [data-selection-key]");await expect(cards).toHaveCount(4);
 const desktop=await cards.evaluateAll(nodes=>nodes.slice(0,3).map(node=>node.getBoundingClientRect().top));expect(new Set(desktop).size).toBe(1);
 await page.setViewportSize({width:390,height:844});const mobile=await cards.evaluateAll(nodes=>nodes.slice(0,3).map(node=>node.getBoundingClientRect().top));expect(new Set(mobile).size).toBe(3);
 expect(state.contacts).toHaveLength(4);expect(state.contactWrites).toBe(0);expect(errors).toEqual([]);
});

test("contact tree separates family links and permits relationship changes only in edit mode",async({page})=>{
 const {state,errors}=await setup(page);await page.goto(`/tree?contact=${ids.child}`);
 await expect(page.getByRole("heading",{name:"Древо",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Просмотр",exact:true})).toHaveAttribute("aria-pressed","true");
 await expect(page.getByRole("button",{name:"Добавить связь",exact:true})).toHaveCount(0);
 const selected=page.getByRole("region",{name:"Выбранный контакт",exact:true});
 await expect(selected).toContainText("Анна");await expect(selected.getByRole("heading",{name:"Семейные связи",exact:true})).toBeVisible();await expect(selected.getByRole("heading",{name:"Другие связи",exact:true})).toBeVisible();
 await expect(selected.getByRole("button",{name:/Удалить связь/})).toHaveCount(0);
 await page.getByRole("button",{name:"Редактирование",exact:true}).click();await page.getByRole("button",{name:"Добавить связь",exact:true}).first().click();
 const editor=page.getByRole("dialog",{name:"Новая связь",exact:true});await expect(editor.getByLabel("Первый контакт",{exact:true})).toHaveValue("Анна");
 await editor.getByRole("button",{name:"Выберите второй контакт",exact:true}).click();
 await page.getByRole("dialog",{name:"Выберите второй контакт",exact:true}).getByRole("button",{name:/Егор/}).click();
 await chooseChoice(editor.getByLabel("Тип связи",{exact:true}), "sibling");await editor.getByRole("button",{name:"Сохранить связь",exact:true}).click();await expect(editor).toHaveCount(0);
 await expect.poll(()=>state.relationships.length).toBe(3);expect(state.relationships.find(edge=>edge.kind==="sibling")).toMatchObject({source_id:ids.child,target_id:ids.sibling,category:"family"});
 await expect(selected).toContainText("Егор");await page.reload();await expect(selected).toContainText("Егор");
 await expect(page.getByRole("button",{name:"Просмотр",exact:true})).toHaveAttribute("aria-pressed","true");
 await page.getByRole("button",{name:"Редактирование",exact:true}).click();await chooseAction(page,"Удалить связь",selected.locator("[data-action-subject=contact-relationship]").filter({has:page.getByRole("button",{name:"Егор",exact:true})}));
 const confirmation=page.getByRole("alertdialog");await confirmation.getByRole("button").last().click();
 await expect.poll(()=>state.relationships.length).toBe(2);expect(state.contacts).toHaveLength(4);await expect(selected.getByRole("button",{name:"Егор",exact:true})).toHaveCount(0);expect(errors).toEqual([]);
});

test("contact tree on mobile reuses contact actions and follows contact edits in both directions",async({page})=>{
 await page.setViewportSize({width:390,height:844});const {state,errors}=await setup(page);await page.goto(`/tree?contact=${ids.child}`);
 const selected=page.getByRole("region",{name:"Выбранный контакт",exact:true});await expect(selected).toContainText("Анна");
 for(const href of ["tel:+12025550123","sms:+12025550123","https://wa.me/12025550123"]){await expect(selected.locator(`a[href="${href}"]`)).toBeVisible();}
 const node=page.locator(`[data-tree-contact="${ids.child}"]`);await expect(node).toHaveAttribute("aria-pressed","true");
 await page.getByRole("button",{name:"Увеличить древо",exact:true}).click();await page.getByRole("button",{name:"Показать выбранного человека",exact:true}).click();await expect(node).toBeInViewport();
 await selected.getByRole("link",{name:"Открыть контакт",exact:true}).click();await expect(page).toHaveURL(new RegExp(`/contacts\\?contact=${ids.child}`));
 const editor=page.getByRole("dialog",{name:"Изменить контакт",exact:true});await expect(editor.getByLabel("Имя контакта",{exact:true})).toHaveValue("Анна");await editor.getByLabel("Имя контакта",{exact:true}).fill("Анна Мария");await editor.getByRole("button",{name:"Сохранить контакт",exact:true}).click();await expect(editor).toHaveCount(0);expect(state.contactWrites).toBe(1);
 const card=page.locator("main article").filter({has:page.getByRole("heading",{name:"Анна Мария",exact:true})});await chooseAction(page,"Найти в древе",card);
 await expect(page).toHaveURL(new RegExp(`/tree\\?contact=${ids.child}`));await expect(selected).toContainText("Анна Мария");await expect(page.getByRole("button",{name:"Выбрать контакт Анна Мария",exact:true})).toBeVisible();
 await page.getByLabel("Поиск в древе",{exact:true}).fill("Егор");await page.getByRole("button",{name:"Выбрать контакт Егор",exact:true}).click();await expect(selected).toContainText("Егор");
 expect(await page.locator(".app-content").evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);expect(errors).toEqual([]);
});

test("countdown birthday zodiac uses the original civil birthday and excludes ordinary or suspended events",async({page})=>{
 const {state,errors}=await setup(page);
 state.countdowns=[countdown("birthday","День рождения Ольги","birthday","1980-03-21"),countdown("ordinary","Годовщина проекта","anniversary","2000-03-21"),countdown("suspended","День рождения без даты","birthday",null)];
 // An instant on the previous UTC date must not change the civil birthday's sign.
 state.countdowns[0].original_at="1980-03-20T21:00:00Z";
 await page.goto("/countdowns");
 const birthday=page.locator("main article").filter({has:page.getByRole("heading",{name:"День рождения Ольги",exact:true})});
 await expect(birthday.getByLabel("Знак зодиака",{exact:true})).toHaveText("Овен");
 for(const name of ["Годовщина проекта","День рождения без даты"]){const card=page.locator("main article").filter({has:page.getByRole("heading",{name,exact:true})});await expect(card).toBeVisible();await expect(card.getByLabel("Знак зодиака",{exact:true})).toHaveCount(0);}
 expect(errors).toEqual([]);
});

test("tree actions and drag share relationship editing, gender and generation projections",async({page})=>{
 await page.setViewportSize({width:1600,height:1000});const {state,errors}=await setup(page);
 state.contacts.find(person=>person.id===ids.parent)!.data.gender="female";
 state.contacts.find(person=>person.id===ids.child)!.data.gender="female";
 await page.goto(`/tree?contact=${ids.child}`);
 const parent=page.locator(`[data-tree-person="${ids.parent}"]`),child=page.locator(`[data-tree-person="${ids.child}"]`);
 await expect(parent).toHaveAttribute("data-lineage","ancestor");await expect(parent).toContainText("Мать");
 await child.getByRole("button",{name:"Выбрать контакт Анна",exact:true}).click({button:"right"});
 await page.getByRole("menuitem",{name:"Редактировать древо",exact:true}).click();
 await child.getByRole("button",{name:"Выбрать контакт Анна",exact:true}).click({button:"right"});
 await page.getByRole("menuitem",{name:"Изменить контакт",exact:true}).click();
 const personEditor=page.getByRole("dialog",{name:"Изменить контакт",exact:true});await chooseChoice(personEditor.getByLabel("Пол",{exact:true}), "male");await personEditor.getByRole("button",{name:"Сохранить контакт",exact:true}).click();await expect(personEditor).toHaveCount(0);
 expect(state.contacts.find(person=>person.id===ids.child)!.data.gender).toBe("male");await expect(child.locator('[data-icon="tabler:gender-male"]')).toHaveCount(1);
 const friend=page.locator(`[data-tree-person="${ids.friend}"]`);await parent.dragTo(friend);
 const editor=page.getByRole("dialog",{name:"Новая связь",exact:true});await expect(editor.getByLabel("Первый контакт",{exact:true})).toHaveValue("Ольга");await expect(editor.getByLabel("Второй контакт",{exact:true})).toHaveValue("София");
 await chooseChoice(editor.getByLabel("Тип связи",{exact:true}), "romantic_partner");await editor.getByRole("button",{name:"Сохранить связь",exact:true}).click();await expect(editor).toHaveCount(0);
 const created=state.relationships.find(edge=>edge.kind==="romantic_partner")!;expect(created).toMatchObject({source_id:ids.parent,target_id:ids.friend});
 const edge=page.locator(`[data-tree-edge="${created.id}"]`);await edge.focus();await edge.press("Shift+F10");await page.getByRole("menuitem",{name:"Изменить связь",exact:true}).click();
 const edit=page.getByRole("dialog",{name:"Изменить связь",exact:true});await chooseChoice(edit.getByLabel("Тип связи",{exact:true}), "spouse");await edit.getByRole("button",{name:"Сохранить связь",exact:true}).click();await expect(edit).toHaveCount(0);expect(created.kind).toBe("spouse");expect(created.revision).toBe(2);
 await page.getByRole("button",{name:"Поколения до и после",exact:true}).click();await expect(page.getByRole("button",{name:"Поколения до и после",exact:true})).toHaveAttribute("aria-pressed","false");
 expect(errors).toEqual([]);
});

test("tree expands through the shared dialog and sorts relationships without losing selection",async({page})=>{
 const {errors}=await setup(page);await page.goto(`/tree?contact=${ids.child}`);
 await page.getByRole("button",{name:"На весь экран",exact:true}).click();
 const screen=page.getByRole("dialog",{name:"Древо",exact:true});await expect(screen).toBeVisible();
 const bounds=await screen.boundingBox();expect(bounds!.width).toBe(1280);expect(bounds!.height).toBe(900);
 const canvas=screen.getByRole("region",{name:"Карта связей",exact:true});
 await canvas.getByRole("button",{name:"Действия",exact:true}).first().click();
 await page.getByRole("menuitem",{name:"Сортировка связей",exact:true}).click();
 await page.getByRole("menuitem",{name:"По дате рождения",exact:true}).click();
 await expect(screen.getByRole("region",{name:"Выбранный контакт",exact:true})).toContainText("По дате рождения");
 await expect(screen.locator(`[data-tree-contact="${ids.child}"]`)).toHaveAttribute("aria-pressed","true");
 await page.keyboard.press("Escape");await expect(screen).toHaveCount(0);
 await expect(page.locator(`[data-tree-contact="${ids.child}"]`)).toHaveAttribute("aria-pressed","true");
 expect(errors).toEqual([]);
});

test("tree layout contains long names and keeps action menus separate across sizes and zoom levels",async({page},testInfo)=>{
 const {state,errors}=await setup(page);
 const longName="АннаМария".repeat(12);
 state.contacts.find(person=>person.id===ids.child)!.data.first_name=longName;
 state.relationships.push({id:"partner-edge",source_id:ids.child,target_id:ids.sibling,kind:"partner",category:"family",revision:1});
 await page.goto(`/tree?contact=${ids.child}`);
 const selected=page.getByRole("region",{name:"Выбранный контакт",exact:true});
 await expect(selected).toContainText(longName);
 for(const width of [320,390,1280,1600]){
  await page.setViewportSize({width,height:900});
  await expect.poll(()=>page.locator(".app-content").evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
  const overlapping=await page.locator("main#main [aria-haspopup=menu]").evaluateAll(all=>all.filter(button=>!button.closest("[data-tree-person]")).flatMap((button,index,buttons)=>{
   const a=button.getBoundingClientRect();
   return buttons.slice(index+1).filter(other=>{const b=other.getBoundingClientRect();return a.width&&a.height&&b.width&&b.height&&a.left<b.right&&b.left<a.right&&a.top<b.bottom&&b.top<a.bottom;}).map(()=>true);
  }));
  expect(overlapping).toEqual([]);
  expect(await selected.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
 }
 await selected.locator("header").getByRole("button",{name:"Действия",exact:true}).click();
 await expect(page.getByRole("menuitem",{name:"Открыть контакт",exact:true})).toHaveCount(1);
 await expect(page.getByRole("menuitem",{name:"Сортировка связей",exact:true})).toHaveCount(0);
 await page.keyboard.press("Escape");
 await selected.locator('[data-action-subject="relationship-sort"]').getByRole("button",{name:"Действия",exact:true}).click();
 await expect(page.getByRole("menuitem",{name:"Сортировка связей",exact:true})).toHaveCount(1);
 await expect(page.getByRole("menuitem",{name:"Открыть контакт",exact:true})).toHaveCount(0);
 await page.keyboard.press("Escape");
 const viewport=page.getByRole("region",{name:"Интерактивное древо контактов",exact:true});
 for(let step=0;step<5;step++)await page.getByRole("button",{name:"Уменьшить древо",exact:true}).click();
 expect(await viewport.evaluate(element=>Math.abs(element.scrollWidth-Math.max(element.clientWidth,element.querySelector("[data-tree-stage]")!.getBoundingClientRect().width)))).toBeLessThanOrEqual(1);
 const backgrounds=await page.locator("[data-tree-person]").evaluateAll(nodes=>nodes.map(node=>({opacity:getComputedStyle(node).opacity,background:getComputedStyle(node).backgroundColor})));
 expect(backgrounds.every(node=>node.opacity==="1"&&!node.background.endsWith(", 0)")&&node.background!=="transparent")).toBe(true);
 await page.getByRole("button",{name:"Сбросить масштаб",exact:true}).click();
 for(let step=0;step<6;step++)await page.getByRole("button",{name:"Увеличить древо",exact:true}).click();
 await page.getByRole("button",{name:"Показать выбранного человека",exact:true}).click();
 await expect(page.locator(`[data-tree-contact="${ids.child}"]`)).toBeInViewport();
 await page.screenshot({path:testInfo.outputPath("tree-desktop.png"),fullPage:true});
 await page.setViewportSize({width:320,height:740});
 await page.getByRole("button",{name:"На весь экран",exact:true}).click();
 const screen=page.getByRole("dialog",{name:"Древо",exact:true});
 await expect(screen).toBeVisible();
 expect(await screen.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);
 await screen.getByRole("button",{name:"Сбросить масштаб",exact:true}).click();
 await page.screenshot({path:testInfo.outputPath("tree-mobile.png")});
 await page.keyboard.press("Escape");await expect(screen).toHaveCount(0);
 await page.getByLabel("Поиск в древе",{exact:true}).fill("НикогоНет");
 await expect(page.getByRole("status").filter({hasText:"Нет контактов с такими условиями поиска."})).toBeVisible();
 expect(errors).toEqual([]);
});

test("tree moves a card onto empty viewport space using scaled canvas coordinates",async({page})=>{
 await page.setViewportSize({width:1600,height:1000});
 const {errors}=await setup(page);await page.goto(`/tree?contact=${ids.child}`);
 await page.getByRole("button",{name:"Редактирование",exact:true}).click();
 for(let step=0;step<5;step++)await page.getByRole("button",{name:"Уменьшить древо",exact:true}).click();
 const viewport=page.getByRole("region",{name:"Интерактивное древо контактов",exact:true});
 const card=page.locator(`[data-tree-person="${ids.parent}"]`);
 const before=await card.boundingBox();const region=await viewport.boundingBox();
 const transfer=await page.evaluateHandle(()=>new DataTransfer());
 const dropX=region!.x+region!.width-40,dropY=region!.y+region!.height-40;
 const stage=await page.locator("[data-tree-stage]").boundingBox();
 await card.dispatchEvent("dragstart",{clientX:before!.x+20,clientY:before!.y+20,dataTransfer:transfer});
 await viewport.dispatchEvent("drop",{clientX:dropX,clientY:dropY,dataTransfer:transfer});
 await card.dispatchEvent("dragend",{dataTransfer:transfer});
 await transfer.dispose();
 await expect.poll(()=>card.evaluate(element=>Number.parseFloat(element.style.left))).toBeCloseTo((dropX-stage!.x-20)/.5,0);
 await expect.poll(()=>card.evaluate(element=>Number.parseFloat(element.style.top))).toBeCloseTo((dropY-stage!.y-20)/.5,0);
 await expect(page.getByRole("dialog",{name:"Новая связь",exact:true})).toHaveCount(0);
 expect(errors).toEqual([]);
});
