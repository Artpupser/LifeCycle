# Graph Report - LifeCycle  (2026-11-01)

## Corpus Check
- 202 files · ~125,694 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 2068 nodes · 6941 edges · 87 communities (76 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 35 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5fb402ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- AppState
- CurrentUser
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
- habits-page.tsx
- scripts
- Button
- engines
- allowBuilds
- tsconfig.json
- ideas.md
- plugins.md
- lifecycle-api
- Правки
- ai_provider.rs
- health/api.ts
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
- Основные данные и планирование (этап 3)
- Реализация по модулям
- LifeCycle API
- useResource
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- action-journal.tsx
- ApiJson
- ai_actions.rs
- Q: Stage 8 AI recovery and provider authentication
- backend
- task-gantt.tsx
- workout_plan.rs
- mutate
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
- task_tags.rs
- Упражнения и тренировки (этап 5)
- config.rs
- analytics-page.tsx
- pomodoro.rs
- AppState
- super
- workout_preferences.rs
- deserialize
- Правки AI после приёмки 1.1–1.3 — завершены (31.10.2026)
- Upgrade v1 — восстановление и этапы 1.1–1.3 (31.10.2026)

## God Nodes (most connected - your core abstractions)
1. `AppState` - 227 edges
2. `CurrentUser` - 141 edges
3. `Button()` - 106 edges
4. `api()` - 96 edges
5. `errorMessage()` - 82 edges
6. `ApiJson` - 76 edges
7. `Input()` - 65 edges
8. `useResource()` - 63 edges
9. `FormField()` - 60 edges
10. `ErrorState()` - 59 edges

## Surprising Connections (you probably didn't know these)
- `Привычки и напоминания (этап 4)` --references--> `Schedule`  [INFERRED]
  backend/README.md → frontend/src/features/planning/types.ts
- `Библиотека и конструктор` --references--> `Exercise`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts
- `Библиотека и конструктор` --references--> `Workout`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts
- `Аналитика и удаление (этап 7)` --references--> `pomodoro()`  [INFERRED]
  backend/README.md → scripts/core_smoke.py
- `Связь с привычками, Today и календарём` --references--> `HabitConfig`  [INFERRED]
  backend/README.md → frontend/src/features/habits/types.ts

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (87 total, 11 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.13
Nodes (40): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+32 more)

### Community 3 - "CurrentUser"
Cohesion: 0.24
Nodes (21): CurrentUser, create_folder(), create_note(), delete_folder(), delete_note(), delete_note_in(), Folder, folder() (+13 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.05
Nodes (67): main(), NoRedirect, raw(), run(), run(), send(), run(), save() (+59 more)

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

### Community 16 - "habits-page.tsx"
Cohesion: 0.08
Nodes (56): Markdown(), MarkdownEditor(), upload(), safeMarkdownUrl(), render(), HabitControls(), save(), MarkEditor() (+48 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "Button"
Cohesion: 0.06
Nodes (75): AiVisibility(), change(), Dialog(), Button(), buttonVariants, Input(), remove(), ChatPanel() (+67 more)

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 22 - "ideas.md"
Cohesion: 0.22
Nodes (8): Анализ приложения, Для AI, Заметки, Правки, Проблемы, Список идей, Улучшения, Что уже есть?

### Community 25 - "Правки"
Cohesion: 0.18
Nodes (10): 1. Восстановление контекста, 1. Восстановление контекста, 1. Восстановление контекста, 2. Продолжение разработки, 2. Продолжение разработки, 2. Продолжение разработки, 3. Сохранение прогресса, 3. Сохранение прогресса (+2 more)

### Community 26 - "ai_provider.rs"
Cohesion: 0.08
Nodes (27): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+19 more)

### Community 27 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 28 - "verify_code"
Cohesion: 0.10
Nodes (20): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+12 more)

### Community 29 - "countdowns.rs"
Cohesion: 0.09
Nodes (24): computed(), Countdown, CountdownInput, create(), delete(), list(), next_date(), read() (+16 more)

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
Cohesion: 0.10
Nodes (42): App(), AppContent(), AuthenticatedApp(), LegacyBoards(), NotFound(), Shell(), logout(), AiAccess (+34 more)

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

### Community 42 - "Основные данные и планирование (этап 3)"
Cohesion: 0.33
Nodes (6): Countdown и Pomodoro, Today, календарь и история, Задачи, подзадачи и расписания, Заметки и папки, Основные данные и планирование (этап 3), Приватные изображения

### Community 43 - "Реализация по модулям"
Cohesion: 0.20
Nodes (10): Исправление входа после этапа 9 — 30.10.2026, Реализация по модулям, Этап 3: основные данные, Этап 4: привычки, Этап 5: тренировки, Этап 6: интимный журнал, Этап 7: аналитика и физическое удаление, Этап 8: AI (окончательно принят 29.10.2026) (+2 more)

### Community 44 - "LifeCycle API"
Cohesion: 0.11
Nodes (18): AI и подключения, EntryData и время, HTTP контракт, LifeCycle API, Upgrade v1: AI actions и последующие правки AI, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Идентификация, профиль и настройки (этап 2) (+10 more)

### Community 45 - "useResource"
Cohesion: 0.10
Nodes (48): ErrorState(), LoadingState(), ActionJournal(), AiPage(), Workspace(), AiSettings(), CountdownPage(), FocusPage() (+40 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.14
Nodes (12): router(), main(), run(), shutdown(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin() (+4 more)

### Community 48 - "action-journal.tsx"
Cohesion: 0.11
Nodes (31): ActionReview(), command(), edit(), ChangeView(), entityLabels, labels, parseActions(), refreshActions() (+23 more)

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
Nodes (48): DateTimeInput(), presets(), changedInterval(), dayStart(), PlanningFields(), update(), ScheduleEditor(), update() (+40 more)

### Community 54 - "workout_plan.rs"
Cohesion: 0.19
Nodes (11): Entry, Exercise, load_valid(), progress(), Progression, Round, Snapshot, snapshot_resolves_progression_rounds_rests_and_private_instructions() (+3 more)

### Community 55 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 56 - "vitest"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, vitest@^5.0.5, @tailwindcss/vite, @vitejs/plugin-react, vitest

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "intimacy-page.tsx"
Cohesion: 0.16
Nodes (26): FormField(), Select(), AnswerInput(), EntryEditor(), Lines(), EntryDetail(), VisibleJournal(), AnswersRow() (+18 more)

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
Cohesion: 0.13
Nodes (15): LifeCycle — прогресс (сжатый журнал), Upgrade v1 — этап 1.4 завершён (31.10.2026), Upgrade v1 — этап 1.5 завершён (31.10.2026), UX-правки задач, досок и общей навигации — завершены (31.10.2026), Архитектура и общие правила, Итоговая приёмка и текущие ограничения, Приёмка, Приёмка и сохранность (+7 more)

### Community 65 - "media.rs"
Cohesion: 0.19
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "ai_access.rs"
Cohesion: 0.10
Nodes (18): Access, BulkAccess, BulkInput, BulkItem, change(), exercise(), exercise_visible(), Input (+10 more)

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
Cohesion: 0.15
Nodes (13): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, UX-правки задач, досок и навигации (31.10.2026), Аналитика и удаление (этап 7), Быстрые задачи и планирование — 01.11.2026, Интимный журнал (этап 6), Какие записи видит AI (+5 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 75 - "profile/types.ts"
Cohesion: 0.25
Nodes (9): submit(), draftToProfile(), MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profileToDraft() (+1 more)

### Community 76 - "task_tags.rs"
Cohesion: 0.29
Nodes (11): create(), list(), locked(), Name, register(), remove(), Revision, routes() (+3 more)

### Community 77 - "Упражнения и тренировки (этап 5)"
Cohesion: 0.40
Nodes (5): Библиотека и конструктор, Выполнение и таймеры, Связь с привычками, Today и календарём, Упражнения и тренировки (этап 5), HabitConfig

### Community 79 - "analytics-page.tsx"
Cohesion: 0.40
Nodes (9): DayChart(), Metrics(), minutes(), number(), percent(), ReportView(), Day, Privacy (+1 more)

### Community 80 - "pomodoro.rs"
Cohesion: 0.27
Nodes (6): active(), change(), routes(), Session, Start, start()

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

## Knowledge Gaps
- **17 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+12 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 527 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
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

- **Why does `LifeCycle API` connect `LifeCycle API` to `README.md`, `Основные данные и планирование (этап 3)`, `Упражнения и тренировки (этап 5)`?**
  _High betweenness centrality (0.389) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _17 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `Аналитика и удаление (этап 7)` connect `LifeCycle API` to `auth_smoke.py`?**
  _High betweenness centrality (0.361) - this node is a cross-community bridge._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.13033313851548803 - nodes in this community are weakly interconnected._
- **Why does `pomodoro()` connect `auth_smoke.py` to `LifeCycle API`?**
  _High betweenness centrality (0.361) - this node is a cross-community bridge._
- **Should `auth_smoke.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05394426074633916 - nodes in this community are weakly interconnected._