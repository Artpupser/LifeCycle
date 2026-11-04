# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: habits.spec.ts >> habit checkbox, Markdown marks and historical snapshots integrate with Today and calendar on mobile
- Location: e2e/habits.spec.ts:25:1

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('menuitem', { name: 'Отметка и заметка', exact: true })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" getByRole('menuitem', { name: 'Отметка и заметка', exact: true }) with timeout 5000ms
  - waiting for getByRole('menuitem', { name: 'Отметка и заметка', exact: true })

```

```yaml
- link "Перейти к содержимому":
  - /url: "#main"
- complementary:
  - link "LifeCycle — главная":
    - /url: /today
  - button "Развернуть навигацию"
  - navigation "Главная навигация":
    - link "Сегодня":
      - /url: /today
    - link "Привычки":
      - /url: /habits
    - link "Тренировки":
      - /url: /workouts
    - link "Интимный журнал":
      - /url: /sex
    - link "Задачи":
      - /url: /tasks
    - link "Календарь":
      - /url: /calendar
    - link "Заметки":
      - /url: /notes
    - link "Отсчёты":
      - /url: /countdowns
    - link "Контакты":
      - /url: /contacts
    - link "Pomodoro":
      - /url: /pomodoro
    - link "Аналитика":
      - /url: /analytics
    - link "AI-помощник":
      - /url: /ai
    - link "Профиль":
      - /url: /profile
    - link "Настройки":
      - /url: /settings
    - link "Подключение":
      - /url: /status
    - link "Теги и категории":
      - /url: /labels
    - link "История действий":
      - /url: /history
  - button "Настроить навигацию": Настроить панель
  - button "Выйти"
- main:
  - paragraph: Повторения, которые имеют значение
  - heading "Привычки" [level=1]
  - paragraph: Планируйте ритм, отмечайте результат в Today и наблюдайте за прогрессом.
  - button "Новая привычка"
  - searchbox "Поиск привычек"
  - group
  - article:
    - heading "Утренний ритм" [level=2]
    - paragraph:
      - strong: Мой ритуал
    - paragraph: Каждый день
    - button "Действия"
  - region "Статистика привычек":
    - heading "Статистика и лучшие привычки" [level=2]
    - paragraph: "Период: 2026-10-06 — 2026-11-04. Измените его фильтрами «статистика_с» и «статистика_по» в строке поиска."
    - paragraph: Диапазон — до 366 дней, включая границы, Будущие появления не учитываются. Серии считаются по плановым появлениям, дни отдыха их не прерывают. Отмены исключены из процента и не прерывают серию. Текущее незавершённое появление до конца занятия не считается пропуском. Рейтинг — по проценту выполнения, затем по числу выполнений. Историю удалённых привычек можно удалить из аналитики.
    - article:
      - heading "1. Утренний ритм" [level=3]
      - paragraph: 0.0%
      - term: Появлений
      - definition: "1"
      - term: Выполнено
      - definition: "0"
      - term: Явных пропусков
      - definition: "0"
      - term: Без результата после срока
      - definition: "0"
      - term: Отменено
      - definition: "0"
      - term: Ожидают результата
      - definition: "1"
      - term: Текущая серия
      - definition: "0"
      - term: Лучшая серия
      - definition: "0"
      - term: Максимальная серия пропусков
      - definition: "0"
      - term: Минимальная серия пропусков
      - definition: "0"
      - term: Последняя серия пропусков
      - definition: "0"
      - button "Действия"
- menu "Действия":
  - menuitem "Изменить привычку"
  - menuitem "История привычки"
  - menuitem "Удалить привычку"
  - menuitem "В Today"
  - menuitem "Метки"
