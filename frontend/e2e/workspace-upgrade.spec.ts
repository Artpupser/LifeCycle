import {expect,test} from "@playwright/test";
import {login} from "./upgrade-helpers";

test("sidebar pinning and drag order persist per account while unified filters work across collections",async({page,request},testInfo)=>{
 await page.setViewportSize({width:1440,height:1000});const failures:string[]=[];page.on("pageerror",error=>failures.push(error.message));await login(page,request);
 const nav=page.getByRole("navigation",{name:"Главная навигация",exact:true});
 await page.getByLabel("Настроить навигацию",{exact:true}).click();
 await page.getByLabel("Перетащить раздел Заметки",{exact:true}).dragTo(page.locator('[data-nav-path="/today"]'));
 await expect(nav.locator("[data-nav-path]").first()).toHaveAttribute("data-nav-path","/notes");
 await page.getByLabel("Открепить Привычки",{exact:true}).click();await expect(page.getByLabel("Закрепить Привычки",{exact:true})).toBeVisible();
 await page.getByLabel("Завершить настройку навигации",{exact:true}).click();await expect(nav.getByRole("link",{name:"Привычки",exact:true})).toHaveCount(0);await page.reload();
 await expect(nav.locator("[data-nav-path]").first()).toHaveAttribute("data-nav-path","/notes");await expect(nav.getByRole("link",{name:"Привычки",exact:true})).toHaveCount(0);
 await nav.getByLabel("Все разделы",{exact:true}).click();await expect(nav.getByRole("link",{name:"Привычки",exact:true})).toBeVisible();
 const headers={Origin:new URL(page.url()).origin};
 for(const [title,tags,priority] of [["Работа срочно",["работа"],"urgent"],["Домашняя задача",["дом"],"low"]])expect((await page.request.post("/api/tasks",{headers,data:{title,tags,priority}})).status()).toBe(201);
 await page.goto("/tasks");await page.getByLabel("Поиск задач",{exact:true}).fill("тег:работа приоритет:срочный выполнено:нет");await expect(page.locator("main article")).toHaveCount(1);await expect(page.locator("main article")).toContainText("Работа срочно");
 await expect(page.getByRole("combobox")).toHaveCount(0);await page.getByLabel("Поиск задач",{exact:true}).fill("неизвестно:да");await expect(page.getByRole("status").filter({hasText:"Неизвестный фильтр"})).toBeVisible();await expect(page.locator("main article")).toHaveCount(0);
 const tasks=await (await page.request.get("/api/tasks")).json() as {id:string;title:string}[];const task=tasks.find(item=>item.title==="Работа срочно")!;
 const board=await (await page.request.post("/api/boards",{headers,data:{name:"Проверка меню"}})).json() as {board:{id:string;revision:number};columns:{id:string}[]};
 expect((await page.request.put(`/api/boards/${board.board.id}/items/${task.id}`,{headers,data:{revision:board.board.revision,column_id:board.columns[0].id}})).ok()).toBe(true);
 await page.goto(`/tasks?board=${board.board.id}`);const card=page.locator("main article");await expect(card.locator("details")).toHaveCount(1);await card.getByLabel("Действия задачи Работа срочно",{exact:true}).click();await card.getByRole("button",{name:"История задачи",exact:true}).click();await expect(page.getByRole("dialog")).toBeVisible();await page.getByLabel("Закрыть окно",{exact:true}).click();
 await card.getByLabel("Действия задачи Работа срочно",{exact:true}).click();await card.getByRole("button",{name:"Снять с доски",exact:true}).click();await expect(card).toHaveCount(0);expect((await page.request.get(`/api/tasks/${task.id}`)).status()).toBe(200);
 const today=new Date().toISOString().slice(0,10);
 expect((await page.request.post("/api/habits",{headers,data:{title:"Привычка работы",tags:["работа"],schedule:{start_date:today,time:null,timezone:"UTC",duration_minutes:15,recurrence:"daily",end_date:null},habit:{icon:"🌱",sub_habits:[],reminder_enabled:false,reminder_minutes_before:null}}})).status()).toBe(201);
 await page.goto("/habits");await page.getByLabel("Поиск привычек",{exact:true}).fill("тег:работа повтор:ежедневно");await expect(page.getByRole("heading",{name:"Привычка работы",exact:true})).toBeVisible();await page.getByLabel("Поиск привычек",{exact:true}).fill("-тег:работа");await expect(page.getByRole("heading",{name:"Привычка работы",exact:true})).toHaveCount(0);
 await page.goto("/workouts");await page.getByLabel("Поиск тренировок",{exact:true}).fill("тег:работа ai:нет");await expect(page.getByRole("combobox")).toHaveCount(0);await page.screenshot({path:testInfo.outputPath("sidebar-customized.png"),fullPage:true});
 await page.setViewportSize({width:390,height:844});await page.getByLabel("Настроить навигацию",{exact:true}).click();await expect.poll(async()=>(await nav.locator("..").boundingBox())!.width).toBe(240);await page.getByLabel("Закрепить Привычки",{exact:true}).click();await expect(page.getByLabel("Открепить Привычки",{exact:true})).toBeVisible();await page.getByLabel("Завершить настройку навигации",{exact:true}).click();await expect(nav.getByRole("link",{name:"Привычки",exact:true})).toBeVisible();
 expect(failures).toEqual([]);
});
