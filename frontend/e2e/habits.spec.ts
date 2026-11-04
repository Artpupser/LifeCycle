import {chooseAction} from "./upgrade-helpers";
import { confirmUi } from "./upgrade-helpers";
import { expect, test, type Page, type APIRequestContext } from "@playwright/test";

async function login(page: Page, request: APIRequestContext) {
  const email = `habits-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
  await page.goto("/login");
  await page.getByLabel("Электронная почта", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Получить код", exact: true }).click();
  let code = "";
  await expect.poll(async () => {
    const inbox = await (await request.get(`${mailpit}/api/v1/messages`)).json();
    const message = inbox.messages.find((item: { To: { Address: string }[] }) => item.To.some((to) => to.Address === email));
    if (!message) return false;
    const detail = await (await request.get(`${mailpit}/api/v1/message/${message.ID}`)).json();
    code = detail.Text.match(/\b\d{6}\b/)?.[0] ?? "";
    return code.length === 6;
  }, { timeout: 20_000 }).toBe(true);
  await page.getByLabel("Код подтверждения").fill(code);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Выйти", exact: true })).toBeVisible();
}

test("habit checkbox, Markdown marks and historical snapshots integrate with Today and calendar on mobile", async ({ page, request }, testInfo) => {
  const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, request);
  await page.getByRole("link", { name: "Привычки", exact: true }).click();
  await page.getByRole("button", { name: "Новая привычка", exact: true }).click();
  await page.getByLabel("Название привычки", { exact: true }).fill("Утренний ритм");
  await page.getByLabel("Описание привычки", { exact: true }).fill("**Мой ритуал**");
  await expect(page.getByLabel("Время начала",{exact:true})).toHaveCount(0);
  await expect(page.getByRole("button",{name:"Добавить подпривычку",exact:true})).toHaveCount(0);
  await page.getByRole("button", { name: "Сохранить привычку", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const habitCard=page.locator("article").filter({has:page.getByRole("heading",{name:"Утренний ритм",exact:true})}).first();
  await expect(habitCard.locator('button[data-context-ignore]')).toHaveCount(1);
  await habitCard.locator('button[data-context-ignore]').click();
  for(const name of ["Отметка и заметка","Изменить привычку","История привычки","Метки"])await expect(page.getByRole("menuitem",{name,exact:true})).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "Сегодня", exact: true }).click();
  const occurrence = page.locator("article").filter({ has: page.getByRole("heading", { name: "Утренний ритм", exact: true }) });
  await expect(occurrence).toBeVisible();
  await occurrence.getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true}).check();
  await chooseAction(page,"Отметка и заметка",occurrence);
  await page.getByLabel("Заметка к отметке", { exact: true }).fill("**Хорошее утро**");
  await page.getByRole("button", { name: "Сохранить отметку", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true})).toBeChecked();
  await occurrence.getByText("Заметка к отметке", { exact: true }).click();
  await expect(occurrence.locator("strong").filter({ hasText: "Хорошее утро" })).toHaveText("Хорошее утро");
  await page.getByRole("link", { name: "Календарь", exact: true }).click();
  await expect(page.getByRole("region", { name: "План выбранного дня" }).getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true})).toHaveCount(0);
  await page.getByRole("link", { name: "Привычки", exact: true }).click();
  await expect(page.getByRole("region", { name: "Статистика привычек" })).toContainText("100.0%");
  await chooseAction(page,"Изменить привычку");
  await page.getByLabel("Название привычки", { exact: true }).fill("Новый ритм");
  await page.getByRole("button", { name: "Сохранить привычку", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await chooseAction(page,"История привычки");
  await expect(page.getByRole("dialog")).toContainText("Утренний ритм");
  await page.getByRole("button", { name: "Закрыть окно", exact: true }).click();
  await confirmUi(page, async()=>{await chooseAction(page,"Удалить привычку");}, true);
  await expect(page.getByRole("button", { name: "Изменить привычку", exact: true })).toHaveCount(0);
  await chooseAction(page,"Открыть историю");
  await expect(page.getByRole("dialog").getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true})).toBeDisabled();
  await page.getByRole("button", { name: "Закрыть окно", exact: true }).click();
  expect(await page.locator("html").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: testInfo.outputPath("mobile-habits.png"), fullPage: true });
  expect(errors).toEqual([]);
});

test("habit editor has only repeating all-day rules and no reminder controls",async({page,request})=>{await login(page,request);await page.goto("/habits");await page.getByRole("button",{name:"Новая привычка",exact:true}).click();for(const label of ["Время начала","Длительность, минут","Напоминать о привычке"])await expect(page.getByLabel(label,{exact:true})).toHaveCount(0);await expect(page.getByLabel("Повторение",{exact:true}).locator('option[value="once"]')).toHaveCount(0);});
