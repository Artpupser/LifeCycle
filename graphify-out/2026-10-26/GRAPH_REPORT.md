# Graph Report - LifeCycle  (2026-10-26)

## Corpus Check
- 63 files · ~16,904 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 617 nodes · 1154 edges · 36 communities (27 shown, 9 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- foundation.rs
- login-page.tsx
- services
- auth_smoke.py
- auth.rs
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
- error.rs
- health/api.ts
- mail.rs
- crypto.rs
- health.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test

## God Nodes (most connected - your core abstractions)
1. `AppState` - 36 edges
2. `environment` - 20 edges
3. `errorMessage()` - 18 edges
4. `react` - 17 edges
5. `ProfileEditor()` - 17 edges
6. `compilerOptions` - 17 edges
7. `verify_code()` - 16 edges
8. `LoginPage()` - 16 edges
9. `SettingsPage()` - 16 edges
10. `request_code()` - 15 edges

## Surprising Connections (you probably didn't know these)
- `AppState` --references--> `Config`  [EXTRACTED]
  backend/src/state.rs → backend/src/config.rs
- `AppState` --references--> `DataCipher`  [EXTRACTED]
  backend/src/state.rs → backend/src/crypto.rs
- `guard()` --references--> `AppState`  [EXTRACTED]
  backend/src/csrf.rs → backend/src/state.rs
- `ready()` --references--> `AppState`  [EXTRACTED]
  backend/src/health.rs → backend/src/state.rs
- `router()` --references--> `AppState`  [EXTRACTED]
  backend/src/lib.rs → backend/src/state.rs

## Import Cycles
- None detected.

## Communities (36 total, 9 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.05
Nodes (38): HTTP контракт, LifeCycle API, Идентификация, профиль и настройки (этап 2), Команды, Конфигурация, LifeCycle frontend, Принятые решения, Проверки окружения (+30 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "foundation.rs"
Cohesion: 0.08
Nodes (13): guard(), router(), main(), run(), shutdown(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials() (+5 more)

### Community 3 - "login-page.tsx"
Cohesion: 0.08
Nodes (63): App(), AppContent(), AuthenticatedApp(), NotFound(), Shell(), logout(), FormField(), ErrorState() (+55 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.14
Nodes (12): Client, email_address(), main(), origin_url(), read_code(), request_code(), require(), run() (+4 more)

### Community 6 - "auth.rs"
Cohesion: 0.05
Nodes (34): authenticate(), client_address(), code_hash(), CurrentUser, EmailRequest, identifier(), keyed_hash(), logout() (+26 more)

### Community 7 - "environment"
Cohesion: 0.06
Nodes (32): depends_on, environment, networks, restart, garage, mailpit, postgres, redis (+24 more)

### Community 8 - "package.json"
Cohesion: 0.12
Nodes (20): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, lucide-react@^1.61.0, @radix-ui/react-slot@^1.2.0, react@^19.2.0, react-dom@^19.2.0, react-router@^7.18.4 (+12 more)

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
Cohesion: 0.20
Nodes (10): build, condition, context, backend, build, depends_on, networks, ports (+2 more)

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

### Community 26 - "error.rs"
Cohesion: 0.13
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 27 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 28 - "mail.rs"
Cohesion: 0.15
Nodes (5): Config, validated_url(), send_code(), transport(), unavailable()

### Community 30 - "health.rs"
Cohesion: 0.27
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

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

## Knowledge Gaps
- **3 isolated node(s):** `lifecycle-api`, `AST graph update`, `Wiki navigation`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 243 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `auth.rs` to `foundation.rs`, `mail.rs`, `crypto.rs`, `health.rs`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `AST graph update`, `Wiki navigation` to the rest of the system?**
  _3 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
- **Why does `services` connect `services` to `mailpit`, `postgres`, `redis`, `environment`, `frontend`, `garage`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `foundation.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.07560975609756097 - nodes in this community are weakly interconnected._
- **Why does `react` connect `login-page.tsx` to `package.json`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Should `login-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08248212461695607 - nodes in this community are weakly interconnected._