# Graph Report - LifeCycle  (2026-11-04)

## Corpus Check
- 552 files · ~221,625 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 9, .network 9, .trace 9)

## Summary
- 3463 nodes · 12655 edges · 159 communities (133 shown, 26 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 344 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f6100b25`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- t
- Graphify Project Navigation
- functions.rs
- locale.ts
- services
- ai_upgrade_smoke.py
- marks.rs
- environment
- package.json
- compilerOptions
- redis
- components.json
- health-page.tsx
- compilerOptions
- frontend
- login/service.rs
- scripts
- cache.ts
- contacts-page.tsx
- allowBuilds
- tsconfig.json
- ApiJson
- AppIcon
- lifecycle-api
- actions/service.rs
- programs/models.rs
- useLanguage
- auth/handlers.rs
- LifeCycle frontend
- notes/handlers.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- labels/handlers.rs
- errors.rs
- schedule.rs
- actions/handlers.rs
- depends_on
- analytics/service.rs
- contacts/handlers.rs
- AppState
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- access/handlers.rs
- requests.rs
- countdowns/repository.rs
- Q: Stage 8 AI recovery and provider authentication
- intimacy/models.rs
- dates.ts
- labels/service.rs
- catalog.ts
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- health.rs
- responses.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- actions/models.rs
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- tasks/handlers.rs
- media/handlers.rs
- boards-page.tsx
- Q: Stage 9 final integration of LifeCycle after stage 8
- sys
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- history/handlers.rs
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- api
- contacts/service.rs
- countdowns/dto.rs
- require
- auth.rs
- surfaces.tsx
- auth_smoke.py
- habits/models.rs
- intimacy/handlers.rs
- intimacy/service.rs
- utc
- serialize
- effect-provider.tsx
- planning.rs
- tags.rs
- LifeCycle frontend
- mail.rs
- generation.rs
- locale.ts
- context.rs
- theme-editor.tsx
- app.tsx
- LICENSES.md
- countdowns/mod.rs
- workouts_smoke.py
- sounds.ts
- statuscode
- actions/tests.rs
- ai/models.rs
- SOURCES.md
- markdown.tsx
- programs/handlers.rs
- workouts/handlers.rs
- date-time-input.tsx
- calendar-page.tsx
- profile/handlers.rs
- Client
- sessions/models.rs
- preferences/handlers.rs
- unified-workflows.spec.ts
- intimacy/tests.rs
- sidebar-navigation.tsx
- profile/types.ts
- LifeCycle
- chats.rs
- ai/service.rs
- json_as_dbjson
- icons/SOURCES.md
- feedback-provider.tsx
- countdowns/handlers.rs
- UX-правки задач, досок и навигации (31.10.2026)
- settings.rs
- access/routes.rs
- health/api.ts
- model.rs
- ai/dto.rs
- backend
- operators/SOURCES.md
- sessions/handlers.rs
- actions/routes.rs
- run
- profile/models.rs
- functional-labels-one-acti-c46dd-nal-cost-persists-on-mobile/error-context.md
- habits-habit-checkbox-Mark-df27c-oday-and-calendar-on-mobile/error-context.md
- FeedQuery
- operators/handlers.rs
- AI-помощник `/ai`
- tasks/models.rs
- run
- run
- UX-правки задач, досок и навигации (31.10.2026)
- Общие frontend-системы — 02.11.2026
- navigation/handlers.rs
- pomodoro/models.rs
- settings/models.rs
- ContactBinding
- audit
- Frontend
- redis.rs

## God Nodes (most connected - your core abstractions)
1. `AppState` - 356 edges
2. `t()` - 294 edges
3. `useLanguage()` - 214 edges
4. `CurrentUser` - 180 edges
5. `Button()` - 149 edges
6. `api()` - 126 edges
7. `AppIcon()` - 123 edges
8. `errorMessage()` - 114 edges
9. `ApiJson` - 98 edges
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
- 1-file cycle: `backend/src/routes.rs -> backend/src/routes.rs`
- 1-file cycle: `backend/src/modules/history/handlers.rs -> backend/src/modules/history/handlers.rs`
- 1-file cycle: `backend/src/modules/operators/handlers.rs -> backend/src/modules/operators/handlers.rs`
- 2-file cycle: `backend/src/modules/intimacy/models.rs -> backend/src/modules/intimacy/service.rs -> backend/src/modules/intimacy/models.rs`

## Communities (159 total, 26 thin omitted)

### Community 0 - "t"
Cohesion: 0.11
Nodes (66): Dialog(), FilterSearch(), FormField(), Button(), buttonVariants, Input(), Select(), Textarea() (+58 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "functions.rs"
Cohesion: 0.21
Nodes (19): aad(), append(), Assignment, Change, Cost, cost(), decoded(), exists() (+11 more)

### Community 3 - "locale.ts"
Cohesion: 0.17
Nodes (22): Plus(), Trash2(), EntryDetail(), IntimacyPage(), VisibleJournal(), AnswersRow(), JournalStatistics(), answerLabel() (+14 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.11
Nodes (14): main(), assistant(), run(), seal(), training(), run(), main(), ready() (+6 more)

### Community 6 - "marks.rs"
Cohesion: 0.11
Nodes (16): HabitInput, MarkInput, Range, complete_workout(), editable_occurrence(), mark_in_transaction(), normalize_mark(), task_status() (+8 more)

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.04
Nodes (72): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, date-holidays@^3.38.0, @foleyjs/core@^2.9.0, @foleyjs/react@^2.9.0, @iconify-json/circle-flags@^1.2.14, @iconify-json/simple-icons@^1.2.101 (+64 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 10 - "redis"
Cohesion: 0.45
Nodes (11): healthcheck, healthcheck, healthcheck, interval, retries, start_period, test, timeout (+3 more)

### Community 11 - "components.json"
Cohesion: 0.17
Nodes (11): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+3 more)

### Community 12 - "health-page.tsx"
Cohesion: 0.17
Nodes (24): ArrowLeft(), ArrowRight(), Check(), CircleAlert(), Database(), HardDrive(), LoaderCircle(), Mail() (+16 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, module, moduleResolution, noEmit, paths (+7 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "login/service.rs"
Cohesion: 0.06
Nodes (44): Config, validated_url(), accounts(), authorize(), callback(), complete(), disconnect(), models() (+36 more)

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "cache.ts"
Cohesion: 0.16
Nodes (18): AuthContext, AuthContextValue, User, AuthProvider(), clearResourceCache(), empty, entries, Entry (+10 more)

### Community 19 - "contacts-page.tsx"
Cohesion: 0.15
Nodes (28): contact(), ContactImport(), submit(), ContactsPage(), exportContacts(), pick(), readFile(), remove() (+20 more)

### Community 20 - "allowBuilds"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, @tsparticles/engine

### Community 22 - "ApiJson"
Cohesion: 0.14
Nodes (29): add_column(), create(), create_task(), list(), memberships(), move_item(), read(), remove() (+21 more)

### Community 23 - "AppIcon"
Cohesion: 0.09
Nodes (43): Activity(), AlertTriangle(), ArrowDown(), ArrowUp(), BarChart3(), BookUser(), Cake(), CalendarClock() (+35 more)

### Community 25 - "actions/service.rs"
Cohesion: 0.28
Nodes (11): check_exercise_links(), context(), current(), duplicate(), merge(), persist(), remove(), row() (+3 more)

### Community 26 - "programs/models.rs"
Cohesion: 0.11
Nodes (20): Action, Anchor, Config, ConfigInput, History, HistoryQuery, MAX_REPLAY_INTERVALS, Program (+12 more)

### Community 27 - "useLanguage"
Cohesion: 0.11
Nodes (47): Centralized systems (mandatory), RefreshCw(), ShieldCheck(), ErrorState(), LoadingState(), ActionJournal(), ChangeView(), AiPage() (+39 more)

### Community 28 - "auth/handlers.rs"
Cohesion: 0.14
Nodes (17): client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me(), MessageResponse (+9 more)

### Community 29 - "LifeCycle frontend"
Cohesion: 0.17
Nodes (12): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Общие метки, история и операторы — миграции 0023–0025, Основные данные (этап 3) (+4 more)

### Community 30 - "notes/handlers.rs"
Cohesion: 0.11
Nodes (29): bulk(), create_folder(), create_note(), delete_folder(), delete_note(), folder(), folders(), note() (+21 more)

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
Cohesion: 0.11
Nodes (7): chooseAction(), confirmUi(), login(), noteProperties(), quickNote(), selectTags(), @playwright/test

### Community 36 - "labels/handlers.rs"
Cohesion: 0.24
Nodes (7): create(), list(), list_tags(), remove(), update(), Filter, validate_icon()

### Community 37 - "errors.rs"
Cohesion: 0.12
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 38 - "schedule.rs"
Cohesion: 0.15
Nodes (13): date(), deserialize(), intervals_count_calendar_days_across_dst_without_drifting(), invalid_rules_and_unbounded_queries_are_rejected(), missing_calendar_day_is_resolved_without_panicking(), nonexistent_time_moves_to_next_valid_minute(), repeated_time_chooses_earliest_instant(), resolve_local_start() (+5 more)

### Community 39 - "actions/handlers.rs"
Cohesion: 0.26
Nodes (8): apply(), dismiss(), list(), prepare(), undo(), check_actions(), conflict(), denied()

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "analytics/service.rs"
Cohesion: 0.08
Nodes (23): read_privacy(), report(), update_privacy(), Day, HabitMetrics, Privacy, ProfileMetrics, Range (+15 more)

### Community 44 - "contacts/handlers.rs"
Cohesion: 0.21
Nodes (11): create(), delete(), import(), labels(), list(), read(), routes(), update() (+3 more)

### Community 45 - "AppState"
Cohesion: 0.06
Nodes (15): AppState, routes(), routes(), routes(), routes(), routes(), routes(), routes() (+7 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.12
Nodes (17): main(), run(), shutdown(), router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin() (+9 more)

### Community 48 - "access/handlers.rs"
Cohesion: 0.20
Nodes (12): exercise(), note(), notes_bulk(), workout(), Access, BulkAccess, BulkInput, BulkItem (+4 more)

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
Cohesion: 0.13
Nodes (15): Answers, Day, Entry, EntryData, Journal, Kind, Masturbation, Sex (+7 more)

### Community 53 - "dates.ts"
Cohesion: 0.07
Nodes (69): CountdownEditor(), CountdownsPage(), Remaining(), DayEvents(), changedInterval(), update(), moveTaskDate(), quickDateChoices (+61 more)

### Community 54 - "labels/service.rs"
Cohesion: 0.39
Nodes (10): signed_identity_requires_matching_issuer_audience_nonce_expiry_and_key(), all(), decode(), encode(), key(), lock(), propagate(), register() (+2 more)

### Community 55 - "catalog.ts"
Cohesion: 0.08
Nodes (23): AppIconProps, available, brandBody, catalogVersion(), data, iconCatalog, iconData(), IconEntry (+15 more)

### Community 56 - "vitest"
Cohesion: 0.20
Nodes (5): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, root, @tailwindcss/vite, @vitejs/plugin-react

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "CurrentUser"
Cohesion: 0.17
Nodes (17): DeleteHistory, create(), delete(), delete_history(), history(), list(), mark(), read() (+9 more)

### Community 59 - "health.rs"
Cohesion: 0.27
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

### Community 60 - "responses.rs"
Cohesion: 0.07
Nodes (30): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+22 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "actions/models.rs"
Cohesion: 0.19
Nodes (14): Action, Change, COLUMNS, Confirmation, Data, Entity, Exercise, Note (+6 more)

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "tasks/handlers.rs"
Cohesion: 0.11
Nodes (26): CalendarQuery, CalendarResponse, OccurrenceInput, PlanInput, TaskInput, TodayQuery, TodayResponse, calendar() (+18 more)

### Community 66 - "media/handlers.rs"
Cohesion: 0.19
Nodes (4): download(), upload(), MAX_BYTES, verify_image()

### Community 67 - "boards-page.tsx"
Cohesion: 0.05
Nodes (90): AiVisibility(), HabitControls(), save(), submit(), habitFilters, HabitsPage(), create(), refresh() (+82 more)

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 69 - "sys"
Cohesion: 0.13
Nodes (3): Table, main(), main()

### Community 70 - "Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?, Source Nodes

### Community 71 - "history/handlers.rs"
Cohesion: 0.22
Nodes (3): bucket(), feed(), remove()

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 74 - "api"
Cohesion: 0.05
Nodes (91): AiAccess, change(), X(), remove(), ChatPanel(), cancel(), prepare(), showData() (+83 more)

### Community 75 - "contacts/service.rs"
Cohesion: 0.06
Nodes (37): Contact, ContactData, DeleteEvents, Delete, Keep, duplicate(), LabelKind, Categories (+29 more)

### Community 76 - "countdowns/dto.rs"
Cohesion: 0.15
Nodes (9): Recurrence, Daily, Monthly, Once, Yearly, CountdownInput, nullable(), nullable_id() (+1 more)

### Community 77 - "require"
Cohesion: 0.14
Nodes (20): run(), send(), run(), save(), origin_url(), require(), SmokeFailure, countdowns() (+12 more)

### Community 78 - "auth.rs"
Cohesion: 0.29
Nodes (3): authenticate(), session_cookie(), session_token()

### Community 79 - "surfaces.tsx"
Cohesion: 0.13
Nodes (26): Движение и эффекты, AnimationProvider(), animateDragLayout(), captureDragLayout(), dragFeedback(), identities, installDragAnimations(), items() (+18 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (10): NoRedirect, raw(), run(), email_address(), main(), read_code(), request_code(), run() (+2 more)

### Community 81 - "habits/models.rs"
Cohesion: 0.16
Nodes (9): HabitConfig, HabitMark, HabitStatistics, HabitStatus, Cancelled, Completed, Pending, Skipped (+1 more)

### Community 82 - "intimacy/handlers.rs"
Cohesion: 0.33
Nodes (5): create(), delete(), list(), read(), update()

### Community 83 - "intimacy/service.rs"
Cohesion: 0.28
Nodes (7): AnalyticsSummary, analytics_summary(), context(), decode(), rename_collection(), stale(), validate_list()

### Community 84 - "utc"
Cohesion: 0.44
Nodes (3): active(), change(), start()

### Community 85 - "serialize"
Cohesion: 0.09
Nodes (14): Data, Input, Label, Revision, Row, Media, Navigation, PAGES (+6 more)

### Community 86 - "effect-provider.tsx"
Cohesion: 0.25
Nodes (13): EffectProvider(), effectEvents, EffectKind, EffectRequest, effectsEnabled(), mutationEffect(), origin, rememberEffectOrigin() (+5 more)

### Community 87 - "planning.rs"
Cohesion: 0.19
Nodes (16): gantt_moves_the_entire_weekly_rule_and_validates_occurrences_and_precision(), gantt_rejects_the_second_dst_instant_and_keeps_the_series_anchor(), schedule(), calendar_date(), next_schedule_date(), PlannedStart, replanned(), schedule_in_profile_range() (+8 more)

### Community 88 - "tags.rs"
Cohesion: 0.35
Nodes (7): Change, list(), normalized(), read(), same(), save(), SubjectTags

### Community 89 - "LifeCycle frontend"
Cohesion: 0.18
Nodes (11): LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Единые метки, история, загрузка и контакты — 03.11.2026, Интимный журнал (этап 6), Основные данные (этап 3), Праздники, анимации и эффекты — 03.11.2026, Привычки (этап 4) (+3 more)

### Community 90 - "mail.rs"
Cohesion: 0.18
Nodes (5): migrate(), pool(), send_code(), transport(), unavailable()

### Community 91 - "generation.rs"
Cohesion: 0.16
Nodes (5): generate(), wait_for_cancel(), client(), endpoint(), generate()

### Community 92 - "locale.ts"
Cohesion: 0.08
Nodes (58): generatedMarkdown(), Copy(), ActionReview(), command(), edit(), entityLabels, labels, parseActions() (+50 more)

### Community 93 - "context.rs"
Cohesion: 0.40
Nodes (3): build(), clip(), validate_range()

### Community 94 - "theme-editor.tsx"
Cohesion: 0.18
Nodes (18): PreferencesContext, PreferencesProvider(), configureAnimations(), configureEffects(), ExtraSubjectTags, FunctionalValues, LabelCatalog, LabelValue (+10 more)

### Community 95 - "app.tsx"
Cohesion: 0.11
Nodes (36): AiPage, AnalyticsPage, App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), BoardsPage, CalendarPage (+28 more)

### Community 97 - "countdowns/mod.rs"
Cohesion: 0.15
Nodes (15): at_index(), category(), clamped(), computed(), index_near(), instant(), MAX_EVENT_YEAR, MAX_OCCURRENCE_YEAR (+7 more)

### Community 98 - "workouts_smoke.py"
Cohesion: 0.33
Nodes (13): main(), run(), find_occurrence(), listed(), occurrences(), task_body(), tasks_and_schedule(), main() (+5 more)

### Community 99 - "sounds.ts"
Cohesion: 0.31
Nodes (11): feedbackEvents, Notice, SoundProvider(), apply(), configureSounds(), playSound(), playTaskResult(), previewSound() (+3 more)

### Community 101 - "actions/tests.rs"
Cohesion: 0.29
Nodes (6): Operation, Create, Update, action(), patches_preserve_omitted_fields_and_reject_nonobjects(), untrusted_actions_need_both_scopes_and_versions()

### Community 102 - "ai/models.rs"
Cohesion: 0.24
Nodes (7): Chat, Config, Permissions, Preview, Turn, TurnData, TurnRow

### Community 104 - "markdown.tsx"
Cohesion: 0.18
Nodes (22): Переиспользование, Eye(), Pencil(), Markdown(), MarkdownEditor(), safeMarkdownUrl(), render(), SessionPanel() (+14 more)

### Community 105 - "programs/handlers.rs"
Cohesion: 0.31
Nodes (6): create(), delete(), history(), list(), start(), update()

### Community 106 - "workouts/handlers.rs"
Cohesion: 0.10
Nodes (30): create_exercise(), create_workout(), delete_exercise(), delete_workout(), exercises(), read_exercise(), read_workout(), update_exercise() (+22 more)

### Community 107 - "date-time-input.tsx"
Cohesion: 0.36
Nodes (4): CalendarDays(), Clock3(), DateTimeInput(), closeActionMenu()

### Community 108 - "calendar-page.tsx"
Cohesion: 0.06
Nodes (69): Праздники, ChevronLeft(), ChevronRight(), CalendarPage(), changeMonth(), calendarOccurrenceVisible(), shiftMonth(), FilterQuery (+61 more)

### Community 109 - "profile/handlers.rs"
Cohesion: 0.25
Nodes (7): Value, read(), update(), decode(), load(), merge(), partial_current_updates_preserve_origin_and_first_events()

### Community 110 - "Client"
Cohesion: 0.11
Nodes (11): Client, run(), run(), login(), run(), run(), run(), run() (+3 more)

### Community 111 - "sessions/models.rs"
Cohesion: 0.28
Nodes (5): HistoryQuery, Session, Start, StepResult, Summary

### Community 112 - "preferences/handlers.rs"
Cohesion: 0.21
Nodes (3): read(), update(), load()

### Community 113 - "unified-workflows.spec.ts"
Cohesion: 0.09
Nodes (19): settings, defaults, defaults, png, birthday, defaults, paths, setup() (+11 more)

### Community 114 - "intimacy/tests.rs"
Cohesion: 0.27
Nodes (8): TimeOccurrence, Earlier, Later, actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), ciphertext_is_bound_to_owner_and_individual_entry(), entry(), optional_answers_accept_zero_false_but_reject_incompatible_details_and_future(), statistics_count_events_not_days_and_exclude_unanswered_measurements()

### Community 115 - "sidebar-navigation.tsx"
Cohesion: 0.36
Nodes (7): GripVertical(), Settings2(), Item, Navigation, SidebarNavigation(), move(), save()

### Community 116 - "profile/types.ts"
Cohesion: 0.14
Nodes (19): Save(), ProfileEditor(), numberField(), submit(), textField(), update(), draftToProfile(), emptyFirsts (+11 more)

### Community 117 - "LifeCycle"
Cohesion: 0.25
Nodes (8): LifeCycle, Upgrade v1: этапы 1.1–1.3, Upgrade v1: этапы 1.4–1.5, Единый рабочий экран задач, Локальный запуск, Подключение AI, Проверки, Структура

### Community 118 - "chats.rs"
Cohesion: 0.31
Nodes (5): chats(), create_chat(), delete_chat(), read_chat(), routes()

### Community 119 - "ai/service.rs"
Cohesion: 0.19
Nodes (5): allowed_history(), open(), question(), rate_limit(), seal()

### Community 120 - "json_as_dbjson"
Cohesion: 0.43
Nodes (3): early_finish_is_rejected_and_skip_is_partial(), fixture(), time_uses_server_segments_and_pause_freezes_elapsed()

### Community 122 - "feedback-provider.tsx"
Cohesion: 0.22
Nodes (10): FeedbackProvider(), Request, CheckCircle2(), Info(), TriangleAlert(), Confirmation, ActionMenuProvider(), ActionsContext (+2 more)

### Community 123 - "countdowns/handlers.rs"
Cohesion: 0.31
Nodes (7): create(), delete(), list(), read(), routes(), unlink(), update()

### Community 124 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.29
Nodes (7): Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Массовые заметки и навигация — 02.11.2026, Рабочее пространство — 02.11.2026

### Community 125 - "settings.rs"
Cohesion: 0.32
Nodes (8): ConnectionRevision, ConfigView, stale(), ollama_models(), read_config(), remove_connection(), update_config(), valid_model()

### Community 127 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 128 - "model.rs"
Cohesion: 0.36
Nodes (6): Countdown, Details, Display, EventOccurrence, Row, Snapshot

### Community 129 - "ai/dto.rs"
Cohesion: 0.43
Nodes (3): ConfigInput, PreviewInput, SendInput

### Community 130 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 132 - "sessions/handlers.rs"
Cohesion: 0.18
Nodes (7): save(), active(), change(), history(), read(), start(), Command

### Community 135 - "profile/models.rs"
Cohesion: 0.31
Nodes (5): Firsts, HabitPeriod, HarmfulHabit, Origin, Profile

### Community 136 - "functional-labels-one-acti-c46dd-nal-cost-persists-on-mobile/error-context.md"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Page snapshot, Test info

### Community 137 - "habits-habit-checkbox-Mark-df27c-oday-and-calendar-on-mobile/error-context.md"
Cohesion: 0.40
Nodes (4): Error details, Instructions, Test info, Test source

### Community 138 - "FeedQuery"
Cohesion: 0.54
Nodes (3): Feed, FeedItem, FeedQuery

### Community 139 - "operators/handlers.rs"
Cohesion: 0.18
Nodes (7): lookup(), read(), save(), ResultData, Status, digits(), fingerprint()

### Community 142 - "AI-помощник `/ai`"
Cohesion: 0.67
Nodes (3): AI-помощник `/ai`, Какие записи видит AI, Просмотр и применение предложений

### Community 144 - "run"
Cohesion: 0.67
Nodes (3): run(), current(), mutate()

### Community 145 - "run"
Cohesion: 1.00
Nodes (3): run(), change(), selection()

### Community 146 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.67
Nodes (3): UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Рабочее пространство — 02.11.2026

### Community 147 - "Общие frontend-системы — 02.11.2026"
Cohesion: 0.67
Nodes (3): Общие frontend-системы — 02.11.2026, Проверка, Сохранение и совместимость

### Community 159 - "ContactBinding"
Cohesion: 0.48
Nodes (4): ContactBinding, Birthday, Independent, Linked

### Community 163 - "Frontend"
Cohesion: 0.33
Nodes (5): Before finishing, Frontend, New centralized systems, Skils, UI principles

## Knowledge Gaps
- **36 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 658 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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
  _High betweenness centrality (0.431) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useLanguage()` (e.g. with `Переиспользование` and `getLanguage()`) actually correct?**
  _`useLanguage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `t` be split into smaller, more focused modules?**
  _Cohesion score 0.11141222523336344 - nodes in this community are weakly interconnected._
- **Why does `preview` connect `scripts` to `requests.rs`, `chats.rs`?**
  _High betweenness centrality (0.431) - this node is a cross-community bridge._
- **Should `ai_upgrade_smoke.py` be split into smaller, more focused modules?**
  _Cohesion score 0.11260504201680673 - nodes in this community are weakly interconnected._
- **Why does `AppState` connect `AppState` to `functions.rs`, `sessions/handlers.rs`, `actions/routes.rs`, `operators/handlers.rs`, `login/service.rs`, `navigation/handlers.rs`, `ApiJson`, `actions/service.rs`, `programs/models.rs`, `auth/handlers.rs`, `notes/handlers.rs`, `audit`, `labels/handlers.rs`, `actions/handlers.rs`, `analytics/service.rs`, `contacts/handlers.rs`, `foundation.rs`, `access/handlers.rs`, `requests.rs`, `countdowns/repository.rs`, `labels/service.rs`, `CurrentUser`, `health.rs`, `responses.rs`, `tasks/handlers.rs`, `src/routes.rs`, `media/handlers.rs`, `history/handlers.rs`, `contacts/service.rs`, `auth.rs`, `intimacy/handlers.rs`, `intimacy/service.rs`, `utc`, `tags.rs`, `generation.rs`, `context.rs`, `countdowns/mod.rs`, `statuscode`, `ai/models.rs`, `programs/handlers.rs`, `workouts/handlers.rs`, `profile/handlers.rs`, `preferences/handlers.rs`, `chats.rs`, `ai/service.rs`, `countdowns/handlers.rs`, `settings.rs`, `access/routes.rs`?**
  _High betweenness centrality (0.376) - this node is a cross-community bridge._