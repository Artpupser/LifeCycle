# Graph Report - LifeCycle  (2026-11-02)

## Corpus Check
- 231 files · ~138,291 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 2285 nodes · 7901 edges · 98 communities (87 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `da2947aa`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- AppState
- useResource
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
- navigation.rs
- scripts
- api
- engines
- allowBuilds
- tsconfig.json
- ideas.md
- plugins.md
- lifecycle-api
- Правки
- pomodoro_programs.rs
- Button
- verify_code
- countdowns.rs
- workout_sessions.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- project_upgrade_projective_v1.md
- app.tsx
- intimacy.rs
- habits.rs
- README.md
- depends_on
- ai_access.rs
- Реализация по модулям
- LifeCycle frontend
- error.rs
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- countdowns-page.tsx
- ApiJson
- ai_actions.rs
- Q: Stage 8 AI recovery and provider authentication
- backend
- task-gantt.tsx
- Input
- mutate
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- analytics.rs
- ai.spec.ts
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- LifeCycle — прогресс (сжатый журнал)
- media.rs
- profile.rs
- button.tsx
- Q: Stage 9 final integration of LifeCycle after stage 8
- csrf.rs
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- profile/types.ts
- ai_provider.rs
- require
- config.rs
- boards-page.tsx
- auth_smoke.py
- pomodoro.rs
- health.rs
- workout_preferences.rs
- deserialize
- Правки AI после приёмки 1.1–1.3 — завершены (31.10.2026)
- Upgrade v1 — восстановление и этапы 1.1–1.3 (31.10.2026)
- task_tags.rs
- Client
- AppState
- BulkAction
- UX-правки задач, досок и навигации (31.10.2026)
- json
- analytics_smoke.py
- main.rs
- health/api.ts

## God Nodes (most connected - your core abstractions)
1. `AppState` - 244 edges
2. `CurrentUser` - 152 edges
3. `Button()` - 122 edges
4. `api()` - 106 edges
5. `errorMessage()` - 93 edges
6. `ApiJson` - 84 edges
7. `Input()` - 72 edges
8. `useResource()` - 71 edges
9. `FormField()` - 68 edges
10. `react` - 63 edges

## Surprising Connections (you probably didn't know these)
- `build_report()` --calls--> `visible()`  [INFERRED]
  backend/src/analytics.rs → backend/src/ai_access.rs
- `Report` --references--> `AnalyticsSummary`  [INFERRED]
  backend/src/analytics.rs → backend/src/intimacy.rs
- `run()` --calls--> `router()`  [INFERRED]
  backend/src/main.rs → backend/src/lib.rs
- `logout()` --calls--> `errorMessage()`  [EXTRACTED]
  frontend/src/app.tsx → frontend/src/lib/api.ts
- `render()` --indirect_call--> `Markdown()`  [INFERRED]
  frontend/src/components/markdown.test.ts → frontend/src/components/markdown.tsx

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (98 total, 11 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.13
Nodes (40): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+32 more)

### Community 3 - "useResource"
Cohesion: 0.10
Nodes (46): ErrorState(), LoadingState(), AiSettings(), AnalyticsPage(), DayChart(), Metrics(), minutes(), number() (+38 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.09
Nodes (12): main(), assistant(), run(), seal(), training(), main(), ready(), run() (+4 more)

### Community 6 - "AppState"
Cohesion: 0.12
Nodes (44): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+36 more)

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
Cohesion: 0.08
Nodes (27): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, @playwright/test@^1.64.1, tailwindcss@^4.1.0 (+19 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (41): access(), Account, account(), account_context(), accounts(), AttemptQuery, authorization_url(), authorize() (+33 more)

### Community 16 - "navigation.rs"
Cohesion: 0.25
Nodes (6): Navigation, navigation_requires_known_unique_order_and_pins(), PAGES, read(), routes(), update()

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "api"
Cohesion: 0.06
Nodes (71): AiVisibility(), change(), ActionJournal(), ActionReview(), command(), edit(), ChangeView(), entityLabels (+63 more)

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 22 - "ideas.md"
Cohesion: 0.22
Nodes (8): Анализ приложения, Для AI, Заметки, Правки, Проблемы, Список идей, Улучшения, Что уже есть?

### Community 25 - "Правки"
Cohesion: 0.12
Nodes (16): 1. Восстановление контекста, 1. Восстановление контекста, 1. Восстановление контекста, 2. Продолжение разработки, 2. Продолжение разработки, 2. Продолжение разработки, 3. Сохранение прогресса, 3. Сохранение прогресса (+8 more)

### Community 26 - "pomodoro_programs.rs"
Cohesion: 0.15
Nodes (26): Action, Anchor, boundaries_cycles_and_long_suspension_are_arithmetic(), change(), Config, ConfigInput, create(), delete() (+18 more)

### Community 27 - "Button"
Cohesion: 0.09
Nodes (44): Dialog(), Button(), buttonVariants, CountdownEditor(), submit(), HabitDetail(), BoardNameDialog(), ColumnDialog() (+36 more)

### Community 28 - "verify_code"
Cohesion: 0.05
Nodes (25): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+17 more)

### Community 29 - "countdowns.rs"
Cohesion: 0.08
Nodes (38): at_index(), clamped(), computed(), Countdown, CountdownInput, create(), delete(), Details (+30 more)

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
Cohesion: 0.17
Nodes (4): confirmUi(), login(), quickNote(), @playwright/test

### Community 36 - "project_upgrade_projective_v1.md"
Cohesion: 0.05
Nodes (41): 1. Обратный отсчёт (Countdown), 2.1. Добавить, 2.2. Убрать или заменить, 2. Аналитика (Analytics), 3. Pomodoro, 4. Профиль пользователя (Profile), 5. Задачи (Tasks), 6. Интеграция между системами (+33 more)

### Community 37 - "app.tsx"
Cohesion: 0.11
Nodes (34): App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), LegacyBoards(), NotFound(), Shell(), logout() (+26 more)

