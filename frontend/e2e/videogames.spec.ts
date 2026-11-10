import {noPermissions} from "../src/features/ai/types";
import {test,expect,type Page} from "@playwright/test";
import registry from "../../shared/integrations.json" with {type:"json"};
import sales from "../../shared/game-sales.json" with {type:"json"};
import {emptyOrigin,emptyFirsts} from "../src/features/profile/types";
import type {Settings} from "../src/features/settings/types";
import type {GameCatalog,Offer} from "../src/features/videogames/types";
import type {Integration} from "../src/systems/integrations/types";
const stamp="2026-11-08T12:00:00Z";
const settings:Settings={timezone:"Europe/Moscow",time_format:"24h",language:"ru",theme:"light",week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5,animations_enabled:false,effects_enabled:false,sounds_enabled:false};
const offer=(id:string,free:boolean,ownership:Offer["ownership"]):Offer=>({id,platform:id==="gift"?"epic":"steam",title:id==="gift"?"Бесплатная игра": "Portal",app_id:id==="gift"?null:"400",price:free?"0.00":"0.99",regular_price:"19.99",currency:"USD",discount_basis_points:free?10000:9504,free,url:id==="gift"?"https://store.epicgames.com/p/gift":"https://store.steampowered.com/app/400/",claim_url:id==="gift"?"https://store.epicgames.com/p/gift":"https://www.cheapshark.com/redirect?dealID=portal",source:free?"gamerpower":"cheapshark",ends_at:null,ownership});
async function setup(page:Page){
 const state={settings:{...settings},providers:registry.map(provider=>({...provider,instance_id:provider.id==="steam"?"11111111-1111-4111-8111-111111111111":null,connected:provider.id==="steam",configured:provider.id==="steam",account_id:provider.id==="steam"?"76561198000000000":null,revision:provider.id==="steam"?1:0,last_synced_at:provider.id==="steam"?stamp:null,last_error:null})) as Integration[],keyWrites:[] as unknown[],syncs:0,disconnects:0,events:[] as Record<string,unknown>[],notifications:[] as {id:string;message:string;parameters:Record<string,number>;href:string}[],reads:0,catalog:{offers:[offer("portal",false,"verified"),offer("gift",true,"unknown")],library:[{provider:"steam",id:"400",name:"Portal",playtime_minutes:600,recent_minutes:120,last_played_at:stamp,store_url:"https://store.steampowered.com/app/400/"}],stats:{available:true,games:1,played:1,playtime_minutes:600,recent_minutes:120},sales,calendar_sales:[],notify_free:true,checked_at:stamp,unavailable_sources:[]} as GameCatalog};
 const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
 await page.clock.setFixedTime(new Date(stamp));
 await page.route("**/api/**",async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();let data:unknown=[];
  if(path==="/api/auth/me")data={user:{id:"user",email:"games@example.test"}};
  else if(path==="/api/profile")data={revision:1,name:"Игрок",nickname:"",gender:"unspecified",birth_date:null,birth_country:"",residence_country:"",origin:emptyOrigin,firsts:emptyFirsts,harmful_habits:[],conditions:[],daily_medications:[],past_medications:[],surgeries:[],height_cm:null,weight_kg:null,arms_count:null,legs_count:null,eye_color:"",hair_color:"",skin_color:"",colleagues_count:null,friends_count:null,acquaintances_count:null,has_family:null,has_partner:null,penis_length_cm:null,penis_width_cm:null,breast_size:"",pregnant:null};
  else if(path==="/api/settings"){if(method==="PUT")Object.assign(state.settings,request.postDataJSON());data=state.settings;}
  else if(path==="/api/navigation")data={ordering:["/videogames","/profile","/calendar","/today"],pinned:["/videogames","/profile","/calendar","/today"],revision:1};
  else if(path==="/api/ai/settings")data={provider:"openai",auth_mode:"api_key",active_account_id:null,login_available:false,model:"",enabled:false,permissions:noPermissions,key_present:false,openai_key_present:false,openrouter_key_present:false,revision:0};
  else if(path==="/api/operators/settings")data={enabled:false,configured:false};
  else if(path==="/api/notifications/push")data={public_key:null,subscriptions:[]};
  else if(path==="/api/integrations")data=state.providers;
  else if(path==="/api/integrations/steam"&&method==="PUT"){
   const input=request.postDataJSON(),provider=state.providers[0];expect(input.revision).toBe(provider.revision);expect(input.instance_id).toBe(provider.instance_id);state.keyWrites.push(input);provider.configured=!input.remove_key;provider.revision++;data=state.providers;
  }
  else if(path==="/api/integrations/steam"&&method==="DELETE"){
   const provider=state.providers[0];expect(request.postDataJSON().instance_id).toBe(provider.instance_id);state.disconnects++;provider.connected=false;provider.configured=false;provider.revision=0;provider.instance_id=null;provider.account_id=null;state.catalog.library=[];state.catalog.stats={available:false,games:0,played:0,playtime_minutes:0,recent_minutes:null};await route.fulfill({status:204});return;
  }
  else if(path==="/api/integrations/steam/sync"){
   state.syncs++;state.providers[0].last_synced_at=stamp;await route.fulfill({status:204});return;
  }
  else if(path==="/api/integrations/steam/connect")data={url:"https://steamcommunity.com/openid/login?openid.mode=checkid_setup&openid.return_to=https%3A%2F%2Flife.test%2Fapi%2Fintegrations%2Fsteam%2Fcallback"};
  else if(path==="/api/videogames"||path==="/api/videogames/refresh")data=state.catalog;
  else if(path==="/api/videogames/acquired"){
   const input=request.postDataJSON();state.catalog.offers.find(offer=>offer.id===input.offer_id)!.ownership=input.acquired?"marked":"unknown";await route.fulfill({status:204});return;
  }
  else if(path==="/api/videogames/preferences"){
   state.catalog.notify_free=request.postDataJSON().notify_free;await route.fulfill({status:204});return;
  }
  else if(path.startsWith("/api/videogames/sales/")&&path.endsWith("/calendar")){
   const id=path.split("/")[4],sale=sales.find(sale=>sale.id===id)!;
   if(!state.catalog.calendar_sales.includes(id)){
    state.catalog.calendar_sales.push(id);
    for(const [index,at]of [sale.starts_at,sale.ends_at].entries())state.events.push({id:`sale-${index}`,title:`${sale.title} · ${index?"Окончание":"Начало"}`,category:"other",tags:[],icon:"tabler:discount",target_date:at.slice(0,10),target_time:at.slice(11,19),timezone:"UTC",recurrence:"once",description:sale.source,details:{full_name:"",phone:"",occupation:"",relationship:"",notes:""},display:{clock:"both",show_years:true,show_repetitions:true},next_date:at.slice(0,10),next_at:at,original_at:at,days_remaining:39,full_years:0,repetitions:0,repeat_yearly:false,updated_at:stamp,contact_id:null,contact_name:null,contact_birthday:false,suspended:false,computed_at:stamp});
   }
   data=state.events.map(event=>event.id);
  }
  else if(path==="/api/calendar")data={from:url.searchParams.get("from"),to:url.searchParams.get("to"),timezone:settings.timezone,occurrences:[],events:state.events.map(countdown=>({date:countdown.target_date,event_at:countdown.next_at,countdown}))};
  else if(path==="/api/today")data={date:"2026-11-08",timezone:settings.timezone,tasks:[],events:[]};
  else if(path==="/api/countdowns")data=state.events;
  else if(path==="/api/notifications")data=state.notifications;
  else if(path.startsWith("/api/notifications/")&&path.endsWith("/read")){state.reads++;state.notifications=[];await route.fulfill({status:204});return;}
  await route.fulfill({json:data});
 });
 return {state,errors};
}

