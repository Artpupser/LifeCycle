# Graph Report - LifeCycle  (2026-11-11)

## Corpus Check
- 616 files · ~269,907 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 20 file(s) not represented in the graph (top: (none) 10, .css 6, .example 1)

## Summary
- 4362 nodes · 16808 edges · 194 communities (162 shown, 32 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 409 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bccbf050`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- locale.ts
- Graphify Project Navigation
- functions.rs
- contacts-page.tsx
- services
- ai_upgrade_smoke.py
- habits/tests.rs
- environment
- devDependencies
- compilerOptions
- redis
- components.json
- theme-editor.tsx
- compilerOptions
- backend
- useLanguage
- routes
- scripts
- cache.ts
- package.json
- allowBuilds
- tsconfig.json
- ApiJson
- AppIcon
- lifecycle-api
- actions/handlers.rs
- programs/models.rs
- notes-page.tsx
- auth/handlers.rs
- dates.ts
- notes/handlers.rs
- garage
- mailpit
- postgres
- redis
- upgrade-helpers.ts
- tasks_upgrade_smoke.py
- errors.rs
- schedule.rs
- access/handlers.rs
- depends_on
- analytics/service.rs
- contacts/handlers.rs
- AppState
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- market.rs
- requests.rs
- countdowns/repository.rs
- Q: Stage 8 AI recovery and provider authentication
- intimacy/models.rs
- countdowns-page.tsx
- relationships.rs
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
- src/routes.rs
- settings/handlers.rs
- Q: Stage 9 final integration of LifeCycle after stage 8
- sys
- Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?
- history/handlers.rs
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown
- tree-page.tsx
- contacts/service.rs
- countdowns/dto.rs
- require
- battlenet.rs
- surfaces.tsx
- auth_smoke.py
- habits/models.rs
- login/service.rs
- epic.rs
- utc
- serialize
- effect-provider.tsx
- planning.rs
- ai/service.rs
- LifeCycle frontend
- mail.rs
- generation.rs
- t
- marks.rs
- videogames.spec.ts
- app.tsx
- LICENSES.md
- countdowns/mod.rs
- uuid
- sounds.ts
- videogames-page.tsx
- session.rs
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
- playstation.rs
- tasks/service.rs
- contacts/types.ts
- compact-ui.spec.ts
- integrations/handlers.rs
- chats.rs
- plan.rs
- integrations/service.rs
- icons/SOURCES.md
- xbox.rs
- countdowns/handlers.rs
- countdowns/types.ts
- settings.rs
- actions/models.rs
- model.rs
- generate-icons.mjs
- operators/SOURCES.md
- sessions/handlers.rs
- TaskOccurrenceResponse
- mockServiceWorker.js
- profile/models.rs
- labels/handlers.rs
- operator-badge.tsx
- labels/service.rs
- operators/handlers.rs
- profile/tests.rs
- tasks/dto.rs
- holiday-list.tsx
- tasks/models.rs
- analytics/handlers.rs
- analytics/models.rs
- ExternalLink
- ai/repository.rs
- navigation/handlers.rs
- eslint.config.js
- access/service.rs
- config.rs
- pomodoro/models.rs
- settings/models.rs
- duration
- habits/dto.rs
- tasks/tests.rs
- statuscode
- notes/models.rs
- ContactBinding
- countdowns/domain.rs
- lock_tasks
- programs.tsx
- Frontend
- integrations/models.rs
- redis.rs
- mutate
- catalog.rs
- steam.rs
- http.rs
- path
- feedback.rs
- backend
- tags.rs
- provider.rs
- run
- LifeCycle frontend
- LifeCycle
- shared-systems.spec.ts
- use-holidays.ts
- media/routes.rs
- FeedQuery
- health/api.ts
- UX-правки задач, досок и навигации (31.10.2026)
- .from_request
- choiceOptions
- manifest.json
- git-repair.sh

## God Nodes (most connected - your core abstractions)
1. `AppState` - 449 edges
2. `t()` - 382 edges
3. `useLanguage()` - 266 edges
4. `CurrentUser` - 225 edges
5. `Button()` - 174 edges
6. `api()` - 156 edges
7. `AppIcon()` - 146 edges
8. `errorMessage()` - 135 edges
9. `react` - 124 edges
10. `ApiJson` - 116 edges

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
- 1-file cycle: `backend/src/modules/operators/handlers.rs -> backend/src/modules/operators/handlers.rs`
- 2-file cycle: `backend/src/modules/intimacy/models.rs -> backend/src/modules/intimacy/service.rs -> backend/src/modules/intimacy/models.rs`
- 3-file cycle: `frontend/src/components/ui/date-time-input.tsx -> frontend/src/components/ui/date-time-picker.tsx -> frontend/src/components/ui/input.tsx -> frontend/src/components/ui/date-time-input.tsx`
- 4-file cycle: `frontend/src/components/filter-search.tsx -> frontend/src/systems/actions/action-menu.tsx -> frontend/src/systems/labels/functional.tsx -> frontend/src/components/ui/choice-picker.tsx -> frontend/src/components/filter-search.tsx`
- 4-file cycle: `frontend/src/components/ui/choice-picker.tsx -> frontend/src/components/ui/input.tsx -> frontend/src/components/ui/date-time-input.tsx -> frontend/src/components/ui/date-time-picker.tsx -> frontend/src/components/ui/choice-picker.tsx`
- 5-file cycle: `frontend/src/components/filter-search.tsx -> frontend/src/components/ui/input.tsx -> frontend/src/components/ui/date-time-input.tsx -> frontend/src/components/ui/date-time-picker.tsx -> frontend/src/components/ui/choice-picker.tsx -> frontend/src/components/filter-search.tsx`
- 5-file cycle: `frontend/src/components/filter-search.tsx -> frontend/src/systems/actions/action-menu.tsx -> frontend/src/systems/labels/functional.tsx -> frontend/src/systems/labels/inputs.tsx -> frontend/src/components/ui/choice-picker.tsx -> frontend/src/components/filter-search.tsx`

## Communities (194 total, 32 thin omitted)

### Community 0 - "locale.ts"
Cohesion: 0.07
Nodes (83): Controls(), FormFieldContext, FormField(), ChoiceField(), ChoiceFieldProps, ChoiceInputProps, RadioGroup(), useControlState() (+75 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "functions.rs"
Cohesion: 0.21
Nodes (19): aad(), append(), Assignment, Change, Cost, cost(), decoded(), exists() (+11 more)

### Community 3 - "contacts-page.tsx"
Cohesion: 0.10
Nodes (40): ArrowLeft(), categoryName(), categoryTerms(), eventCategories, eventCategory(), names, EventCategorySelect(), collectionCatalog (+32 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "ai_upgrade_smoke.py"
Cohesion: 0.13
Nodes (11): main(), seal(), run(), run(), main(), ready(), run(), sql() (+3 more)

### Community 6 - "habits/tests.rs"
Cohesion: 0.19
Nodes (6): summarize(), current_untimed_pending_does_not_break_a_completed_streak(), fixture(), habits_are_repeating_all_day_events(), row(), statistics_distinguish_cancellation_skips_missing_and_future()

### Community 7 - "environment"
Cohesion: 0.10
Nodes (21): environment, APP_BIND, APP_PUBLIC_URL, AUTH_CODE_SECRET, DATA_ENCRYPTION_KEY, DATABASE_URL, REDIS_URL, RUST_LOG (+13 more)

### Community 8 - "devDependencies"
Cohesion: 0.06
Nodes (31): devDependencies, eslint@^10.13.0, jsdom@^31.0.0, motion-ai@^14.2.0, msw@^3.0.4, @playwright/test@^1.64.1, tailwindcss@^4.1.0, @testing-library/dom@^10.4.2 (+23 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, baseUrl, erasableSyntaxOnly, jsx, lib, module, moduleResolution, noEmit (+11 more)

### Community 10 - "redis"
Cohesion: 0.28
Nodes (15): healthcheck, healthcheck, networks, ports, restart, healthcheck, interval, retries (+7 more)

### Community 11 - "components.json"
Cohesion: 0.17
Nodes (11): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+3 more)

### Community 12 - "theme-editor.tsx"
Cohesion: 0.12
Nodes (22): defaults, PreferencesProvider(), Settings, configureEffects(), Language, ExtraSubjectTags, FunctionalValues, LabelCatalog (+14 more)

### Community 13 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, baseUrl, jsx, lib, module, moduleResolution, noEmit, paths (+7 more)

### Community 14 - "backend"
Cohesion: 0.67
Nodes (3): condition, backend, depends_on

### Community 15 - "useLanguage"
Cohesion: 0.11
Nodes (69): Centralized systems (mandatory), Переиспользование, Dialog(), MarkdownEditor(), Button(), buttonVariants, SaveButton(), textOf() (+61 more)

### Community 16 - "routes"
Cohesion: 0.08
Nodes (3): audit(), ensure_focus_task(), background()

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 18 - "cache.ts"
Cohesion: 0.15
Nodes (26): changeMonth(), retryAfterMilliseconds(), invalidate(), invalidateResources(), loadResource(), Resource, resourceKey(), ResourceMeta (+18 more)

### Community 19 - "package.json"
Cohesion: 0.04
Nodes (71): dependencies, class-variance-authority@^0.7.1, clsx@^2.1.1, date-holidays@^3.38.0, @dnd-kit/dom@^0.5.3, @dnd-kit/helpers@^0.5.3, @dnd-kit/react@^0.5.3, @foleyjs/core@^2.9.0 (+63 more)

### Community 20 - "allowBuilds"
Cohesion: 0.50
Nodes (3): allowBuilds, esbuild, @tsparticles/engine

### Community 22 - "ApiJson"
Cohesion: 0.14
Nodes (30): add_column(), create(), create_task(), list(), memberships(), move_item(), read(), remove() (+22 more)

### Community 23 - "AppIcon"
Cohesion: 0.05
Nodes (105): DurableFeedback(), Entry, FeedbackProvider(), Request, Activity(), AlertTriangle(), ArrowDown(), ArrowRight() (+97 more)

### Community 25 - "actions/handlers.rs"
Cohesion: 0.17
Nodes (20): apply(), dismiss(), list(), prepare(), undo(), COLUMNS, check_actions(), check_exercise_links() (+12 more)

### Community 26 - "programs/models.rs"
Cohesion: 0.11
Nodes (20): Action, Anchor, Config, ConfigInput, History, HistoryQuery, MAX_REPLAY_INTERVALS, Program (+12 more)

### Community 27 - "notes-page.tsx"
Cohesion: 0.09
Nodes (45): ContactImport(), emptyNote(), Note, NoteInput, NoteSelection, BulkKind, quickCreate(), specs (+37 more)

### Community 28 - "auth/handlers.rs"
Cohesion: 0.14
Nodes (17): client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), me(), MessageResponse (+9 more)

### Community 29 - "dates.ts"
Cohesion: 0.05
Nodes (89): MetricDetails(), MetricList(), Metrics(), DateTimePicker(), focusDate(), selectDate(), Props, DayChart() (+81 more)

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
Cohesion: 0.11
Nodes (13): choiceRoot(), chooseChoice(), expectChoiceValue(), settings, addCollectionItem(), chooseAction(), confirmUi(), login() (+5 more)

### Community 36 - "tasks_upgrade_smoke.py"
Cohesion: 0.40
Nodes (3): run(), current(), mutate()

### Community 37 - "errors.rs"
Cohesion: 0.16
Nodes (4): ApiError, ErrorDetail, ErrorEnvelope, not_found()

### Community 38 - "schedule.rs"
Cohesion: 0.15
Nodes (13): date(), deserialize(), intervals_count_calendar_days_across_dst_without_drifting(), invalid_rules_and_unbounded_queries_are_rejected(), missing_calendar_day_is_resolved_without_panicking(), nonexistent_time_moves_to_next_valid_minute(), repeated_time_chooses_earliest_instant(), resolve_local_start() (+5 more)

### Community 39 - "access/handlers.rs"
Cohesion: 0.19
Nodes (10): exercise(), note(), notes_bulk(), workout(), Access, BulkAccess, BulkInput, BulkItem (+2 more)

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "analytics/service.rs"
Cohesion: 0.16
Nodes (11): TaskMetrics, ai_report(), build_report(), habit_metrics(), percent(), privacy(), profile_metrics(), task_metrics() (+3 more)

### Community 44 - "contacts/handlers.rs"
Cohesion: 0.32
Nodes (8): create(), delete(), import(), labels(), list(), read(), routes(), update()

### Community 45 - "AppState"
Cohesion: 0.05
Nodes (24): AppState, routes(), routes(), routes(), routes(), routes(), routes(), routes() (+16 more)

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.16
Nodes (12): main(), run(), shutdown(), router(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint(), configuration_requires_real_storage_credentials(), csrf_origin_includes_the_public_port_and_accepts_exact_origin() (+4 more)

### Community 48 - "market.rs"
Cohesion: 0.07
Nodes (30): country(), decimal(), epic(), epic_catalog(), epic_url(), metadata(), price(), regionalize() (+22 more)

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
Cohesion: 0.06
Nodes (42): create(), delete(), list(), read(), update(), validate_collection_choices(), validate_fixed_values(), AnalyticsSummary (+34 more)

### Community 53 - "countdowns-page.tsx"
Cohesion: 0.05
Nodes (125): FilterSearch(), BarChart3(), ChevronLeft(), ChevronRight(), Pencil(), Plus(), Search(), Trash2() (+117 more)

### Community 54 - "relationships.rs"
Cohesion: 0.09
Nodes (34): aad(), all(), create(), decode(), edge(), Input, input(), Kind (+26 more)

### Community 55 - "catalog.ts"
Cohesion: 0.08
Nodes (24): @iconify/react@^6.0.4, available, brandBody, catalogVersion(), data, iconCatalog, iconData(), IconEntry (+16 more)

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
Cohesion: 0.20
Nodes (17): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+9 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "vitest"
Cohesion: 0.12
Nodes (13): generatedMarkdown(), Editor(), PreferencesContext, normalizeCost(), queryClient, Consumer(), handlers, mockSettings (+5 more)

### Community 63 - "Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 external ChatGPT acceptance after catalog and composer fixes, Source Nodes

### Community 64 - "tasks/handlers.rs"
Cohesion: 0.29
Nodes (13): CalendarQuery, OccurrenceInput, TodayQuery, calendar(), create(), delete(), history(), list() (+5 more)

### Community 65 - "src/routes.rs"
Cohesion: 0.10
Nodes (3): build(), clip(), validate_range()

### Community 68 - "Q: Stage 9 final integration of LifeCycle after stage 8"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 9 final integration of LifeCycle after stage 8, Source Nodes

### Community 69 - "sys"
Cohesion: 0.09
Nodes (7): Table, main(), run(), send(), origin_url(), run(), main()

### Community 70 - "Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?, Source Nodes

### Community 71 - "history/handlers.rs"
Cohesion: 0.20
Nodes (7): BulkItem, BulkRemove, feed(), remove(), remove_bulk(), remove_one(), routes()

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

### Community 74 - "tree-page.tsx"
Cohesion: 0.09
Nodes (54): removeContact(), ContactRelationships(), person(), remove(), RelationshipDraft, RelationshipEditor(), RelationshipsProps, collateralName() (+46 more)

### Community 75 - "contacts/service.rs"
Cohesion: 0.05
Nodes (42): Contact, ContactData, DeleteEvents, Delete, Keep, duplicate(), Gender, Female (+34 more)

### Community 76 - "countdowns/dto.rs"
Cohesion: 0.13
Nodes (11): MAX_EVENT_YEAR, MIN_EVENT_YEAR, Recurrence, Daily, Monthly, Once, Yearly, CountdownInput (+3 more)

### Community 77 - "require"
Cohesion: 0.21
Nodes (22): require(), SmokeFailure, countdowns(), find_occurrence(), listed(), main(), media(), notes_and_folders() (+14 more)

### Community 78 - "battlenet.rs"
Cohesion: 0.07
Nodes (20): Callback, callback(), connect(), digest(), finish(), Identity, redirect_uri(), Token (+12 more)

### Community 79 - "surfaces.tsx"
Cohesion: 0.15
Nodes (21): motion@^14.9.0, focusSelected(), AnimationProvider(), animationsEnabled(), configureAnimations(), listeners, motionAllowed(), scrollElement() (+13 more)

### Community 80 - "auth_smoke.py"
Cohesion: 0.14
Nodes (10): NoRedirect, raw(), run(), email_address(), main(), read_code(), request_code(), run() (+2 more)

### Community 81 - "habits/models.rs"
Cohesion: 0.16
Nodes (9): HabitConfig, HabitMark, HabitStatistics, HabitStatus, Cancelled, Completed, Pending, Skipped (+1 more)

### Community 82 - "login/service.rs"
Cohesion: 0.06
Nodes (45): accounts(), authorize(), callback(), complete(), disconnect(), models(), select(), start() (+37 more)

### Community 83 - "epic.rs"
Cohesion: 0.12
Nodes (24): authorize(), callback(), CLIENT_ID, CLIENT_SECRET, code(), code_login_accepts_only_one_time_codes_and_fixed_epic_destinations(), connect(), epic_library_never_invents_playtime_or_merges_ids_across_namespaces() (+16 more)

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
Cohesion: 0.11
Nodes (19): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, UX-правки задач, досок и навигации (31.10.2026), Аналитика и удаление (этап 7), Быстрые задачи и планирование — 01.11.2026, Единые метки, история, загрузка и контакты — 03.11.2026, Интимный журнал (этап 6) (+11 more)

### Community 90 - "mail.rs"
Cohesion: 0.14
Nodes (4): send_code(), transport(), unavailable(), bucket()

### Community 91 - "generation.rs"
Cohesion: 0.15
Nodes (7): generate(), wait_for_cancel(), tailwind, baseColor, config, css, cssVariables

### Community 92 - "t"
Cohesion: 0.04
Nodes (109): Copy(), MessageCircle(), ActionJournal(), ActionReview(), command(), edit(), ChangeView(), entityLabels (+101 more)

### Community 93 - "marks.rs"
Cohesion: 0.37
Nodes (7): complete_workout(), editable_occurrence(), mark_in_transaction(), normalize_mark(), task_status(), workout_occurrence(), completion_is_explicit_and_old_subhabit_input_is_rejected()

### Community 94 - "videogames.spec.ts"
Cohesion: 0.12
Nodes (18): offer(), settings, setup(), filterGames(), gameFilters(), game, offers, Game (+10 more)

### Community 95 - "app.tsx"
Cohesion: 0.09
Nodes (44): AiPage, AnalyticsPage, App(), AppContent(), ApplicationFeedback(), AuthenticatedApp(), BoardsPage, CalendarPage (+36 more)

### Community 97 - "countdowns/mod.rs"
Cohesion: 0.19
Nodes (9): external_event_exists(), external_id(), import_external_event(), leap_age_repetitions_and_elapsed_are_calendar_correct(), missing_contact_birthdate_suspends_without_exposing_placeholder_dates(), now(), row(), timed_events_roll_forward_and_share_schedule_dst_rules() (+1 more)

### Community 98 - "uuid"
Cohesion: 0.13
Nodes (11): assistant(), run(), training(), run(), main(), run(), task_body(), command() (+3 more)

### Community 99 - "sounds.ts"
Cohesion: 0.35
Nodes (10): Notice, SoundProvider(), apply(), configureSounds(), playSound(), playTaskResult(), previewSound(), settings (+2 more)

### Community 100 - "videogames-page.tsx"
Cohesion: 0.14
Nodes (28): BentoCard(), BentoGrid(), ChoicePicker(), VirtualGrid(), VideogamesPage(), refreshLibrary(), run(), DayHolidays() (+20 more)

### Community 101 - "session.rs"
Cohesion: 0.18
Nodes (11): CodeInput, authorize(), authorize_playstation(), authorize_xbox(), connect(), finish(), json_response(), required() (+3 more)

### Community 102 - "ai/models.rs"
Cohesion: 0.24
Nodes (8): Chat, Config, ConfigView, Permissions, Preview, Turn, TurnData, TurnRow

### Community 104 - "media.ts"
Cohesion: 0.35
Nodes (10): safeMarkdownUrl(), upload(), imageAccept, imageTypes, markdownImage(), mediaId(), mediaIdsInMarkdown(), mediaUrl() (+2 more)

### Community 105 - "programs/handlers.rs"
Cohesion: 0.31
Nodes (6): create(), delete(), history(), list(), start(), update()

### Community 106 - "workouts/handlers.rs"
Cohesion: 0.08
Nodes (33): create_exercise(), create_workout(), delete_exercise(), delete_workout(), exercises(), read_exercise(), read_workout(), update_exercise() (+25 more)

### Community 107 - "labels/models.rs"
Cohesion: 0.24
Nodes (6): CollectionDetails, Data, Input, Label, Revision, Row

### Community 109 - "profile/handlers.rs"
Cohesion: 0.27
Nodes (6): read(), update(), decode(), load(), merge(), partial_current_updates_preserve_origin_and_first_events()

### Community 110 - "Client"
Cohesion: 0.10
Nodes (14): Client, run(), login(), run(), run(), run(), run(), run() (+6 more)

### Community 111 - "sessions/models.rs"
Cohesion: 0.28
Nodes (5): HistoryQuery, Session, Start, StepResult, Summary

### Community 112 - "preferences/handlers.rs"
Cohesion: 0.19
Nodes (3): read(), update(), load()

### Community 113 - "playstation.rs"
Cohesion: 0.16
Nodes (17): AUTH, CLIENT, CLIENT_AUTH, identifier(), library(), login(), merge(), npsso() (+9 more)

### Community 114 - "tasks/service.rs"
Cohesion: 0.42
Nodes (6): delete_in(), occurrences(), persist_occurrence(), save(), save_in(), valid_status()

### Community 115 - "contacts/types.ts"
Cohesion: 0.23
Nodes (16): contact(), readFile(), decode(), parseContactFile(), parseVcards(), Picker, split(), unescape() (+8 more)

### Community 116 - "compact-ui.spec.ts"
Cohesion: 0.08
Nodes (29): defaults, setup(), contact(), defaults, ids, Relationship, setup(), dragObject() (+21 more)

### Community 117 - "integrations/handlers.rs"
Cohesion: 0.23
Nodes (11): callback(), connect(), digest(), disconnect(), finish(), list(), return_url(), routes() (+3 more)

### Community 118 - "chats.rs"
Cohesion: 0.31
Nodes (5): chats(), create_chat(), delete_chat(), read_chat(), routes()

### Community 119 - "plan.rs"
Cohesion: 0.22
Nodes (11): Entry, Exercise, load_valid(), progress(), Progression, Round, Snapshot, snapshot_resolves_progression_rounds_rests_and_private_instructions() (+3 more)

### Community 120 - "integrations/service.rs"
Cohesion: 0.30
Nodes (14): providers(), authorization_attempt(), consume_authorization(), context(), credentials(), encrypt(), list(), record_failure() (+6 more)

### Community 122 - "xbox.rs"
Cohesion: 0.20
Nodes (13): SessionTokens, Authorization, authorization(), browser_session(), CLIENT, DESKTOP, history(), history_is_not_purchase_proof_and_unknown_playtime_is_preserved() (+5 more)

### Community 123 - "countdowns/handlers.rs"
Cohesion: 0.38
Nodes (7): create(), delete(), list(), read(), routes(), unlink(), update()

### Community 124 - "countdowns/types.ts"
Cohesion: 0.15
Nodes (13): birthday, defaults, paths, setup(), Countdown, CountdownInput, EventDetails, EventDisplay (+5 more)

### Community 125 - "settings.rs"
Cohesion: 0.33
Nodes (8): ConnectionRevision, config(), stale(), ollama_models(), read_config(), remove_connection(), update_config(), valid_model()

### Community 127 - "actions/models.rs"
Cohesion: 0.17
Nodes (16): Action, Change, Confirmation, Data, Entity, Exercise, Note, Task (+8 more)

### Community 128 - "model.rs"
Cohesion: 0.36
Nodes (6): Countdown, Details, Display, EventOccurrence, Row, Snapshot

### Community 129 - "generate-icons.mjs"
Cohesion: 0.20
Nodes (5): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, root, @tailwindcss/vite, @vitejs/plugin-react

### Community 132 - "sessions/handlers.rs"
Cohesion: 0.41
Nodes (6): active(), change(), history(), read(), start(), Command

### Community 134 - "mockServiceWorker.js"
Cohesion: 0.15
Nodes (17): activeClientIds, activeClientIdsRestorePromise, activeClientIdsStorePromise, getResponse(), handleRequest(), IS_MOCKED_RESPONSE, notifyClient(), pendingRequests (+9 more)

### Community 135 - "profile/models.rs"
Cohesion: 0.31
Nodes (5): Firsts, HabitPeriod, HarmfulHabit, Origin, Profile

### Community 136 - "labels/handlers.rs"
Cohesion: 0.30
Nodes (8): collection_expandable(), create(), list(), list_tags(), remove(), update(), Filter, validate_icon()

### Community 137 - "operator-badge.tsx"
Cohesion: 0.24
Nodes (12): OperatorResult, rangeOperator(), cache, clearOperatorCache(), lookupOperator(), pending, resetOperators(), slot() (+4 more)

### Community 138 - "labels/service.rs"
Cohesion: 0.42
Nodes (10): all(), decode(), encode(), key(), lock(), propagate(), register(), register_kind() (+2 more)

### Community 139 - "operators/handlers.rs"
Cohesion: 0.17
Nodes (7): lookup(), read(), save(), ResultData, Status, digits(), fingerprint()

### Community 140 - "profile/tests.rs"
Cohesion: 0.16
Nodes (3): action(), patches_preserve_omitted_fields_and_reject_nonobjects(), untrusted_actions_need_both_scopes_and_versions()

### Community 141 - "tasks/dto.rs"
Cohesion: 0.31
Nodes (5): CalendarResponse, PlanInput, TaskInput, TodayResponse, TaskOccurrenceResponse

### Community 142 - "holiday-list.tsx"
Cohesion: 0.17
Nodes (15): FilterQuery, buildHolidayYear(), holidayIdentity(), sharedNames, holidayFilters, kindAliases, internationalDays, firstHolidayYear (+7 more)

### Community 144 - "analytics/handlers.rs"
Cohesion: 0.32
Nodes (4): read_privacy(), report(), update_privacy(), routes()

### Community 145 - "analytics/models.rs"
Cohesion: 0.26
Nodes (8): Day, HabitMetrics, Privacy, ProfileMetrics, Range, Report, TimerMetrics, WorkoutMetrics

### Community 146 - "ExternalLink"
Cohesion: 0.41
Nodes (8): ContactActions(), contactLinkActions(), serviceName(), linkIcon(), LinkService, openExternalUrl(), phoneLinks(), safeExternalUrl()

### Community 147 - "ai/repository.rs"
Cohesion: 0.44
Nodes (7): expire(), history(), invalidate(), load_turn(), require_chat(), turn(), TURN_COLUMNS

### Community 149 - "eslint.config.js"
Cohesion: 0.17
Nodes (10): @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, typescript-eslint@^8.48.0, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+2 more)

### Community 150 - "access/service.rs"
Cohesion: 0.47
Nodes (4): change(), exercise_visible(), object_table(), visible()

### Community 155 - "habits/dto.rs"
Cohesion: 0.33
Nodes (3): HabitInput, MarkInput, Range

### Community 156 - "tasks/tests.rs"
Cohesion: 0.57
Nodes (6): date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), multiday_tasks_overlap_calendar_and_search_without_changing_the_occurrence_key(), open_date_filters_find_old_and_distant_recurrences(), schedule(), timed_calendar_and_date_search_use_the_profile_day()

### Community 158 - "notes/models.rs"
Cohesion: 0.23
Nodes (11): BulkAction, Color, Delete, Move, TagsAdd, TagsRemove, BulkItem, BulkNotes (+3 more)

### Community 159 - "ContactBinding"
Cohesion: 0.48
Nodes (4): ContactBinding, Birthday, Independent, Linked

### Community 160 - "countdowns/domain.rs"
Cohesion: 0.35
Nodes (8): at_index(), category(), clamped(), computed(), index_near(), instant(), MAX_OCCURRENCE_YEAR, occurrences()

### Community 162 - "programs.tsx"
Cohesion: 0.10
Nodes (28): save(), PomodoroHistory(), change(), Snapshot, kindLabels, PomodoroConfig, Program, ProgramState (+20 more)

### Community 163 - "Frontend"
Cohesion: 0.33
Nodes (5): Before finishing, Frontend, New centralized systems, Skils, UI principles

### Community 164 - "integrations/models.rs"
Cohesion: 0.26
Nodes (10): Credentials, EpicCredentials, EpicSession, Game, Integration, KeyInput, Provider, Revision (+2 more)

### Community 166 - "mutate"
Cohesion: 0.67
Nodes (4): drop(), move(), mutate(), update()

### Community 167 - "catalog.rs"
Cohesion: 0.22
Nodes (8): Collection, collection_catalog(), CollectionValue, fixed_collection_value(), fixed_entry(), fixed_icon(), seed(), stored_value()

### Community 172 - "steam.rs"
Cohesion: 0.30
Nodes (10): account_id(), ENDPOINT, GamesData, GamesResponse, integration_normalizes_playtime_and_preserves_unavailable_recent_data(), integration_private_library_is_not_an_empty_library(), library(), normalize() (+2 more)

### Community 173 - "http.rs"
Cohesion: 0.13
Nodes (7): client(), endpoint(), generate(), bytes(), client(), json(), retry_after()

### Community 174 - "path"
Cohesion: 0.32
Nodes (6): calendar(), mark(), preferences(), read(), refresh(), routes()

### Community 175 - "feedback.rs"
Cohesion: 0.30
Nodes (6): enqueue(), Entry, list(), Message, read(), routes()

### Community 176 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 177 - "tags.rs"
Cohesion: 0.35
Nodes (7): Change, list(), normalized(), read(), same(), save(), SubjectTags

### Community 178 - "provider.rs"
Cohesion: 0.27
Nodes (4): catalog_image(), download(), register_providers(), trusted()

### Community 180 - "LifeCycle frontend"
Cohesion: 0.17
Nodes (12): AI-помощник `/ai`, LifeCycle frontend, Upgrade v1, этапы 1.4–1.5, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Какие записи видит AI, Общие метки, история и операторы — миграции 0023–0025, Основные данные (этап 3) (+4 more)

### Community 181 - "LifeCycle"
Cohesion: 0.18
Nodes (8): LifeCycle, Upgrade v1: этапы 1.1–1.3, Upgrade v1: этапы 1.4–1.5, Единый рабочий экран задач, Локальный запуск, Подключение AI, Проверки, Структура

### Community 182 - "shared-systems.spec.ts"
Cohesion: 0.27
Nodes (6): collectionsSetup(), defaults, fixedRegistry(), gallerySetup(), png, setup()

### Community 183 - "use-holidays.ts"
Cohesion: 0.29
Nodes (9): Праздники, Праздники, анимации и эффекты — 03.11.2026, holidayOccurrences(), cache, loadHolidayYear(), pending, resetWorker(), State (+1 more)

### Community 184 - "media/routes.rs"
Cohesion: 0.24
Nodes (3): MAX_BYTES, Media, routes()

### Community 185 - "FeedQuery"
Cohesion: 0.54
Nodes (3): Feed, FeedItem, FeedQuery

### Community 186 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 187 - "UX-правки задач, досок и навигации (31.10.2026)"
Cohesion: 0.29
Nodes (7): Upgrade 1.6: события и поздравления, Upgrade 1.7: алгоритмы Pomodoro, Upgrade 1.8: профиль и жизненная история, UX-правки задач, досок и навигации (31.10.2026), Быстрые задачи и планирование — 01.11.2026, Массовые заметки и навигация — 02.11.2026, Рабочее пространство — 02.11.2026

### Community 190 - "choiceOptions"
Cohesion: 0.60
Nodes (3): ChoiceOption, choiceOptions(), textOf()

### Community 191 - "manifest.json"
Cohesion: 0.40
Nodes (4): circle-flags, simple-icons, tabler, twemoji

### Community 192 - "git-repair.sh"
Cohesion: 1.00
Nodes (3): fail(), log(), git-repair.sh script

## Knowledge Gaps
- **53 isolated node(s):** `lifecycle-api`, `Exercise`, `Workout`, `Task`, `Note` (+48 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 831 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `schedule.rs` (2× useful, score=1.452912899)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `scripts` connect `scripts` to `package.json`?**
  _High betweenness centrality (0.446) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `AppState` (e.g. with `seed()` and `ensure_focus_task()`) actually correct?**
  _`AppState` has 7 INFERRED edges - model-reasoned connections that need verification._
- **What connects `lifecycle-api`, `Exercise`, `Workout` to the rest of the system?**
  _53 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `locale.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07342657342657342 - nodes in this community are weakly interconnected._
- **Why does `preview` connect `scripts` to `requests.rs`, `chats.rs`?**
  _High betweenness centrality (0.446) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `CurrentUser` (e.g. with `authorization_attempt()` and `consume_authorization()`) actually correct?**
  _`CurrentUser` has 5 INFERRED edges - model-reasoned connections that need verification._
- **Should `contacts-page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09993011879804332 - nodes in this community are weakly interconnected._