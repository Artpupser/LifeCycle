# Graph Report - LifeCycle  (2026-11-04)

## Corpus Check
- 384 files · ~214,501 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 21 file(s) not represented in the graph (top: (none) 9, .css 3, .network 3)

## Summary
- 3009 nodes · 11658 edges · 120 communities (109 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 135 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `50106607`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- boards-page.tsx
- Graphify Project Navigation
- AppState
- locale.ts
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
- deserialize
- scripts
- cache.ts
- pomodoro-page.tsx
- allowBuilds
- tsconfig.json
- analytics-page.tsx
- AppIcon
- lifecycle-api
- health-page.tsx
- pomodoro_programs.rs
- locale.ts
- verify_code
- LifeCycle frontend
- workout_sessions.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- action-menu.tsx
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
- dates.ts
- calendar-page.tsx
- catalog.ts
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- analytics.rs
- sidebar-navigation.tsx
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- labels.rs
- media.rs
- profile.rs
- t
- Q: Stage 9 final integration of LifeCycle after stage 8
- sys
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- media.ts
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- api
- date-time-input.tsx
- ai_provider.rs
- require
- operators.rs
- surfaces.tsx
- auth_smoke.py
- settings-page.tsx
- LifeCycle
- UX-правки задач, досок и навигации (31.10.2026)
- deserialize
- navigation.ts
- effect-provider.tsx
- manifest.json
- mutate
- run
- mail.rs
- path
- AI-помощник `/ai`
- preferences-provider.tsx
- app.tsx
- LICENSES.md
- countdowns.rs
- workouts_smoke.py
- sounds.ts
- UX-правки задач, досок и навигации (31.10.2026)
- LifeCycle frontend
- workout_preferences.rs
- SOURCES.md
- Общие frontend-системы — 02.11.2026
- serialize
- super
- react
- Client
- habits-page.tsx
- package.json
- eslint.config.js
- profile/types.ts
- icons/SOURCES.md
- surfaces.tsx
- countdowns-page.tsx
- run
- operators/SOURCES.md
- engines
- run

## God Nodes (most connected - your core abstractions)
1. `AppState` - 301 edges
2. `t()` - 291 edges
3. `useLanguage()` - 213 edges
4. `CurrentUser` - 171 edges
5. `Button()` - 148 edges
6. `api()` - 124 edges
7. `AppIcon()` - 123 edges
8. `errorMessage()` - 114 edges
9. `ApiJson` - 95 edges
10. `react` - 94 edges

## Surprising Connections (you probably didn't know these)
- `Общие метки, история и операторы — миграции 0023–0025` --references--> `pomodoro()`  [INFERRED]
  backend/README.md → scripts/core_smoke.py
- `Единые метки, история, загрузка и контакты — 03.11.2026` --references--> `useResource()`  [INFERRED]
  frontend/README.md → frontend/src/hooks/use-resource.ts
- `Применение frontend/AGENTS.md — 02.11.2026` --references--> `FeedbackProvider()`  [INFERRED]
  frontend/README.md → frontend/src/components/feedback-provider.tsx
- `Праздники` --references--> `FilterSearch()`  [INFERRED]
  frontend/README.md → frontend/src/components/filter-search.tsx
- `Применение frontend/AGENTS.md — 02.11.2026` --references--> `FilterSearch()`  [INFERRED]
  frontend/README.md → frontend/src/components/filter-search.tsx

## Import Cycles
- 3-file cycle: `backend/src/ai.rs -> backend/src/ai_context.rs -> backend/src/workout_preferences.rs -> backend/src/ai.rs`

## Communities (120 total, 11 thin omitted)

### Community 0 - "boards-page.tsx"
Cohesion: 0.12
Nodes (26): Plus(), X(), Board, BoardColumn, BoardItem, BoardState, Membership, BoardsPage() (+18 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.12
Nodes (42): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+34 more)

### Community 3 - "locale.ts"
Cohesion: 0.17
Nodes (21): EntryDetail(), VisibleJournal(), AnswersRow(), JournalStatistics(), answerLabel(), Answers, Entry, EntryData (+13 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.11
Nodes (14): main(), assistant(), run(), seal(), training(), run(), main(), ready() (+6 more)

### Community 6 - "AppState"
Cohesion: 0.12
Nodes (44): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+36 more)

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.08
Nodes (25): dependencies, class-variance-authority@^0.7.1, date-holidays@^3.38.0, @foleyjs/core@^2.9.0, @foleyjs/react@^2.9.0, @iconify-json/circle-flags@^1.2.14, @iconify-json/tabler@^1.2.43, @iconify-json/twemoji@^1.2.5 (+17 more)

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
Cohesion: 0.11
Nodes (19): devDependencies, eslint@^10.13.0, motion-ai@^14.2.0, @playwright/test@^1.64.1, tailwindcss@^4.1.0, @types/node@^24.0.0, @types/react@^19.2.0, @types/react-dom@^19.2.0 (+11 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, module, moduleResolution, noEmit, paths (+7 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (41): access(), Account, account(), account_context(), accounts(), AttemptQuery, authorization_url(), authorize() (+33 more)

### Community 16 - "deserialize"
Cohesion: 0.06
Nodes (37): Contact, ContactData, DeleteEvents, Delete, Keep, duplicate(), LabelKind, Categories (+29 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "cache.ts"
Cohesion: 0.17
Nodes (17): AuthContext, AuthContextValue, User, AuthProvider(), clearResourceCache(), empty, entries, Entry (+9 more)

### Community 19 - "pomodoro-page.tsx"
Cohesion: 0.11
Nodes (29): Pencil(), Trash2(), moveTaskDate(), quickDateChoices, quickSchedule(), taskDateActions(), taskInput, PomodoroPage() (+21 more)

### Community 20 - "allowBuilds"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, @tsparticles/engine

### Community 22 - "analytics-page.tsx"
Cohesion: 0.33
Nodes (11): RefreshCw(), DayChart(), Metrics(), minutes(), number(), percent(), ReportView(), Day (+3 more)

### Community 23 - "AppIcon"
Cohesion: 0.09
Nodes (42): Activity(), AlertTriangle(), ArrowDown(), ArrowUp(), BarChart3(), BookUser(), Cake(), CalendarClock() (+34 more)

### Community 25 - "health-page.tsx"
Cohesion: 0.17
Nodes (16): Check(), CircleAlert(), Database(), HardDrive(), Server(), Zap(), fetchReadiness(), HealthRequestError (+8 more)

### Community 26 - "pomodoro_programs.rs"
Cohesion: 0.14
Nodes (27): Action, Anchor, boundaries_cycles_and_long_suspension_are_arithmetic(), change(), Config, ConfigInput, create(), delete() (+19 more)

### Community 27 - "locale.ts"
Cohesion: 0.11
Nodes (43): AiAccess, buttonVariants, entityLabels, labels, input(), Folder, Note, NoteInput (+35 more)

### Community 28 - "verify_code"
Cohesion: 0.10
Nodes (20): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+12 more)

### Community 29 - "LifeCycle frontend"
Cohesion: 0.18
Nodes (11): LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Единые метки, история, загрузка и контакты — 03.11.2026, Интимный журнал (этап 6), Основные данные (этап 3), Праздники, анимации и эффекты — 03.11.2026, Привычки (этап 4) (+3 more)

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
Cohesion: 0.06
Nodes (30): contact(), settings, defaults, png, birthday, defaults, paths, setup() (+22 more)

### Community 36 - "action-menu.tsx"
Cohesion: 0.19
Nodes (13): ActionMenuButton(), ActionMenuProvider(), aliases, declaredActions(), ReadActions, scopes, subjectActions(), textOf() (+5 more)

### Community 37 - "error.rs"
Cohesion: 0.11
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 38 - "intimacy.rs"
Cohesion: 0.06
Nodes (49): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+41 more)

### Community 39 - "habits.rs"
Cohesion: 0.12
Nodes (43): complete_workout(), completion_is_explicit_and_old_subhabit_input_is_rejected(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), delete_history(), DeleteHistory, editable_occurrence() (+35 more)

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "ai_access.rs"
Cohesion: 0.30
Nodes (13): Access, BulkAccess, BulkInput, BulkItem, change(), exercise(), exercise_visible(), Input (+5 more)

### Community 44 - "AppState"
Cohesion: 0.13
Nodes (9): create(), delete(), import(), labels(), list(), read(), routes(), update() (+1 more)

### Community 45 - "CurrentUser"
Cohesion: 0.35
Nodes (8): CurrentUser, create(), delete(), list(), read(), routes(), unlink(), update()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.08
Nodes (15): Config, validated_url(), guard(), router(), main(), run(), shutdown(), configuration_errors_do_not_expose_secrets() (+7 more)

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

### Community 53 - "dates.ts"
Cohesion: 0.09
Nodes (67): ChevronLeft(), ChevronRight(), ErrorState(), LoadingState(), ActionJournal(), AnalyticsPage(), DayEvents(), CalendarPage() (+59 more)

### Community 54 - "calendar-page.tsx"
Cohesion: 0.06
Nodes (66): Before finishing, Centralized systems (mandatory), Frontend, New centralized systems, UI principles, Праздники, FilterQuery, DayHolidays() (+58 more)

### Community 55 - "catalog.ts"
Cohesion: 0.12
Nodes (16): AppIconProps, available, brandBody, catalogVersion(), data, iconData(), IconEntry, IconPack (+8 more)

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
Cohesion: 0.05
Nodes (44): build(), clip(), validate_range(), ai_report(), build_report(), Day, habit_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending() (+36 more)

### Community 60 - "sidebar-navigation.tsx"
Cohesion: 0.31
Nodes (9): GripVertical(), Pin(), PinOff(), Settings2(), Item, Navigation, SidebarNavigation(), move() (+1 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "workouts.rs"
Cohesion: 0.12
Nodes (30): color(), conflict(), event(), local_today(), not_found(), Search, settings(), tags() (+22 more)

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "labels.rs"
Cohesion: 0.10
Nodes (38): signed_identity_requires_matching_issuer_audience_nonce_expiry_and_key(), all(), create(), Data, decode(), encode(), Filter, aad() (+30 more)

### Community 65 - "media.rs"
Cohesion: 0.13
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "profile.rs"
Cohesion: 0.19
Nodes (15): decode(), Firsts, HabitPeriod, HarmfulHabit, historical_years_and_habit_periods_validate_without_inventing_unknowns(), load(), merge(), Origin (+7 more)

### Community 67 - "t"
Cohesion: 0.11
Nodes (81): Переиспользование, Dialog(), FormField(), Save(), MarkdownEditor(), Button(), Input(), Select() (+73 more)

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 69 - "sys"
Cohesion: 0.13
Nodes (3): Table, main(), main()

### Community 70 - "Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?, Source Nodes

### Community 71 - "media.ts"
Cohesion: 0.26
Nodes (12): safeMarkdownUrl(), upload(), imageAccept, imageTypes, markdownImage(), mediaId(), mediaIdsInMarkdown(), mediaUrl() (+4 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 74 - "api"
Cohesion: 0.06
Nodes (78): AiVisibility(), change(), ShieldCheck(), command(), edit(), parseActions(), refreshActions(), AiPage() (+70 more)

### Community 75 - "date-time-input.tsx"
Cohesion: 0.36
Nodes (4): CalendarDays(), Clock3(), DateTimeInput(), closeActionMenu()

### Community 76 - "ai_provider.rs"
Cohesion: 0.15
Nodes (20): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+12 more)

### Community 77 - "require"
Cohesion: 0.14
Nodes (20): run(), send(), run(), save(), origin_url(), require(), SmokeFailure, countdowns() (+12 more)

### Community 78 - "operators.rs"
Cohesion: 0.19
Nodes (11): digits(), fingerprint(), Lookup, lookup(), Preferences, ProviderData, read(), ResultData (+3 more)

### Community 79 - "surfaces.tsx"
Cohesion: 0.19
Nodes (16): Движение и эффекты, AnimationProvider(), animateDragLayout(), captureDragLayout(), dragFeedback(), identities, installDragAnimations(), items() (+8 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (10): NoRedirect, raw(), run(), email_address(), main(), read_code(), request_code(), run() (+2 more)

### Community 81 - "settings-page.tsx"
Cohesion: 0.22
Nodes (19): ArrowLeft(), ArrowRight(), LoaderCircle(), Mail(), SlidersHorizontal(), Card(), CardContent(), CardDescription() (+11 more)

### Community 82 - "LifeCycle"
Cohesion: 0.25
Nodes (8): LifeCycle, Upgrade v1: этапы 1.1–1.3, Upgrade v1: этапы 1.4–1.5, Единый рабочий экран задач, Локальный запуск, Подключение AI, Проверки, Структура

### Community 83 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.29
Nodes (7): Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Массовые заметки и навигация — 02.11.2026, Рабочее пространство — 02.11.2026

### Community 84 - "deserialize"
Cohesion: 0.21
Nodes (7): read(), routes(), Settings, ThemeColors, update(), validates_custom_palette_colors_and_contrast(), validates_iana_timezone_and_bounds()

### Community 85 - "navigation.ts"
Cohesion: 0.60
Nodes (3): iconCatalog, navigationCatalog, navigationItems()

### Community 86 - "effect-provider.tsx"
Cohesion: 0.21
Nodes (16): prefersReducedMotion(), EffectProvider(), configureEffects(), effectEvents, EffectKind, effectOrigin, EffectRequest, effectsEnabled() (+8 more)

### Community 87 - "manifest.json"
Cohesion: 0.40
Nodes (4): circle-flags, simple-icons, tabler, twemoji

### Community 88 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 90 - "mail.rs"
Cohesion: 0.35
Nodes (3): send_code(), transport(), unavailable()

### Community 91 - "path"
Cohesion: 0.18
Nodes (7): audit(), Feed, feed(), FeedItem, FeedQuery, remove(), routes()

### Community 93 - "AI-помощник `/ai`"
Cohesion: 0.67
Nodes (3): AI-помощник `/ai`, Какие записи видит AI, Просмотр и применение предложений

### Community 94 - "preferences-provider.tsx"
Cohesion: 0.15
Nodes (20): defaults, submit(), PreferencesContext, PreferencesProvider(), Settings, commitLanguage(), Language, setLanguage() (+12 more)

### Community 95 - "app.tsx"
Cohesion: 0.11
Nodes (35): AiPage, AnalyticsPage, App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), BoardsPage, CalendarPage (+27 more)

### Community 97 - "countdowns.rs"
Cohesion: 0.05
Nodes (48): at_index(), category(), clamped(), computed(), ContactBinding, Birthday, Independent, Linked (+40 more)

### Community 98 - "workouts_smoke.py"
Cohesion: 0.33
Nodes (13): main(), run(), find_occurrence(), listed(), occurrences(), task_body(), tasks_and_schedule(), main() (+5 more)

### Community 99 - "sounds.ts"
Cohesion: 0.18
Nodes (12): generatedMarkdown(), normalizeCost(), SoundProvider(), apply(), configureSounds(), playSound(), playTaskResult(), previewSound() (+4 more)

### Community 100 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.67
Nodes (3): UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Рабочее пространство — 02.11.2026

### Community 101 - "LifeCycle frontend"
Cohesion: 0.17
Nodes (12): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Общие метки, история и операторы — миграции 0023–0025, Основные данные (этап 3) (+4 more)

### Community 102 - "workout_preferences.rs"
Cohesion: 0.31
Nodes (8): Conditions, Input, load(), Preferences, read(), routes(), training_conditions_preserve_unknown_and_limit_unicode(), update()

### Community 104 - "Общие frontend-системы — 02.11.2026"
Cohesion: 0.67
Nodes (3): Общие frontend-системы — 02.11.2026, Проверка, Сохранение и совместимость

### Community 106 - "serialize"
Cohesion: 0.25
Nodes (6): Navigation, navigation_requires_known_unique_order_and_pins(), PAGES, read(), routes(), update()

### Community 108 - "react"
Cohesion: 0.08
Nodes (50): FilterSearch(), ContactImport(), submit(), ContactsPage(), exportContacts(), remove(), Contact, ContactData (+42 more)

### Community 110 - "Client"
Cohesion: 0.11
Nodes (11): Client, run(), run(), login(), run(), run(), run(), run() (+3 more)

### Community 111 - "habits-page.tsx"
Cohesion: 0.13
Nodes (35): Markdown(), render(), HabitControls(), save(), submit(), habitFilters, HabitHistory(), HabitsPage() (+27 more)

### Community 113 - "package.json"
Cohesion: 0.12
Nodes (15): clsx@^2.1.1, @iconify-json/simple-icons@^1.2.101, react-markdown@^10.1.0, tailwind-merge@^3.3.0, @tsparticles/confetti@^4.5.0, name, packageManager, private (+7 more)

### Community 115 - "eslint.config.js"
Cohesion: 0.17
Nodes (10): @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, typescript-eslint@^8.48.0, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+2 more)

### Community 116 - "profile/types.ts"
Cohesion: 0.19
Nodes (11): emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey, medicalKeys, NumericProfileKey (+3 more)

### Community 122 - "surfaces.tsx"
Cohesion: 0.13
Nodes (21): motion@^14.9.0, FeedbackProvider(), Request, CheckCircle2(), Info(), TriangleAlert(), Confirmation, feedbackEvents (+13 more)

### Community 126 - "countdowns-page.tsx"
Cohesion: 0.22
Nodes (14): categoryName(), categoryTerms(), eventCategories, eventCategory(), names, CategoryChip(), EventCategorySelect(), FunctionalValues (+6 more)

### Community 130 - "run"
Cohesion: 0.67
Nodes (3): run(), current(), mutate()

### Community 133 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 137 - "run"
Cohesion: 1.00
Nodes (3): run(), change(), selection()

## Knowledge Gaps
- **35 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 597 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `tasks.rs` (3× useful, score=2.772880876) _(code changed — re-verify)_
- `project_progress.md` (3× useful, score=2.711096496) _(code changed — re-verify)_
- `ai_login.rs` (2× useful, score=1.835980333)
- `ai_provider.rs` (2× useful, score=1.835980333) _(code changed — re-verify)_
- `habits.rs` (2× useful, score=1.790486949) _(code changed — re-verify)_
- `schedule.rs` (2× useful, score=1.790486949)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeCycle frontend` connect `LifeCycle frontend` to `UX-правки задач, досок и навигации (31.10.2026)`, `Общие frontend-системы — 02.11.2026`, `README.md`, `AI-помощник `/ai``?**
  _High betweenness centrality (0.429) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `AppState` (e.g. with `decoded()` and `list()`) actually correct?**
  _`AppState` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `boards-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11942959001782531 - nodes in this community are weakly interconnected._
- **Why does `LifeCycle frontend` connect `LifeCycle frontend` to `UX-правки задач, досок и навигации (31.10.2026)`, `README.md`?**
  _High betweenness centrality (0.429) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useLanguage()` (e.g. with `Переиспользование` and `getLanguage()`) actually correct?**
  _`useLanguage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.12321523003701745 - nodes in this community are weakly interconnected._