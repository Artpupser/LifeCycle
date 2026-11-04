# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: functional-labels.spec.ts >> one action menu serves icon, mouse and keyboard; functional cost persists on mobile
- Location: e2e/functional-labels.spec.ts:4:1

# Error details

```
Test timeout of 60000ms exceeded.
```

```
Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/home/hacker/projects/LifeCycle/frontend/test-results/.playwright-artifacts-0/traces/a87117feb29ac58576a6-0f45ac855770dcba369d-recording2.network' -> '/home/hacker/projects/LifeCycle/frontend/test-results/.playwright-artifacts-0/traces/a87117feb29ac58576a6-0f45ac855770dcba369d-recording2-pwnetcopy-1.network'
```

```
Error: apiRequestContext._wrapApiCall: ENOENT: no such file or directory, copyfile '/home/hacker/projects/LifeCycle/frontend/test-results/.playwright-artifacts-0/traces/a87117feb29ac58576a6-0f45ac855770dcba369d-recording1.network' -> '/home/hacker/projects/LifeCycle/frontend/test-results/.playwright-artifacts-0/traces/a87117feb29ac58576a6-0f45ac855770dcba369d-recording1-pwnetcopy-1.network'
```

# Page snapshot

```yaml
- generic [ref=f1e2]:
  - generic [ref=f1e3]:
    - link "Перейти к содержимому" [ref=f1e4] [cursor=pointer]:
      - /url: "#main"
    - complementary [ref=f1e5]:
      - link "LifeCycle — главная" [ref=f1e7] [cursor=pointer]:
        - /url: /today
      - button "Развернуть навигацию" [ref=f1e13] [cursor=pointer]
      - navigation "Главная навигация" [ref=f1e16]:
        - link "Сегодня" [ref=f1e18] [cursor=pointer]:
          - /url: /today
        - link "Привычки" [ref=f1e23] [cursor=pointer]:
          - /url: /habits
        - link "Тренировки" [ref=f1e28] [cursor=pointer]:
          - /url: /workouts
        - link "Интимный журнал" [ref=f1e33] [cursor=pointer]:
          - /url: /sex
        - link "Задачи" [ref=f1e38] [cursor=pointer]:
          - /url: /tasks
        - link "Календарь" [ref=f1e45] [cursor=pointer]:
          - /url: /calendar
        - link "Заметки" [ref=f1e50] [cursor=pointer]:
          - /url: /notes
        - link "Отсчёты" [ref=f1e55] [cursor=pointer]:
          - /url: /countdowns
        - link "Контакты" [ref=f1e62] [cursor=pointer]:
          - /url: /contacts
        - link "Pomodoro" [ref=f1e69] [cursor=pointer]:
          - /url: /pomodoro
        - link "Аналитика" [ref=f1e76] [cursor=pointer]:
          - /url: /analytics
        - link "AI-помощник" [ref=f1e81] [cursor=pointer]:
          - /url: /ai
        - link "Профиль" [ref=f1e90] [cursor=pointer]:
          - /url: /profile
        - link "Настройки" [ref=f1e95] [cursor=pointer]:
          - /url: /settings
        - link "Подключение" [ref=f1e100] [cursor=pointer]:
          - /url: /status
        - link "Теги и категории" [ref=f1e105] [cursor=pointer]:
          - /url: /labels
        - link "История действий" [ref=f1e112] [cursor=pointer]:
          - /url: /history
      - button "Настроить навигацию" [ref=f1e119] [cursor=pointer]:
        - generic [ref=f1e124]: Настроить панель
      - button "Выйти" [ref=f1e126] [cursor=pointer]
    - main [ref=f1e134]:
      - generic [ref=f1e135]:
        - generic [ref=f1e136]:
          - heading "Заметки" [level=1] [ref=f1e137]
          - paragraph [ref=f1e138]: Быстро записывайте идеи и продолжайте работать с текстом справа.
        - generic [ref=f1e139]:
          - button "Папки" [ref=f1e140] [cursor=pointer]
          - button "Новая заметка" [ref=f1e141] [cursor=pointer]
      - generic [ref=f1e144]:
        - generic [ref=f1e146]:
          - searchbox "Поиск заметок" [ref=f1e147]
          - group [ref=f1e148]:
            - 'generic "Фильтры: Поиск заметок" [ref=f1e149] [cursor=pointer]'
        - button "Действия с выбором" [ref=f1e153] [cursor=pointer]
      - region "Список заметок" [ref=f1e157]:
        - article [ref=f1e159]:
          - generic [ref=f1e160]:
            - checkbox "Выбрать заметку Метка со стоимостью" [ref=f1e161]
            - button "Метка со стоимостью" [ref=f1e162] [cursor=pointer]
            - button "Действия заметки Метка со стоимостью" [ref=f1e164] [cursor=pointer]
          - generic [ref=f1e167]:
            - generic [ref=f1e168]: Закрыта
            - 'button "Изменить метку Стоимость: 100.25 USD" [ref=f1e169] [cursor=pointer]':
              - generic [ref=f1e170]: "Стоимость: 100.25 USD"
            - 'button "Изменить метку Стоимость: 200.00 EUR" [ref=f1e176] [cursor=pointer]':
              - generic [ref=f1e177]: "Стоимость: 200.00 EUR"
            - 'button "Изменить метку Доставка: 50.00 RUB" [ref=f1e183] [cursor=pointer]':
              - generic [ref=f1e184]: "Доставка: 50.00 RUB"
  - generic "Уведомления"
```