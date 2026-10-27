# Graph Report - LifeCycle  (2026-10-27)

## Corpus Check
- 94 files · ~36,397 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 943 nodes · 2510 edges · 47 communities (39 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- foundation.rs
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
- countdowns.rs
- README.md
- depends_on
- Основные данные и планирование (этап 3)
- Прогресс LifeCycle
- LifeCycle API
- pomodoro.rs
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?

## God Nodes (most connected - your core abstractions)
1. `AppState` - 84 edges
2. `CurrentUser` - 48 edges
3. `Button()` - 44 edges
4. `errorMessage()` - 39 edges
5. `api()` - 36 edges
6. `react` - 30 edges
7. `Input()` - 28 edges
8. `TasksPage()` - 27 edges
9. `useResource()` - 26 edges
10. `LoadingState()` - 25 edges

## Surprising Connections (you probably didn't know these)
- `render()` --indirect_call--> `Markdown()`  [INFERRED]
  frontend/src/components/markdown.test.ts → frontend/src/components/markdown.tsx
- `archive()` --references--> `CurrentUser`  [EXTRACTED]
  backend/src/countdowns.rs → backend/src/auth.rs
- `create()` --references--> `CurrentUser`  [EXTRACTED]
  backend/src/countdowns.rs → backend/src/auth.rs
- `list()` --references--> `CurrentUser`  [EXTRACTED]
  backend/src/countdowns.rs → backend/src/auth.rs
- `read()` --references--> `CurrentUser`  [EXTRACTED]
  backend/src/countdowns.rs → backend/src/auth.rs

## Import Cycles
- None detected.

## Communities (47 total, 8 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "foundation.rs"
Cohesion: 0.06
Nodes (17): Config, validated_url(), router(), send_code(), transport(), unavailable(), main(), run() (+9 more)

### Community 3 - "login-page.tsx"
Cohesion: 0.06
Nodes (123): App(), AppContent(), AuthenticatedApp(), NotFound(), Shell(), logout(), Dialog(), FormField() (+115 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.11
Nodes (26): Client, email_address(), main(), origin_url(), read_code(), request_code(), require(), run() (+18 more)

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
Cohesion: 0.15
Nodes (13): build, condition, networks, restart, context, backend, build, depends_on (+5 more)

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
Cohesion: 0.07
Nodes (45): authenticate(), client_address(), code_hash(), CurrentUser, EmailRequest, identifier(), keyed_hash(), logout() (+37 more)

### Community 30 - "domain.rs"
Cohesion: 0.13
Nodes (15): color(), conflict(), event(), local_today(), not_found(), Search, settings(), tags() (+7 more)

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
Cohesion: 0.25
Nodes (9): submit(), draftToProfile(), MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profileToDraft() (+1 more)

### Community 38 - "media.rs"
Cohesion: 0.09
Nodes (7): guard(), download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 39 - "countdowns.rs"
Cohesion: 0.29
Nodes (12): archive(), computed(), Countdown, CountdownInput, create(), list(), next_date(), read() (+4 more)

### Community 40 - "README.md"
Cohesion: 0.20
Nodes (6): LifeCycle frontend, Основные данные (этап 3), LifeCycle, Локальный запуск, Проверки, Структура

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "Основные данные и планирование (этап 3)"
Cohesion: 0.33
Nodes (6): Countdown и Pomodoro, Today, календарь и история, Задачи, подзадачи и расписания, Заметки и папки, Основные данные и планирование (этап 3), Приватные изображения

### Community 43 - "Прогресс LifeCycle"
Cohesion: 0.25
Nodes (8): Восстановление этапа 3 — 27 октября 2026, Итог этапа 3, Принятые решения, Проверки окружения, Прогресс LifeCycle, Результаты, Фактически выполненные проверки, Этапы

### Community 44 - "LifeCycle API"
Cohesion: 0.40
Nodes (5): HTTP контракт, LifeCycle API, Идентификация, профиль и настройки (этап 2), Команды, Конфигурация

### Community 45 - "pomodoro.rs"
Cohesion: 0.25
Nodes (6): active(), change(), routes(), Session, Start, start()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

## Knowledge Gaps
- **3 isolated node(s):** `lifecycle-api`, `AST graph update`, `Wiki navigation`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 286 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `AppState` to `foundation.rs`, `media.rs`, `countdowns.rs`, `AppState`, `pomodoro.rs`, `error.rs`, `crypto.rs`, `domain.rs`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `AST graph update`, `Wiki navigation` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `ApiJson` connect `AppState` to `AppState`, `countdowns.rs`, `pomodoro.rs`, `error.rs`, `domain.rs`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Should `foundation.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.06009783368273934 - nodes in this community are weakly interconnected._
- **Why does `react` connect `login-page.tsx` to `package.json`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Should `login-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05990752073983408 - nodes in this community are weakly interconnected._