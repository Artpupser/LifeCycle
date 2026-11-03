# Graph Report - LifeCycle  (2026-11-03)

## Corpus Check
- 307 files · ~185,265 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: (none) 9, .css 2, .example 1)

## Summary
- 2724 nodes · 10465 edges · 104 communities (93 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 104 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d5e323d2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mutate
- Graphify Project Navigation
- AppState
- t
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
- service.rs
- scripts
- useResource
- engines
- allowBuilds
- tsconfig.json
- profile/types.ts
- icons.tsx
- lifecycle-api
- locale.ts
- pomodoro_programs.rs
- workouts-page.tsx
- verify_code
- countdowns.rs
- workout_sessions.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- Frontend
- schedule.rs
- intimacy.rs
- habits.rs
- depends_on
- ai_access.rs
- AppState
- CurrentUser
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- pomodoro.rs
- ApiJson
- ai_actions.rs
- Q: Stage 8 AI recovery and provider authentication
- backend
- usePreferences
- holidays.ts
- catalog.ts
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- analytics.rs
- login-page.tsx
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- phone.test.ts
- media.rs
- profile.rs
- Input
- Q: Stage 9 final integration of LifeCycle after stage 8
- origin_url
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- health/api.ts
- settings/types.ts
- ai_provider.rs
- require
- config.rs
- surfaces.tsx
- auth_smoke.py
- navigation.rs
- import.ts
- media.ts
- deserialize
- ai.spec.ts
- effect-provider.tsx
- task_tags.rs
- csrf.rs
- Client
- mail.rs
- AppState
- countdowns-page.tsx
- preferences-provider.tsx
- app.tsx
- LICENSES.md
- ai_connections_smoke.py
- workouts_smoke.py
- sounds.ts
- auth-provider.tsx
- DateTimeInput
- workout_preferences.rs
- SOURCES.md

## God Nodes (most connected - your core abstractions)
1. `AppState` - 275 edges
2. `t()` - 264 edges
3. `useLanguage()` - 192 edges
4. `CurrentUser` - 161 edges
5. `Button()` - 140 edges
6. `api()` - 113 edges
7. `AppIcon()` - 108 edges
8. `errorMessage()` - 107 edges
9. `ApiJson` - 91 edges
10. `react` - 82 edges

## Surprising Connections (you probably didn't know these)
- `Применение frontend/AGENTS.md — 02.11.2026` --references--> `FeedbackProvider()`  [INFERRED]
  frontend/README.md → frontend/src/components/feedback-provider.tsx
- `Праздники` --references--> `FilterSearch()`  [INFERRED]
  frontend/README.md → frontend/src/components/filter-search.tsx
- `Применение frontend/AGENTS.md — 02.11.2026` --references--> `FilterSearch()`  [INFERRED]
  frontend/README.md → frontend/src/components/filter-search.tsx
- `Переиспользование` --references--> `Markdown()`  [INFERRED]
  frontend/README.md → frontend/src/components/markdown.tsx
- `Переиспользование` --references--> `notify()`  [INFERRED]
  frontend/README.md → frontend/src/lib/feedback.ts

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (104 total, 11 thin omitted)

### Community 0 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.12
Nodes (41): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+33 more)