test("video games share filters, ownership marks, sale events and the calendar",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/videogames");
 await expect(page.getByRole("heading",{name:"Видеоигры",exact:true})).toBeVisible();
 const owned=page.locator('[data-game-offer="portal"]');await expect(owned).toContainText("Есть в библиотеке площадки");
 await expect(owned.getByRole("link",{name:"Страница предложения",exact:true})).toHaveAttribute("href",/store\.steampowered\.com\/app\/400/);
 const search=page.getByLabel("Поиск видеоигр",{exact:true});await search.fill("type:offers free:yes");await expect(owned).toHaveCount(0);
 const gift=page.locator('[data-game-offer="gift"]');await gift.getByRole("button",{name:"Действия",exact:true}).click();await page.getByRole("menuitem",{name:"Отметить как полученную",exact:true}).click();await expect(gift).toContainText("Получение отмечено вручную");
 await search.fill("owned:yes");await expect(page.locator("[data-game-offer]")).toHaveCount(2);
 await search.fill("type:library Portal");await expect(page.getByRole("region",{name:"Игровая библиотека",exact:true})).toContainText("10 ч");
 await search.fill("type:sales");const winter=page.locator("article").filter({has:page.getByRole("heading",{name:"Зимняя распродажа Steam 2026",exact:true})});
 await winter.getByRole("button",{name:"Добавить в календарь",exact:true}).click();await expect(winter.getByRole("button",{name:"Уже в календаре",exact:true})).toBeDisabled();expect(state.events).toHaveLength(2);
 await page.goto("/calendar");await page.getByLabel("Дата календаря",{exact:true}).fill("2026-12-17");
 const day=page.getByRole("region",{name:"План выбранного дня",exact:true});await expect(day).toContainText("Зимняя распродажа Steam 2026 · Начало");await expect(day).toContainText("21:00");
 expect(errors).toEqual([]);
});

