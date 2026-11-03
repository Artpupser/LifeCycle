import {expect, test, type Page} from "@playwright/test";
import type {Settings} from "../src/features/settings/types";
import {emptyContact, type Contact} from "../src/features/contacts/types";
import type {Countdown} from "../src/features/countdowns/types";

test.use({viewport:{width:390,height:844},timezoneId:"America/Los_Angeles"});

test.afterEach(async ({page}, info)=>{
  if(info.status !== "passed") return;
  expect(await page.locator("html").evaluate(element=>element.scrollWidth)).toBeLessThanOrEqual(390);
  if(info.title.startsWith("countdowns")) await page.screenshot({path:info.outputPath("mobile-events.png"),fullPage:true});
});

const settings: Settings = {timezone:"Asia/Tokyo",time_format:"12h",language:"ru",theme:"light",reminders_enabled:false,reminder_minutes_before:5,week_starts_on:"monday",pomodoro_work_minutes:25,pomodoro_break_minutes:5};
const stamp="2026-11-02T15:30:47Z";
function contact(id:string, name:string, category:string, tags:string[]):Contact {
  return {id,data:{...emptyContact(),first_name:name,categories:[category],tags,phones:["+7 (999) 123-45-67"]},revision:1,created_at:stamp,updated_at:stamp};
}
async function setup(page:Page) {
  const failures:string[]=[];
  page.on("pageerror", error=>failures.push(error.message));
  await page.route("**/api/**",async route=>{
    const path=new URL(route.request().url()).pathname;
    const data=path==="/api/auth/me"?{user:{id:"test-user",email:"frontend@example.test"}}:path==="/api/settings"?settings:path==="/api/navigation"?{ordering:["/contacts","/countdowns","/analytics","/sex","/notes"],pinned:["/contacts","/countdowns","/analytics","/sex","/notes"],revision:1}:[];
    await route.fulfill({json:data});
  });
  return failures;
}

test("contacts use one search, normalized tags and queued deletion choices with keyboard cancellation",async({page})=>{
  const failures=await setup(page);
  let contacts=[contact("anna","Анна","Друзья",["важные"]),contact("boris","Борис","Работа",["архив"])];
  const deleted:unknown[]=[];
  await page.route("**/api/contacts**",async route=>{
    if(route.request().method()==="DELETE") {deleted.push(route.request().postDataJSON());contacts=contacts.filter(c=>!route.request().url().endsWith(c.id));await route.fulfill({status:204});}
    else await route.fulfill({json:contacts});
  });
  await page.goto("/contacts");
  const search=page.getByRole("searchbox",{name:"Поиск контактов",exact:true});
  await search.fill('категория:друзья -тег:архив 999123');
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article")).toContainText("Анна");
  await expect(page.locator("main select")).toHaveCount(0);
  await page.getByRole("button",{name:"Удалить контакт",exact:true}).click();
  const confirmation=page.getByRole("alertdialog");
  await expect(confirmation.getByRole("combobox")).toHaveValue("keep");
  await page.keyboard.press("Escape");
  expect(deleted).toEqual([]);
  await expect(confirmation).toHaveCount(0);
  await page.getByRole("button",{name:"Удалить контакт",exact:true}).click();
  await confirmation.getByRole("combobox").selectOption("delete");
  await confirmation.getByRole("button",{name:"Подтвердить удаление контакта",exact:true}).click();
  await expect(page.getByText("Контакт удалён.",{exact:true})).toBeVisible();
  expect(deleted).toEqual([{revision:1,events:"delete"}]);
  await expect(page.locator("article")).toHaveCount(0);
  expect(failures).toEqual([]);
});

test("contact tag editor preserves legacy punctuation and validates limits before sending",async({page})=>{
  await setup(page);let saved:Contact|undefined;
  const original=contact("anna","Анна","Друзья, коллеги",["Работа"]);
  await page.route("**/api/contacts**",async route=>{
    if(route.request().method()==="PUT"){saved={...original,...route.request().postDataJSON()};await route.fulfill({json:saved});}
    else await route.fulfill({json:[saved??original]});
  });
  await page.goto("/contacts");
  await page.getByRole("button",{name:"Изменить контакт",exact:true}).click();
  await expect(page.getByLabel("Категории контакта",{exact:true})).toHaveCount(0);
  const tags=page.getByLabel("Теги контакта",{exact:true});
  await tags.fill("x".repeat(65));
  await page.getByRole("button",{name:"Сохранить контакт",exact:true}).click();
  expect(saved).toBeUndefined();
  await expect(tags).toHaveAttribute("aria-invalid","true");
  await tags.fill(" Работа \nработа\nДом");
  await page.getByRole("button",{name:"Сохранить контакт",exact:true}).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  expect(saved?.data.tags).toEqual(["Работа","Дом"]);
  expect(saved?.data.categories).toEqual(["Друзья, коллеги"]);
});