### Community 3 - "t"
Cohesion: 0.07
Nodes (53): Plus(), copy(), save(), exportContacts(), Labels(), change(), CountdownsPage(), refresh() (+45 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.13
Nodes (11): main(), assistant(), run(), seal(), training(), run(), main(), ready() (+3 more)

### Community 6 - "AppState"
Cohesion: 0.12
Nodes (44): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+36 more)

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.07
Nodes (38): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, date-holidays@^3.38.0, @foleyjs/core@^2.9.0, @foleyjs/react@^2.9.0, @iconify-json/circle-flags@^1.2.14, @iconify-json/simple-icons@^1.2.101 (+30 more)

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
Cohesion: 0.07
Nodes (29): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, motion-ai@^14.2.0, @playwright/test@^1.64.1 (+21 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, module, moduleResolution, noEmit, paths (+7 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (41): access(), Account, account(), account_context(), accounts(), AttemptQuery, authorization_url(), authorize() (+33 more)

### Community 16 - "service.rs"
Cohesion: 0.06
Nodes (36): Contact, ContactData, DeleteEvents, Delete, Keep, duplicate(), LabelKind, Categories (+28 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "useResource"
Cohesion: 0.07
Nodes (65): ActionJournal(), ActionReview(), command(), edit(), ChangeView(), entityLabels, labels, parseActions() (+57 more)

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 20 - "allowBuilds"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, @tsparticles/engine

### Community 22 - "profile/types.ts"
Cohesion: 0.16
Nodes (15): submit(), draftToProfile(), emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey (+7 more)

### Community 23 - "icons.tsx"
Cohesion: 0.08
Nodes (50): Activity(), AlertTriangle(), ArrowDown(), ArrowUp(), BarChart3(), BookUser(), Cake(), CalendarClock() (+42 more)

### Community 25 - "locale.ts"
Cohesion: 0.10
Nodes (53): LoaderCircle(), RefreshCw(), ShieldCheck(), ErrorState(), LoadingState(), buttonVariants, AiSettings(), AnalyticsPage() (+45 more)

### Community 26 - "pomodoro_programs.rs"
Cohesion: 0.14
Nodes (27): Action, Anchor, boundaries_cycles_and_long_suspension_are_arithmetic(), change(), Config, ConfigInput, create(), delete() (+19 more)

### Community 27 - "workouts-page.tsx"
Cohesion: 0.08
Nodes (48): GripVertical(), MoreHorizontal(), Pencil(), Trash2(), Markdown(), render(), Item, Navigation (+40 more)

### Community 28 - "verify_code"
Cohesion: 0.10
Nodes (20): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+12 more)

### Community 29 - "countdowns.rs"
Cohesion: 0.05
Nodes (47): at_index(), clamped(), computed(), ContactBinding, Birthday, Independent, Linked, index_near() (+39 more)

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

### Community 36 - "Frontend"
Cohesion: 0.29
Nodes (6): Before finishing, Centralized systems (mandatory), Frontend, New centralized systems, Shared holidays, animation and effects, UI principles

### Community 37 - "schedule.rs"
Cohesion: 0.05
Nodes (25): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found(), bounded(), check_status(), Checks (+17 more)

### Community 38 - "intimacy.rs"
Cohesion: 0.11
Nodes (35): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+27 more)

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (48): complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), delete_history(), DeleteHistory, dismiss(), editable_occurrence() (+40 more)

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "ai_access.rs"
Cohesion: 0.30
Nodes (13): Access, BulkAccess, BulkInput, BulkItem, change(), exercise(), exercise_visible(), Input (+5 more)

### Community 44 - "AppState"
Cohesion: 0.31
Nodes (10): CurrentUser, Imported, create(), delete(), import(), labels(), list(), read() (+2 more)