test("profile integrations reuse key forms, confirmations, synchronization and Steam redirects",async({page})=>{
 const {state,errors}=await setup(page);await page.goto("/profile#integrations");
 const panel=page.getByRole("region",{name:"Интеграции",exact:true}),steam=panel.getByRole("article",{name:"Steam",exact:true});
 await expect(panel.getByRole("link",{name:"Открыть настройки интеграции",exact:true})).toHaveCount(2);
 for(const width of [320,390]){await page.setViewportSize({width,height:844});expect(await panel.evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);}
 await page.setViewportSize({width:1280,height:900});
 await steam.getByLabel("Steam Web API key",{exact:true}).fill("0123456789abcdef0123456789abcdef");await steam.getByRole("button",{name:"Сохранить ключ интеграции",exact:true}).click();
 await expect.poll(()=>state.keyWrites.length).toBe(1);await expect(steam.getByLabel("Steam Web API key",{exact:true})).toHaveValue("");
 await steam.getByRole("button",{name:"Синхронизировать библиотеку",exact:true}).click();await expect.poll(()=>state.syncs).toBe(1);
 await steam.getByRole("button",{name:"Действия",exact:true}).click();await page.getByRole("menuitem",{name:"Отключить интеграцию",exact:true}).click();
 const confirm=page.getByRole("alertdialog");await expect(confirm).toContainText("копия библиотеки будут удалены");await confirm.getByRole("button",{name:"Подтвердить",exact:true}).click();
 await expect.poll(()=>state.disconnects).toBe(1);await expect(steam).toContainText("Аккаунт не подключён");
 await page.route("https://steamcommunity.com/openid/login**",route=>route.fulfill({contentType:"text/html",body:"Steam sign in"}));
 await steam.getByRole("button",{name:"Подключить Steam",exact:true}).click();await expect(page).toHaveURL(/^https:\/\/steamcommunity\.com\/openid\/login/);
 expect(errors).toEqual([]);
});

test("games adapt to narrow screens, dark English UI and durable shared notifications",async({page},testInfo)=>{
 const {state,errors}=await setup(page);state.settings.language="en";state.settings.theme="dark";
 state.notifications=[{id:"22222222-2222-4222-8222-222222222222",message:"Новые бесплатные игры: {count}",parameters:{count:2},href:"/videogames"}];
 await page.setViewportSize({width:390,height:844});await page.goto("/videogames");
 await expect(page.getByRole("heading",{name:"Video games",exact:true})).toBeVisible();
 const notice=page.getByRole("link",{name:"New free games: 2",exact:true});await expect(notice).toBeVisible();await notice.click();await expect.poll(()=>state.reads).toBe(1);
 for(const width of [320,390,1280]){await page.setViewportSize({width,height:844});expect(await page.locator(".app-content").evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);}
 await expect(page.locator('nav a[href="/videogames"] [data-icon="tabler:device-gamepad-2"]')).toHaveCount(1);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:testInfo.outputPath("videogames-mobile-dark.png"),fullPage:true});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:testInfo.outputPath("videogames-desktop-dark.png"),fullPage:true});
 await page.reload();await expect(page.getByRole("link",{name:"New free games: 2",exact:true})).toHaveCount(0);
 const offers=page.getByRole("region",{name:"Free games and deals",exact:true});await offers.locator(":scope > header button[aria-haspopup=menu]").click();await page.getByRole("menuitem",{name:"Disable free game notifications",exact:true}).click();await expect.poll(()=>state.catalog.notify_free).toBe(false);
 expect(errors).toEqual([]);
});


