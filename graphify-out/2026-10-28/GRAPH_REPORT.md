# Graph Report - LifeCycle  (2026-10-28)

## Corpus Check
- 116 files · ~55,339 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 1194 nodes · 3661 edges · 61 communities (53 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 20 edges (avg confidence: 0.89)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `cd8f9d36`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- mail.rs
- habits-page.tsx
- services
- auth_smoke.py
- AppState
- environment
- package.json
- compilerOptions
- redis
- components.json
- devDependencies
- compilerOptions
- frontend
- eslint.config.js
- vite.config.ts
- scripts
- setup_env.py
- engines
- allowBuilds
- tsconfig.json
- ideas.md
- plugins.md
- lifecycle-api
- prompts.md
- health.rs
- health/api.ts
- AppState
- auth.rs
- workout_sessions.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- countdowns.rs
- app.tsx
- media.rs
- habits.rs
- README.md
- depends_on
- Основные данные и планирование (этап 3)
- Прогресс LifeCycle
- LifeCycle API
- error.rs
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- Config
- app.tsx
- main.rs
- Button
- backend
- workout_plan.rs
- Input
- lib.rs
- tasks-page.tsx
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- profile/types.ts
- Упражнения и тренировки (этап 5)
- LifeCycle frontend

## God Nodes (most connected - your core abstractions)
1. `AppState` - 121 edges
2. `CurrentUser` - 77 edges
3. `Button()` - 64 edges
4. `api()` - 60 edges
5. `Input()` - 41 edges
6. `errorMessage()` - 41 edges
7. `FormField()` - 39 edges
8. `react` - 38 edges
9. `ErrorState()` - 37 edges
10. `useResource()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `Библиотека и конструктор` --references--> `Exercise`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts
- `Библиотека и конструктор` --references--> `Workout`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts
- `Связь с привычками, Today и календарём` --references--> `HabitConfig`  [INFERRED]
  backend/README.md → frontend/src/features/habits/types.ts
- `Привычки и напоминания (этап 4)` --references--> `Schedule`  [INFERRED]
  backend/README.md → frontend/src/features/planning/types.ts
- `run()` --calls--> `router()`  [INFERRED]
  backend/src/main.rs → backend/src/lib.rs

## Import Cycles
- None detected.

## Communities (61 total, 8 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "mail.rs"
Cohesion: 0.15
Nodes (3): send_code(), transport(), unavailable()

### Community 3 - "habits-page.tsx"
Cohesion: 0.15
Nodes (22): HabitControls(), save(), MarkEditor(), submit(), submit(), statisticsLabels, emptyMark(), Habit (+14 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.12
Nodes (35): Client, email_address(), main(), origin_url(), read_code(), request_code(), require(), run() (+27 more)

### Community 6 - "AppState"
Cohesion: 0.13
Nodes (36): archive(), calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules() (+28 more)

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

### Community 12 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint@^10.13.0, tailwindcss@^4.1.0, @types/node@^24.0.0, @types/react@^19.2.0, @types/react-dom@^19.2.0, typescript@^5.9.0, vite@^8.3.5 (+7 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "eslint.config.js"
Cohesion: 0.18
Nodes (10): @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, typescript-eslint@^8.48.0, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+2 more)

### Community 16 - "vite.config.ts"
Cohesion: 0.33
Nodes (4): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, @tailwindcss/vite, @vitejs/plugin-react

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 22 - "ideas.md"
Cohesion: 0.50
Nodes (3): Для AI, Список идей, Что уже есть?

### Community 25 - "prompts.md"
Cohesion: 0.50
Nodes (3): 1. Восстановление контекста, 2. Продолжение разработки, 3. Сохранение прогресса

### Community 26 - "health.rs"
Cohesion: 0.27
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

### Community 27 - "health/api.ts"
Cohesion: 0.31
Nodes (8): vitest@^5.0.5, fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus, vitest

### Community 28 - "AppState"
Cohesion: 0.06
Nodes (63): CurrentUser, color(), conflict(), event(), local_today(), not_found(), Search, settings() (+55 more)

### Community 29 - "auth.rs"
Cohesion: 0.07
Nodes (22): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+14 more)

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

### Community 36 - "countdowns.rs"
Cohesion: 0.09
Nodes (24): archive(), computed(), Countdown, CountdownInput, create(), list(), next_date(), read() (+16 more)

### Community 37 - "app.tsx"
Cohesion: 0.13
Nodes (30): App(), AppContent(), NotFound(), Shell(), Card(), CardContent(), CardDescription(), CardHeader() (+22 more)

### Community 38 - "media.rs"
Cohesion: 0.21
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (43): archive(), complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), dismiss(), fixture(), foreign_or_duplicate_children_are_rejected(), HabitConfig (+35 more)

### Community 40 - "README.md"
Cohesion: 0.29
Nodes (4): LifeCycle, Локальный запуск, Проверки, Структура

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "Основные данные и планирование (этап 3)"
Cohesion: 0.33
Nodes (6): Countdown и Pomodoro, Today, календарь и история, Задачи, подзадачи и расписания, Заметки и папки, Основные данные и планирование (этап 3), Приватные изображения

### Community 43 - "Прогресс LifeCycle"
Cohesion: 0.17
Nodes (12): Восстановление и этап 4 — 28 октября 2026, Восстановление и этап 5 — 28 октября 2026, Восстановление этапа 3 — 27 октября 2026, Итог этапа 3, Итог этапа 4, Принятые решения, Проверки окружения, Прогресс LifeCycle (+4 more)

### Community 44 - "LifeCycle API"
Cohesion: 0.29
Nodes (7): HTTP контракт, LifeCycle API, Идентификация, профиль и настройки (этап 2), Команды, Конфигурация, Привычки и напоминания (этап 4), Schedule

### Community 45 - "error.rs"
Cohesion: 0.13
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.23
Nodes (9): router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin(), liveness_is_independent_of_infrastructure_and_has_safe_headers(), mutation_without_origin_is_rejected_before_services_are_accessed(), readiness_reports_actual_connection_failures_without_credentials() (+1 more)

### Community 49 - "app.tsx"
Cohesion: 0.16
Nodes (33): AuthenticatedApp(), ErrorState(), LoadingState(), Countdown, CountdownInput, CountdownsPage(), icons, Remaining() (+25 more)

### Community 50 - "main.rs"
Cohesion: 0.32
Nodes (3): main(), run(), shutdown()

### Community 51 - "Button"
Cohesion: 0.14
Nodes (31): logout(), Dialog(), Button(), buttonVariants, requestCode(), submit(), Countdown, CountdownEditor() (+23 more)

### Community 52 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 53 - "workout_plan.rs"
Cohesion: 0.18
Nodes (11): Entry, Exercise, load_valid(), progress(), Progression, Round, Snapshot, snapshot_resolves_progression_rounds_rests_and_private_instructions() (+3 more)

### Community 54 - "Input"
Cohesion: 0.11
Nodes (45): FormField(), Markdown(), MarkdownEditor(), upload(), safeMarkdownUrl(), render(), Input(), Select() (+37 more)

### Community 56 - "tasks-page.tsx"
Cohesion: 0.23
Nodes (16): create(), TaskEditor(), TasksPage(), changeStatus(), refreshed(), remove(), renderTask(), DayPlan (+8 more)

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "profile/types.ts"
Cohesion: 0.25
Nodes (9): submit(), draftToProfile(), MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profileToDraft() (+1 more)

### Community 59 - "Упражнения и тренировки (этап 5)"
Cohesion: 0.40
Nodes (5): Библиотека и конструктор, Выполнение и таймеры, Связь с привычками, Today и календарём, Упражнения и тренировки (этап 5), HabitConfig

### Community 60 - "LifeCycle frontend"
Cohesion: 0.40
Nodes (4): LifeCycle frontend, Основные данные (этап 3), Привычки (этап 4), Тренировки (этап 5)

## Knowledge Gaps
- **7 isolated node(s):** `lifecycle-api`, `Pending`, `Completed`, `Skipped`, `Cancelled` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 312 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `AppState` to `mail.rs`, `countdowns.rs`, `media.rs`, `habits.rs`, `AppState`, `foundation.rs`, `Config`, `lib.rs`, `health.rs`, `auth.rs`, `workout_sessions.rs`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Pending`, `Completed` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `ApiJson` connect `AppState` to `countdowns.rs`, `AppState`, `habits.rs`, `error.rs`, `auth.rs`, `workout_sessions.rs`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Should `mail.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Why does `LifeCycle API` connect `LifeCycle API` to `README.md`, `Основные данные и планирование (этап 3)`, `Упражнения и тренировки (этап 5)`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Should `auth_smoke.py` be split into smaller, more focused modules?**
  _Cohesion score 0.1180327868852459 - nodes in this community are weakly interconnected._