# Graph Report - LifeCycle  (2026-10-31)

## Corpus Check
- 205 files · ~122,145 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 19 file(s) not represented in the graph (top: (none) 8, .network 3, .trace 3)

## Summary
- 2025 nodes · 6748 edges · 80 communities (72 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 36 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5fb402ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- AppState
- Button
- services
- auth_smoke.py
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
- react
- scripts
- api
- engines
- allowBuilds
- tsconfig.json
- ideas.md
- plugins.md
- lifecycle-api
- Что действительно работает
- ai_provider.rs
- health/api.ts
- verify_code
- schedule.rs
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
- Основные данные и планирование (этап 3)
- Реализация по модулям
- LifeCycle API
- useResource
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- usePreferences
- CurrentUser
- ai_actions.rs
- Q: Stage 8 AI recovery and provider authentication
- backend
- task-gantt.tsx
- countdowns.rs
- boards-page.tsx
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- intimacy-page.tsx
- analytics.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- LifeCycle — прогресс (сжатый журнал)
- media.rs
- ai_access.rs
- profile.rs
- Q: Stage 9 final integration of LifeCycle after stage 8
- get
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- profile/types.ts
- main.rs
- Упражнения и тренировки (этап 5)
- config.rs
- analytics-page.tsx

## God Nodes (most connected - your core abstractions)
1. `AppState` - 226 edges
2. `CurrentUser` - 140 edges
3. `Button()` - 102 edges
4. `api()` - 95 edges
5. `errorMessage()` - 79 edges
6. `ApiJson` - 75 edges
7. `useResource()` - 63 edges
8. `Input()` - 61 edges
9. `FormField()` - 60 edges
10. `ErrorState()` - 59 edges

## Surprising Connections (you probably didn't know these)
- `Привычки и напоминания (этап 4)` --references--> `Schedule`  [INFERRED]
  backend/README.md → frontend/src/features/planning/types.ts
- `Выполнение и таймеры` --references--> `cancel()`  [INFERRED]
  backend/README.md → frontend/src/features/ai/chat-panel.tsx
- `Аналитика и удаление (этап 7)` --references--> `pomodoro()`  [INFERRED]
  backend/README.md → scripts/core_smoke.py
- `Связь с привычками, Today и календарём` --references--> `HabitConfig`  [INFERRED]
  backend/README.md → frontend/src/features/habits/types.ts
- `Библиотека и конструктор` --references--> `Exercise`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (80 total, 8 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.06
Nodes (53): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+45 more)

### Community 3 - "Button"
Cohesion: 0.13
Nodes (48): Dialog(), FormField(), MarkdownEditor(), Button(), Input(), Select(), ConfigForm(), CountdownEditor() (+40 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.05
Nodes (66): main(), NoRedirect, raw(), run(), run(), send(), run(), save() (+58 more)

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
Nodes (24): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, tailwindcss@^4.1.0, @types/node@^24.0.0 (+16 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (41): access(), Account, account(), account_context(), accounts(), AttemptQuery, authorization_url(), authorize() (+33 more)

### Community 16 - "react"
Cohesion: 0.07
Nodes (56): Библиотека и конструктор, upload(), safeMarkdownUrl(), buttonVariants, Textarea(), Attempt, ActionItem, AiAccount (+48 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "api"
Cohesion: 0.08
Nodes (42): logout(), AiAccess, AiVisibility(), change(), remove(), ChatPanel(), cancel(), prepare() (+34 more)

### Community 19 - "engines"
Cohesion: 0.30
Nodes (5): typescript@^5.9.0, engines, node, pnpm, typescript

### Community 22 - "ideas.md"
Cohesion: 0.22
Nodes (8): Анализ приложения, Для AI, Заметки, Правки, Проблемы, Список идей, Улучшения, Что уже есть?

### Community 25 - "Что действительно работает"
Cohesion: 0.17
Nodes (11): 1. Восстановление контекста, 1. Восстановление контекста, 1. Восстановление контекста, 2. Продолжение разработки, 2. Продолжение разработки, 2. Продолжение разработки, 3. Сохранение прогресса, 3. Сохранение прогресса (+3 more)

### Community 26 - "ai_provider.rs"
Cohesion: 0.07
Nodes (30): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+22 more)

### Community 27 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 28 - "verify_code"
Cohesion: 0.10
Nodes (20): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+12 more)

### Community 29 - "schedule.rs"
Cohesion: 0.05
Nodes (24): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found(), bounded(), check_status(), Checks (+16 more)

### Community 30 - "workout_sessions.rs"
Cohesion: 0.19
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
Nodes (3): login(), @playwright/test@^1.64.1, @playwright/test

### Community 36 - "project_upgrade_projective_v1.md"
Cohesion: 0.05
Nodes (41): 1. Обратный отсчёт (Countdown), 2.1. Добавить, 2.2. Убрать или заменить, 2. Аналитика (Analytics), 3. Pomodoro, 4. Профиль пользователя (Profile), 5. Задачи (Tasks), 6. Интеграция между системами (+33 more)

### Community 37 - "app.tsx"
Cohesion: 0.30
Nodes (14): Card(), CardContent(), CardDescription(), CardHeader(), CardTitle(), useAuth(), LoginPage(), HealthPage() (+6 more)

### Community 38 - "intimacy.rs"
Cohesion: 0.11
Nodes (35): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+27 more)

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (46): complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), dismiss(), editable_occurrence(), fixture(), foreign_or_duplicate_children_are_rejected() (+38 more)

