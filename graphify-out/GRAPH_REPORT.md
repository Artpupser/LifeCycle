# Graph Report - LifeCycle  (2026-10-28)

## Corpus Check
- 133 files · ~70,852 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 1376 nodes · 4310 edges · 70 communities (60 shown, 10 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 26 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `71ad7a61`
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
- package.json
- compilerOptions
- frontend
- auth.rs
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
- super
- health/api.ts
- verify_code
- workout_sessions.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- countdowns.rs
- app.tsx
- intimacy.rs
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
- ErrorState
- main.rs
- Восстановление этапа 3 — 27 октября 2026
- backend
- workout_plan.rs
- Input
- intimacy-page.tsx
- tasks-page.tsx
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- profile/types.ts
- analytics.rs
- health.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- AppState
- Упражнения и тренировки (этап 5)
- media.rs
- analytics-page.tsx
- get
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown

## God Nodes (most connected - your core abstractions)
1. `AppState` - 139 edges
2. `CurrentUser` - 87 edges
3. `Button()` - 73 edges
4. `api()` - 69 edges
5. `errorMessage()` - 50 edges
6. `FormField()` - 47 edges
7. `Input()` - 47 edges
8. `react` - 41 edges
9. `ErrorState()` - 41 edges
10. `ApiJson` - 40 edges

## Surprising Connections (you probably didn't know these)
- `Аналитика и удаление (этап 7)` --references--> `pomodoro()`  [INFERRED]
  backend/README.md → scripts/core_smoke.py
- `Связь с привычками, Today и календарём` --references--> `HabitConfig`  [INFERRED]
  backend/README.md → frontend/src/features/habits/types.ts
- `Привычки и напоминания (этап 4)` --references--> `Schedule`  [INFERRED]
  backend/README.md → frontend/src/features/planning/types.ts
- `Библиотека и конструктор` --references--> `Exercise`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts
- `Библиотека и конструктор` --references--> `Workout`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts

## Import Cycles
- None detected.

## Communities (70 total, 10 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "mail.rs"
Cohesion: 0.36
Nodes (3): send_code(), transport(), unavailable()

### Community 3 - "habits-page.tsx"
Cohesion: 0.11
Nodes (52): Dialog(), Markdown(), MarkdownEditor(), upload(), safeMarkdownUrl(), render(), Button(), Select() (+44 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.12
Nodes (41): main(), run(), Client, email_address(), main(), origin_url(), read_code(), request_code() (+33 more)

### Community 6 - "AppState"
Cohesion: 0.13
Nodes (36): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+28 more)

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, lucide-react@^1.61.0, @radix-ui/react-slot@^1.2.0, react@^19.2.0, react-dom@^19.2.0, react-markdown@^10.1.0 (+10 more)

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
Nodes (30): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, tailwindcss@^4.1.0, @types/node@^24.0.0 (+22 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "auth.rs"
Cohesion: 0.11
Nodes (7): me(), MessageResponse, REQUEST_CODE, routes(), SESSION_SECONDS, UserResponse, VERIFY_CODE

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

### Community 27 - "health/api.ts"
Cohesion: 0.31
Nodes (8): vitest@^5.0.5, fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus, vitest

### Community 28 - "verify_code"
Cohesion: 0.17
Nodes (13): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), normalize_email() (+5 more)

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
Nodes (24): computed(), Countdown, CountdownInput, create(), delete(), list(), next_date(), read() (+16 more)

### Community 37 - "app.tsx"
Cohesion: 0.16
Nodes (24): buttonVariants, Card(), CardContent(), CardDescription(), CardHeader(), CardTitle(), AuthContext, AuthContextValue (+16 more)

### Community 38 - "intimacy.rs"
Cohesion: 0.11
Nodes (35): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+27 more)

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (46): complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), dismiss(), editable_occurrence(), fixture(), foreign_or_duplicate_children_are_rejected() (+38 more)

### Community 40 - "README.md"
Cohesion: 0.25
Nodes (4): LifeCycle, Локальный запуск, Проверки, Структура

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "Основные данные и планирование (этап 3)"
Cohesion: 0.33
Nodes (6): Countdown и Pomodoro, Today, календарь и история, Задачи, подзадачи и расписания, Заметки и папки, Основные данные и планирование (этап 3), Приватные изображения

### Community 43 - "Прогресс LifeCycle"
Cohesion: 0.12
Nodes (17): Восстановление и этап 4 — 28 октября 2026, Восстановление и этап 5 — 28 октября 2026, Восстановление и этап 6 — 28 октября 2026, Восстановление и этап 7 — 28 октября 2026, Итог этапа 4, Итог этапа 5, Итог этапа 6, Итог этапа 7 (+9 more)