test("countdowns combine category and period filters and show account time including seconds",async({page})=>{
  const failures=await setup(page);
  const event:Countdown={id:"event",title:"Встреча",category:"Личное",icon:"calendar",target_date:"2026-11-03",target_time:"00:30:47",timezone:"Asia/Tokyo",recurrence:"daily",description:"",contact_id:"anna",details:{full_name:"",phone:"",occupation:"",relationship:"",notes:""},display:{clock:"both",show_years:true,show_repetitions:true},repeat_yearly:false,next_date:"2026-11-03",next_at:stamp,original_at:stamp,days_remaining:1,full_years:0,repetitions:0,updated_at:stamp,contact_name:"Анна",contact_birthday:false,suspended:false,computed_at:stamp};
  await page.route("**/api/countdowns",route=>route.fulfill({json:[event,{...event,id:"other",title:"Рабочее",category:"Работа",contact_id:"boris"}]}));
  await page.route("**/api/today?**",route=>route.fulfill({json:{events:[{date:"2026-11-03",event_at:stamp,countdown:event}]}}));
  await page.goto("/countdowns?contact=anna");
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article")).toContainText("12:30:47 AM");
  const search=page.getByRole("searchbox",{name:"Поиск событий",exact:true});
  await search.fill('категория:личное период:СЕГОДНЯ');
  await expect(page.locator("article")).toHaveCount(1);
  await search.fill('-период:сегодня');
  await expect(page.locator("article")).toHaveCount(1);
  await expect(page.locator("article")).toContainText("Рабочее");
  expect(failures).toEqual([]);
});

test("journal filters rows and statistics on the server and blocks invalid ranges",async({page})=>{
  const failures=await setup(page);const queries:URLSearchParams[]=[];
  const answers={yes:0,no:0,unknown:0};
  await page.route("**/api/sex?**",async route=>{
    const params=new URL(route.request().url()).searchParams;queries.push(params);
    await route.fulfill({json:{from:params.get("from"),to:params.get("to"),timezone:settings.timezone,offset:0,limit:50,total:0,entries:[],statistics:{total:0,sex:0,masturbation:0,active_days:0,duration_minutes:0,duration_answers:0,average_duration_minutes:null,ejaculations:0,ejaculation_answers:0,with_toys:0,repeat_desired:answers,lubricant_used:answers,protection_used:answers,emotions:{},days:{}}}});
  });
  await page.goto("/sex");
  await expect(page.getByRole("region",{name:"Интимная статистика"})).toBeVisible();
  const search=page.getByRole("searchbox",{name:"Поиск в интимном журнале",exact:true});
  await search.fill("с:2026-10-01 по:2026-10-31 тип:СЕКС");
  await expect.poll(()=>queries.at(-1)?.toString()).toBe("from=2026-10-01&to=2026-10-31&offset=0&kind=sex");
  await search.fill("с:2026-10-31 по:2026-10-01");
  await expect(page.getByRole("alert")).toContainText("от 1 до 366");
  await expect(page.getByRole("region",{name:"Интимная статистика"})).toHaveCount(0);
  const count=queries.length;
  await search.fill("с:2026-02-29");
  await expect(search).toHaveAttribute("aria-invalid","true");
  expect(queries).toHaveLength(count);
  expect(failures).toEqual([]);
});

test("analytics range is controlled by the common search and rejects oversized periods",async({page})=>{
  await setup(page);const queries:URLSearchParams[]=[];
  await page.route("**/api/analytics/privacy",route=>route.fulfill({json:{include_profile:false,include_intimacy:false}}));
  await page.route(/\/api\/analytics\?/,async route=>{
    const params=new URL(route.request().url()).searchParams;queries.push(params);
    await route.fulfill({json:{generated_at:stamp,timezone:settings.timezone,event_count:0,active_days:0,days:[{date:"2026-11-02",events:0,tasks_completed:0,habits_completed:0,workouts_completed:0,focus_seconds:0}],tasks:{scheduled:0,completed:0,rejected:0,missed:0,in_progress:0,pending:0,future:0,completion_rate:null,planned_minutes:0},habits:{expected:0,completed:0,skipped:0,missed:0,cancelled:0,pending:0,completed_sub_habits:0,total_sub_habits:0,completion_rate:null,ranking:[]},workouts:{completed:0,partial:0,cancelled:0,exercise_steps:0,repetitions:0,seconds:0},pomodoro:{completed:0,cancelled:0,seconds:0}}});
  });
  await page.goto("/analytics");
  await expect(page.getByRole("region",{name:"Задачи",exact:true})).toBeVisible();
  const search=page.getByRole("searchbox",{name:"Поиск и период аналитики",exact:true});
  await search.fill("с:2026-10-01 по:2026-10-31");
  await expect.poll(()=>queries.at(-1)?.toString()).toBe("from=2026-10-01&to=2026-10-31");
  await search.fill("с:2020-01-01 по:2026-10-31");
  await expect(page.getByRole("alert")).toContainText("от 1 до 366");
  await expect(page.getByRole("region",{name:"Задачи",exact:true})).toHaveCount(0);
});
