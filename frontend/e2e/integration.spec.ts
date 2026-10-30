import { expect, test, type Page } from "@playwright/test";

async function login(page: Page) {
  await page.goto("/login");
  const email = `integration-${crypto.randomUUID()}@example.test`;
  const headers = { Origin: new URL(page.url()).origin };
  expect((await page.request.post("/api/auth/request-code", { headers, data: { email } })).ok()).toBe(true);
  let code = "";
  await expect.poll(async () => {
    const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
    const inbox = await (await page.request.get(`${mailpit}/api/v1/search`, { params: { query: `to:${email}` } })).json();
    const message = inbox.messages.find((item: { To: { Address: string }[] }) => item.To.some((to) => to.Address === email));
    if (!message) return false;
    const detail = await (await page.request.get(`${mailpit}/api/v1/message/${message.ID}`)).json();
    code = detail.Text.match(/\b\d{6}\b/)?.[0] ?? "";
    return code.length === 6;
  }, { timeout: 20_000 }).toBe(true);
  expect((await page.request.post("/api/auth/verify-code", { headers, data: { email, code } })).ok()).toBe(true);
  await page.goto("/today");
  await expect(page.getByRole("button", { name: "Выйти", exact: true })).toBeVisible();
}

async function write(page: Page, method: "POST" | "PUT" | "DELETE", path: string, data?: unknown) {
  const response = await page.request.fetch(`/api${path}`, { method, headers: { Origin: new URL(page.url()).origin }, data });
  expect(response.ok()).toBe(true);
  return response.status() === 204 ? null : response.json();
}

test("open tabs refresh saved notes and clear private data on logout and account changes", async ({ page, context }) => {
  await login(page);
  const note = await write(page, "POST", "/notes", { title: "Первая версия", content: "**Личный текст**" });
  await page.goto("/notes");
  await expect(page.getByRole("button", { name: note.title, exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/notes");
  await other.bringToFront();
  await other.getByRole("button", { name: "Редактировать", exact: true }).click();
  await other.getByLabel("Название заметки", { exact: true }).fill("Согласованная версия");
  await other.getByRole("button", { name: "Сохранить заметку", exact: true }).click();
  await expect(other.getByRole("dialog")).toHaveCount(0);
  await page.bringToFront();
  await page.evaluate("window.dispatchEvent(new Event('focus'))");
  await expect(page.getByRole("button", { name: "Согласованная версия", exact: true })).toBeVisible();
  await other.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Войти или создать аккаунт" })).toBeVisible();
  await expect(page.getByText("Личный текст", { exact: true })).toHaveCount(0);
  await login(other);
  await page.bringToFront();
  await page.evaluate("window.dispatchEvent(new Event('focus'))");
  await page.getByRole("link", { name: "Заметки", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Заметки", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Согласованная версия", exact: true })).toHaveCount(0);
  await other.close();
});

test("profile timezone and 12/24-hour preferences agree across Today, calendar, Gantt and reload", async ({ page }) => {
  await login(page);
  const rule = { start_date: "2026-10-29", time: "00:30", timezone: "Asia/Tokyo", duration_minutes: 30, recurrence: "once" };
  await write(page, "POST", "/tasks", { title: "Граница дня", description: "**Минутное расписание**", schedule: rule });
  await page.goto("/settings");
  await expect(page.getByLabel("Формат времени", { exact: true })).toHaveValue("24h");
  await page.getByLabel("Часовой пояс", { exact: true }).fill("America/Los_Angeles");
  await page.getByLabel("Формат времени", { exact: true }).selectOption("12h");
  await page.getByRole("button", { name: "Сохранить настройки", exact: true }).click();
  await expect(page.getByText("Настройки сохранены", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Сегодня", exact: true }).click();
  await page.getByLabel("Дата плана", { exact: true }).fill("2026-10-28");
  await expect(page.locator("article")).toContainText("08:30 AM");
  await page.getByRole("link", { name: "Календарь", exact: true }).click();
  await page.getByLabel("Дата календаря", { exact: true }).fill("2026-10-28");
  await expect(page.getByRole("region", { name: "План выбранного дня" })).toContainText("08:30 AM");
  await page.getByRole("link", { name: "Задачи", exact: true }).click();
  await page.getByLabel("Задачи с даты", { exact: true }).fill("2026-10-28");
  await page.getByRole("button", { name: "Gantt", exact: true }).click();
  const bar = page.getByRole("img", { name: /Диаграмма Ганта/ }).locator("rect[rx]");
  await expect(bar).toHaveCount(1);
  expect(Number(await bar.getAttribute("x"))).toBeCloseTo(220 + (8.5 / 24) * (900 / 14), 4);
  await page.getByRole("link", { name: "Настройки", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Формат времени", { exact: true })).toHaveValue("12h");
  await page.getByLabel("Формат времени", { exact: true }).selectOption("24h");
  await page.getByRole("button", { name: "Сохранить настройки", exact: true }).click();
  await expect(page.getByText("Настройки сохранены", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Сегодня", exact: true }).click();
  await page.getByLabel("Дата плана", { exact: true }).fill("2026-10-28");
  await expect(page.locator("article")).toContainText("08:30");
  await expect(page.locator("article")).not.toContainText("AM");
});

test("focus refresh preserves AI drafts and invalidates a preview after grants change in another tab", async ({ page, context }) => {
  await login(page);
  await page.goto("/ai");
  await page.getByRole("button", { name: "Новый чат", exact: true }).click();
  const question = page.getByLabel("Ваше сообщение", { exact: true });
  await question.fill("Сохрани мой черновик после смены прав");
  await page.getByRole("button", { name: "Подготовить предпросмотр", exact: true }).click();
  await expect(page.getByRole("region", { name: "Предпросмотр отправки", exact: true })).toBeVisible();
  const other = await context.newPage();
  await other.goto("/settings");
  const config = await (await other.request.get("/api/ai/settings")).json();
  await write(other, "PUT", "/ai/settings", { revision: config.revision, model: config.model, enabled: false, permissions: { ...config.permissions, notes: true } });
  await page.bringToFront();
  await page.evaluate("window.dispatchEvent(new Event('focus'))");
  await expect(page.getByRole("region", { name: "Предпросмотр отправки", exact: true })).toHaveCount(0);
  await expect(question).toHaveValue("Сохрани мой черновик после смены прав");
  await page.getByRole("button", { name: "Подготовить предпросмотр", exact: true }).click();
  await expect(page.getByRole("region", { name: "Предпросмотр отправки", exact: true })).toBeVisible();
  await other.close();
});

test("a delayed real session response cannot restore private UI after logout", async ({ page }) => {
  await login(page);
  let loggedOut = false;
  const protectedRequests: string[] = [];
  page.on("request", (request) => { if (loggedOut && new URL(request.url()).pathname === "/api/settings") protectedRequests.push(request.url()); });
  let release!: () => void;
  let received!: () => void;
  let delivered!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { received = resolve; });
  const finished = new Promise<void>((resolve) => { delivered = resolve; });
  await page.route("**/api/auth/me", async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    received();
    await held;
    await route.fulfill({ response }).catch(() => undefined);
    delivered();
  });
  await page.evaluate("window.dispatchEvent(new Event('focus'))");
  await started;
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Войти или создать аккаунт" })).toBeVisible();
  loggedOut = true;
  release();
  await finished;
  await page.evaluate("new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))");
  await expect(page.getByRole("button", { name: "Выйти", exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Войти или создать аккаунт" })).toBeVisible();
  expect(protectedRequests).toEqual([]);
});
