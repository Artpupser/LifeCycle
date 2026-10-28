# Graph Report - LifeCycle  (2026-10-28)

## Corpus Check
- 103 files · ~44,082 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 1045 nodes · 3011 edges · 54 communities (45 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 15 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7976ea3f`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- mail.rs
- login-page.tsx
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
- error.rs
- health/api.ts
- AppState
- crypto.rs
- domain.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- schedule.rs
- ProfileEditor
- media.rs
- habits.rs
- README.md
- depends_on
- Основные данные и планирование (этап 3)
- Прогресс LifeCycle
- LifeCycle API
- pomodoro.rs
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- Config
- main.rs
- csrf.rs
- backend
- LifeCycle

## God Nodes (most connected - your core abstractions)
1. `AppState` - 100 edges
2. `CurrentUser` - 60 edges
3. `Button()` - 54 edges
4. `api()` - 49 edges
5. `errorMessage()` - 39 edges
6. `react` - 34 edges
7. `Input()` - 32 edges
8. `useResource()` - 32 edges
9. `ErrorState()` - 31 edges
10. `FormField()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Привычки и напоминания (этап 4)` --references--> `Schedule`  [INFERRED]
  backend/README.md → frontend/src/features/planning/types.ts
- `run()` --calls--> `router()`  [INFERRED]
  backend/src/main.rs → backend/src/lib.rs
- `render()` --indirect_call--> `Markdown()`  [INFERRED]
  frontend/src/components/markdown.test.ts → frontend/src/components/markdown.tsx
- `archive()` --references--> `CurrentUser`  [EXTRACTED]
  backend/src/habits.rs → backend/src/auth.rs
- `create()` --references--> `CurrentUser`  [EXTRACTED]
  backend/src/habits.rs → backend/src/auth.rs

## Import Cycles
- None detected.

## Communities (54 total, 9 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "mail.rs"
Cohesion: 0.15
Nodes (3): send_code(), transport(), unavailable()

### Community 3 - "login-page.tsx"
Cohesion: 0.05
Nodes (151): App(), AppContent(), AuthenticatedApp(), NotFound(), Shell(), logout(), Dialog(), FormField() (+143 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.12
Nodes (29): Client, email_address(), main(), origin_url(), read_code(), request_code(), require(), run() (+21 more)

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
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, vitest@^5.0.5, @tailwindcss/vite, @vitejs/plugin-react, vitest

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

### Community 26 - "error.rs"
Cohesion: 0.08
Nodes (12): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found(), bounded(), check_status(), Checks (+4 more)

### Community 27 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 28 - "AppState"
Cohesion: 0.06
Nodes (57): authenticate(), client_address(), code_hash(), CurrentUser, EmailRequest, identifier(), keyed_hash(), logout() (+49 more)

### Community 29 - "crypto.rs"
Cohesion: 0.12
Nodes (8): DataCipher, encryption_binds_data_to_its_owner_and_detects_tampering(), Profile, profile_accepts_optional_fields_without_gender_inference(), profile_rejects_future_birthdates_and_impossible_measurements(), read(), routes(), update()

### Community 30 - "domain.rs"
Cohesion: 0.24
Nodes (9): color(), conflict(), event(), local_today(), not_found(), Search, settings(), tags() (+1 more)

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

### Community 36 - "schedule.rs"
Cohesion: 0.12
Nodes (12): date(), deserialize(), intervals_count_calendar_days_across_dst_without_drifting(), invalid_rules_and_unbounded_queries_are_rejected(), missing_calendar_day_is_resolved_without_panicking(), nonexistent_time_moves_to_next_valid_minute(), repeated_time_chooses_earliest_instant(), Schedule (+4 more)

### Community 37 - "ProfileEditor"
Cohesion: 0.29
Nodes (6): MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profile

### Community 38 - "media.rs"
Cohesion: 0.19
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (40): archive(), create(), current_untimed_pending_does_not_break_a_completed_streak(), dismiss(), fixture(), foreign_or_duplicate_children_are_rejected(), HabitConfig, HabitInput (+32 more)

### Community 40 - "README.md"
Cohesion: 0.29
Nodes (3): LifeCycle frontend, Основные данные (этап 3), Привычки (этап 4)

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "Основные данные и планирование (этап 3)"
Cohesion: 0.33
Nodes (6): Countdown и Pomodoro, Today, календарь и история, Задачи, подзадачи и расписания, Заметки и папки, Основные данные и планирование (этап 3), Приватные изображения

### Community 43 - "Прогресс LifeCycle"
Cohesion: 0.22
Nodes (9): Восстановление и этап 4 — 28 октября 2026, Восстановление этапа 3 — 27 октября 2026, Итог этапа 3, Принятые решения, Проверки окружения, Прогресс LifeCycle, Результаты, Фактически выполненные проверки (+1 more)

### Community 44 - "LifeCycle API"
Cohesion: 0.29
Nodes (7): HTTP контракт, LifeCycle API, Идентификация, профиль и настройки (этап 2), Команды, Конфигурация, Привычки и напоминания (этап 4), Schedule

### Community 45 - "pomodoro.rs"
Cohesion: 0.27
Nodes (6): active(), change(), routes(), Session, Start, start()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.25
Nodes (9): router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin(), liveness_is_independent_of_infrastructure_and_has_safe_headers(), mutation_without_origin_is_rejected_before_services_are_accessed(), readiness_reports_actual_connection_failures_without_credentials() (+1 more)

### Community 50 - "main.rs"
Cohesion: 0.32
Nodes (3): main(), run(), shutdown()

### Community 52 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 53 - "LifeCycle"
Cohesion: 0.50
Nodes (4): LifeCycle, Локальный запуск, Проверки, Структура

## Knowledge Gaps
- **7 isolated node(s):** `lifecycle-api`, `Pending`, `Completed`, `Skipped`, `Cancelled` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 297 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `AppState` to `mail.rs`, `media.rs`, `habits.rs`, `AppState`, `pomodoro.rs`, `foundation.rs`, `Config`, `lib.rs`, `csrf.rs`, `error.rs`, `crypto.rs`, `domain.rs`?**
  _High betweenness centrality (0.104) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Pending`, `Completed` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `ApiJson` connect `AppState` to `AppState`, `habits.rs`, `pomodoro.rs`, `error.rs`, `crypto.rs`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `mail.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.14736842105263157 - nodes in this community are weakly interconnected._
- **Why does `CurrentUser` connect `AppState` to `AppState`, `media.rs`, `habits.rs`, `pomodoro.rs`, `crypto.rs`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Should `login-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.052558584409373506 - nodes in this community are weakly interconnected._