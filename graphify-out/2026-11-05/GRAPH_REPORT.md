# Graph Report - LifeCycle  (2026-11-05)

## Corpus Check
- 556 files · ~223,726 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 41 file(s) not represented in the graph (top: (none) 9, .network 9, .trace 9)

## Summary
- 3494 nodes · 12859 edges · 165 communities (137 shown, 28 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 350 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `21f7e3b8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- useLanguage
- Graphify Project Navigation
- functions.rs
- planning/types.ts
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
- login/service.rs
- scripts
- cache.ts
- dates.ts
- allowBuilds
- tsconfig.json
- ApiJson
- AppIcon
- lifecycle-api
- actions/service.rs
- programs/models.rs
- locale.ts
- auth/handlers.rs
- analytics/models.rs
- notes/handlers.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- analytics/handlers.rs
- errors.rs
- schedule.rs
- devDependencies
- depends_on
- analytics/service.rs
- contacts/handlers.rs
- AppState
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- login/models.rs
- requests.rs
- countdowns/repository.rs
- Q: Stage 8 AI recovery and provider authentication
- intimacy/models.rs
- task-gantt.tsx
- boards/models.rs
- catalog.ts
- vitest
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- CurrentUser
- health.rs
- responses.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- vitest
- Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes
- tasks/handlers.rs
- src/routes.rs
- media/handlers.rs
- t
- Q: Stage 9 final integration of LifeCycle after stage 8
- sys
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- history/handlers.rs
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- pomodoro-page.tsx
- contacts/service.rs
- countdowns/dto.rs
- require
- auth.rs
- surfaces.tsx
- auth_smoke.py
- habits/models.rs
- login/handlers.rs
- plan.rs
- utc
- serialize
- effect-provider.tsx
- planning.rs
- TaskGantt
- LifeCycle frontend
- mail.rs
- generation.rs
- api
- marks.rs
- functional.tsx
- app.tsx
- LICENSES.md
- countdowns/mod.rs
- workouts_smoke.py
- sounds.ts
- statuscode
- config.rs
- ai/models.rs
- SOURCES.md
- media.ts
- programs/handlers.rs
- workouts/handlers.rs
- labels/models.rs
- operator-badge.tsx
- profile/handlers.rs
- Client
- sessions/models.rs
- preferences/handlers.rs
- crypto.rs
- tasks/service.rs
- board-types.ts
- profile/types.ts
- navigation.ts
- chats.rs
- ai/service.rs
- json_as_dbjson
- icons/SOURCES.md
- ActionMenuProvider
- countdowns/handlers.rs
- manifest.json
- settings.rs
- declaredActions
- health/api.ts
- model.rs
- ai/repository.rs
- backend
- operators/SOURCES.md
- sessions/handlers.rs
- TaskOccurrenceResponse
- run
- profile/models.rs
- functional-labels-one-acti-c46dd-nal-cost-persists-on-mobile/error-context.md
- habits-habit-checkbox-Mark-df27c-oday-and-calendar-on-mobile/error-context.md
- FeedQuery
- operators/handlers.rs
- tasks/dto.rs
- calendar-page.tsx
- tasks/models.rs
- run
- run
- state.rs
- navigation/handlers.rs
- pomodoro/models.rs
- settings/models.rs
- duration
- habits/dto.rs
- tasks/tests.rs
- settings/handlers.rs
- ContactBinding
- audit
- lock_tasks
- Frontend
- redis.rs
- api
- package.json

## God Nodes (most connected - your core abstractions)
1. `AppState` - 359 edges
2. `t()` - 305 edges
3. `useLanguage()` - 220 edges
4. `CurrentUser` - 181 edges
5. `Button()` - 153 edges
6. `api()` - 129 edges
7. `AppIcon()` - 121 edges
8. `errorMessage()` - 119 edges
9. `ApiJson` - 99 edges
10. `react` - 95 edges

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

## Communities (165 total, 28 thin omitted)

### Community 0 - "useLanguage"
Cohesion: 0.11
Nodes (71): Переиспользование, Dialog(), FormField(), MarkdownEditor(), Button(), Input(), Select(), Textarea() (+63 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "functions.rs"
Cohesion: 0.07
Nodes (43): signed_identity_requires_matching_issuer_audience_nonce_expiry_and_key(), aad(), append(), Assignment, Change, Cost, cost(), decoded() (+35 more)

### Community 3 - "planning/types.ts"
Cohesion: 0.11
Nodes (25): Day, Privacy, Report, Habit, HabitConfig, HabitMark, HabitStatistics, HabitStatus (+17 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.11
Nodes (14): main(), assistant(), run(), seal(), training(), run(), main(), ready() (+6 more)

### Community 6 - "habits/tests.rs"
Cohesion: 0.19
Nodes (6): summarize(), current_untimed_pending_does_not_break_a_completed_streak(), fixture(), habits_are_repeating_all_day_events(), row(), statistics_distinguish_cancellation_skips_missing_and_future()

### Community 7 - "environment"
Cohesion: 0.10
Nodes (20): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+12 more)

### Community 8 - "package.json"
Cohesion: 0.07
Nodes (29): dependencies, clsx@^2.1.1, date-holidays@^3.38.0, @foleyjs/core@^2.9.0, @foleyjs/react@^2.9.0, @iconify-json/circle-flags@^1.2.14, @iconify-json/simple-icons@^1.2.101, @iconify-json/tabler@^1.2.43 (+21 more)

### Community 9 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleResolution, noEmit (+10 more)

### Community 10 - "redis"
Cohesion: 0.45
Nodes (11): healthcheck, healthcheck, healthcheck, interval, retries, start_period, test, timeout (+3 more)

### Community 11 - "components.json"
Cohesion: 0.17
Nodes (11): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+3 more)

### Community 12 - "theme-editor.tsx"
Cohesion: 0.18
Nodes (18): defaults, PreferencesContext, PreferencesProvider(), Settings, configureAnimations(), commitLanguage(), Language, setLanguage() (+10 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, module, moduleResolution, noEmit, paths (+7 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "login/service.rs"
Cohesion: 0.13
Nodes (18): Callback, Claims, ISSUER, TokenResponse, access(), account(), account_context(), authorization_url() (+10 more)

### Community 17 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, test, test:e2e, typecheck

### Community 18 - "cache.ts"
Cohesion: 0.17
Nodes (17): AuthContext, AuthContextValue, User, AuthProvider(), clearResourceCache(), empty, entries, Entry (+9 more)

### Community 19 - "dates.ts"
Cohesion: 0.24
Nodes (16): Remaining(), birthdayAges(), clockFields(), countdownAmount(), countdownParts(), CountdownUnit, dateLabel(), dateTimePresets() (+8 more)

### Community 20 - "allowBuilds"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, @tsparticles/engine

### Community 22 - "ApiJson"
Cohesion: 0.19
Nodes (21): add_column(), create(), create_task(), list(), memberships(), move_item(), read(), remove() (+13 more)

### Community 23 - "AppIcon"
Cohesion: 0.05
Nodes (91): FeedbackProvider(), Request, Activity(), ArrowRight(), BarChart3(), BookUser(), Cake(), CalendarClock() (+83 more)

### Community 25 - "actions/service.rs"
Cohesion: 0.05
Nodes (53): exercise(), note(), notes_bulk(), workout(), Access, BulkAccess, BulkInput, BulkItem (+45 more)

### Community 26 - "programs/models.rs"
Cohesion: 0.11
Nodes (20): Action, Anchor, Config, ConfigInput, History, HistoryQuery, MAX_REPLAY_INTERVALS, Program (+12 more)

### Community 27 - "locale.ts"
Cohesion: 0.07
Nodes (72): Markdown(), safeMarkdownUrl(), render(), buttonVariants, ContactImport(), remove(), Contact, ContactData (+64 more)

### Community 28 - "auth/handlers.rs"
Cohesion: 0.14
Nodes (17): client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me(), MessageResponse (+9 more)

### Community 29 - "analytics/models.rs"
Cohesion: 0.24
Nodes (9): Day, HabitMetrics, Privacy, ProfileMetrics, Range, Report, TaskMetrics, TimerMetrics (+1 more)

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
Cohesion: 0.05
Nodes (35): contact(), settings, defaults, png, birthday, defaults, paths, setup() (+27 more)

### Community 36 - "analytics/handlers.rs"
Cohesion: 0.35
Nodes (4): read_privacy(), report(), update_privacy(), routes()

### Community 37 - "errors.rs"
Cohesion: 0.12
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 38 - "schedule.rs"
Cohesion: 0.12
Nodes (13): date(), deserialize(), intervals_count_calendar_days_across_dst_without_drifting(), invalid_rules_and_unbounded_queries_are_rejected(), missing_calendar_day_is_resolved_without_panicking(), nonexistent_time_moves_to_next_valid_minute(), repeated_time_chooses_earliest_instant(), resolve_local_start() (+5 more)

### Community 39 - "devDependencies"
Cohesion: 0.09
Nodes (23): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, motion-ai@^14.2.0, @playwright/test@^1.64.1 (+15 more)

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "analytics/service.rs"
Cohesion: 0.16
Nodes (10): ai_report(), build_report(), habit_metrics(), percent(), privacy(), profile_metrics(), task_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending() (+2 more)

### Community 44 - "contacts/handlers.rs"
Cohesion: 0.29
Nodes (8): create(), delete(), import(), labels(), list(), read(), routes(), update()

### Community 45 - "AppState"
Cohesion: 0.08
Nodes (14): AppState, routes(), routes(), routes(), routes(), routes(), routes(), routes() (+6 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.16
Nodes (12): main(), run(), shutdown(), router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin() (+4 more)

### Community 48 - "login/models.rs"
Cohesion: 0.26
Nodes (8): Account, Credentials, Pending, PLAN_SCOPE, RESOURCE, Revision, StartInput, TOKEN_URL

### Community 49 - "requests.rs"
Cohesion: 0.26
Nodes (7): ConfigInput, PreviewInput, SendInput, cancel_turn(), preview(), read_turn(), send()

### Community 50 - "countdowns/repository.rs"
Cohesion: 0.26
Nodes (14): apply_contact(), apply_snapshot(), delete(), detach_contact(), detach_one(), encrypt_snapshot(), hydrate(), load_for_update() (+6 more)

### Community 51 - "Q: Stage 8 AI recovery and provider authentication"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 AI recovery and provider authentication, Source Nodes

### Community 52 - "intimacy/models.rs"
Cohesion: 0.07
Nodes (37): create(), delete(), list(), read(), update(), AnalyticsSummary, Answers, Day (+29 more)

### Community 53 - "task-gantt.tsx"
Cohesion: 0.17
Nodes (26): filter(), PlanningFields(), update(), repeat(), update(), Drag, Interval, PlanDialog() (+18 more)

### Community 54 - "boards/models.rs"
Cohesion: 0.32
Nodes (9): Board, BoardState, Column, Item, Membership, Move, NewTask, RemoveColumn (+1 more)

### Community 55 - "catalog.ts"
Cohesion: 0.13
Nodes (13): @iconify/react@^6.0.4, available, brandBody, data, IconEntry, IconPack, legacy, loadIconPack() (+5 more)

### Community 56 - "vitest"
Cohesion: 0.20
Nodes (5): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, root, @tailwindcss/vite, @vitejs/plugin-react

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "CurrentUser"
Cohesion: 0.23
Nodes (15): DeleteHistory, create(), delete(), delete_history(), history(), list(), mark(), read() (+7 more)

### Community 59 - "health.rs"
Cohesion: 0.27
Nodes (7): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse

### Community 60 - "responses.rs"
Cohesion: 0.15
Nodes (20): client(), endpoint(), generate(), Answer, bounded_json(), bounded_json_limit(), client(), endpoint() (+12 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "vitest"
Cohesion: 0.24
Nodes (4): generatedMarkdown(), english, normalizeCost(), vitest

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "tasks/handlers.rs"
Cohesion: 0.29
Nodes (13): CalendarQuery, OccurrenceInput, TodayQuery, calendar(), create(), delete(), history(), list() (+5 more)

### Community 65 - "src/routes.rs"
Cohesion: 0.10
Nodes (3): build(), clip(), validate_range()

### Community 66 - "media/handlers.rs"
Cohesion: 0.13
Nodes (6): download(), upload(), MAX_BYTES, Media, routes(), verify_image()

### Community 67 - "t"
Cohesion: 0.07
Nodes (64): FilterSearch(), DayChart(), Metrics(), minutes(), number(), percent(), ReportView(), submit() (+56 more)

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
Nodes (7): BulkItem, BulkRemove, feed(), remove(), remove_bulk(), remove_one(), routes()

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 74 - "pomodoro-page.tsx"
Cohesion: 0.17
Nodes (21): CircleCheck(), Coffee(), Pause(), Play(), RefreshCw(), TimerReset(), PomodoroHistory(), PomodoroPage() (+13 more)

### Community 75 - "contacts/service.rs"
Cohesion: 0.06
Nodes (37): Contact, ContactData, DeleteEvents, Delete, Keep, duplicate(), LabelKind, Categories (+29 more)

### Community 76 - "countdowns/dto.rs"
Cohesion: 0.16
Nodes (9): Recurrence, Daily, Monthly, Once, Yearly, CountdownInput, nullable(), nullable_id() (+1 more)

### Community 77 - "require"
Cohesion: 0.14
Nodes (20): run(), send(), run(), save(), origin_url(), require(), SmokeFailure, countdowns() (+12 more)

### Community 78 - "auth.rs"
Cohesion: 0.23
Nodes (3): authenticate(), session_cookie(), session_token()

### Community 79 - "surfaces.tsx"
Cohesion: 0.12
Nodes (27): Движение и эффекты, Праздники, анимации и эффекты — 03.11.2026, AnimationProvider(), animateDragLayout(), captureDragLayout(), dragFeedback(), identities, installDragAnimations() (+19 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (10): NoRedirect, raw(), run(), email_address(), main(), read_code(), request_code(), run() (+2 more)

### Community 81 - "habits/models.rs"
Cohesion: 0.16
Nodes (9): HabitConfig, HabitMark, HabitStatistics, HabitStatus, Cancelled, Completed, Pending, Skipped (+1 more)

### Community 82 - "login/handlers.rs"
Cohesion: 0.19
Nodes (16): accounts(), authorize(), callback(), complete(), disconnect(), models(), select(), start() (+8 more)

### Community 83 - "plan.rs"
Cohesion: 0.22
Nodes (11): Entry, Exercise, load_valid(), progress(), Progression, Round, Snapshot, snapshot_resolves_progression_rounds_rests_and_private_instructions() (+3 more)

### Community 84 - "utc"
Cohesion: 0.44
Nodes (3): active(), change(), start()

### Community 85 - "serialize"
Cohesion: 0.14
Nodes (8): Navigation, PAGES, Lookup, Preferences, ProviderData, Conditions, Input, Preferences

### Community 86 - "effect-provider.tsx"
Cohesion: 0.20
Nodes (16): feedbackEvents, Notice, EffectProvider(), configureEffects(), effectEvents, EffectKind, EffectRequest, effectsEnabled() (+8 more)

### Community 87 - "planning.rs"
Cohesion: 0.26
Nodes (10): gantt_moves_the_entire_weekly_rule_and_validates_occurrences_and_precision(), gantt_rejects_the_second_dst_instant_and_keeps_the_series_anchor(), schedule(), calendar_date(), next_schedule_date(), PlannedStart, replanned(), schedule_in_profile_range() (+2 more)

### Community 88 - "TaskGantt"
Cohesion: 0.35
Nodes (8): changedInterval(), TaskGantt(), intervalAt(), persist(), pointerMove(), pointerUp(), dayStart(), toInstant()

### Community 89 - "LifeCycle frontend"
Cohesion: 0.04
Nodes (46): AI-помощник `/ai`, LifeCycle frontend, Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, Upgrade v1, этапы 1.4–1.5, UX-правки задач, досок и навигации (31.10.2026), Аналитика и удаление (этап 7) (+38 more)

### Community 90 - "mail.rs"
Cohesion: 0.35
Nodes (3): send_code(), transport(), unavailable()

### Community 91 - "generation.rs"
Cohesion: 0.17
Nodes (7): generate(), wait_for_cancel(), tailwind, baseColor, config, css, cssVariables

### Community 92 - "api"
Cohesion: 0.06
Nodes (82): Centralized systems (mandatory), ShieldCheck(), ErrorState(), LoadingState(), ActionJournal(), ActionReview(), command(), edit() (+74 more)

### Community 93 - "marks.rs"
Cohesion: 0.37
Nodes (7): complete_workout(), editable_occurrence(), mark_in_transaction(), normalize_mark(), task_status(), workout_occurrence(), completion_is_explicit_and_old_subhabit_input_is_rejected()

### Community 94 - "functional.tsx"
Cohesion: 0.09
Nodes (40): ArrowLeft(), DayEvents(), Folder, Note, NoteInput, NoteSelection, OccurrenceList(), WorkoutLauncher() (+32 more)

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
Cohesion: 0.39
Nodes (9): SoundProvider(), apply(), configureSounds(), playSound(), playTaskResult(), previewSound(), settings, SoundPreferences (+1 more)

### Community 102 - "ai/models.rs"
Cohesion: 0.24
Nodes (7): Chat, Config, Permissions, Preview, Turn, TurnData, TurnRow

### Community 104 - "media.ts"
Cohesion: 0.47
Nodes (8): imageAccept, imageTypes, markdownImage(), mediaId(), mediaIdsInMarkdown(), mediaUrl(), uploadImage(), validateImage()

### Community 105 - "programs/handlers.rs"
Cohesion: 0.31
Nodes (6): create(), delete(), history(), list(), start(), update()

### Community 106 - "workouts/handlers.rs"
Cohesion: 0.10
Nodes (30): create_exercise(), create_workout(), delete_exercise(), delete_workout(), exercises(), read_exercise(), read_workout(), update_exercise() (+22 more)

### Community 107 - "labels/models.rs"
Cohesion: 0.32
Nodes (5): Data, Input, Label, Revision, Row

### Community 108 - "operator-badge.tsx"
Cohesion: 0.15
Nodes (23): operatorLogo(), ContactActions(), contactLinkActions(), serviceName(), linkIcon(), LinkService, phoneLinks(), safeExternalUrl() (+15 more)

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
Cohesion: 0.19
Nodes (3): read(), update(), load()

### Community 114 - "tasks/service.rs"
Cohesion: 0.42
Nodes (6): delete_in(), occurrences(), persist_occurrence(), save(), save_in(), valid_status()

### Community 115 - "board-types.ts"
Cohesion: 0.33
Nodes (5): Board, BoardItem, BoardState, Membership, GanttZoom

### Community 116 - "profile/types.ts"
Cohesion: 0.19
Nodes (11): emptyFirsts, emptyOrigin, Firsts, HabitPeriod, HarmfulHabit, MedicalKey, medicalKeys, NumericProfileKey (+3 more)

### Community 117 - "navigation.ts"
Cohesion: 0.60
Nodes (3): iconCatalog, navigationCatalog, navigationItems()

### Community 118 - "chats.rs"
Cohesion: 0.23
Nodes (6): chats(), create_chat(), delete_chat(), read_chat(), routes(), preview

### Community 119 - "ai/service.rs"
Cohesion: 0.19
Nodes (5): allowed_history(), open(), question(), rate_limit(), seal()

### Community 120 - "json_as_dbjson"
Cohesion: 0.43
Nodes (3): early_finish_is_rejected_and_skip_is_partial(), fixture(), time_uses_server_segments_and_pause_freezes_elapsed()

### Community 122 - "ActionMenuProvider"
Cohesion: 0.50
Nodes (5): menu(), ActionMenuProvider(), activate(), keys(), ActionsContext

### Community 123 - "countdowns/handlers.rs"
Cohesion: 0.38
Nodes (7): create(), delete(), list(), read(), routes(), unlink(), update()

### Community 124 - "manifest.json"
Cohesion: 0.40
Nodes (4): circle-flags, simple-icons, tabler, twemoji

### Community 125 - "settings.rs"
Cohesion: 0.32
Nodes (8): ConnectionRevision, ConfigView, stale(), ollama_models(), read_config(), remove_connection(), update_config(), valid_model()

### Community 127 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 128 - "model.rs"
Cohesion: 0.36
Nodes (6): Countdown, Details, Display, EventOccurrence, Row, Snapshot

### Community 129 - "ai/repository.rs"
Cohesion: 0.42
Nodes (8): config(), expire(), history(), invalidate(), load_turn(), require_chat(), turn(), TURN_COLUMNS

### Community 130 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

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

### Community 138 - "FeedQuery"
Cohesion: 0.54
Nodes (3): Feed, FeedItem, FeedQuery

### Community 139 - "operators/handlers.rs"
Cohesion: 0.18
Nodes (7): lookup(), read(), save(), ResultData, Status, digits(), fingerprint()

### Community 141 - "tasks/dto.rs"
Cohesion: 0.32
Nodes (4): CalendarResponse, PlanInput, TaskInput, TodayResponse

### Community 142 - "calendar-page.tsx"
Cohesion: 0.10
Nodes (43): Праздники, ChevronLeft(), ChevronRight(), CalendarPage(), changeMonth(), calendarOccurrenceVisible(), shiftMonth(), FilterQuery (+35 more)

### Community 144 - "run"
Cohesion: 0.67
Nodes (3): run(), current(), mutate()

### Community 145 - "run"
Cohesion: 1.00
Nodes (3): run(), change(), selection()

### Community 148 - "navigation/handlers.rs"
Cohesion: 0.23
Nodes (3): save(), read(), update()

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

### Community 166 - "api"
Cohesion: 0.06
Nodes (64): AlertTriangle(), ArrowDown(), ArrowUp(), CircleSlash(), Clock3(), Copy(), Pencil(), Plus() (+56 more)

### Community 167 - "package.json"
Cohesion: 0.10
Nodes (20): class-variance-authority@^0.7.1, react-dom@^19.2.0, react-markdown@^10.1.0, tailwindcss@^4.1.0, typescript@^5.9.0, vite@^8.3.5, engines, node (+12 more)

## Knowledge Gaps
- **36 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 659 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **28 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

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

- **Why does `scripts` connect `scripts` to `chats.rs`, `package.json`?**
  _High betweenness centrality (0.434) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `useLanguage()` (e.g. with `Переиспользование` and `getLanguage()`) actually correct?**
  _`useLanguage()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `useLanguage` be split into smaller, more focused modules?**
  _Cohesion score 0.1148936170212766 - nodes in this community are weakly interconnected._
- **Why does `preview` connect `chats.rs` to `requests.rs`, `scripts`?**
  _High betweenness centrality (0.434) - this node is a cross-community bridge._
- **Should `functions.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.0699942627653471 - nodes in this community are weakly interconnected._
- **Why does `AppState` connect `AppState` to `ai/repository.rs`, `functions.rs`, `sessions/handlers.rs`, `TaskOccurrenceResponse`, `operators/handlers.rs`, `login/service.rs`, `state.rs`, `navigation/handlers.rs`, `ApiJson`, `actions/service.rs`, `programs/models.rs`, `auth/handlers.rs`, `notes/handlers.rs`, `settings/handlers.rs`, `audit`, `lock_tasks`, `analytics/handlers.rs`, `analytics/service.rs`, `contacts/handlers.rs`, `foundation.rs`, `requests.rs`, `countdowns/repository.rs`, `intimacy/models.rs`, `CurrentUser`, `health.rs`, `tasks/handlers.rs`, `src/routes.rs`, `media/handlers.rs`, `history/handlers.rs`, `contacts/service.rs`, `auth.rs`, `login/handlers.rs`, `utc`, `generation.rs`, `countdowns/mod.rs`, `statuscode`, `ai/models.rs`, `programs/handlers.rs`, `workouts/handlers.rs`, `profile/handlers.rs`, `preferences/handlers.rs`, `crypto.rs`, `tasks/service.rs`, `chats.rs`, `ai/service.rs`, `countdowns/handlers.rs`, `settings.rs`?**
  _High betweenness centrality (0.375) - this node is a cross-community bridge._