### Community 44 - "LifeCycle API"
Cohesion: 0.15
Nodes (13): EntryData и время, HTTP контракт, LifeCycle API, Аналитика и удаление (этап 7), Идентификация, профиль и настройки (этап 2), Интимный журнал (этап 6), Команды, Конфигурация (+5 more)

### Community 45 - "error.rs"
Cohesion: 0.13
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.23
Nodes (9): router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin(), liveness_is_independent_of_infrastructure_and_has_safe_headers(), mutation_without_origin_is_rejected_before_services_are_accessed(), readiness_reports_actual_connection_failures_without_credentials() (+1 more)

### Community 49 - "ErrorState"
Cohesion: 0.11
Nodes (42): App(), AppContent(), AuthenticatedApp(), NotFound(), Shell(), logout(), ErrorState(), LoadingState() (+34 more)

### Community 50 - "main.rs"
Cohesion: 0.32
Nodes (3): main(), run(), shutdown()

### Community 51 - "Восстановление этапа 3 — 27 октября 2026"
Cohesion: 0.67
Nodes (3): Восстановление этапа 3 — 27 октября 2026, Итог этапа 3, Фактически выполненные проверки

### Community 52 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 53 - "workout_plan.rs"
Cohesion: 0.18
Nodes (11): Entry, Exercise, load_valid(), progress(), Progression, Round, Snapshot, snapshot_resolves_progression_rounds_rests_and_private_instructions() (+3 more)

### Community 54 - "Input"
Cohesion: 0.14
Nodes (30): Библиотека и конструктор, FormField(), Input(), OptionalBoolean(), ProfileEditor(), numberField(), textField(), update() (+22 more)

### Community 55 - "intimacy-page.tsx"
Cohesion: 0.15
Nodes (22): Textarea(), AnswerInput(), EntryEditor(), submit(), Lines(), EntryDetail(), VisibleJournal(), remove() (+14 more)

### Community 56 - "tasks-page.tsx"
Cohesion: 0.12
Nodes (32): Countdown, CountdownInput, create(), HabitMark, ScheduleEditor(), TaskEditor(), submit(), TaskGantt() (+24 more)

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "profile/types.ts"
Cohesion: 0.25
Nodes (9): submit(), draftToProfile(), MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profileToDraft() (+1 more)

### Community 59 - "analytics.rs"
Cohesion: 0.13
Nodes (21): Day, habit_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending(), HabitMetrics, percent(), Privacy, privacy(), profile_metrics() (+13 more)

### Community 60 - "health.rs"
Cohesion: 0.24
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "AppState"
Cohesion: 0.05
Nodes (64): CurrentUser, color(), conflict(), event(), local_today(), not_found(), Search, settings() (+56 more)

### Community 64 - "Упражнения и тренировки (этап 5)"
Cohesion: 0.50
Nodes (4): Выполнение и таймеры, Связь с привычками, Today и календарём, Упражнения и тренировки (этап 5), HabitConfig

### Community 65 - "media.rs"
Cohesion: 0.19
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 68 - "analytics-page.tsx"
Cohesion: 0.40
Nodes (9): DayChart(), Metrics(), minutes(), number(), percent(), ReportView(), Day, Privacy (+1 more)

### Community 71 - "LifeCycle frontend"
Cohesion: 0.33
Nodes (6): LifeCycle frontend, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Основные данные (этап 3), Привычки (этап 4), Тренировки (этап 5)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

## Knowledge Gaps
- **11 isolated node(s):** `lifecycle-api`, `Pending`, `Completed`, `Skipped`, `Cancelled` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 346 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `project_progress.md` (2× useful, score=1.999048286) _(code changed — re-verify)_
- `habits.rs` (2× useful, score=1.998606271) _(code changed — re-verify)_
- `schedule.rs` (2× useful, score=1.998606271)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeCycle API` connect `LifeCycle API` to `README.md`, `Основные данные и планирование (этап 3)`, `Упражнения и тренировки (этап 5)`?**
  _High betweenness centrality (0.357) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Pending`, `Completed` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `pomodoro()` connect `auth_smoke.py` to `LifeCycle API`?**
  _High betweenness centrality (0.336) - this node is a cross-community bridge._
- **Should `habits-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10721153846153846 - nodes in this community are weakly interconnected._
- **Why does `Аналитика и удаление (этап 7)` connect `LifeCycle API` to `auth_smoke.py`?**
  _High betweenness centrality (0.336) - this node is a cross-community bridge._
- **Should `auth_smoke.py` be split into smaller, more focused modules?**
  _Cohesion score 0.12489343563512362 - nodes in this community are weakly interconnected._