### Community 38 - "intimacy.rs"
Cohesion: 0.11
Nodes (35): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+27 more)

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (48): complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), delete_history(), DeleteHistory, dismiss(), editable_occurrence() (+40 more)

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

### Community 45 - "error.rs"
Cohesion: 0.13
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.23
Nodes (9): router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin(), liveness_is_independent_of_infrastructure_and_has_safe_headers(), mutation_without_origin_is_rejected_before_services_are_accessed(), readiness_reports_actual_connection_failures_without_credentials() (+1 more)

### Community 48 - "countdowns-page.tsx"
Cohesion: 0.25
Nodes (9): duration(), icons, Remaining(), Countdown, CountdownInput, EventDetails, EventDisplay, EventOccurrence (+1 more)

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
Cohesion: 0.09
Nodes (56): DateTimeInput(), presets(), HabitsPage(), create(), habitTime(), refresh(), remove(), changedInterval() (+48 more)

### Community 54 - "Input"
Cohesion: 0.12
Nodes (41): FormField(), Input(), Select(), Textarea(), CountdownEditor(), HabitEditor(), AnswerInput(), EntryEditor() (+33 more)

### Community 55 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 56 - "vitest"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, @tailwindcss/vite, @vitejs/plugin-react

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
Cohesion: 0.10
Nodes (21): LifeCycle — прогресс (сжатый журнал), Upgrade v1 — этап 1.4 завершён (31.10.2026), Upgrade v1 — этап 1.5 завершён (31.10.2026), Upgrade v1 — этап 1.6 завершён (02.11.2026), Upgrade v1 — этап 1.7 завершён (02.11.2026), Upgrade v1 — этап 1.8 завершён (02.11.2026), UX-правки задач, досок и общей навигации — завершены (31.10.2026), Архитектура и общие правила (+13 more)

### Community 65 - "media.rs"
Cohesion: 0.21
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "profile.rs"
Cohesion: 0.19
Nodes (15): decode(), Firsts, HabitPeriod, HarmfulHabit, historical_years_and_habit_periods_validate_without_inventing_unknowns(), load(), merge(), Origin (+7 more)

