import { expect, test } from "@playwright/test";

test("email login, saved questionnaire and preferences, session restore and logout", async ({ page, request }) => {
  const email = `browser-${Date.now()}@example.test`;
  const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Войти или создать аккаунт" })).toBeVisible();
  await page.getByLabel("Электронная почта", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Получить код", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Проверьте вашу почту" })).toBeVisible();

  let code = "";
  await expect.poll(async () => {
    const response = await request.get(`${mailpit}/api/v1/messages`);
    const inbox = await response.json() as { messages: { ID: string; To: { Address: string }[] }[] };
    const message = inbox.messages.find((item) => item.To.some((recipient) => recipient.Address === email));
    if (!message) return false;
    const detail = await (await request.get(`${mailpit}/api/v1/message/${message.ID}`)).json() as { Text: string };
    code = detail.Text.match(/\b\d{6}\b/)?.[0] ?? "";
    return code.length === 6;
  }, { timeout: 15_000 }).toBe(true);

  await page.getByLabel("Код подтверждения").fill(code);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await page.getByRole("link", { name: "Профиль", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Мой профиль", exact: true })).toBeVisible();
  await page.getByLabel("Псевдоним", { exact: true }).fill("Мой ритм");
  await page.getByLabel("Имя", { exact: true }).fill("Алексей");
  await page.getByLabel("Дата рождения", { exact: true }).fill("1995-06-15");
  await page.getByLabel("Заболевания", { exact: true }).fill("Первая запись\nВторая запись");
  await page.getByLabel("Количество друзей", { exact: true }).fill("0");
  await page.getByLabel("Есть семья", { exact: true }).selectOption("false");
  await page.getByRole("button", { name: "Сохранить профиль", exact: true }).click();
  await expect(page.getByText("Профиль сохранён", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Псевдоним", { exact: true })).toHaveValue("Мой ритм");
  await expect(page.getByLabel("Количество друзей", { exact: true })).toHaveValue("0");
  await expect(page.getByLabel("Есть семья", { exact: true })).toHaveValue("false");
  await expect(page.getByLabel("Заболевания", { exact: true })).toHaveValue("Первая запись\nВторая запись");

  await page.getByRole("link", { name: "Настройки", exact: true }).click();
  await page.getByLabel("Тема", { exact: true }).selectOption("light");
  await page.getByLabel("Часовой пояс", { exact: true }).fill("Europe/Moscow");
  await page.getByRole("button", { name: "Сохранить настройки", exact: true }).click();
  await expect(page.getByText("Настройки сохранены", { exact: true })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await expect(page.getByLabel("Часовой пояс", { exact: true })).toHaveValue("Europe/Moscow");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.getByRole("button", { name: "Выйти", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Войти или создать аккаунт" })).toBeVisible();
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Войти или создать аккаунт" })).toBeVisible();
  expect(failures).toEqual([]);
});