test("video game request failures pause focus, preload and refresh attempts with growing delays",async({page})=>{
 const {state,errors}=await setup(page);let reads=0;
 await page.route("**/api/videogames",async route=>{reads++;await route.fulfill(reads<3?{status:500,json:{error:{code:"internal_error"}}}:{json:state.catalog});});
 await page.goto("/videogames");await expect(page.getByRole("alert")).toContainText("Не удалось выполнить запрос");
 const wait=page.getByRole("button",{name:"Ожидание перед повтором",exact:true});await expect(wait).toBeDisabled();await expect(page.getByRole("button",{name:"Обновить предложения",exact:true})).toBeDisabled();
 await page.evaluate(()=>{for(let index=0;index<12;index++)window.dispatchEvent(new Event("focus"));});expect(reads).toBe(1);
 await page.clock.setFixedTime(new Date(Date.parse(stamp)+31_000));await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect.poll(()=>reads).toBe(2);await expect(wait).toBeDisabled();
 await page.clock.setFixedTime(new Date(Date.parse(stamp)+65_000));await page.evaluate(()=>window.dispatchEvent(new Event("focus")));expect(reads).toBe(2);
 await page.clock.setFixedTime(new Date(Date.parse(stamp)+92_000));await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect.poll(()=>reads).toBe(3);await expect(page.locator('[data-game-offer="portal"]')).toBeVisible();expect(errors).toEqual([]);
});

test("video game rate limits honor Retry-After across reloads without signing the user out",async({page})=>{
 const {state,errors}=await setup(page);let reads=0;
 await page.route("**/api/videogames",async route=>{reads++;await route.fulfill(reads===1?{status:429,headers:{"Retry-After":"600"},json:{error:{code:"rate_limited"}}}:{json:state.catalog});});
 await page.goto("/videogames");await expect(page.getByRole("button",{name:"Ожидание перед повтором",exact:true})).toBeDisabled();
 await page.reload();await expect(page.getByRole("button",{name:"Ожидание перед повтором",exact:true})).toBeDisabled();expect(reads).toBe(1);
 await page.clock.setFixedTime(new Date(Date.parse(stamp)+301_000));await page.evaluate(()=>window.dispatchEvent(new Event("focus")));expect(reads).toBe(1);
 await expect(page.getByRole("heading",{name:"Видеоигры",exact:true})).toBeVisible();
 await page.clock.setFixedTime(new Date(Date.parse(stamp)+601_000));await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
 await expect.poll(()=>reads).toBe(2);await expect(page.locator('[data-game-offer="portal"]')).toBeVisible();expect(errors).toEqual([]);
});

