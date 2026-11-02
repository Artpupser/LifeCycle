import { expect, type Page, type APIRequestContext } from "@playwright/test";

export async function login(page: Page, request: APIRequestContext) {
  const email = `core-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
  await page.goto("/login");
  await page.getByLabel("Электронная почта", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Получить код", exact: true }).click();
  let code = "";
  await expect.poll(async () => {
    const inbox = await (await request.get(`${mailpit}/api/v1/messages`)).json() as { messages: { ID: string; To: { Address: string }[] }[] };
    const message = inbox.messages.find((item) => item.To.some((recipient) => recipient.Address === email));
    if (!message) return false;
    const detail = await (await request.get(`${mailpit}/api/v1/message/${message.ID}`)).json() as { Text: string };
    code = detail.Text.match(/\b\d{6}\b/)?.[0] ?? "";
    return code.length === 6;
  }, { timeout: 20_000 }).toBe(true);
  await page.getByLabel("Код подтверждения").fill(code);
  await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  await expect(page.getByRole("button", { name: "Выйти", exact: true })).toBeVisible();
}