### Community 45 - "CurrentUser"
Cohesion: 0.28
Nodes (7): create(), delete(), list(), read(), routes(), unlink(), update()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.14
Nodes (12): router(), main(), run(), shutdown(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin() (+4 more)

### Community 48 - "pomodoro.rs"
Cohesion: 0.24
Nodes (6): active(), change(), routes(), Session, Start, start()

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

### Community 53 - "usePreferences"
Cohesion: 0.06
Nodes (93): ChevronLeft(), ChevronRight(), HabitDetail(), habitFilters, HabitsPage(), create(), habitTime(), statisticsLabels (+85 more)

### Community 54 - "holidays.ts"
Cohesion: 0.14
Nodes (23): Праздники, FilterQuery, buildHolidayYear(), holidayIdentity(), sharedNames, holidayFilters, holidayOccurrences(), kindAliases (+15 more)

### Community 55 - "catalog.ts"
Cohesion: 0.08
Nodes (22): @iconify/react@^6.0.4, available, brandBody, catalogVersion(), data, iconCatalog, iconData(), IconEntry (+14 more)

### Community 56 - "vitest"
Cohesion: 0.20
Nodes (5): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, root, @tailwindcss/vite, @vitejs/plugin-react

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "CurrentUser"
Cohesion: 0.16
Nodes (29): bulk(), BulkAction, Color, Delete, Move, TagsAdd, TagsRemove, BulkItem (+21 more)

### Community 59 - "analytics.rs"
Cohesion: 0.09
Nodes (26): build(), clip(), validate_range(), ai_report(), build_report(), Day, habit_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending() (+18 more)

### Community 60 - "login-page.tsx"
Cohesion: 0.17
Nodes (23): ArrowLeft(), ArrowRight(), Check(), CircleAlert(), Database(), HardDrive(), Mail(), Server() (+15 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "workouts.rs"
Cohesion: 0.13
Nodes (30): color(), conflict(), event(), local_today(), not_found(), Search, settings(), tags() (+22 more)

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "phone.test.ts"
Cohesion: 0.90
Nodes (3): formatPhone(), parsePhone(), possiblePhone()

### Community 65 - "media.rs"
Cohesion: 0.21
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "profile.rs"
Cohesion: 0.19
Nodes (15): decode(), Firsts, HabitPeriod, HarmfulHabit, historical_years_and_habit_periods_validate_without_inventing_unknowns(), load(), merge(), Origin (+7 more)

### Community 67 - "Input"
Cohesion: 0.10
Nodes (73): Переиспользование, AiAccess, AiVisibility(), change(), Dialog(), FeedbackProvider(), Request, FormField() (+65 more)

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
Cohesion: 0.04
Nodes (44): AI-помощник `/ai`, LifeCycle frontend, Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, Upgrade v1, этапы 1.4–1.5, UX-правки задач, досок и навигации (31.10.2026), Аналитика и удаление (этап 7) (+36 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 74 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 75 - "settings/types.ts"
Cohesion: 0.11
Nodes (14): contact(), settings, defaults, defaults, png, Countdown, CountdownInput, EventDetails (+6 more)

### Community 76 - "ai_provider.rs"
Cohesion: 0.07
Nodes (30): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+22 more)

### Community 77 - "require"
Cohesion: 0.20
Nodes (22): require(), SmokeFailure, countdowns(), find_occurrence(), listed(), main(), media(), notes_and_folders() (+14 more)

### Community 79 - "surfaces.tsx"
Cohesion: 0.17
Nodes (16): Движение и эффекты, Праздники, анимации и эффекты — 03.11.2026, AnimationProvider(), animationsEnabled(), configureAnimations(), listeners, motionAllowed(), scrollElement() (+8 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (9): email_address(), main(), read_code(), request_code(), run(), session_cookie(), verify(), run() (+1 more)

### Community 81 - "navigation.rs"
Cohesion: 0.25
Nodes (6): Navigation, navigation_requires_known_unique_order_and_pins(), PAGES, read(), routes(), update()

### Community 82 - "import.ts"
Cohesion: 0.22
Nodes (16): pick(), readFile(), decode(), devicePicker(), parseContactFile(), parseVcards(), Picker, selectDeviceContacts() (+8 more)

### Community 83 - "media.ts"
Cohesion: 0.35
Nodes (10): safeMarkdownUrl(), upload(), imageAccept, imageTypes, markdownImage(), mediaId(), mediaIdsInMarkdown(), mediaUrl() (+2 more)

### Community 84 - "deserialize"
Cohesion: 0.21
Nodes (7): read(), routes(), Settings, ThemeColors, update(), validates_custom_palette_colors_and_contrast(), validates_iana_timezone_and_bounds()

### Community 86 - "effect-provider.tsx"
Cohesion: 0.19
Nodes (17): feedbackEvents, Notice, prefersReducedMotion(), EffectProvider(), effectEvents, EffectKind, effectOrigin, EffectRequest (+9 more)

### Community 87 - "task_tags.rs"
Cohesion: 0.29
Nodes (11): create(), list(), locked(), Name, register(), remove(), Revision, routes() (+3 more)

### Community 89 - "Client"
Cohesion: 0.10
Nodes (16): run(), save(), Client, run(), login(), run(), run(), run() (+8 more)

### Community 90 - "mail.rs"
Cohesion: 0.35
Nodes (3): send_code(), transport(), unavailable()

### Community 92 - "countdowns-page.tsx"
Cohesion: 0.10
Nodes (51): FilterSearch(), ContactImport(), submit(), ContactsPage(), remove(), Contact, ContactData, contactName() (+43 more)

### Community 94 - "preferences-provider.tsx"
Cohesion: 0.24
Nodes (12): PreferencesContext, PreferencesProvider(), configureEffects(), commitLanguage(), setLanguage(), english, contrast(), readableText() (+4 more)

### Community 95 - "app.tsx"
Cohesion: 0.12
Nodes (32): AiPage, AnalyticsPage, App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), BoardsPage, CalendarPage (+24 more)

### Community 97 - "ai_connections_smoke.py"
Cohesion: 0.22
Nodes (3): NoRedirect, raw(), run()

### Community 98 - "workouts_smoke.py"
Cohesion: 0.28
Nodes (9): run(), main(), run(), command(), entry(), exercise(), main(), plan() (+1 more)

### Community 99 - "sounds.ts"
Cohesion: 0.38
Nodes (8): SoundProvider(), apply(), configureSounds(), playSound(), previewSound(), settings, SoundPreferences, @foleyjs/core

### Community 100 - "auth-provider.tsx"
Cohesion: 0.53
Nodes (4): AuthContext, AuthContextValue, User, AuthProvider()

### Community 101 - "DateTimeInput"
Cohesion: 0.40
Nodes (3): CalendarDays(), Clock3(), DateTimeInput()

### Community 102 - "workout_preferences.rs"
Cohesion: 0.31
Nodes (8): Conditions, Input, load(), Preferences, read(), routes(), training_conditions_preserve_unknown_and_limit_unicode(), update()

## Knowledge Gaps
- **35 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 535 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `tasks.rs` (3× useful, score=2.772880876)
- `project_progress.md` (3× useful, score=2.711096496) _(code changed — re-verify)_
- `ai_login.rs` (2× useful, score=1.835980333)
- `ai_provider.rs` (2× useful, score=1.835980333)
- `habits.rs` (2× useful, score=1.790486949) _(code changed — re-verify)_
- `schedule.rs` (2× useful, score=1.790486949)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppState` connect `AppState` to `AppState`, `AppState`, `ai_login.rs`, `service.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `schedule.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `AppState`, `CurrentUser`, `foundation.rs`, `pomodoro.rs`, `ApiJson`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `media.rs`, `profile.rs`, `ai_provider.rs`, `navigation.rs`, `deserialize`, `task_tags.rs`, `csrf.rs`, `workout_preferences.rs`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useLanguage()` (e.g. with `Переиспользование` and `getLanguage()`) actually correct?**
  _`useLanguage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.12349726775956284 - nodes in this community are weakly interconnected._
- **Why does `ApiJson` connect `ApiJson` to `AppState`, `AppState`, `ai_login.rs`, `pomodoro_programs.rs`, `verify_code`, `workout_sessions.rs`, `schedule.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `AppState`, `CurrentUser`, `pomodoro.rs`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `profile.rs`, `navigation.rs`, `deserialize`, `task_tags.rs`, `workout_preferences.rs`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Should `t` be split into smaller, more focused modules?**
  _Cohesion score 0.07457627118644068 - nodes in this community are weakly interconnected._
- **Why does `CurrentUser` connect `AppState` to `AppState`, `AppState`, `ai_login.rs`, `pomodoro_programs.rs`, `verify_code`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `CurrentUser`, `pomodoro.rs`, `ApiJson`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `media.rs`, `profile.rs`, `navigation.rs`, `deserialize`, `task_tags.rs`, `AppState`, `workout_preferences.rs`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._