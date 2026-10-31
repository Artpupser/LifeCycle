# Graph Report - LifeCycle  (2026-10-31)

## Corpus Check
- 172 files · ~104,880 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 1854 nodes · 6007 edges · 81 communities (71 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `35909b3e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- AppState
- react
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
- action-journal.tsx
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
- action-journal.tsx
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- useResource
- CurrentUser
- ai_actions.rs
- Q: Stage 8 AI recovery and provider authentication
- backend
- profile.rs
- countdowns.rs
- FormField
- pomodoro.rs
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- intimacy-page.tsx
- analytics.rs
- workout_preferences.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- LifeCycle — прогресс (сжатый журнал)
- media.rs
- ai_access.rs
- AppState
- Q: Stage 9 final integration of LifeCycle after stage 8
- csrf.rs
- settings.rs
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- profile/types.ts
- eslint.config.js
- analytics-page.tsx
- config.rs
- main.rs

## God Nodes (most connected - your core abstractions)
1. `AppState` - 203 edges
2. `CurrentUser` - 120 edges
3. `Button()` - 87 edges
4. `api()` - 86 edges
5. `errorMessage()` - 78 edges
6. `ApiJson` - 59 edges
7. `useResource()` - 54 edges
8. `FormField()` - 53 edges
9. `ErrorState()` - 52 edges
10. `Input()` - 51 edges

## Surprising Connections (you probably didn't know these)
- `Выполнение и таймеры` --references--> `cancel()`  [INFERRED]
  backend/README.md → frontend/src/features/ai/chat-panel.tsx
- `Связь с привычками, Today и календарём` --references--> `HabitConfig`  [INFERRED]
  backend/README.md → frontend/src/features/habits/types.ts
- `Привычки и напоминания (этап 4)` --references--> `Schedule`  [INFERRED]
  backend/README.md → frontend/src/features/planning/types.ts
- `Аналитика и удаление (этап 7)` --references--> `pomodoro()`  [INFERRED]
  backend/README.md → scripts/core_smoke.py
- `Библиотека и конструктор` --references--> `Exercise`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (81 total, 10 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.13
Nodes (40): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+32 more)

### Community 3 - "react"
Cohesion: 0.12
Nodes (31): Markdown(), render(), Button(), buttonVariants, HabitControls(), save(), MarkEditor(), submit() (+23 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.06
Nodes (61): main(), NoRedirect, raw(), run(), run(), send(), run(), save() (+53 more)

### Community 6 - "AppState"
Cohesion: 0.13
Nodes (38): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+30 more)

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
Nodes (21): devDependencies, eslint@^10.13.0, tailwindcss@^4.1.0, @tailwindcss/vite@^4.1.0, @types/node@^24.0.0, @types/react@^19.2.0, @types/react-dom@^19.2.0, typescript@^5.9.0 (+13 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (41): access(), Account, account(), account_context(), accounts(), AttemptQuery, authorization_url(), authorize() (+33 more)

### Community 16 - "action-journal.tsx"
Cohesion: 0.12
Nodes (32): Библиотека и конструктор, entityLabels, labels, Countdown, CountdownInput, Countdown, CountdownInput, icons (+24 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "api"
Cohesion: 0.09
Nodes (38): logout(), AiAccess, AiVisibility(), change(), remove(), ChatPanel(), cancel(), prepare() (+30 more)

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 22 - "ideas.md"
Cohesion: 0.22
Nodes (8): Анализ приложения, Для AI, Заметки, Правки, Проблемы, Список идей, Улучшения, Что уже есть?

### Community 25 - "Что действительно работает"
Cohesion: 0.17
Nodes (11): 1. Восстановление контекста, 1. Восстановление контекста, 1. Восстановление контекста, 2. Продолжение разработки, 2. Продолжение разработки, 2. Продолжение разработки, 3. Сохранение прогресса, 3. Сохранение прогресса (+3 more)

### Community 26 - "ai_provider.rs"
Cohesion: 0.06
Nodes (30): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+22 more)

### Community 27 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 28 - "verify_code"
Cohesion: 0.07
Nodes (23): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+15 more)

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

### Community 36 - "project_upgrade_projective_v1.md"
Cohesion: 0.05
Nodes (41): 1. Обратный отсчёт (Countdown), 2.1. Добавить, 2.2. Убрать или заменить, 2. Аналитика (Analytics), 3. Pomodoro, 4. Профиль пользователя (Profile), 5. Задачи (Tasks), 6. Интеграция между системами (+33 more)

### Community 37 - "app.tsx"
Cohesion: 0.13
Nodes (28): App(), AppContent(), NotFound(), Shell(), Card(), CardContent(), CardDescription(), CardHeader() (+20 more)

### Community 38 - "intimacy.rs"
Cohesion: 0.11
Nodes (35): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+27 more)

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (46): complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), dismiss(), editable_occurrence(), fixture(), foreign_or_duplicate_children_are_rejected() (+38 more)

### Community 40 - "README.md"
Cohesion: 0.20
Nodes (6): LifeCycle, Upgrade v1: этапы 1.1–1.3, Локальный запуск, Подключение AI, Проверки, Структура

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
Cohesion: 0.11
Nodes (18): AI и подключения, EntryData и время, HTTP контракт, LifeCycle API, Upgrade v1: AI actions и последующие правки AI, Аналитика и удаление (этап 7), Выполнение и таймеры, Идентификация, профиль и настройки (этап 2) (+10 more)

### Community 45 - "action-journal.tsx"
Cohesion: 0.12
Nodes (28): ActionReview(), command(), edit(), parseActions(), refreshActions(), AiSettings(), Attempt, Message() (+20 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.23
Nodes (9): router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin(), liveness_is_independent_of_infrastructure_and_has_safe_headers(), mutation_without_origin_is_rejected_before_services_are_accessed(), readiness_reports_actual_connection_failures_without_credentials() (+1 more)

### Community 48 - "useResource"
Cohesion: 0.11
Nodes (53): AuthenticatedApp(), ErrorState(), LoadingState(), ActionJournal(), ChangeView(), AiPage(), Workspace(), AnalyticsPage() (+45 more)

### Community 49 - "CurrentUser"
Cohesion: 0.25
Nodes (20): CurrentUser, create_folder(), create_note(), delete_folder(), delete_note(), delete_note_in(), Folder, folder() (+12 more)

### Community 50 - "ai_actions.rs"
Cohesion: 0.14
Nodes (40): Action, action(), apply(), Change, check_actions(), check_exercise_links(), COLUMNS, Confirmation (+32 more)

### Community 51 - "Q: Stage 8 AI recovery and provider authentication"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 AI recovery and provider authentication, Source Nodes

### Community 52 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 53 - "profile.rs"
Cohesion: 0.25
Nodes (7): load(), Profile, profile_accepts_optional_fields_without_gender_inference(), profile_rejects_future_birthdates_and_impossible_measurements(), read(), routes(), update()

### Community 54 - "countdowns.rs"
Cohesion: 0.29
Nodes (12): computed(), Countdown, CountdownInput, create(), delete(), list(), next_date(), read() (+4 more)

### Community 55 - "FormField"
Cohesion: 0.16
Nodes (32): Dialog(), FormField(), MarkdownEditor(), Input(), Select(), Textarea(), CountdownEditor(), CountdownEditor() (+24 more)

### Community 56 - "pomodoro.rs"
Cohesion: 0.27
Nodes (6): active(), change(), routes(), Session, Start, start()

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "intimacy-page.tsx"
Cohesion: 0.17
Nodes (18): upload(), safeMarkdownUrl(), EntryDetail(), AnswersRow(), JournalStatistics(), answerLabel(), Answers, Entry (+10 more)

### Community 59 - "analytics.rs"
Cohesion: 0.09
Nodes (26): build(), clip(), validate_range(), ai_report(), build_report(), Day, habit_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending() (+18 more)

### Community 60 - "workout_preferences.rs"
Cohesion: 0.31
Nodes (8): Conditions, Input, load(), Preferences, read(), routes(), training_conditions_preserve_unknown_and_limit_unicode(), update()

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
Cohesion: 0.15
Nodes (13): LifeCycle — прогресс (сжатый журнал), Upgrade 1.1 — завершён, Upgrade 1.2 — завершён, Upgrade 1.3 — завершён, Upgrade v1 — восстановление и этапы 1.1–1.3 (31.10.2026), Архитектура и общие правила, Доступ к источникам, Интерфейс и персонализация (+5 more)

### Community 65 - "media.rs"
Cohesion: 0.19
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "ai_access.rs"
Cohesion: 0.32
Nodes (10): Access, change(), exercise(), exercise_visible(), Input, note(), routes(), visible() (+2 more)

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 70 - "settings.rs"
Cohesion: 0.27
Nodes (5): read(), routes(), Settings, update(), validates_iana_timezone_and_bounds()

### Community 71 - "LifeCycle frontend"
Cohesion: 0.20
Nodes (10): AI-помощник `/ai`, LifeCycle frontend, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Основные данные (этап 3), Привычки (этап 4), Просмотр и применение предложений (+2 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 75 - "profile/types.ts"
Cohesion: 0.25
Nodes (9): submit(), draftToProfile(), MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profileToDraft() (+1 more)

### Community 76 - "eslint.config.js"
Cohesion: 0.18
Nodes (10): @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, typescript-eslint@^8.48.0, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+2 more)

### Community 77 - "analytics-page.tsx"
Cohesion: 0.40
Nodes (9): DayChart(), Metrics(), minutes(), number(), percent(), ReportView(), Day, Privacy (+1 more)

### Community 79 - "main.rs"
Cohesion: 0.32
Nodes (3): main(), run(), shutdown()

## Knowledge Gaps
- **17 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 484 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `ai_login.rs` (2× useful, score=1.995760475) _(code changed — re-verify)_
- `ai_provider.rs` (2× useful, score=1.995760475) _(code changed — re-verify)_
- `project_progress.md` (2× useful, score=1.946738381) _(code changed — re-verify)_
- `habits.rs` (2× useful, score=1.946307932)
- `schedule.rs` (2× useful, score=1.946307932)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeCycle API` connect `LifeCycle API` to `README.md`, `Основные данные и планирование (этап 3)`?**
  _High betweenness centrality (0.339) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `pomodoro()` connect `auth_smoke.py` to `LifeCycle API`?**
  _High betweenness centrality (0.319) - this node is a cross-community bridge._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.13033313851548803 - nodes in this community are weakly interconnected._
- **Why does `Аналитика и удаление (этап 7)` connect `LifeCycle API` to `auth_smoke.py`?**
  _High betweenness centrality (0.319) - this node is a cross-community bridge._
- **Should `react` be split into smaller, more focused modules?**
  _Cohesion score 0.1241565452091768 - nodes in this community are weakly interconnected._