### Community 67 - "button.tsx"
Cohesion: 0.09
Nodes (51): Markdown(), MarkdownEditor(), upload(), safeMarkdownUrl(), render(), Item, Navigation, HabitControls() (+43 more)

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

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
Cohesion: 0.17
Nodes (14): submit(), draftToProfile(), emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey (+6 more)

### Community 76 - "ai_provider.rs"
Cohesion: 0.10
Nodes (28): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+20 more)

### Community 77 - "require"
Cohesion: 0.21
Nodes (23): require(), SmokeFailure, countdowns(), find_occurrence(), listed(), main(), media(), notes_and_folders() (+15 more)

### Community 79 - "boards-page.tsx"
Cohesion: 0.07
Nodes (53): AiAccess, Request, FilterSearch(), SidebarNavigation(), move(), save(), Countdown, CountdownInput (+45 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.10
Nodes (14): main(), NoRedirect, raw(), run(), run(), send(), email_address(), main() (+6 more)

### Community 81 - "pomodoro.rs"
Cohesion: 0.22
Nodes (6): active(), change(), routes(), Session, Start, start()

### Community 82 - "health.rs"
Cohesion: 0.24
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

### Community 83 - "workout_preferences.rs"
Cohesion: 0.31
Nodes (8): Conditions, Input, load(), Preferences, read(), routes(), training_conditions_preserve_unknown_and_limit_unicode(), update()

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
Cohesion: 0.12
Nodes (14): run(), save(), Client, login(), task_body(), run(), run(), run() (+6 more)

### Community 91 - "BulkAction"
Cohesion: 0.33
Nodes (6): BulkAction, Color, Delete, Move, TagsAdd, TagsRemove

### Community 94 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.29
Nodes (7): Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Массовые заметки и навигация — 02.11.2026, Рабочее пространство — 02.11.2026

### Community 97 - "json"
Cohesion: 0.24
Nodes (3): run(), run(), main()

### Community 98 - "analytics_smoke.py"
Cohesion: 0.28
Nodes (7): run(), main(), run(), command(), entry(), exercise(), plan()

### Community 99 - "main.rs"
Cohesion: 0.32
Nodes (3): main(), run(), shutdown()

### Community 100 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

## Knowledge Gaps
- **22 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+17 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 564 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `project_progress.md` (3× useful, score=2.831940507) _(code changed — re-verify)_
- `ai_login.rs` (2× useful, score=1.917817047)
- `ai_provider.rs` (2× useful, score=1.917817047)
- `tasks.rs` (2× useful, score=1.896140482) _(code changed — re-verify)_
- `habits.rs` (2× useful, score=1.870295848) _(code changed — re-verify)_
- `schedule.rs` (2× useful, score=1.870295848) _(code changed — re-verify)_

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `AppState` to `AppState`, `AppState`, `ai_login.rs`, `navigation.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `foundation.rs`, `ApiJson`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `media.rs`, `profile.rs`, `csrf.rs`, `pomodoro.rs`, `health.rs`, `workout_preferences.rs`, `deserialize`, `task_tags.rs`, `get`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _22 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `CurrentUser` connect `CurrentUser` to `AppState`, `AppState`, `ai_login.rs`, `navigation.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `ApiJson`, `ai_actions.rs`, `analytics.rs`, `workouts.rs`, `media.rs`, `profile.rs`, `pomodoro.rs`, `workout_preferences.rs`, `deserialize`, `task_tags.rs`, `AppState`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.13033313851548803 - nodes in this community are weakly interconnected._
- **Why does `ApiJson` connect `ApiJson` to `AppState`, `AppState`, `ai_login.rs`, `navigation.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `error.rs`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `profile.rs`, `pomodoro.rs`, `workout_preferences.rs`, `deserialize`, `task_tags.rs`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `useResource` be split into smaller, more focused modules?**
  _Cohesion score 0.10267857142857142 - nodes in this community are weakly interconnected._