```

# Test source

```ts
  1  | import {chooseAction} from "./upgrade-helpers";
  2  | import { confirmUi } from "./upgrade-helpers";
  3  | import { expect, test, type Page, type APIRequestContext } from "@playwright/test";
  4  | 
  5  | async function login(page: Page, request: APIRequestContext) {
  6  |   const email = `habits-${Date.now()}-${Math.random().toString(16).slice(2)}@example.test`;
  7  |   const mailpit = process.env.MAILPIT_URL ?? "http://localhost:8025";
  8  |   await page.goto("/login");
  9  |   await page.getByLabel("Электронная почта", { exact: true }).fill(email);
  10 |   await page.getByRole("button", { name: "Получить код", exact: true }).click();
  11 |   let code = "";
  12 |   await expect.poll(async () => {
  13 |     const inbox = await (await request.get(`${mailpit}/api/v1/messages`)).json();
  14 |     const message = inbox.messages.find((item: { To: { Address: string }[] }) => item.To.some((to) => to.Address === email));
  15 |     if (!message) return false;
  16 |     const detail = await (await request.get(`${mailpit}/api/v1/message/${message.ID}`)).json();
  17 |     code = detail.Text.match(/\b\d{6}\b/)?.[0] ?? "";
  18 |     return code.length === 6;
  19 |   }, { timeout: 20_000 }).toBe(true);
  20 |   await page.getByLabel("Код подтверждения").fill(code);
  21 |   await page.getByRole("button", { name: "Продолжить", exact: true }).click();
  22 |   await expect(page.getByRole("button", { name: "Выйти", exact: true })).toBeVisible();
  23 | }
  24 | 
  25 | test("habit checkbox, Markdown marks and historical snapshots integrate with Today and calendar on mobile", async ({ page, request }, testInfo) => {
  26 |   const errors: string[] = []; page.on("pageerror", (error) => errors.push(error.message));
  27 |   await page.setViewportSize({ width: 390, height: 844 });
  28 |   await login(page, request);
  29 |   await page.getByRole("link", { name: "Привычки", exact: true }).click();
  30 |   await page.getByRole("button", { name: "Новая привычка", exact: true }).click();
  31 |   await page.getByLabel("Название привычки", { exact: true }).fill("Утренний ритм");
  32 |   await page.getByLabel("Описание привычки", { exact: true }).fill("**Мой ритуал**");
  33 |   await expect(page.getByLabel("Время начала",{exact:true})).toHaveCount(0);
  34 |   await expect(page.getByRole("button",{name:"Добавить подпривычку",exact:true})).toHaveCount(0);
  35 |   await page.getByRole("button", { name: "Сохранить привычку", exact: true }).click();
  36 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  37 |   const habitCard=page.locator("article").filter({has:page.getByRole("heading",{name:"Утренний ритм",exact:true})}).first();
  38 |   await expect(habitCard.locator('button[data-context-ignore]')).toHaveCount(1);
  39 |   await habitCard.locator('button[data-context-ignore]').click();
> 40 |   for(const name of ["Отметка и заметка","Изменить привычку","История привычки","Метки"])await expect(page.getByRole("menuitem",{name,exact:true})).toBeVisible();
     |                                                                                                                                                     ^ Error: expect(locator).toBeVisible() failed
  41 |   await page.keyboard.press("Escape");
  42 |   await page.getByRole("link", { name: "Сегодня", exact: true }).click();
  43 |   const occurrence = page.locator("article").filter({ has: page.getByRole("heading", { name: "Утренний ритм", exact: true }) });
  44 |   await expect(occurrence).toBeVisible();
  45 |   await occurrence.getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true}).check();
  46 |   await chooseAction(page,"Отметка и заметка",occurrence);
  47 |   await page.getByLabel("Заметка к отметке", { exact: true }).fill("**Хорошее утро**");
  48 |   await page.getByRole("button", { name: "Сохранить отметку", exact: true }).click();
  49 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  50 |   await page.reload();
  51 |   await expect(page.getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true})).toBeChecked();
  52 |   await occurrence.getByText("Заметка к отметке", { exact: true }).click();
  53 |   await expect(occurrence.locator("strong").filter({ hasText: "Хорошее утро" })).toHaveText("Хорошее утро");
  54 |   await page.getByRole("link", { name: "Календарь", exact: true }).click();
  55 |   await expect(page.getByRole("region", { name: "План выбранного дня" }).getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true})).toHaveCount(0);
  56 |   await page.getByRole("link", { name: "Привычки", exact: true }).click();
  57 |   await expect(page.getByRole("region", { name: "Статистика привычек" })).toContainText("100.0%");
  58 |   await chooseAction(page,"Изменить привычку");
  59 |   await page.getByLabel("Название привычки", { exact: true }).fill("Новый ритм");
  60 |   await page.getByRole("button", { name: "Сохранить привычку", exact: true }).click();
  61 |   await expect(page.getByRole("dialog")).toHaveCount(0);
  62 |   await chooseAction(page,"История привычки");
  63 |   await expect(page.getByRole("dialog")).toContainText("Утренний ритм");
  64 |   await page.getByRole("button", { name: "Закрыть окно", exact: true }).click();
  65 |   await confirmUi(page, async()=>{await chooseAction(page,"Удалить привычку");}, true);
  66 |   await expect(page.getByRole("button", { name: "Изменить привычку", exact: true })).toHaveCount(0);
  67 |   await chooseAction(page,"Открыть историю");
  68 |   await expect(page.getByRole("dialog").getByRole("checkbox",{name:"Выполнено: Утренний ритм",exact:true})).toBeDisabled();
  69 |   await page.getByRole("button", { name: "Закрыть окно", exact: true }).click();
  70 |   expect(await page.locator("html").evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(390);
  71 |   await page.screenshot({ path: testInfo.outputPath("mobile-habits.png"), fullPage: true });
  72 |   expect(errors).toEqual([]);
  73 | });
  74 | 
  75 | test("habit editor has only repeating all-day rules and no reminder controls",async({page,request})=>{await login(page,request);await page.goto("/habits");await page.getByRole("button",{name:"Новая привычка",exact:true}).click();for(const label of ["Время начала","Длительность, минут","Напоминать о привычке"])await expect(page.getByLabel(label,{exact:true})).toHaveCount(0);await expect(page.getByLabel("Повторение",{exact:true}).locator('option[value="once"]')).toHaveCount(0);});
  76 | 
```