### Community 40 - "README.md"
Cohesion: 0.17
Nodes (8): LifeCycle, Upgrade v1: этапы 1.1–1.3, Upgrade v1: этапы 1.4–1.5, Единый рабочий экран задач, Локальный запуск, Подключение AI, Проверки, Структура

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "Основные данные и планирование (этап 3)"
Cohesion: 0.33
Nodes (6): Countdown и Pomodoro, Today, календарь и история, Задачи, подзадачи и расписания, Заметки и папки, Основные данные и планирование (этап 3), Приватные изображения

### Community 43 - "Реализация по модулям"
Cohesion: 0.20
Nodes (10): Исправление входа после этапа 9 — 30.10.2026, Реализация по модулям, Этап 3: основные данные, Этап 4: привычки, Этап 5: тренировки, Этап 6: интимный журнал, Этап 7: аналитика и физическое удаление, Этап 8: AI (окончательно принят 29.10.2026) (+2 more)

### Community 44 - "LifeCycle API"
Cohesion: 0.12
Nodes (17): AI и подключения, EntryData и время, HTTP контракт, LifeCycle API, Upgrade v1: AI actions и последующие правки AI, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Идентификация, профиль и настройки (этап 2) (+9 more)

### Community 45 - "useResource"
Cohesion: 0.11
Nodes (36): App(), AppContent(), AuthenticatedApp(), LegacyBoards(), NotFound(), Shell(), ErrorState(), LoadingState() (+28 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.23
Nodes (9): router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin(), liveness_is_independent_of_infrastructure_and_has_safe_headers(), mutation_without_origin_is_rejected_before_services_are_accessed(), readiness_reports_actual_connection_failures_without_credentials() (+1 more)

### Community 48 - "usePreferences"
Cohesion: 0.15
Nodes (21): Markdown(), render(), ActionJournal(), ActionReview(), command(), edit(), ChangeView(), entityLabels (+13 more)

### Community 49 - "CurrentUser"
Cohesion: 0.06
Nodes (73): CurrentUser, add_column(), Board, BoardInput, BoardState, bump(), check(), Column (+65 more)

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
Cohesion: 0.08
Nodes (57): HabitDetail(), HabitsPage(), create(), habitTime(), refresh(), remove(), statisticsLabels, Board (+49 more)

### Community 54 - "countdowns.rs"
Cohesion: 0.29
Nodes (12): computed(), Countdown, CountdownInput, create(), delete(), list(), next_date(), read() (+4 more)

### Community 55 - "boards-page.tsx"
Cohesion: 0.20
Nodes (9): BoardsPage(), refresh(), remove(), toggle(), BoardWorkspace(), drop(), move(), mutate() (+1 more)

### Community 56 - "vitest"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, @tailwindcss/vite, @vitejs/plugin-react

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "intimacy-page.tsx"
Cohesion: 0.21
Nodes (17): EntryDetail(), IntimacyPage(), VisibleJournal(), AnswersRow(), JournalStatistics(), answerLabel(), Answers, Entry (+9 more)

### Community 59 - "analytics.rs"
Cohesion: 0.09
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
Cohesion: 0.11
Nodes (18): LifeCycle — прогресс (сжатый журнал), Upgrade 1.1 — завершён, Upgrade 1.2 — завершён, Upgrade 1.3 — завершён, Upgrade v1 — восстановление и этапы 1.1–1.3 (31.10.2026), Upgrade v1 — этап 1.4 завершён (31.10.2026), Upgrade v1 — этап 1.5 завершён (31.10.2026), Архитектура и общие правила (+10 more)

### Community 65 - "media.rs"
Cohesion: 0.21
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "ai_access.rs"
Cohesion: 0.30
Nodes (13): Access, BulkAccess, BulkInput, BulkItem, change(), exercise(), exercise_visible(), Input (+5 more)

### Community 67 - "profile.rs"
Cohesion: 0.28
Nodes (7): load(), Profile, profile_accepts_optional_fields_without_gender_inference(), profile_rejects_future_birthdates_and_impossible_measurements(), read(), routes(), update()

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 70 - "Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?, Source Nodes

### Community 71 - "LifeCycle frontend"
Cohesion: 0.17
Nodes (12): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, UX-правки задач, досок и навигации (31.10.2026), Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Основные данные (этап 3) (+4 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 75 - "profile/types.ts"
Cohesion: 0.25
Nodes (9): submit(), draftToProfile(), MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profileToDraft() (+1 more)

### Community 76 - "main.rs"
Cohesion: 0.32
Nodes (3): main(), run(), shutdown()

### Community 77 - "Упражнения и тренировки (этап 5)"
Cohesion: 0.50
Nodes (4): Выполнение и таймеры, Связь с привычками, Today и календарём, Упражнения и тренировки (этап 5), HabitConfig

### Community 79 - "analytics-page.tsx"
Cohesion: 0.18
Nodes (17): DayChart(), Metrics(), minutes(), number(), percent(), ReportView(), Day, Privacy (+9 more)

## Knowledge Gaps
- **17 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 521 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `project_progress.md` (3× useful, score=2.831940507) _(code changed — re-verify)_
- `ai_login.rs` (2× useful, score=1.917817047)
- `ai_provider.rs` (2× useful, score=1.917817047)
- `tasks.rs` (2× useful, score=1.896140482) _(code changed — re-verify)_
- `habits.rs` (2× useful, score=1.870295848)
- `schedule.rs` (2× useful, score=1.870295848)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeCycle API` connect `LifeCycle API` to `README.md`, `Основные данные и планирование (этап 3)`, `Упражнения и тренировки (этап 5)`?**
  _High betweenness centrality (0.376) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Аналитика и удаление (этап 7)` connect `LifeCycle API` to `auth_smoke.py`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.06301161241195508 - nodes in this community are weakly interconnected._
- **Why does `pomodoro()` connect `auth_smoke.py` to `LifeCycle API`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._