test("game search quick actions replace the platform in the unified query using right click and keyboard",async({page})=>{
 const {state,errors}=await setup(page);state.catalog.country="JP";state.catalog.connected_platforms=["steam","epic"];
 state.catalog.offers[0].currency="JPY";state.catalog.offers[0].price="99";state.catalog.offers[0].preview="/api/media/providers/11111111-1111-4111-8111-111111111111";
 await page.route("**/api/media/providers/**",route=>route.fulfill({contentType:"image/png",body:Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aVWQAAAAASUVORK5CYII=","base64")}));
 await page.goto("/videogames");await expect(page.getByText("Регион цен: Япония",{exact:true})).toBeVisible();
 const portal=page.locator('[data-game-offer="portal"]');await expect(portal.locator('img')).toHaveAttribute("src",/^\/api\/media\/providers\//);await expect(portal.locator('[data-icon="lifecycle:currency-jpy"]')).toBeVisible();await expect(portal.getByRole("link",{name:"Страница предложения",exact:true})).toHaveCount(1);await expect(page.getByRole("link",{name:"Купить на площадке",exact:true})).toHaveCount(0);
 const search=page.getByLabel("Поиск видеоигр",{exact:true});await search.fill("type:offers platform:steam");await search.click({button:"right"});await page.getByRole("menuitem",{name:"Площадка",exact:true}).click();await page.getByRole("menuitem",{name:"Epic Games Store",exact:true}).click();await expect(search).toHaveValue("type:offers platform:epic");await expect(portal).toHaveCount(0);
 await search.focus();await search.press("Shift+F10");await page.getByRole("menuitem",{name:"Площадка",exact:true}).click();await page.getByRole("menuitem",{name:"Убрать фильтр",exact:true}).click();await expect(search).toHaveValue("type:offers");await expect(portal).toBeVisible();expect(errors).toEqual([]);
});
test("Epic code login is explicit and library synchronization remains separate",async({page})=>{
 const {state,errors}=await setup(page);let starts=0,authorizations=0,syncs=0;const epicProvider=state.providers.find(item=>item.id==="epic")!;
 await page.route("**/api/integrations/epic/connect",async route=>{starts++;epicProvider.revision=1;epicProvider.instance_id="33333333-3333-4333-8333-333333333333";await route.fulfill({json:{url:"https://www.epicgames.com/id/login?redirectUrl=https%3A%2F%2Fwww.epicgames.com%2Fid%2Fapi%2Fredirect",state:"a".repeat(64)}});});
 await page.route("**/api/integrations/epic/authorize",async route=>{authorizations++;expect(route.request().postDataJSON()).toEqual({state:"a".repeat(64),code:"0123456789abcdef0123456789abcdef"});epicProvider.configured=true;epicProvider.connected=true;epicProvider.revision=2;epicProvider.display_name="Epic Player";await route.fulfill({json:state.providers});});
 await page.route("**/api/integrations/epic/sync",async route=>{syncs++;epicProvider.syncing=true;await route.fulfill({status:202,json:{pending:true}});});
 await page.goto("/profile#integrations");const epic=page.getByRole("article",{name:"Epic Games",exact:true});
 await expect(epic.getByLabel("Epic OAuth Client Secret",{exact:true})).toHaveCount(0);await epic.getByRole("button",{name:"Подключить Epic Games",exact:true}).click();
 const code=epic.getByLabel("Одноразовый код Epic Games",{exact:true});await code.fill("0123456789abcdef0123456789abcdef");await expect(code).toHaveValue("0123456789abcdef0123456789abcdef");expect(starts).toBe(1);expect(authorizations).toBe(0);expect(syncs).toBe(0);
 await expect(epic.getByRole("link",{name:"Открыть вход Epic Games",exact:true})).toHaveAttribute("href",/^https:\/\/www.epicgames.com\/id\/login/);
 await epic.getByRole("button",{name:"Подтвердить код Epic Games",exact:true}).click();await expect(epic).toContainText("Epic Player");await expect(code).toHaveCount(0);expect(authorizations).toBe(1);expect(syncs).toBe(0);
 await epic.getByRole("button",{name:"Синхронизировать библиотеку",exact:true}).click();await expect(epic.getByRole("button",{name:"Синхронизация выполняется…",exact:true})).toBeDisabled();
 epicProvider.syncing=false;epicProvider.last_synced_at=stamp;state.catalog.connected_platforms=["steam","epic"];state.catalog.library.push({provider:"epic",id:"namespace:catalog",name:"Epic Game",playtime_minutes:null,recent_minutes:null,last_played_at:null,store_url:"https://store.epicgames.com/p/game"});state.catalog.stats={available:true,games:2,played:null,playtime_minutes:null,recent_minutes:null};
 await expect(epic.getByRole("button",{name:"Синхронизировать библиотеку",exact:true})).toBeEnabled({timeout:20_000});expect(syncs).toBe(1);
 await page.goto("/videogames");await expect(page.getByRole("region",{name:"Игровая библиотека",exact:true})).toContainText("Epic Game");await expect(page.getByRole("region",{name:"Игровая библиотека",exact:true})).toContainText("Игровое время недоступно");expect(errors).toEqual([]);
});
test("integration cooldown permits changing Steam settings after an Epic failure",async({page})=>{
 const {state,errors}=await setup(page);let connects=0;
 await page.route("**/api/integrations/epic/connect",route=>{connects++;return route.fulfill({status:429,headers:{"Retry-After":"600"},json:{error:{code:"rate_limited"}}});});
 await page.goto("/profile#integrations");const epic=page.getByRole("article",{name:"Epic Games",exact:true});await epic.getByRole("button",{name:"Подключить Epic Games",exact:true}).click();await expect(epic.getByRole("alert")).toBeVisible();
 const steam=page.getByRole("article",{name:"Steam",exact:true});await steam.getByLabel("Steam Web API key",{exact:true}).fill("0123456789abcdef0123456789abcdef");await steam.getByRole("button",{name:"Сохранить ключ интеграции",exact:true}).click();await expect.poll(()=>state.keyWrites.length).toBe(1);
 await steam.getByRole("button",{name:"Синхронизировать библиотеку",exact:true}).click();await expect.poll(()=>state.syncs).toBe(1);
 await epic.getByRole("button",{name:"Подключить Epic Games",exact:true}).click();await expect(epic.getByRole("alert")).toContainText("Повторные запросы временно приостановлены после ошибки.");expect(connects).toBe(1);expect(errors).toEqual([]);
});
test("persisted integration cooldown migrates on reload and leaves local changes accessible",async({page})=>{
 const {state,errors}=await setup(page);let writes=0,connects=0;state.providers.find(provider=>provider.id==="epic")!.revision=1;
 await page.addInitScript(()=>localStorage.setItem("lifecycle:request-cooldowns",JSON.stringify({"/integrations":{failures:2,retryAt:Date.now()+600_000,status:429,code:"rate_limited"}})));
 await page.route("**/api/integrations/epic/connect",route=>{connects++;return route.fulfill({json:{url:"https://www.epicgames.com/id/login",state:"a".repeat(64)}});});
 await page.route("**/api/integrations/epic",async route=>{if(route.request().method()==="DELETE"){writes++;state.providers.find(provider=>provider.id==="epic")!.revision=0;await route.fulfill({status:204});}else await route.continue();});
 await page.goto("/profile#integrations");const epic=page.getByRole("article",{name:"Epic Games",exact:true}),steam=page.getByRole("article",{name:"Steam",exact:true});await expect(steam).toBeVisible();
 await steam.getByLabel("Steam Web API key",{exact:true}).fill("0123456789abcdef0123456789abcdef");await steam.getByRole("button",{name:"Сохранить ключ интеграции",exact:true}).click();await expect.poll(()=>state.keyWrites.length).toBe(1);
 await epic.getByRole("button",{name:"Подключить Epic Games",exact:true}).click();await expect(epic.getByRole("alert")).toContainText("Повторные запросы временно приостановлены после ошибки.");expect(connects).toBe(0);
 await epic.getByRole("button",{name:"Действия",exact:true}).click();await page.getByRole("menuitem",{name:"Отключить интеграцию",exact:true}).click();await page.getByRole("alertdialog").getByRole("button",{name:"Подтвердить",exact:true}).click();await expect.poll(()=>writes).toBe(1);expect(errors).toEqual([]);
});


test("numeric ranges share the search action menu and refresh offers separately from the library",async({page},testInfo)=>{
 const {state,errors}=await setup(page);let refreshes=0;
 await page.route("**/api/videogames/refresh",async route=>{refreshes++;await route.fulfill({json:state.catalog});});
 await page.goto("/videogames");
 const search=page.getByLabel("Поиск видеоигр",{exact:true});
 await search.fill("discount:90..96 price:0.5..1 free:no");await expect(page.locator("[data-game-offer]")).toHaveCount(1);
 await expect(page.locator('[data-game-offer="portal"]')).toBeVisible();
 await search.fill("price:<=0");await expect(page.locator('[data-game-offer="gift"]')).toBeVisible();
 await search.fill("discount:101");await expect(search).toHaveAttribute("aria-invalid","true");
 await search.fill("");await page.getByLabel("Фильтры: Поиск видеоигр",{exact:true}).click();
 await page.getByRole("menuitem",{name:"Скидка, %",exact:true}).click();
 await page.getByRole("menuitem",{name:"От значения",exact:true}).click();
 await page.getByRole("spinbutton",{name:"Скидка, %",exact:true}).fill("90");await page.getByRole("button",{name:"Выбрать",exact:true}).click();
 await expect(search).toHaveValue("discount:>=90");
 await page.getByRole("button",{name:"Обновить предложения",exact:true}).click();await expect.poll(()=>refreshes).toBe(1);expect(state.syncs).toBe(0);
 await page.getByRole("button",{name:"Обновить библиотеку",exact:true}).click();await expect.poll(()=>state.syncs).toBe(1);
 for(const width of [375,768,1280]){await page.setViewportSize({width,height:900});expect(await page.locator(".app-content").evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);}
 await page.screenshot({path:testInfo.outputPath("games-bento.png"),fullPage:true});
 expect(errors).toEqual([]);
});

test("six palettes and notification settings use shared cards on mobile and desktop",async({page},testInfo)=>{
 const {state,errors}=await setup(page);await page.goto("/settings");
 const themes=page.getByRole("radiogroup",{name:"Тема приложения",exact:true});
 await expect(themes.getByRole("radio")).toHaveCount(8);
 for(const [label,name] of [["Песок","sand"],["Тёмная","dark"],["Океан","ocean"],["Лес","forest"],["Сумерки","dusk"],["Светлая","light"]]){
  await themes.getByRole("radio",{name:label,exact:true}).check();
  await page.getByRole("button",{name:"Сохранить настройки",exact:true}).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme",name);
 }
 await expect(page.getByRole("heading",{name:"Push-уведомления",exact:true})).toBeVisible();
 await expect(page.getByRole("button",{name:"Включить на этом устройстве",exact:true})).toBeDisabled();
 for(const width of [375,768,1280]){await page.setViewportSize({width,height:900});expect(await page.locator(".app-content").evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);}
 await page.screenshot({path:testInfo.outputPath("settings-palettes.png"),fullPage:true});
 expect(state.settings.theme).toBe("light");expect(errors).toEqual([]);
});

for(const providerId of ["xbox","playstation"] as const){
 test(`${providerId} user session uses the shared form and starts the library separately`,async({page})=>{
  const {state,errors}=await setup(page);const provider=state.providers.find(item=>item.id===providerId)!;let authorized=0,synced=0;
  const attempt="b".repeat(64);
  const login=providerId==="xbox"?`https://login.live.com/oauth20_authorize.srf?state=${attempt}`:"https://www.playstation.com/";
  const credential=providerId==="xbox"?`https://login.live.com/oauth20_desktop.srf#access_token=private-token&expires_in=3600&state=${attempt}`:JSON.stringify({npsso:"c".repeat(64)});
  await page.route(`**/api/integrations/${providerId}/connect`,async route=>{provider.revision=1;provider.instance_id="44444444-4444-4444-8444-444444444444";await route.fulfill({json:{url:login,state:attempt}});});
  await page.route(`**/api/integrations/${providerId}/authorize`,async route=>{authorized++;expect(route.request().postDataJSON()).toEqual({state:attempt,code:credential});provider.connected=true;provider.configured=true;provider.display_name="Console Player";await route.fulfill({json:{pending:false}});});
  await page.route(`**/api/integrations/${providerId}/sync`,async route=>{synced++;await route.fulfill({json:{pending:false}});});
  await page.goto("/profile#integrations");const card=page.getByRole("article",{name:provider.name,exact:true});
  await card.getByRole("button",{name:`Подключить ${provider.name}`,exact:true}).click();
  const field=card.getByLabel(providerId==="xbox"?"Адрес завершения входа Microsoft":"NPSSO PlayStation",{exact:true});
  await expect(field).toHaveAttribute("type","password");await field.fill(credential);expect(authorized).toBe(0);expect(synced).toBe(0);
  await card.getByRole("button",{name:`Подтвердить сессию ${provider.name}`,exact:true}).click();await expect(card).toContainText("Console Player");await expect(field).toHaveCount(0);expect(synced).toBe(0);
  expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain("private-token");expect(await page.evaluate(()=>JSON.stringify(localStorage))).not.toContain("c".repeat(64));
  await card.getByRole("button",{name:"Синхронизировать библиотеку",exact:true}).click();await expect.poll(()=>synced).toBe(1);
  for(const width of [375,768,1280]){await page.setViewportSize({width,height:900});expect(await page.locator(".app-content").evaluate(element=>element.scrollWidth-element.clientWidth)).toBeLessThanOrEqual(1);}
  expect(errors).toEqual([]);
 });
}
