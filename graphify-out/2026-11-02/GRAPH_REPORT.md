# Graph Report - LifeCycle  (2026-11-02)

## Corpus Check
- 307 files · ~181,833 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 47 file(s) not represented in the graph (top: .network 14, .trace 14, (none) 9)

## Summary
- 2623 nodes · 10137 edges · 100 communities (88 shown, 12 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 98 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3ee85da`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Button
- Graphify Project Navigation
- AppState
- api
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
- LoadingState
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
- Frontend
- error.rs
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
- locale.ts
- catalog.ts
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- analytics.rs
- login-page.tsx
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- country-input.tsx
- media.rs
- profile.rs
- Input
- Q: Stage 9 final integration of LifeCycle after stage 8
- origin_url
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- health-page.tsx
- start
- ai_provider.rs
- require
- config.rs
- super
- auth_smoke.py
- navigation.rs
- theme-editor.tsx
- media.ts
- deserialize
- ai.spec.ts
- main.rs
- task_tags.rs
- csrf.rs
- Client
- mail.rs
- .from_request
- intimacy-page.tsx
- feedback-provider.tsx
- app.tsx
- LICENSES.md
- ai_connections_smoke.py
- workouts_smoke.py
- workout_preferences.rs

## God Nodes (most connected - your core abstractions)
1. `AppState` - 275 edges
2. `t()` - 259 edges
3. `useLanguage()` - 191 edges
4. `CurrentUser` - 161 edges
5. `Button()` - 138 edges
6. `api()` - 110 edges
7. `errorMessage()` - 107 edges
8. `AppIcon()` - 103 edges
9. `ApiJson` - 91 edges
10. `react` - 77 edges

## Surprising Connections (you probably didn't know these)
- `Применение frontend/AGENTS.md — 02.11.2026` --references--> `FeedbackProvider()`  [INFERRED]
  frontend/README.md → frontend/src/components/feedback-provider.tsx
- `Применение frontend/AGENTS.md — 02.11.2026` --references--> `FilterSearch()`  [INFERRED]
  frontend/README.md → frontend/src/components/filter-search.tsx
- `Переиспользование` --references--> `notify()`  [INFERRED]
  frontend/README.md → frontend/src/lib/feedback.ts
- `Centralized systems (mandatory)` --references--> `useLanguage()`  [INFERRED]
  frontend/AGENTS.md → frontend/src/systems/i18n/locale.ts
- `Переиспользование` --references--> `useLanguage()`  [INFERRED]
  frontend/README.md → frontend/src/systems/i18n/locale.ts

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (100 total, 12 thin omitted)

### Community 0 - "Button"
Cohesion: 0.10
Nodes (35): MoreHorizontal(), Pencil(), Plus(), Board, BoardColumn, BoardItem, BoardState, Membership (+27 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.12
Nodes (41): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+33 more)

### Community 3 - "api"
Cohesion: 0.06
Nodes (78): AiAccess, AiVisibility(), change(), X(), remove(), ChatPanel(), cancel(), prepare() (+70 more)

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
Cohesion: 0.08
Nodes (34): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, @foleyjs/core@^2.9.0, @foleyjs/react@^2.9.0, @iconify-json/circle-flags@^1.2.14, @iconify-json/simple-icons@^1.2.101, @iconify-json/tabler@^1.2.43 (+26 more)

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
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, module, moduleResolution, noEmit, paths (+7 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (29): access(), Account, account(), account_context(), authorization_url(), available(), Callback, Claims (+21 more)

### Community 16 - "service.rs"
Cohesion: 0.06
Nodes (37): Contact, ContactData, DeleteEvents, Delete, Keep, duplicate(), LabelKind, Categories (+29 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "useResource"
Cohesion: 0.09
Nodes (41): Item, Navigation, ActionReview(), command(), edit(), entityLabels, labels, parseActions() (+33 more)

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 22 - "profile/types.ts"
Cohesion: 0.16
Nodes (15): submit(), draftToProfile(), emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey (+7 more)

### Community 23 - "icons.tsx"
Cohesion: 0.08
Nodes (52): Shell(), logout(), Activity(), AlertTriangle(), ArrowDown(), ArrowUp(), BarChart3(), BookUser() (+44 more)

### Community 25 - "LoadingState"
Cohesion: 0.15
Nodes (31): Dialog(), Copy(), Trash2(), ErrorState(), LoadingState(), ActionJournal(), AiPage(), Workspace() (+23 more)

### Community 26 - "pomodoro_programs.rs"
Cohesion: 0.14
Nodes (27): Action, Anchor, boundaries_cycles_and_long_suspension_are_arithmetic(), change(), Config, ConfigInput, create(), delete() (+19 more)

### Community 27 - "Button"
Cohesion: 0.13
Nodes (35): Переиспользование, Eye(), Markdown(), MarkdownEditor(), render(), Button(), buttonVariants, HabitControls() (+27 more)

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
Cohesion: 0.40
Nodes (4): Before finishing, Frontend, New centralized systems, UI principles

### Community 37 - "error.rs"
Cohesion: 0.16
Nodes (4): ApiError, ErrorDetail, ErrorEnvelope, not_found()

### Community 38 - "intimacy.rs"
Cohesion: 0.06
Nodes (48): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+40 more)

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
Cohesion: 0.37
Nodes (9): CurrentUser, create(), delete(), import(), labels(), list(), read(), routes() (+1 more)

### Community 45 - "CurrentUser"
Cohesion: 0.14
Nodes (8): create(), delete(), list(), read(), routes(), unlink(), update(), AppState

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.23
Nodes (9): router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin(), liveness_is_independent_of_infrastructure_and_has_safe_headers(), mutation_without_origin_is_rejected_before_services_are_accessed(), readiness_reports_actual_connection_failures_without_credentials() (+1 more)

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
Cohesion: 0.08
Nodes (76): ChevronLeft(), ChevronRight(), ChangeView(), DayEvents(), CountdownInput, EventDetails, EventDisplay, EventOccurrence (+68 more)

### Community 54 - "locale.ts"
Cohesion: 0.15
Nodes (22): EntryDetail(), IntimacyPage(), VisibleJournal(), AnswersRow(), JournalStatistics(), answerLabel(), Answers, Entry (+14 more)

### Community 55 - "catalog.ts"
Cohesion: 0.10
Nodes (19): AppIconProps, available, brandBody, catalogVersion(), data, iconCatalog, iconData(), IconEntry (+11 more)

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
Cohesion: 0.22
Nodes (18): ArrowLeft(), ArrowRight(), LoaderCircle(), Mail(), Save(), SlidersHorizontal(), Card(), CardContent() (+10 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "workouts.rs"
Cohesion: 0.13
Nodes (30): color(), conflict(), event(), local_today(), not_found(), Search, settings(), tags() (+22 more)

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "country-input.tsx"
Cohesion: 0.27
Nodes (17): getLanguage(), callingCode(), countries, countryCode(), countryFlag(), countryName(), countryNames(), en (+9 more)

### Community 65 - "media.rs"
Cohesion: 0.12
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "profile.rs"
Cohesion: 0.19
Nodes (15): decode(), Firsts, HabitPeriod, HarmfulHabit, historical_years_and_habit_periods_validate_without_inventing_unknowns(), load(), merge(), Origin (+7 more)

### Community 67 - "Input"
Cohesion: 0.10
Nodes (55): FormField(), DateTimeInput(), Input(), Select(), Textarea(), ContactEditor(), save(), HabitEditor() (+47 more)

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

### Community 74 - "health-page.tsx"
Cohesion: 0.16
Nodes (17): Check(), CircleAlert(), Database(), HardDrive(), RefreshCw(), Server(), Zap(), fetchReadiness() (+9 more)

### Community 75 - "start"
Cohesion: 0.26
Nodes (12): accounts(), AttemptQuery, authorize(), callback(), complete(), failure(), models(), pending_context() (+4 more)

### Community 76 - "ai_provider.rs"
Cohesion: 0.07
Nodes (35): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+27 more)

### Community 77 - "require"
Cohesion: 0.20
Nodes (22): require(), SmokeFailure, countdowns(), find_occurrence(), listed(), main(), media(), notes_and_folders() (+14 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (9): email_address(), main(), read_code(), request_code(), run(), session_cookie(), verify(), run() (+1 more)

### Community 81 - "navigation.rs"
Cohesion: 0.25
Nodes (6): Navigation, navigation_requires_known_unique_order_and_pins(), PAGES, read(), routes(), update()

### Community 82 - "theme-editor.tsx"
Cohesion: 0.06
Nodes (52): contact(), settings, defaults, png, pick(), readFile(), decode(), devicePicker() (+44 more)

### Community 83 - "media.ts"
Cohesion: 0.35
Nodes (10): safeMarkdownUrl(), upload(), imageAccept, imageTypes, markdownImage(), mediaId(), mediaIdsInMarkdown(), mediaUrl() (+2 more)

### Community 84 - "deserialize"
Cohesion: 0.21
Nodes (7): read(), routes(), Settings, ThemeColors, update(), validates_custom_palette_colors_and_contrast(), validates_iana_timezone_and_bounds()

### Community 86 - "main.rs"
Cohesion: 0.32
Nodes (3): main(), run(), shutdown()

### Community 87 - "task_tags.rs"
Cohesion: 0.29
Nodes (11): create(), list(), locked(), Name, register(), remove(), Revision, routes() (+3 more)

### Community 89 - "Client"
Cohesion: 0.10
Nodes (16): run(), save(), Client, run(), login(), run(), run(), run() (+8 more)

### Community 90 - "mail.rs"
Cohesion: 0.35
Nodes (3): send_code(), transport(), unavailable()

### Community 92 - "intimacy-page.tsx"
Cohesion: 0.13
Nodes (41): Centralized systems (mandatory), FilterSearch(), ShieldCheck(), AnalyticsPage(), DayChart(), Metrics(), minutes(), number() (+33 more)

### Community 94 - "feedback-provider.tsx"
Cohesion: 0.36
Nodes (6): FeedbackProvider(), Request, CheckCircle2(), Info(), TriangleAlert(), Confirmation

### Community 95 - "app.tsx"
Cohesion: 0.11
Nodes (31): AiPage, AnalyticsPage, App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), BoardsPage, CalendarPage (+23 more)

### Community 97 - "ai_connections_smoke.py"
Cohesion: 0.22
Nodes (3): NoRedirect, raw(), run()

### Community 98 - "workouts_smoke.py"
Cohesion: 0.28
Nodes (9): run(), main(), run(), command(), entry(), exercise(), main(), plan() (+1 more)

### Community 102 - "workout_preferences.rs"
Cohesion: 0.31
Nodes (8): Conditions, Input, load(), Preferences, read(), routes(), training_conditions_preserve_unknown_and_limit_unicode(), update()

## Knowledge Gaps
- **35 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 516 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **12 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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

- **Why does `AppState` connect `CurrentUser` to `AppState`, `AppState`, `ai_login.rs`, `service.rs`, `pomodoro_programs.rs`, `verify_code`, `countdowns.rs`, `workout_sessions.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `AppState`, `foundation.rs`, `pomodoro.rs`, `ApiJson`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `media.rs`, `profile.rs`, `start`, `ai_provider.rs`, `super`, `navigation.rs`, `deserialize`, `task_tags.rs`, `csrf.rs`, `workout_preferences.rs`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `t()` (e.g. with `Centralized systems (mandatory)` and `Переиспользование`) actually correct?**
  _`t()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Button` be split into smaller, more focused modules?**
  _Cohesion score 0.09758454106280193 - nodes in this community are weakly interconnected._
- **Why does `ApiJson` connect `ApiJson` to `AppState`, `AppState`, `ai_login.rs`, `pomodoro_programs.rs`, `verify_code`, `workout_sessions.rs`, `error.rs`, `intimacy.rs`, `habits.rs`, `ai_access.rs`, `AppState`, `CurrentUser`, `pomodoro.rs`, `ai_actions.rs`, `CurrentUser`, `analytics.rs`, `workouts.rs`, `profile.rs`, `start`, `navigation.rs`, `deserialize`, `task_tags.rs`, `workout_preferences.rs`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `useLanguage()` (e.g. with `Centralized systems (mandatory)` and `Переиспользование`) actually correct?**
  _`useLanguage()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.12349726775956284 - nodes in this community are weakly interconnected._