# Graph Report - LifeCycle  (2026-11-05)

## Corpus Check
- 575 files · ~229,157 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 43 file(s) not represented in the graph (top: (none) 10, .network 9, .trace 9)

## Summary
- 3581 nodes · 13502 edges · 172 communities (137 shown, 35 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 358 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `765e1b39`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useLanguage
- Graphify Project Navigation
- functions.rs
- contacts-page.tsx
- services
- ai_upgrade_smoke.py
- habits/tests.rs
- environment
- package.json
- compilerOptions
- redis
- components.json
- theme-editor.tsx
- compilerOptions
- frontend
- habits-page.tsx
- scripts
- cache.ts
- dependencies
- allowBuilds
- tsconfig.json
- ApiJson
- AppIcon
- lifecycle-api
- domain
- programs/models.rs
- notes-page.tsx
- auth/handlers.rs
- locale.ts
- notes/handlers.rs
- garage
- mailpit
- postgres
- redis
- upgrade-helpers.ts
- argparse
- errors.rs
- schedule.rs
- access/handlers.rs
- depends_on
- analytics/service.rs
- contacts/handlers.rs
- AppState
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- contacts/domain.rs
- requests.rs
- countdowns/repository.rs
- Q: Stage 8 AI recovery and provider authentication
- intimacy/models.rs
- boards-page.tsx
- workouts-page.tsx
- catalog.ts
- path
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- health.rs
- responses.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- vitest
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- tasks/handlers.rs
- settings/handlers.rs
- contacts-page.tsx
- Q: Stage 9 final integration of LifeCycle after stage 8
- sys
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- history/handlers.rs
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- pomodoro-page.tsx
- contacts/repository.rs
- countdowns/dto.rs
- require
- auth.rs
- surfaces.tsx
- auth_smoke.py
- habits/models.rs
- login/service.rs
- contacts/service.rs
- utc
- serialize
- effect-provider.tsx
- planning.rs
- ai/service.rs
- LifeCycle frontend
- mail.rs
- generation.rs
- api
- marks.rs
- sidebar-navigation.tsx
- app.tsx
- LICENSES.md
- countdowns/mod.rs
- workouts_smoke.py
- sounds.ts
- context.rs
- DeleteEvents
- ai/models.rs
- SOURCES.md
- media.ts
- programs/handlers.rs
- workouts/handlers.rs
- labels/models.rs
- ensure_owned
- profile/handlers.rs
- Client
- sessions/models.rs
- preferences/handlers.rs
- crypto.rs
- tasks/service.rs
- contacts/types.ts
- profile/types.ts
- contacts/dto.rs
- chats.rs
- health/api.ts
- ai/dto.rs
- icons/SOURCES.md
- feedback-provider.tsx
- countdowns/handlers.rs
- countdowns/types.ts
- settings.rs
- health-page.tsx
- model.rs
- generate-icons.mjs
- operators/SOURCES.md
- sessions/handlers.rs
- TaskOccurrenceResponse
- profile/models.rs
- functional-labels-one-acti-c46dd-nal-cost-persists-on-mobile/error-context.md
- habits-habit-checkbox-Mark-df27c-oday-and-calendar-on-mobile/error-context.md
- operators/handlers.rs
- tasks/dto.rs
- holidays.ts
- tasks/models.rs
- state.rs
- shared-systems.spec.ts
- navigation/handlers.rs
- LifeCycle frontend
- pomodoro/models.rs
- settings/models.rs
- duration
- habits/dto.rs
- tasks/tests.rs
- statuscode
- ai.spec.ts
- ContactBinding
- lock_tasks
- Frontend
- redis.rs
- mutate
- countdowns-page.tsx
- LifeCycle
- UX-правки задач, досок и навигации (31.10.2026)
- AI-помощник `/ai`
- UX-правки задач, досок и навигации (31.10.2026)
- Общие frontend-системы — 02.11.2026
- declaredActions

## God Nodes (most connected - your core abstractions)
1. `AppState` - 363 edges
2. `t()` - 325 edges
3. `useLanguage()` - 236 edges
4. `CurrentUser` - 181 edges
5. `Button()` - 152 edges
6. `api()` - 135 edges
7. `AppIcon()` - 125 edges
8. `errorMessage()` - 122 edges
9. `react` - 104 edges
10. `ApiJson` - 99 edges

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
- 1-file cycle: `backend/src/routes.rs -> backend/src/routes.rs`
- 1-file cycle: `backend/src/modules/history/handlers.rs -> backend/src/modules/history/handlers.rs`
- 1-file cycle: `backend/src/modules/operators/handlers.rs -> backend/src/modules/operators/handlers.rs`
- 2-file cycle: `backend/src/modules/intimacy/models.rs -> backend/src/modules/intimacy/service.rs -> backend/src/modules/intimacy/models.rs`

## Communities (172 total, 35 thin omitted)

### Community 0 - "useLanguage"
Cohesion: 0.10
Nodes (82): Переиспользование, Dialog(), FormField(), MarkdownEditor(), render(), Button(), buttonVariants, Input() (+74 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "functions.rs"
Cohesion: 0.06
Nodes (50): Collection, collection_catalog(), collection_expandable(), CollectionValue, fixed_collection_value(), seed(), stored_value(), aad() (+42 more)

### Community 3 - "contacts-page.tsx"
Cohesion: 0.16
Nodes (28): IconPicker(), collectionCatalog, collectionDefinition, CollectionKind, CollectionOption, collectionOptions(), isCollectionKind(), CollectionEditor() (+20 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.11
Nodes (12): main(), assistant(), run(), seal(), training(), run(), main(), ready() (+4 more)

### Community 6 - "habits/tests.rs"
Cohesion: 0.19
Nodes (6): summarize(), current_untimed_pending_does_not_break_a_completed_streak(), fixture(), habits_are_repeating_all_day_events(), row(), statistics_distinguish_cancellation_skips_missing_and_future()

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.07
Nodes (40): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, motion-ai@^14.2.0, @playwright/test@^1.64.1 (+32 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleResolution, noEmit (+11 more)

### Community 10 - "redis"
Cohesion: 0.45
Nodes (11): healthcheck, healthcheck, healthcheck, interval, retries, start_period, test, timeout (+3 more)

### Community 11 - "components.json"
Cohesion: 0.17
Nodes (11): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+3 more)

### Community 12 - "theme-editor.tsx"
Cohesion: 0.13
Nodes (21): defaults, PreferencesContext, PreferencesProvider(), Settings, configureAnimations(), configureEffects(), Language, ExtraSubjectTags (+13 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, module, moduleResolution, noEmit, paths (+7 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "habits-page.tsx"
Cohesion: 0.12
Nodes (31): HabitControls(), save(), submit(), habitFilters, statisticsLabels, emptyMark(), Habit, HabitConfig (+23 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "cache.ts"
Cohesion: 0.17
Nodes (17): AuthContext, AuthContextValue, User, AuthProvider(), clearResourceCache(), empty, entries, Entry (+9 more)

### Community 19 - "dependencies"
Cohesion: 0.06
Nodes (33): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, date-holidays@^3.38.0, @foleyjs/core@^2.9.0, @iconify-json/circle-flags@^1.2.14, @iconify-json/simple-icons@^1.2.101, @iconify-json/tabler@^1.2.43 (+25 more)

### Community 20 - "allowBuilds"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, @tsparticles/engine

### Community 22 - "ApiJson"
Cohesion: 0.14
Nodes (30): add_column(), create(), create_task(), list(), memberships(), move_item(), read(), remove() (+22 more)

### Community 23 - "AppIcon"
Cohesion: 0.08
Nodes (46): Activity(), AlertTriangle(), ArrowDown(), ArrowUp(), BarChart3(), BookUser(), Cake(), CalendarClock() (+38 more)

### Community 25 - "domain"
Cohesion: 0.07
Nodes (43): change(), exercise_visible(), object_table(), visible(), apply(), dismiss(), list(), prepare() (+35 more)

### Community 26 - "programs/models.rs"
Cohesion: 0.11
Nodes (20): Action, Anchor, Config, ConfigInput, History, HistoryQuery, MAX_REPLAY_INTERVALS, Program (+12 more)

### Community 27 - "notes-page.tsx"
Cohesion: 0.10
Nodes (56): save(), ContactImport(), exportContacts(), refresh(), remove(), unlink(), refresh(), remove() (+48 more)

### Community 28 - "auth/handlers.rs"
Cohesion: 0.14
Nodes (17): client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me(), MessageResponse (+9 more)

### Community 29 - "locale.ts"
Cohesion: 0.16
Nodes (19): LoaderCircle(), AiSettings(), SettingsPage(), submit(), timezones, supportedTimezones(), LanguageInput(), commitLanguage() (+11 more)

### Community 30 - "notes/handlers.rs"
Cohesion: 0.18
Nodes (18): bulk(), create_folder(), create_note(), delete_folder(), delete_note(), folder(), folders(), note() (+10 more)

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

### Community 35 - "upgrade-helpers.ts"
Cohesion: 0.19
Nodes (7): addCollectionItem(), chooseAction(), confirmUi(), login(), quickNote(), selectTags(), @playwright/test

### Community 36 - "argparse"
Cohesion: 0.19
Nodes (4): main(), task_body(), run(), main()

### Community 37 - "errors.rs"
Cohesion: 0.12
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 38 - "schedule.rs"
Cohesion: 0.15
Nodes (13): date(), deserialize(), intervals_count_calendar_days_across_dst_without_drifting(), invalid_rules_and_unbounded_queries_are_rejected(), missing_calendar_day_is_resolved_without_panicking(), nonexistent_time_moves_to_next_valid_minute(), repeated_time_chooses_earliest_instant(), resolve_local_start() (+5 more)

### Community 39 - "access/handlers.rs"
Cohesion: 0.19
Nodes (10): exercise(), note(), notes_bulk(), workout(), Access, BulkAccess, BulkInput, BulkItem (+2 more)

### Community 41 - "depends_on"
Cohesion: 0.17
Nodes (12): depends_on, networks, restart, garage, mailpit, postgres, redis, condition (+4 more)

### Community 42 - "analytics/service.rs"
Cohesion: 0.08
Nodes (23): read_privacy(), report(), update_privacy(), Day, HabitMetrics, Privacy, ProfileMetrics, Range (+15 more)

### Community 44 - "contacts/handlers.rs"
Cohesion: 0.32
Nodes (8): create(), delete(), import(), labels(), list(), read(), routes(), update()

### Community 45 - "AppState"
Cohesion: 0.07
Nodes (18): AppState, routes(), historical_task(), historical_tasks(), owned(), routes(), routes(), routes() (+10 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.15
Nodes (12): main(), run(), shutdown(), router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin() (+4 more)

### Community 48 - "contacts/domain.rs"
Cohesion: 0.21
Nodes (8): Contact, ContactData, duplicate(), normalized(), PhoneKey, WriteMode, Create, Update

### Community 49 - "requests.rs"
Cohesion: 0.27
Nodes (12): config(), expire(), history(), invalidate(), load_turn(), require_chat(), turn(), TURN_COLUMNS (+4 more)

### Community 50 - "countdowns/repository.rs"
Cohesion: 0.26
Nodes (14): apply_contact(), apply_snapshot(), delete(), detach_contact(), detach_one(), encrypt_snapshot(), hydrate(), load_for_update() (+6 more)

### Community 51 - "Q: Stage 8 AI recovery and provider authentication"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 AI recovery and provider authentication, Source Nodes

### Community 52 - "intimacy/models.rs"
Cohesion: 0.06
Nodes (45): create(), delete(), list(), read(), update(), validate_collection_emotions(), AnalyticsSummary, Answers (+37 more)

### Community 53 - "boards-page.tsx"
Cohesion: 0.07
Nodes (63): create(), Board, BoardColumn, BoardItem, BoardState, Membership, BoardsPage(), cancel() (+55 more)

### Community 54 - "workouts-page.tsx"
Cohesion: 0.17
Nodes (21): entityLabels, labels, ActionChange, Entry, Exercise, kindLabels, moveItem(), newEntry() (+13 more)

### Community 55 - "catalog.ts"
Cohesion: 0.09
Nodes (22): AppIconProps, available, brandBody, catalogVersion(), data, iconCatalog, iconData(), IconEntry (+14 more)

### Community 56 - "path"
Cohesion: 0.21
Nodes (4): download(), upload(), MAX_BYTES, Media

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "CurrentUser"
Cohesion: 0.20
Nodes (13): DeleteHistory, create(), delete(), delete_history(), history(), list(), mark(), read() (+5 more)

### Community 59 - "health.rs"
Cohesion: 0.27
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

### Community 60 - "responses.rs"
Cohesion: 0.08
Nodes (31): client(), endpoint(), generate(), Answer, bounded_json(), bounded_json_limit(), client(), endpoint() (+23 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "vitest"
Cohesion: 0.12
Nodes (11): vitest@^5.0.5, generatedMarkdown(), parseActions(), GeneratedActions, changedInterval(), intervalAt(), pointerMove(), fields (+3 more)

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "tasks/handlers.rs"
Cohesion: 0.29
Nodes (13): CalendarQuery, OccurrenceInput, TodayQuery, calendar(), create(), delete(), history(), list() (+5 more)

### Community 67 - "contacts-page.tsx"
Cohesion: 0.06
Nodes (93): Centralized systems (mandatory), FilterSearch(), ChevronLeft(), ChevronRight(), RefreshCw(), ShieldCheck(), Markdown(), ErrorState() (+85 more)

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 69 - "sys"
Cohesion: 0.10
Nodes (7): Table, main(), run(), send(), origin_url(), run(), main()

### Community 70 - "Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?, Source Nodes

### Community 71 - "history/handlers.rs"
Cohesion: 0.16
Nodes (10): BulkItem, BulkRemove, feed(), remove(), remove_bulk(), remove_one(), Feed, FeedItem (+2 more)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 74 - "pomodoro-page.tsx"
Cohesion: 0.15
Nodes (21): Pencil(), Plus(), Trash2(), X(), QuickTask(), submit(), PomodoroPage(), change() (+13 more)

### Community 75 - "contacts/repository.rs"
Cohesion: 0.35
Nodes (11): all(), decode(), delete_contact(), delete_events(), disable_birthday(), enable_birthday(), load(), lock() (+3 more)

### Community 76 - "countdowns/dto.rs"
Cohesion: 0.15
Nodes (9): Recurrence, Daily, Monthly, Once, Yearly, CountdownInput, nullable(), nullable_id() (+1 more)

### Community 77 - "require"
Cohesion: 0.24
Nodes (16): require(), SmokeFailure, countdowns(), listed(), main(), media(), notes_and_folders(), pomodoro() (+8 more)

### Community 78 - "auth.rs"
Cohesion: 0.33
Nodes (3): authenticate(), session_cookie(), session_token()

### Community 79 - "surfaces.tsx"
Cohesion: 0.15
Nodes (24): AnimationProvider(), animateDragLayout(), captureDragLayout(), dragFeedback(), identities, installDragAnimations(), items(), key() (+16 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (10): NoRedirect, raw(), run(), email_address(), main(), read_code(), request_code(), run() (+2 more)

### Community 81 - "habits/models.rs"
Cohesion: 0.16
Nodes (9): HabitConfig, HabitMark, HabitStatistics, HabitStatus, Cancelled, Completed, Pending, Skipped (+1 more)

### Community 82 - "login/service.rs"
Cohesion: 0.06
Nodes (45): Config, validated_url(), accounts(), authorize(), callback(), complete(), disconnect(), models() (+37 more)

### Community 83 - "contacts/service.rs"
Cohesion: 0.29
Nodes (7): LabelChange, delete(), import(), labels(), MAX_IMPORT_CONTACTS, save(), stale()

### Community 84 - "utc"
Cohesion: 0.19
Nodes (4): save(), active(), change(), start()

### Community 85 - "serialize"
Cohesion: 0.15
Nodes (8): Navigation, PAGES, Lookup, Preferences, ProviderData, Conditions, Input, Preferences

### Community 86 - "effect-provider.tsx"
Cohesion: 0.21
Nodes (16): Движение и эффекты, prefersReducedMotion(), EffectProvider(), effectEvents, EffectKind, effectOrigin, EffectRequest, effectsEnabled() (+8 more)

### Community 87 - "planning.rs"
Cohesion: 0.26
Nodes (10): gantt_moves_the_entire_weekly_rule_and_validates_occurrences_and_precision(), gantt_rejects_the_second_dst_instant_and_keeps_the_series_anchor(), schedule(), calendar_date(), next_schedule_date(), PlannedStart, replanned(), schedule_in_profile_range() (+2 more)

### Community 88 - "ai/service.rs"
Cohesion: 0.19
Nodes (5): allowed_history(), open(), question(), rate_limit(), seal()

### Community 89 - "LifeCycle frontend"
Cohesion: 0.17
Nodes (12): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Общие метки, история и операторы — миграции 0023–0025, Основные данные (этап 3) (+4 more)

### Community 90 - "mail.rs"
Cohesion: 0.35
Nodes (3): send_code(), transport(), unavailable()

### Community 91 - "generation.rs"
Cohesion: 0.15
Nodes (7): generate(), wait_for_cancel(), tailwind, baseColor, config, css, cssVariables

### Community 92 - "api"
Cohesion: 0.08
Nodes (62): ActionReview(), command(), edit(), refreshActions(), AiPage(), Workspace(), remove(), Attempt (+54 more)

### Community 93 - "marks.rs"
Cohesion: 0.37
Nodes (7): complete_workout(), editable_occurrence(), mark_in_transaction(), normalize_mark(), task_status(), workout_occurrence(), completion_is_explicit_and_old_subhabit_input_is_rejected()

### Community 94 - "sidebar-navigation.tsx"
Cohesion: 0.31
Nodes (9): GripVertical(), Pin(), PinOff(), Settings2(), Item, Navigation, SidebarNavigation(), move() (+1 more)

### Community 95 - "app.tsx"
Cohesion: 0.10
Nodes (37): AiPage, AnalyticsPage, App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), BoardsPage, CalendarPage (+29 more)

### Community 97 - "countdowns/mod.rs"
Cohesion: 0.15
Nodes (15): at_index(), category(), clamped(), computed(), index_near(), instant(), MAX_EVENT_YEAR, MAX_OCCURRENCE_YEAR (+7 more)

### Community 98 - "workouts_smoke.py"
Cohesion: 0.23
Nodes (13): run(), run(), find_occurrence(), occurrences(), main(), run(), schedule_cases(), command() (+5 more)

### Community 99 - "sounds.ts"
Cohesion: 0.28
Nodes (12): @foleyjs/react@^2.9.0, feedbackEvents, SoundProvider(), apply(), configureSounds(), playSound(), playTaskResult(), previewSound() (+4 more)

### Community 100 - "context.rs"
Cohesion: 0.42
Nodes (3): build(), clip(), validate_range()

### Community 101 - "DeleteEvents"
Cohesion: 0.22
Nodes (6): DeleteEvents, Delete, Keep, LabelKind, Categories, Tags

### Community 102 - "ai/models.rs"
Cohesion: 0.24
Nodes (7): Chat, Config, Permissions, Preview, Turn, TurnData, TurnRow

### Community 104 - "media.ts"
Cohesion: 0.35
Nodes (10): safeMarkdownUrl(), upload(), imageAccept, imageTypes, markdownImage(), mediaId(), mediaIdsInMarkdown(), mediaUrl() (+2 more)

### Community 105 - "programs/handlers.rs"
Cohesion: 0.31
Nodes (6): create(), delete(), history(), list(), start(), update()

### Community 106 - "workouts/handlers.rs"
Cohesion: 0.06
Nodes (44): BulkAction, Color, Delete, Move, TagsAdd, TagsRemove, BulkItem, BulkNotes (+36 more)

### Community 107 - "labels/models.rs"
Cohesion: 0.24
Nodes (6): CollectionDetails, Data, Input, Label, Revision, Row

### Community 109 - "profile/handlers.rs"
Cohesion: 0.25
Nodes (7): Value, read(), update(), decode(), load(), merge(), partial_current_updates_preserve_origin_and_first_events()

### Community 110 - "Client"
Cohesion: 0.09
Nodes (17): run(), save(), Client, run(), login(), run(), run(), run() (+9 more)

### Community 111 - "sessions/models.rs"
Cohesion: 0.28
Nodes (5): HistoryQuery, Session, Start, StepResult, Summary

### Community 112 - "preferences/handlers.rs"
Cohesion: 0.23
Nodes (3): read(), update(), load()

### Community 114 - "tasks/service.rs"
Cohesion: 0.42
Nodes (6): delete_in(), occurrences(), persist_occurrence(), save(), save_in(), valid_status()

### Community 115 - "contacts/types.ts"
Cohesion: 0.19
Nodes (18): submit(), pick(), readFile(), decode(), devicePicker(), parseContactFile(), parseVcards(), Picker (+10 more)

### Community 116 - "profile/types.ts"
Cohesion: 0.16
Nodes (15): submit(), draftToProfile(), emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey (+7 more)

### Community 117 - "contacts/dto.rs"
Cohesion: 0.39
Nodes (5): Delete, Import, Imported, ImportItem, Input

### Community 118 - "chats.rs"
Cohesion: 0.31
Nodes (5): chats(), create_chat(), delete_chat(), read_chat(), routes()

### Community 119 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 120 - "ai/dto.rs"
Cohesion: 0.43
Nodes (3): ConfigInput, PreviewInput, SendInput

### Community 122 - "feedback-provider.tsx"
Cohesion: 0.16
Nodes (15): menu(), FeedbackProvider(), Request, CheckCircle2(), Info(), TriangleAlert(), Confirmation, Notice (+7 more)

### Community 123 - "countdowns/handlers.rs"
Cohesion: 0.34
Nodes (7): create(), delete(), list(), read(), routes(), unlink(), update()

### Community 124 - "countdowns/types.ts"
Cohesion: 0.14
Nodes (12): contact(), settings, birthday, defaults, paths, setup(), Contact, Countdown (+4 more)

### Community 125 - "settings.rs"
Cohesion: 0.32
Nodes (8): ConnectionRevision, ConfigView, stale(), ollama_models(), read_config(), remove_connection(), update_config(), valid_model()

### Community 127 - "health-page.tsx"
Cohesion: 0.17
Nodes (23): ArrowLeft(), ArrowRight(), Check(), CircleAlert(), Database(), HardDrive(), Mail(), Server() (+15 more)

### Community 128 - "model.rs"
Cohesion: 0.36
Nodes (6): Countdown, Details, Display, EventOccurrence, Row, Snapshot

### Community 132 - "sessions/handlers.rs"
Cohesion: 0.41
Nodes (6): active(), change(), history(), read(), start(), Command

### Community 133 - "TaskOccurrenceResponse"
Cohesion: 0.30
Nodes (3): occurrences(), validate_range(), TaskOccurrenceResponse

### Community 135 - "profile/models.rs"
Cohesion: 0.31
Nodes (5): Firsts, HabitPeriod, HarmfulHabit, Origin, Profile

### Community 136 - "functional-labels-one-acti-c46dd-nal-cost-persists-on-mobile/error-context.md"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Page snapshot, Test info

### Community 137 - "habits-habit-checkbox-Mark-df27c-oday-and-calendar-on-mobile/error-context.md"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Test info, Test source

### Community 139 - "operators/handlers.rs"
Cohesion: 0.17
Nodes (7): lookup(), read(), save(), ResultData, Status, digits(), fingerprint()

### Community 141 - "tasks/dto.rs"
Cohesion: 0.32
Nodes (4): CalendarResponse, PlanInput, TaskInput, TodayResponse

### Community 142 - "holidays.ts"
Cohesion: 0.06
Nodes (63): Праздники, ChoiceInput(), ChoicePicker(), FilterQuery, buildHolidayYear(), holidayIdentity(), sharedNames, holidayFilters (+55 more)

### Community 147 - "shared-systems.spec.ts"
Cohesion: 0.24
Nodes (6): collectionsSetup(), defaults, fixedRegistry(), gallerySetup(), png, setup()

### Community 149 - "LifeCycle frontend"
Cohesion: 0.18
Nodes (11): LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Единые метки, история, загрузка и контакты — 03.11.2026, Интимный журнал (этап 6), Основные данные (этап 3), Праздники, анимации и эффекты — 03.11.2026, Привычки (этап 4) (+3 more)

### Community 155 - "habits/dto.rs"
Cohesion: 0.39
Nodes (3): HabitInput, MarkInput, Range

### Community 156 - "tasks/tests.rs"
Cohesion: 0.57
Nodes (6): date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), multiday_tasks_overlap_calendar_and_search_without_changing_the_occurrence_key(), open_date_filters_find_old_and_distant_recurrences(), schedule(), timed_calendar_and_date_search_use_the_profile_day()

### Community 159 - "ContactBinding"
Cohesion: 0.48
Nodes (4): ContactBinding, Birthday, Independent, Linked

### Community 163 - "Frontend"
Cohesion: 0.33
Nodes (5): Before finishing, Frontend, New centralized systems, Skils, UI principles

### Community 166 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 167 - "countdowns-page.tsx"
Cohesion: 0.11
Nodes (34): DateTimeInput(), CountdownsPage(), Remaining(), EventOccurrence, update(), persist(), pointerUp(), addClockMinutes() (+26 more)

### Community 172 - "LifeCycle"
Cohesion: 0.25
Nodes (8): LifeCycle, Upgrade v1: этапы 1.1–1.3, Upgrade v1: этапы 1.4–1.5, Единый рабочий экран задач, Локальный запуск, Подключение AI, Проверки, Структура

### Community 174 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.29
Nodes (7): Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Массовые заметки и навигация — 02.11.2026, Рабочее пространство — 02.11.2026

### Community 181 - "AI-помощник `/ai`"
Cohesion: 0.67
Nodes (3): AI-помощник `/ai`, Какие записи видит AI, Просмотр и применение предложений

### Community 182 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.67
Nodes (3): UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Рабочее пространство — 02.11.2026

### Community 183 - "Общие frontend-системы — 02.11.2026"
Cohesion: 0.67
Nodes (3): Общие frontend-системы — 02.11.2026, Проверка, Сохранение и совместимость

## Knowledge Gaps
- **36 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 675 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `tasks.rs` (3× useful, score=2.772880876) _(code changed — re-verify)_
- `project_progress.md` (3× useful, score=2.711096496) _(code changed — re-verify)_
- `ai_login.rs` (2× useful, score=1.835980333) _(code changed — re-verify)_
- `ai_provider.rs` (2× useful, score=1.835980333) _(code changed — re-verify)_
- `habits.rs` (2× useful, score=1.790486949) _(code changed — re-verify)_
- `schedule.rs` (2× useful, score=1.790486949) _(code changed — re-verify)_

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.446) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useLanguage()` (e.g. with `Переиспользование` and `getLanguage()`) actually correct?**
  _`useLanguage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useLanguage` be split into smaller, more focused modules?**
  _Cohesion score 0.09610194902548726 - nodes in this community are weakly interconnected._
- **Why does `preview` connect `scripts` to `requests.rs`, `chats.rs`?**
  _High betweenness centrality (0.445) - this node is a cross-community bridge._
- **Should `functions.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.056363636363636366 - nodes in this community are weakly interconnected._
- **Why does `AppState` connect `AppState` to `functions.rs`, `sessions/handlers.rs`, `TaskOccurrenceResponse`, `operators/handlers.rs`, `state.rs`, `navigation/handlers.rs`, `ApiJson`, `domain`, `programs/models.rs`, `auth/handlers.rs`, `statuscode`, `notes/handlers.rs`, `lock_tasks`, `access/handlers.rs`, `analytics/service.rs`, `contacts/handlers.rs`, `foundation.rs`, `requests.rs`, `countdowns/repository.rs`, `intimacy/models.rs`, `path`, `CurrentUser`, `health.rs`, `tasks/handlers.rs`, `src/routes.rs`, `settings/handlers.rs`, `history/handlers.rs`, `contacts/repository.rs`, `auth.rs`, `login/service.rs`, `contacts/service.rs`, `utc`, `ai/service.rs`, `generation.rs`, `countdowns/mod.rs`, `context.rs`, `ai/models.rs`, `programs/handlers.rs`, `workouts/handlers.rs`, `profile/handlers.rs`, `preferences/handlers.rs`, `crypto.rs`, `tasks/service.rs`, `chats.rs`, `countdowns/handlers.rs`, `settings.rs`?**
  _High betweenness centrality (0.385) - this node is a cross-community bridge._