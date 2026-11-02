# Graph Report - LifeCycle  (2026-11-02)

## Corpus Check
- 243 files · ~148,166 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 2389 nodes · 8416 edges · 96 communities (88 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 34 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b447062a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- AppState
- services
- ai_upgrade_smoke.py
- AppState
- environment
- package.json
- compilerOptions
- redis
- components.json
- package.json
- compilerOptions
- frontend
- ai_login.rs
- contacts.rs
- scripts
- action-journal.tsx
- engines
- allowBuilds
- tsconfig.json
- ideas.md
- plugins.md
- lifecycle-api
- Правки
- pomodoro_programs.rs
- boards-page.tsx
- verify_code
- countdowns.rs
- workout_sessions.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- project_upgrade_projective_v1.md
- settings-page.tsx
- intimacy.rs
- habits.rs
- README.md
- depends_on
- ai_access.rs
- Реализация по модулям
- LifeCycle frontend
- schedule.rs
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- ApiJson
- ai_actions.rs
- Q: Stage 8 AI recovery and provider authentication
- backend
- task-gantt.tsx
- api
- mutate
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- analytics.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- LifeCycle — прогресс (сжатый журнал)
- media.rs
- profile.rs
- button.tsx
- Q: Stage 9 final integration of LifeCycle after stage 8
- origin_url
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- profile/types.ts
- ai_provider.rs
- require
- config.rs
- app.tsx
- auth_smoke.py
- contact-import.tsx
- usePreferences
- deserialize
- Правки AI после приёмки 1.1–1.3 — завершены (31.10.2026)
- Upgrade v1 — восстановление и этапы 1.1–1.3 (31.10.2026)
- task_tags.rs
- Client
- BulkAction
- Button
- get
- UX-правки задач, досок и навигации (31.10.2026)
- useResource
- ai_connections_smoke.py
- workouts_smoke.py
- health/api.ts
- super
- workout_preferences.rs
- workout_plan.rs

## God Nodes (most connected - your core abstractions)
1. `AppState` - 265 edges
2. `CurrentUser` - 161 edges
3. `Button()` - 129 edges
4. `api()` - 114 edges
5. `errorMessage()` - 105 edges
6. `ApiJson` - 91 edges
7. `Input()` - 78 edges
8. `useResource()` - 74 edges
9. `FormField()` - 73 edges
10. `require()` - 67 edges

## Surprising Connections (you probably didn't know these)
- `build_report()` --calls--> `visible()`  [INFERRED]
  backend/src/analytics.rs → backend/src/ai_access.rs
- `Report` --references--> `AnalyticsSummary`  [INFERRED]
  backend/src/analytics.rs → backend/src/intimacy.rs
- `logout()` --calls--> `errorMessage()`  [EXTRACTED]
  frontend/src/app.tsx → frontend/src/lib/api.ts
- `render()` --indirect_call--> `Markdown()`  [INFERRED]
  frontend/src/components/markdown.test.ts → frontend/src/components/markdown.tsx
- `submit()` --indirect_call--> `saved()`  [INFERRED]
  frontend/src/features/planning/task-editor.tsx → frontend/src/features/planning/boards-page.tsx

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (96 total, 8 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.13
Nodes (40): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+32 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.13
Nodes (11): main(), assistant(), run(), seal(), training(), run(), main(), ready() (+3 more)

### Community 6 - "AppState"
Cohesion: 0.12
Nodes (43): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+35 more)

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.11
Nodes (23): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, lucide-react@^1.61.0, @radix-ui/react-slot@^1.2.0, react@^19.2.0, react-dom@^19.2.0, react-markdown@^10.1.0 (+15 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 10 - "redis"
Cohesion: 0.45
Nodes (11): healthcheck, healthcheck, healthcheck, interval, retries, start_period, test, timeout (+3 more)

### Community 11 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+8 more)

### Community 12 - "package.json"
Cohesion: 0.09
Nodes (26): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, @playwright/test@^1.64.1, tailwindcss@^4.1.0 (+18 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (41): access(), Account, account(), account_context(), accounts(), AttemptQuery, authorization_url(), authorize() (+33 more)

### Community 16 - "contacts.rs"
Cohesion: 0.16
Nodes (30): all(), Contact, ContactData, create(), decode(), Delete, delete(), disable_birthday() (+22 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "action-journal.tsx"
Cohesion: 0.10
Nodes (35): ActionJournal(), ActionReview(), command(), edit(), entityLabels, labels, parseActions(), refreshActions() (+27 more)

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 22 - "ideas.md"
Cohesion: 0.18
Nodes (10): Анализ приложения, Для AI, Заметки, Правки, Проблемы, Список идей, Требования (backend), Требования (frontend) (+2 more)

### Community 25 - "Правки"
Cohesion: 0.12
Nodes (16): 1. Восстановление контекста, 1. Восстановление контекста, 1. Восстановление контекста, 2. Продолжение разработки, 2. Продолжение разработки, 2. Продолжение разработки, 3. Сохранение прогресса, 3. Сохранение прогресса (+8 more)

### Community 26 - "pomodoro_programs.rs"
Cohesion: 0.15
Nodes (26): Action, Anchor, boundaries_cycles_and_long_suspension_are_arithmetic(), change(), Config, ConfigInput, create(), delete() (+18 more)

### Community 27 - "boards-page.tsx"
Cohesion: 0.08
Nodes (43): FilterSearch(), submit(), HabitDetail(), habitFilters, HabitsPage(), refresh(), remove(), statisticsLabels (+35 more)

### Community 28 - "verify_code"
Cohesion: 0.10
Nodes (20): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+12 more)

### Community 29 - "countdowns.rs"
Cohesion: 0.07
Nodes (48): apply_contact(), at_index(), clamped(), computed(), Countdown, CountdownInput, create(), delete() (+40 more)

### Community 30 - "workout_sessions.rs"
Cohesion: 0.20
Nodes (15): active(), change(), Command, early_finish_is_rejected_and_skip_is_partial(), fixture(), history(), HistoryQuery, read() (+7 more)

### Community 31 - "garage"
Cohesion: 0.18
Nodes (11): GARAGE_DEFAULT_ACCESS_KEY, GARAGE_DEFAULT_BUCKET, GARAGE_DEFAULT_SECRET_KEY, GARAGE_RPC_SECRET, command, environment, image, networks (+3 more)

### Community 32 - "mailpit"
Cohesion: 0.22
Nodes (9): MP_DATABASE, MP_MAX_MESSAGES, environment, image, networks, ports, restart, volumes (+1 more)

### Community 33 - "postgres"
Cohesion: 0.22
Nodes (9): POSTGRES_DB, POSTGRES_PASSWORD, POSTGRES_USER, environment, image, networks, restart, volumes (+1 more)

### Community 34 - "redis"
Cohesion: 0.25
Nodes (8): REDIS_PASSWORD, command, environment, image, networks, restart, volumes, redis

### Community 35 - "@playwright/test"
Cohesion: 0.10
Nodes (5): confirmUi(), login(), noteProperties(), quickNote(), @playwright/test

### Community 36 - "project_upgrade_projective_v1.md"
Cohesion: 0.05
Nodes (41): 1. Обратный отсчёт (Countdown), 2.1. Добавить, 2.2. Убрать или заменить, 2. Аналитика (Analytics), 3. Pomodoro, 4. Профиль пользователя (Profile), 5. Задачи (Tasks), 6. Интеграция между системами (+33 more)

### Community 37 - "settings-page.tsx"
Cohesion: 0.29
Nodes (12): Card(), CardContent(), CardDescription(), CardHeader(), CardTitle(), HealthPage(), HealthState, services (+4 more)

### Community 38 - "intimacy.rs"
Cohesion: 0.11
Nodes (35): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+27 more)

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (49): complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), delete_history(), DeleteHistory, dismiss(), editable_occurrence() (+41 more)

### Community 40 - "README.md"
Cohesion: 0.17
Nodes (8): LifeCycle, Upgrade v1: этапы 1.1–1.3, Upgrade v1: этапы 1.4–1.5, Единый рабочий экран задач, Локальный запуск, Подключение AI, Проверки, Структура

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "ai_access.rs"
Cohesion: 0.30
Nodes (13): Access, BulkAccess, BulkInput, BulkItem, change(), exercise(), exercise_visible(), Input (+5 more)

### Community 43 - "Реализация по модулям"
Cohesion: 0.20
Nodes (10): Исправление входа после этапа 9 — 30.10.2026, Реализация по модулям, Этап 3: основные данные, Этап 4: привычки, Этап 5: тренировки, Этап 6: интимный журнал, Этап 7: аналитика и физическое удаление, Этап 8: AI (окончательно принят 29.10.2026) (+2 more)

### Community 44 - "LifeCycle frontend"
Cohesion: 0.18
Nodes (11): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Основные данные (этап 3), Привычки (этап 4) (+3 more)

### Community 45 - "schedule.rs"
Cohesion: 0.06
Nodes (18): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found(), bounded(), check_status(), Checks (+10 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.14
Nodes (12): router(), main(), run(), shutdown(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin() (+4 more)

### Community 49 - "ApiJson"
Cohesion: 0.20
Nodes (30): add_column(), Board, BoardInput, BoardState, bump(), check(), Column, column_save() (+22 more)

### Community 50 - "ai_actions.rs"
Cohesion: 0.14
Nodes (40): Action, action(), apply(), Change, check_actions(), check_exercise_links(), COLUMNS, Confirmation (+32 more)

### Community 51 - "Q: Stage 8 AI recovery and provider authentication"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 AI recovery and provider authentication, Source Nodes

### Community 52 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 53 - "task-gantt.tsx"
Cohesion: 0.07
Nodes (71): DateTimeInput(), presets(), DayEvents(), Countdown, CountdownInput, EventDetails, EventDisplay, EventOccurrence (+63 more)

### Community 54 - "api"
Cohesion: 0.06
Nodes (66): AiAccess, AiVisibility(), change(), remove(), cancel(), ConfigForm(), save(), LoginAccounts() (+58 more)

### Community 55 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 56 - "vitest"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, vitest@^5.0.5, @tailwindcss/vite, @vitejs/plugin-react, vitest

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "CurrentUser"
Cohesion: 0.21
Nodes (24): CurrentUser, bulk(), BulkItem, BulkNotes, create_folder(), create_note(), delete_folder(), delete_note() (+16 more)

### Community 59 - "analytics.rs"
Cohesion: 0.10
Nodes (26): build(), clip(), validate_range(), ai_report(), build_report(), Day, habit_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending() (+18 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "workouts.rs"
Cohesion: 0.13
Nodes (30): color(), conflict(), event(), local_today(), not_found(), Search, settings(), tags() (+22 more)

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "LifeCycle — прогресс (сжатый журнал)"
Cohesion: 0.09
Nodes (23): LifeCycle — прогресс (сжатый журнал), Upgrade v1 — этап 1.4 завершён (31.10.2026), Upgrade v1 — этап 1.5 завершён (31.10.2026), Upgrade v1 — этап 1.6 завершён (02.11.2026), Upgrade v1 — этап 1.7 завершён (02.11.2026), Upgrade v1 — этап 1.8 завершён (02.11.2026), Upgrade v1 — этап 2.1 завершён (02.11.2026), Upgrade v1 — этап 2.2 завершён (02.11.2026) (+15 more)

### Community 65 - "media.rs"
Cohesion: 0.19
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "profile.rs"
Cohesion: 0.19
Nodes (15): decode(), Firsts, HabitPeriod, HarmfulHabit, historical_years_and_habit_periods_validate_without_inventing_unknowns(), load(), merge(), Origin (+7 more)

### Community 67 - "button.tsx"
Cohesion: 0.09
Nodes (40): Item, Navigation, SidebarNavigation(), move(), save(), save(), submit(), submit() (+32 more)

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 69 - "origin_url"
Cohesion: 0.18
Nodes (5): main(), run(), send(), origin_url(), main()

### Community 70 - "Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?, Source Nodes

### Community 71 - "LifeCycle frontend"
Cohesion: 0.14
Nodes (14): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, UX-правки задач, досок и навигации (31.10.2026), Аналитика и удаление (этап 7), Быстрые задачи и планирование — 01.11.2026, Интимный журнал (этап 6), Какие записи видит AI (+6 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 75 - "profile/types.ts"
Cohesion: 0.16
Nodes (15): submit(), draftToProfile(), emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey (+7 more)

### Community 76 - "ai_provider.rs"
Cohesion: 0.09
Nodes (20): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+12 more)

### Community 77 - "require"
Cohesion: 0.20
Nodes (22): require(), SmokeFailure, countdowns(), find_occurrence(), listed(), main(), media(), notes_and_folders() (+14 more)

### Community 79 - "app.tsx"
Cohesion: 0.10
Nodes (27): App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), LegacyBoards(), NotFound(), Shell(), logout() (+19 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (9): email_address(), main(), read_code(), request_code(), run(), session_cookie(), verify(), run() (+1 more)

### Community 82 - "contact-import.tsx"
Cohesion: 0.19
Nodes (20): ContactImport(), submit(), pick(), readFile(), decode(), devicePicker(), parseContactFile(), parseVcards() (+12 more)

### Community 83 - "usePreferences"
Cohesion: 0.11
Nodes (37): Markdown(), render(), ChangeView(), HabitControls(), MarkEditor(), emptyMark(), Habit, HabitConfig (+29 more)

### Community 84 - "deserialize"
Cohesion: 0.27
Nodes (5): read(), routes(), Settings, update(), validates_iana_timezone_and_bounds()

### Community 85 - "Правки AI после приёмки 1.1–1.3 — завершены (31.10.2026)"
Cohesion: 0.40
Nodes (5): Доступ к источникам, Интерфейс и персонализация, Правки AI после приёмки 1.1–1.3 — завершены (31.10.2026), Причина ошибки ChatGPT и настоящее подтверждение, Приёмка окончательных изменений

### Community 86 - "Upgrade v1 — восстановление и этапы 1.1–1.3 (31.10.2026)"
Cohesion: 0.50
Nodes (4): Upgrade 1.1 — завершён, Upgrade 1.2 — завершён, Upgrade 1.3 — завершён, Upgrade v1 — восстановление и этапы 1.1–1.3 (31.10.2026)

### Community 87 - "task_tags.rs"
Cohesion: 0.29
Nodes (11): create(), list(), locked(), Name, register(), remove(), Revision, routes() (+3 more)

### Community 89 - "Client"
Cohesion: 0.10
Nodes (16): run(), save(), Client, run(), login(), run(), run(), run() (+8 more)

### Community 91 - "BulkAction"
Cohesion: 0.33
Nodes (6): BulkAction, Color, Delete, Move, TagsAdd, TagsRemove

### Community 92 - "Button"
Cohesion: 0.15
Nodes (44): Dialog(), FeedbackProvider(), Request, FormField(), MarkdownEditor(), Button(), buttonVariants, Input() (+36 more)

### Community 94 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.29
Nodes (7): Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Массовые заметки и навигация — 02.11.2026, Рабочее пространство — 02.11.2026

### Community 95 - "useResource"
Cohesion: 0.11
Nodes (38): ErrorState(), LoadingState(), AiSettings(), AnalyticsPage(), DayChart(), Metrics(), minutes(), number() (+30 more)

### Community 97 - "ai_connections_smoke.py"
Cohesion: 0.22
Nodes (3): NoRedirect, raw(), run()

### Community 98 - "workouts_smoke.py"
Cohesion: 0.28
Nodes (9): run(), main(), run(), command(), entry(), exercise(), main(), plan() (+1 more)

### Community 100 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 102 - "workout_preferences.rs"
Cohesion: 0.18
Nodes (10): routes(), AppState, Conditions, Input, load(), Preferences, read(), routes() (+2 more)

### Community 103 - "workout_plan.rs"
Cohesion: 0.11
Nodes (17): Navigation, navigation_requires_known_unique_order_and_pins(), PAGES, read(), routes(), update(), Entry, Exercise (+9 more)

## Knowledge Gaps
- **22 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 573 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `tasks.rs` (3× useful, score=2.772880876)
- `project_progress.md` (3× useful, score=2.711096496) _(code changed — re-verify)_
- `ai_login.rs` (2× useful, score=1.835980333)
- `ai_provider.rs` (2× useful, score=1.835980333)
- `habits.rs` (2× useful, score=1.790486949)
- `schedule.rs` (2× useful, score=1.790486949)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `workout_preferences.rs` to `AppState`, `AppState`, `ai_login.rs`, `contacts.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `schedule.rs`, `foundation.rs`, `ApiJson`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `media.rs`, `profile.rs`, `ai_provider.rs`, `deserialize`, `task_tags.rs`, `get`, `super`, `workout_plan.rs`?**
  _High betweenness centrality (0.118) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `CurrentUser` connect `CurrentUser` to `AppState`, `AppState`, `ai_login.rs`, `contacts.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `schedule.rs`, `ApiJson`, `ai_actions.rs`, `analytics.rs`, `workouts.rs`, `media.rs`, `profile.rs`, `deserialize`, `task_tags.rs`, `workout_preferences.rs`, `workout_plan.rs`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.13033313851548803 - nodes in this community are weakly interconnected._
- **Why does `ApiJson` connect `ApiJson` to `AppState`, `AppState`, `ai_login.rs`, `contacts.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `schedule.rs`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `profile.rs`, `deserialize`, `task_tags.rs`, `workout_preferences.rs`, `workout_plan.rs`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Should `ai_upgrade_smoke.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._