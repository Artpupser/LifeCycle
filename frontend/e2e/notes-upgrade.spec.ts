import { expect, test } from "@playwright/test";
import { login } from "./upgrade-helpers";

test("note filters and confirmed bulk access preserve private Markdown on mobile and reload", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await login(page, request);
  for (const title of ["Приватная заметка", "Вторая заметка"]) {
    await page.request.post("/api/notes", { data: { title, content: "**Сохранённый Markdown**" }, headers: { Origin: new URL(page.url()).origin } });
  }
  await page.goto("/notes");
  await expect(page.getByText("Закрыта", { exact: false }).first()).toBeVisible();
  await page.getByRole("button", { name: "Выбрать показанные (до 200)", exact: true }).click();
  page.once("dialog", (dialog) => void dialog.dismiss());
  await page.getByRole("button", { name: "Разрешить AI выбранным", exact: true }).click();
  await expect(page.getByLabel("AI Доступ: Приватная заметка", { exact: true })).not.toBeChecked();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Разрешить AI выбранным", exact: true }).click();
  await expect(page.getByLabel("AI Доступ: Приватная заметка", { exact: true })).toBeChecked();
  await page.getByLabel("Доступ AI", { exact: true }).selectOption("private");
  await expect(page.locator("article")).toHaveCount(0);
  await page.getByLabel("Доступ AI", { exact: true }).selectOption("ai_shared");
  await expect(page.locator("article")).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel("AI Доступ: Вторая заметка", { exact: true })).toBeChecked();
  await page.getByRole("button", { name: "Выбрать показанные (до 200)", exact: true }).click();
  page.once("dialog", (dialog) => void dialog.accept());
  await page.getByRole("button", { name: "Закрыть выбранные", exact: true }).click();
  await expect(page.getByLabel("AI Доступ: Приватная заметка", { exact: true })).not.toBeChecked();
  await expect(page.getByText("Сохранённый Markdown", { exact: true })).toHaveCount(2);
  expect(await page.locator("html").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(390);
  expect(failures).toEqual([]);
});
