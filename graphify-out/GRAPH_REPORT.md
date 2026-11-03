# Graph Report - LifeCycle  (2026-11-03)

## Corpus Check
- 387 files · ~191,044 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 79 file(s) not represented in the graph (top: .network 32, .trace 32, (none) 9)

## Summary
- 2882 nodes · 11102 edges · 132 communities (117 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0cb897eb`
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
- contacts/repository.rs
- scripts
- useResource
- engines
- allowBuilds
- tsconfig.json
- profile/types.ts
- AppIcon
- lifecycle-api
- locale.ts
- pomodoro_programs.rs
- Button
- verify_code
- countdowns/repository.rs
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
- holidays.ts
- catalog.ts
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- analytics.rs
- countdowns-page.tsx
- Q: Stage 5 workout integration with habits Today calendar and schedule
- workouts.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- labels.rs
- media.rs
- profile.rs
- Input
- Q: Stage 9 final integration of LifeCycle after stage 8
- origin_url
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- action-journal.tsx
- settings/types.ts
- ai_provider.rs
- require
- operators.rs
- surfaces.tsx
- auth_smoke.py
- navigation.rs
- import.ts
- media.ts
- deserialize
- ai.spec.ts
- effect-provider.tsx
- countdowns/dto.rs
- csrf.rs
- Client
- mail.rs
- AppState
- country-input.tsx
- preferences-provider.tsx
- app.tsx
- LICENSES.md
- countdowns.rs
- workouts_smoke.py
- sounds.ts
- cache.ts
- useLanguage
- workout_preferences.rs
- SOURCES.md
- start
- contacts/domain.rs
- service.rs
- super
- policy.ts
- operators/service.ts
- ai_smoke.py
- countdowns/domain.rs
- model.rs
- disconnect
- health.rs
- LifeCycle frontend
- filter-query.ts
- DeleteEvents
- serialize
- preload-provider.tsx
- LifeCycle
- UX-правки задач, досок и навигации (31.10.2026)
- ContactBinding
- external-link.tsx
- holidays-motion.spec.ts
- navigation.ts
- AI-помощник `/ai`
- UX-правки задач, досок и навигации (31.10.2026)
- Общие frontend-системы — 02.11.2026
- operators/SOURCES.md

## God Nodes (most connected - your core abstractions)
1. `AppState` - 293 edges
2. `t()` - 275 edges
3. `useLanguage()` - 203 edges
4. `CurrentUser` - 168 edges
5. `Button()` - 146 edges
6. `api()` - 124 edges
7. `errorMessage()` - 112 edges
8. `AppIcon()` - 110 edges
9. `ApiJson` - 94 edges
10. `react` - 91 edges

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

## Communities (132 total, 15 thin omitted)

### Community 0 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.13
Nodes (40): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+32 more)

### Community 3 - "t"
Cohesion: 0.09
Nodes (52): FilterSearch(), RefreshCw(), ShieldCheck(), AnalyticsPage(), DayChart(), Metrics(), minutes(), number() (+44 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.16
Nodes (10): main(), run(), seal(), main(), ready(), run(), sql(), verify_migrations() (+2 more)

### Community 6 - "AppState"
Cohesion: 0.12
Nodes (44): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+36 more)

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.07
Nodes (36): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, date-holidays@^3.38.0, @foleyjs/core@^2.9.0, @foleyjs/react@^2.9.0, @iconify-json/circle-flags@^1.2.14, @iconify-json/simple-icons@^1.2.101 (+28 more)

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
Nodes (21): Account, authorization_url(), available(), Callback, Claims, Credentials, exchange(), has_scope() (+13 more)

### Community 16 - "contacts/repository.rs"
Cohesion: 0.35
Nodes (11): all(), decode(), delete_contact(), delete_events(), disable_birthday(), enable_birthday(), load(), lock() (+3 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "useResource"
Cohesion: 0.05
Nodes (89): Copy(), ActionReview(), command(), edit(), parseActions(), refreshActions(), remove(), Attempt (+81 more)

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 20 - "allowBuilds"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, @tsparticles/engine

### Community 22 - "profile/types.ts"
Cohesion: 0.19
Nodes (11): emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey, medicalKeys, NumericProfileKey (+3 more)

### Community 23 - "AppIcon"
Cohesion: 0.05
Nodes (83): FeedbackProvider(), Request, Activity(), ArrowDown(), ArrowLeft(), ArrowRight(), ArrowUp(), BarChart3() (+75 more)

### Community 25 - "locale.ts"
Cohesion: 0.10
Nodes (40): AiAccess, AiVisibility(), change(), X(), input(), NoteEditor(), emptyNote(), Folder (+32 more)

### Community 26 - "pomodoro_programs.rs"
Cohesion: 0.14
Nodes (27): Action, Anchor, boundaries_cycles_and_long_suspension_are_arithmetic(), change(), Config, ConfigInput, create(), delete() (+19 more)

### Community 27 - "Button"
Cohesion: 0.11
Nodes (39): GripVertical(), Settings2(), Item, Navigation, SidebarNavigation(), move(), save(), Button() (+31 more)

### Community 28 - "verify_code"
Cohesion: 0.11
Nodes (20): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me() (+12 more)

### Community 29 - "countdowns/repository.rs"
Cohesion: 0.24
Nodes (14): apply_contact(), apply_snapshot(), delete(), detach_contact(), detach_one(), encrypt_snapshot(), hydrate(), load_for_update() (+6 more)

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
Cohesion: 0.33
Nodes (5): Before finishing, Centralized systems (mandatory), Frontend, New centralized systems, UI principles

### Community 37 - "error.rs"
Cohesion: 0.12
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

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
Cohesion: 0.27
Nodes (8): create(), delete(), import(), labels(), list(), read(), routes(), update()

### Community 45 - "CurrentUser"
Cohesion: 0.35
Nodes (8): CurrentUser, create(), delete(), list(), read(), routes(), unlink(), update()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.10
Nodes (14): Config, validated_url(), router(), main(), run(), shutdown(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint() (+6 more)

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
Cohesion: 0.09
Nodes (64): HabitsPage(), create(), habitTime(), changedInterval(), PlanningFields(), update(), update(), scheduleInZone() (+56 more)

### Community 54 - "holidays.ts"
Cohesion: 0.13
Nodes (30): Праздники, CalendarPage(), changeMonth(), shiftMonth(), FilterQuery, DayHolidays(), buildHolidayYear(), holidayIdentity() (+22 more)

### Community 55 - "catalog.ts"
Cohesion: 0.11
Nodes (21): @iconify/react@^6.0.4, available, brandBody, catalogVersion(), data, iconCatalog, iconData(), IconEntry (+13 more)

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
Cohesion: 0.06
Nodes (37): build(), clip(), validate_range(), ai_report(), build_report(), Day, habit_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending() (+29 more)

### Community 60 - "countdowns-page.tsx"
Cohesion: 0.10
Nodes (45): Переиспользование, Eye(), Pencil(), Plus(), Markdown(), MarkdownEditor(), safeMarkdownUrl(), ContactEditor() (+37 more)

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
Cohesion: 0.22
Nodes (22): signed_identity_requires_matching_issuer_audience_nonce_expiry_and_key(), all(), create(), Data, decode(), encode(), Filter, Input (+14 more)

### Community 65 - "media.rs"
Cohesion: 0.19
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "profile.rs"
Cohesion: 0.19
Nodes (15): decode(), Firsts, HabitPeriod, HarmfulHabit, historical_years_and_habit_periods_validate_without_inventing_unknowns(), load(), merge(), Origin (+7 more)

### Community 67 - "Input"
Cohesion: 0.20
Nodes (26): FormField(), Trash2(), Input(), Select(), Textarea(), AnswerInput(), EntryEditor(), Lines() (+18 more)

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 69 - "origin_url"
Cohesion: 0.10
Nodes (6): Table, main(), run(), send(), origin_url(), main()

### Community 70 - "Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?, Source Nodes

### Community 71 - "LifeCycle frontend"
Cohesion: 0.17
Nodes (12): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Общие метки, история и операторы — миграции 0023–0025, Основные данные (этап 3) (+4 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 74 - "action-journal.tsx"
Cohesion: 0.17
Nodes (22): entityLabels, labels, ActionChange, Entry, Exercise, kindLabels, moveItem(), newEntry() (+14 more)

### Community 75 - "settings/types.ts"
Cohesion: 0.10
Nodes (15): contact(), settings, defaults, png, render(), Countdown, CountdownInput, EventDetails (+7 more)

### Community 76 - "ai_provider.rs"
Cohesion: 0.20
Nodes (17): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+9 more)

### Community 77 - "require"
Cohesion: 0.21
Nodes (23): require(), SmokeFailure, countdowns(), find_occurrence(), listed(), main(), media(), notes_and_folders() (+15 more)

### Community 78 - "operators.rs"
Cohesion: 0.16
Nodes (11): digits(), fingerprint(), Lookup, lookup(), Preferences, ProviderData, read(), ResultData (+3 more)

### Community 79 - "surfaces.tsx"
Cohesion: 0.24
Nodes (13): AnimationProvider(), animationsEnabled(), subscribeAnimations(), entrances, transitions, AnimatedArticle(), AnimatedGanttBar(), AnimatedNavigation() (+5 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (10): NoRedirect, raw(), run(), email_address(), main(), read_code(), request_code(), run() (+2 more)

### Community 81 - "navigation.rs"
Cohesion: 0.14
Nodes (6): Navigation, navigation_requires_known_unique_order_and_pins(), PAGES, read(), routes(), update()

### Community 82 - "import.ts"
Cohesion: 0.19
Nodes (17): birthday, defaults, paths, setup(), decode(), devicePicker(), parseContactFile(), parseVcards() (+9 more)

### Community 83 - "media.ts"
Cohesion: 0.26
Nodes (12): ImagePlus(), ImageUpload(), upload(), imageAccept, imageTypes, markdownImage(), mediaId(), mediaIdsInMarkdown() (+4 more)

### Community 84 - "deserialize"
Cohesion: 0.21
Nodes (7): read(), routes(), Settings, ThemeColors, update(), validates_custom_palette_colors_and_contrast(), validates_iana_timezone_and_bounds()

### Community 86 - "effect-provider.tsx"
Cohesion: 0.22
Nodes (16): Движение и эффекты, prefersReducedMotion(), EffectProvider(), configureEffects(), effectEvents, EffectKind, EffectRequest, effectsEnabled() (+8 more)

### Community 87 - "countdowns/dto.rs"
Cohesion: 0.15
Nodes (9): Recurrence, Daily, Monthly, Once, Yearly, CountdownInput, nullable(), nullable_id() (+1 more)

### Community 89 - "Client"
Cohesion: 0.12
Nodes (12): Client, run(), run(), login(), run(), run(), run(), main() (+4 more)

### Community 90 - "mail.rs"
Cohesion: 0.35
Nodes (3): send_code(), transport(), unavailable()

### Community 91 - "AppState"
Cohesion: 0.13
Nodes (4): wait_for_cancel(), remove(), routes(), AppState

### Community 92 - "country-input.tsx"
Cohesion: 0.26
Nodes (17): getLanguage(), callingCode(), countries, countryCode(), countryFlag(), countryName(), countryNames(), en (+9 more)

### Community 94 - "preferences-provider.tsx"
Cohesion: 0.27
Nodes (14): PreferencesContext, PreferencesProvider(), Settings, Language, ThemeEditor(), color(), contrast(), readableText() (+6 more)

### Community 95 - "app.tsx"
Cohesion: 0.13
Nodes (30): AiPage, AnalyticsPage, AppContent(), ApplicationFeedback(), AuthenticatedApp(), BoardsPage, CalendarPage, ContactsPage (+22 more)

### Community 97 - "countdowns.rs"
Cohesion: 0.18
Nodes (8): MAX_EVENT_YEAR, MIN_EVENT_YEAR, leap_age_repetitions_and_elapsed_are_calendar_correct(), missing_contact_birthdate_suspends_without_exposing_placeholder_dates(), now(), occurrences(), row(), timed_events_roll_forward_and_share_schedule_dst_rules()

### Community 98 - "workouts_smoke.py"
Cohesion: 0.19
Nodes (8): training(), run(), main(), run(), command(), entry(), exercise(), plan()

### Community 99 - "sounds.ts"
Cohesion: 0.39
Nodes (9): SoundProvider(), apply(), configureSounds(), playSound(), playTaskResult(), previewSound(), settings, SoundPreferences (+1 more)

### Community 100 - "cache.ts"
Cohesion: 0.16
Nodes (17): AuthContext, AuthContextValue, User, AuthProvider(), clearResourceCache(), empty, entries, Entry (+9 more)

### Community 101 - "useLanguage"
Cohesion: 0.08
Nodes (60): Shared labels, history, links and loading, Dialog(), AlertTriangle(), CircleSlash(), Clock3(), MoreHorizontal(), RotateCcw(), ErrorState() (+52 more)

### Community 102 - "workout_preferences.rs"
Cohesion: 0.31
Nodes (8): Conditions, Input, load(), Preferences, read(), routes(), training_conditions_preserve_unknown_and_limit_unicode(), update()

### Community 104 - "start"
Cohesion: 0.32
Nodes (10): accounts(), AttemptQuery, authorize(), callback(), complete(), failure(), models(), pending_context() (+2 more)

### Community 105 - "contacts/domain.rs"
Cohesion: 0.21
Nodes (8): Contact, ContactData, duplicate(), normalized(), PhoneKey, WriteMode, Create, Update

### Community 106 - "service.rs"
Cohesion: 0.27
Nodes (8): Imported, LabelChange, delete(), import(), labels(), MAX_IMPORT_CONTACTS, save(), stale()

### Community 108 - "policy.ts"
Cohesion: 0.27
Nodes (12): animateDragLayout(), captureDragLayout(), dragFeedback(), identities, installDragAnimations(), items(), key(), positions (+4 more)

### Community 109 - "operators/service.ts"
Cohesion: 0.28
Nodes (10): OperatorBadge(), OperatorResult, rangeOperator(), cache, clearOperatorCache(), lookupOperator(), pending, resetOperators() (+2 more)

### Community 110 - "ai_smoke.py"
Cohesion: 0.15
Nodes (7): run(), save(), assistant(), task_body(), run(), current(), mutate()

### Community 111 - "countdowns/domain.rs"
Cohesion: 0.36
Nodes (7): at_index(), category(), clamped(), computed(), index_near(), instant(), MAX_OCCURRENCE_YEAR

### Community 112 - "model.rs"
Cohesion: 0.36
Nodes (6): Countdown, Details, Display, EventOccurrence, Row, Snapshot

### Community 113 - "disconnect"
Cohesion: 0.27
Nodes (10): access(), account(), account_context(), disconnect(), DisconnectInput, Revision, revoke(), select() (+2 more)

### Community 114 - "health.rs"
Cohesion: 0.27
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

### Community 115 - "LifeCycle frontend"
Cohesion: 0.18
Nodes (11): LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Единые метки, история, загрузка и контакты — 03.11.2026, Интимный журнал (этап 6), Основные данные (этап 3), Праздники, анимации и эффекты — 03.11.2026, Привычки (этап 4) (+3 more)

### Community 116 - "filter-query.ts"
Cohesion: 0.33
Nodes (9): aiFilter, Field, FilterTerm, matchesFilter(), matchValue(), normalize(), parseFilterQuery(), rangeFilters (+1 more)

### Community 118 - "DeleteEvents"
Cohesion: 0.22
Nodes (6): DeleteEvents, Delete, Keep, LabelKind, Categories, Tags

### Community 119 - "serialize"
Cohesion: 0.39
Nodes (4): Delete, Import, ImportItem, Input

### Community 120 - "preload-provider.tsx"
Cohesion: 0.32
Nodes (5): App(), prefetchResource(), PreloadProvider(), resources, preloadPage()

### Community 121 - "LifeCycle"
Cohesion: 0.25
Nodes (8): LifeCycle, Upgrade v1: этапы 1.1–1.3, Upgrade v1: этапы 1.4–1.5, Единый рабочий экран задач, Локальный запуск, Подключение AI, Проверки, Структура

### Community 122 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.29
Nodes (7): Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Массовые заметки и навигация — 02.11.2026, Рабочее пространство — 02.11.2026

### Community 123 - "ContactBinding"
Cohesion: 0.48
Nodes (4): ContactBinding, Birthday, Independent, Linked

### Community 124 - "external-link.tsx"
Cohesion: 0.57
Nodes (4): linkIcon(), LinkService, phoneLinks(), safeExternalUrl()

### Community 128 - "AI-помощник `/ai`"
Cohesion: 0.67
Nodes (3): AI-помощник `/ai`, Какие записи видит AI, Просмотр и применение предложений

### Community 129 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.67
Nodes (3): UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Рабочее пространство — 02.11.2026

### Community 130 - "Общие frontend-системы — 02.11.2026"
Cohesion: 0.67
Nodes (3): Общие frontend-системы — 02.11.2026, Проверка, Сохранение и совместимость

## Knowledge Gaps
- **35 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+30 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 569 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `tasks.rs` (3× useful, score=2.772880876) _(code changed — re-verify)_
- `project_progress.md` (3× useful, score=2.711096496) _(code changed — re-verify)_
- `ai_login.rs` (2× useful, score=1.835980333)
- `ai_provider.rs` (2× useful, score=1.835980333)
- `habits.rs` (2× useful, score=1.790486949) _(code changed — re-verify)_
- `schedule.rs` (2× useful, score=1.790486949)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeCycle frontend` connect `LifeCycle frontend` to `UX-правки задач, досок и навигации (31.10.2026)`, `README.md`?**
  _High betweenness centrality (0.431) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useLanguage()` (e.g. with `Переиспользование` and `getLanguage()`) actually correct?**
  _`useLanguage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _35 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.12655367231638417 - nodes in this community are weakly interconnected._
- **Why does `pomodoro()` connect `require` to `ai_upgrade_smoke.py`, `LifeCycle frontend`?**
  _High betweenness centrality (0.425) - this node is a cross-community bridge._
- **Should `t` be split into smaller, more focused modules?**
  _Cohesion score 0.088841882601798 - nodes in this community are weakly interconnected._
- **Why does `Общие метки, история и операторы — миграции 0023–0025` connect `LifeCycle frontend` to `require`?**
  _High betweenness centrality (0.425) - this node is a cross-community bridge._