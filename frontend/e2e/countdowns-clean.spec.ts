import {chooseAction} from "./upgrade-helpers";
import { expect, test } from "@playwright/test";
import { login } from "./upgrade-helpers";

test("1.6 clean countdown editor preserves stored metadata and hides removed fields", async ({ page, request }, info) => {
  await login(page, request);
  const preferences = await (await page.request.get("/api/settings")).json();
  expect((await page.request.put("/api/settings", { headers: { Origin: new URL(page.url()).origin }, data: { ...preferences, timezone: "UTC" } })).status()).toBe(200);
  const legacy = await page.request.post("/api/countdowns", {
    headers: { Origin: new URL(page.url()).origin },
    data: { title: "Сохранённое событие", category: "personal", icon: "calendar", target_date: "2030-12-31", target_time: "09:15:30", timezone: "Asia/Tokyo", recurrence: "yearly", details: { full_name: "Скрытое прежнее имя", phone: "+12025550187", notes: "Скрытая прежняя заметка" }, display: { clock: "elapsed", show_years: false, show_repetitions: false }, description: "**Исходное описание**" },
  });
  expect(legacy.status()).toBe(201);
  const stored = await legacy.json();
  await page.goto("/countdowns");
  const card = page.locator("article");
  await expect(card.getByRole("heading", { name: "Сохранённое событие", exact: true })).toBeVisible();
  await expect(card.locator(".font-mono")).toBeVisible();
  await expect(card).not.toContainText("Скрытое прежнее имя");
  await expect(card).not.toContainText("+12025550187");
  await expect(card).not.toContainText("Asia/Tokyo");
  await expect(card).toContainText("00:15:30");
  await chooseAction(page,"Изменить",card);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Время события", { exact: true })).toHaveValue("00:15:30");
  for (const name of ["Сведения о человеке", "Отображение времени", "Отображаемое время", "Часовой пояс события"]) await expect(dialog.getByText(name, { exact: true })).toHaveCount(0);
  for (const name of ["ФИО", "Телефон", "Показывать время", "Часовой пояс события"]) await expect(dialog.getByLabel(name, { exact: true })).toHaveCount(0);
  await expect(dialog.getByRole("button", { name: /дату рождения из профиля/ })).toHaveCount(0);
  await dialog.getByLabel("Описание события", { exact: true }).fill("**Обновлённое описание**");
  await dialog.getByRole("button", { name: "Сохранить событие", exact: true }).click();
  await card.getByText("Подробности",{exact:true}).click();
  await expect(card.locator("strong")).toHaveText("Обновлённое описание");
  const after = await (await page.request.get(`/api/countdowns/${stored.id}`)).json();
  expect(after.details).toEqual(stored.details);
  expect(after.display).toEqual(stored.display);
  expect(after.timezone).toBe(stored.timezone);
  expect(after.target_time).toBe(stored.target_time);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator("aside").evaluate(e => Math.round(e.getBoundingClientRect().width))).toBe(64);
  await chooseAction(page,"Изменить",card);
  expect(await dialog.evaluate(e => e.scrollWidth - e.clientWidth)).toBeLessThanOrEqual(1);
  await page.screenshot({ path: info.outputPath("countdown-clean-editor-mobile.png"), fullPage: true });
  await dialog.getByLabel("Дата события", { exact: true }).fill("2031-06-15");
  await dialog.getByLabel("Время события", { exact: true }).fill("12:30:45");
  await dialog.getByRole("button", { name: "Сохранить событие", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const rescheduled = await (await page.request.get(`/api/countdowns/${stored.id}`)).json();
  expect(rescheduled.timezone).toBe("UTC");
  expect(rescheduled.target_time).toBe("12:30:45");
  expect(rescheduled.details).toEqual(stored.details);
  expect(rescheduled.display).toEqual(stored.display);
});

test("1.6 new countdowns use account timezone without a timezone field", async ({ page, request }) => {
  await login(page, request);
  const settings = await (await page.request.get("/api/settings")).json();
  const result = await page.request.put("/api/settings", { headers: { Origin: new URL(page.url()).origin }, data: { ...settings, timezone: "Europe/Berlin" } });
  expect(result.status()).toBe(200);
  await page.goto("/countdowns");
  await page.getByRole("button", { name: "Новое событие", exact: true }).click();
  await page.getByLabel("Название события", { exact: true }).fill("Чистая форма");
  await page.getByLabel("Дата события", { exact: true }).fill("2027-06-15");
  await page.getByLabel("Время события", { exact: true }).fill("12:30");
  await page.getByRole("button", { name: "Сохранить событие", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Чистая форма", exact: true })).toBeVisible();
  const events = await (await page.request.get("/api/countdowns")).json();
  expect(events).toHaveLength(1);
  expect(events[0].timezone).toBe("Europe/Berlin");
  expect(events[0].next_at).toBe("2027-06-15T10:30:00Z");
});
