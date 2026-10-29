# Graph Report - LifeCycle  (2026-10-29)

## Corpus Check
- 150 files · ~87,066 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 12 file(s) not represented in the graph (top: (none) 8, .example 1, .conf 1)

## Summary
- 1612 nodes · 5193 edges · 71 communities (63 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 28 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f8cddbf7`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- project_projective.md
- Graphify Project Navigation
- AppState
- habit-controls.tsx
- services
- auth_smoke.py
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
- ai_provider.rs
- health/api.ts
- verify_code
- countdowns.rs
- workout_sessions.rs
- garage
- mailpit
- postgres
- redis
- @playwright/test
- schedule.rs
- app.tsx
- intimacy.rs
- habits.rs
- README.md
- depends_on
- Основные данные и планирование (этап 3)
- Прогресс LifeCycle
- LifeCycle API
- pomodoro.rs
- Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?
- foundation.rs
- Button
- ErrorState
- auth.rs
- Q: Stage 8 AI recovery and provider authentication
- backend
- workout_plan.rs
- FormField
- entry-editor.tsx
- api
- Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4
- profile/types.ts
- analytics.rs
- csrf.rs
- Q: Stage 5 workout integration with habits Today calendar and schedule
- AppState
- Восстановление и этап 6 — 28 октября 2026
- Повторное восстановление этапа 8 — 29 октября 2026
- media.rs
- analytics-page.tsx
- LifeCycle frontend
- Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5
- Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown

## God Nodes (most connected - your core abstractions)
1. `AppState` - 179 edges
2. `CurrentUser` - 106 edges
3. `Button()` - 83 edges
4. `api()` - 81 edges
5. `errorMessage()` - 68 edges
6. `FormField()` - 51 edges
7. `Input()` - 51 edges
8. `useResource()` - 49 edges
9. `ApiJson` - 48 edges
10. `ErrorState()` - 48 edges

## Surprising Connections (you probably didn't know these)
- `Выполнение и таймеры` --references--> `cancel()`  [INFERRED]
  backend/README.md → frontend/src/features/ai/chat-panel.tsx
- `Связь с привычками, Today и календарём` --references--> `HabitConfig`  [INFERRED]
  backend/README.md → frontend/src/features/habits/types.ts
- `Привычки и напоминания (этап 4)` --references--> `Schedule`  [INFERRED]
  backend/README.md → frontend/src/features/planning/types.ts
- `Аналитика и удаление (этап 7)` --references--> `pomodoro()`  [INFERRED]
  backend/README.md → scripts/core_smoke.py
- `Библиотека и конструктор` --references--> `Exercise`  [INFERRED]
  backend/README.md → frontend/src/features/workouts/types.ts

## Import Cycles
- None detected.

## Communities (71 total, 8 thin omitted)

### Community 0 - "project_projective.md"
Cohesion: 0.08
Nodes (23): Архетиктурный план разработки, Зачем нужно создавать это приложение?, Как бы я назвал данное приложение?, Как понять что проект готов?, Какие должны быть разделы/вкладки?, Какие системы должны быть?, Между какими системами должна быть интеграция?, Минимальные желаемые данные некоторых сущностей (+15 more)

### Community 1 - "Graphify Project Navigation"
Cohesion: 0.50
Nodes (3): AST graph update, Graphify knowledge graph, Wiki navigation

### Community 2 - "AppState"
Cohesion: 0.08
Nodes (43): allowed_history(), cancel_turn(), Chat, chats(), Config, config(), ConfigInput, ConfigView (+35 more)

### Community 3 - "habit-controls.tsx"
Cohesion: 0.14
Nodes (21): Markdown(), render(), HabitControls(), save(), MarkEditor(), submit(), submit(), refresh() (+13 more)

### Community 4 - "services"
Cohesion: 0.18
Nodes (10): name, networks, services, services, volumes, garage_data, garage_meta, mailpit_data (+2 more)

### Community 5 - "auth_smoke.py"
Cohesion: 0.10
Nodes (48): NoRedirect, raw(), run(), run(), send(), run(), save(), main() (+40 more)

### Community 6 - "AppState"
Cohesion: 0.13
Nodes (36): calendar(), calendar_date(), CalendarQuery, CalendarResponse, create(), date(), date_filters_respect_boundaries_of_once_and_weekly_rules(), delete() (+28 more)

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

### Community 12 - "package.json"
Cohesion: 0.09
Nodes (25): devDependencies, eslint@^10.13.0, @eslint/js@^10.0.1, eslint-plugin-react-hooks@^7.0.0, eslint-plugin-react-refresh@^0.5.7, globals@^17.13.0, tailwindcss@^4.1.0, @types/node@^24.0.0 (+17 more)

### Community 13 - "compilerOptions"
Cohesion: 0.15
Nodes (12): compilerOptions, lib, module, moduleResolution, noEmit, skipLibCheck, strict, target (+4 more)

### Community 14 - "frontend"
Cohesion: 0.29
Nodes (7): condition, backend, depends_on, networks, ports, restart, frontend

### Community 15 - "ai_login.rs"
Cohesion: 0.09
Nodes (40): access(), Account, account(), account_context(), accounts(), AttemptQuery, authorization_url(), authorize() (+32 more)

### Community 16 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.1.0, @vitejs/plugin-react@^6.1.2, vitest@^5.0.5, @tailwindcss/vite, @vitejs/plugin-react, vitest

### Community 17 - "scripts"
Cohesion: 0.25
Nodes (8): scripts, build, dev, lint, preview, test, test:e2e, typecheck

### Community 19 - "engines"
Cohesion: 0.67
Nodes (3): engines, node, pnpm

### Community 22 - "ideas.md"
Cohesion: 0.50
Nodes (3): Для AI, Список идей, Что уже есть?

### Community 25 - "prompts.md"
Cohesion: 0.17
Nodes (11): 1. Восстановление контекста, 1. Восстановление контекста, 2. Продолжение разработки, 2. Продолжение разработки, 3. Сохранение прогресса, 3. Сохранение прогресса, Анализ приложения, Заметки (+3 more)

### Community 26 - "ai_provider.rs"
Cohesion: 0.10
Nodes (17): Answer, bounded_json(), bounded_json_limit(), client(), endpoint(), error_code(), EventStream, generate() (+9 more)

### Community 27 - "health/api.ts"
Cohesion: 0.43
Nodes (6): fetchReadiness(), HealthRequestError, isRecord(), parseReadiness(), Readiness, ServiceStatus

### Community 28 - "verify_code"
Cohesion: 0.18
Nodes (13): authenticate(), client_address(), code_hash(), EmailRequest, identifier(), keyed_hash(), logout(), normalize_email() (+5 more)

### Community 29 - "countdowns.rs"
Cohesion: 0.09
Nodes (24): computed(), Countdown, CountdownInput, create(), delete(), list(), next_date(), read() (+16 more)

### Community 30 - "workout_sessions.rs"
Cohesion: 0.19
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

### Community 36 - "schedule.rs"
Cohesion: 0.13
Nodes (5): ApiError, ApiJson<T>, ErrorDetail, ErrorEnvelope, not_found()

### Community 37 - "app.tsx"
Cohesion: 0.14
Nodes (28): App(), AppContent(), NotFound(), Shell(), buttonVariants, Card(), CardContent(), CardDescription() (+20 more)

### Community 38 - "intimacy.rs"
Cohesion: 0.11
Nodes (35): actual_times_reject_dst_gaps_and_preserve_both_repeated_instants(), analytics_summary(), AnalyticsSummary, Answers, ciphertext_is_bound_to_owner_and_individual_entry(), context(), create(), Day (+27 more)

### Community 39 - "habits.rs"
Cohesion: 0.11
Nodes (46): complete_workout(), create(), current_untimed_pending_does_not_break_a_completed_streak(), delete(), dismiss(), editable_occurrence(), fixture(), foreign_or_duplicate_children_are_rejected() (+38 more)

### Community 40 - "README.md"
Cohesion: 0.22
Nodes (5): LifeCycle, Локальный запуск, Подключение AI, Проверки, Структура

### Community 41 - "depends_on"
Cohesion: 0.22
Nodes (9): depends_on, garage, mailpit, postgres, redis, condition, condition, condition (+1 more)

### Community 42 - "Основные данные и планирование (этап 3)"
Cohesion: 0.33
Nodes (6): Countdown и Pomodoro, Today, календарь и история, Задачи, подзадачи и расписания, Заметки и папки, Основные данные и планирование (этап 3), Приватные изображения

### Community 43 - "Прогресс LifeCycle"
Cohesion: 0.11
Nodes (18): Восстановление и этап 4 — 28 октября 2026, Восстановление и этап 5 — 28 октября 2026, Восстановление и этап 7 — 28 октября 2026, Восстановление и этап 8 — 28 октября 2026, Восстановление этапа 3 — 27 октября 2026, Итог этапа 3, Итог этапа 4, Итог этапа 5 (+10 more)

### Community 44 - "LifeCycle API"
Cohesion: 0.12
Nodes (16): AI и подключения, EntryData и время, HTTP контракт, LifeCycle API, Аналитика и удаление (этап 7), Выполнение и таймеры, Идентификация, профиль и настройки (этап 2), Интимный журнал (этап 6) (+8 more)

### Community 45 - "pomodoro.rs"
Cohesion: 0.27
Nodes (6): active(), change(), routes(), Session, Start, start()

### Community 46 - "Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Каково фактическое состояние этапа 3 LifeCycle после прерывания и восстановления?, Source Nodes

### Community 47 - "foundation.rs"
Cohesion: 0.10
Nodes (14): Config, validated_url(), router(), main(), run(), shutdown(), configuration_errors_do_not_expose_secrets(), configuration_rejects_unsafe_storage_endpoint() (+6 more)

### Community 48 - "Button"
Cohesion: 0.17
Nodes (33): Dialog(), FormField(), MarkdownEditor(), Button(), Input(), Select(), Textarea(), Countdown (+25 more)

### Community 49 - "ErrorState"
Cohesion: 0.13
Nodes (47): AuthenticatedApp(), ErrorState(), LoadingState(), AiPage(), AiSettings(), AnalyticsPage(), CountdownsPage(), FocusPage() (+39 more)

### Community 50 - "auth.rs"
Cohesion: 0.11
Nodes (7): me(), MessageResponse, REQUEST_CODE, routes(), SESSION_SECONDS, UserResponse, VERIFY_CODE

### Community 51 - "Q: Stage 8 AI recovery and provider authentication"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 8 AI recovery and provider authentication, Source Nodes

### Community 52 - "backend"
Cohesion: 0.33
Nodes (7): build, networks, restart, context, dockerfile, build, backend

### Community 53 - "workout_plan.rs"
Cohesion: 0.11
Nodes (18): bounded(), check_status(), Checks, live(), LiveResponse, ready(), ReadyResponse, Entry (+10 more)

### Community 54 - "FormField"
Cohesion: 0.08
Nodes (38): Библиотека и конструктор, Countdown, CountdownEditor(), submit(), CountdownInput, CountdownPage(), EnabledReminders(), HabitReminders() (+30 more)

### Community 55 - "entry-editor.tsx"
Cohesion: 0.20
Nodes (17): EntryDetail(), IntimacyPage(), VisibleJournal(), AnswersRow(), JournalStatistics(), answerLabel(), Answers, Entry (+9 more)

### Community 56 - "api"
Cohesion: 0.09
Nodes (50): logout(), upload(), safeMarkdownUrl(), Workspace(), create(), remove(), ChatPanel(), cancel() (+42 more)

### Community 57 - "Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Восстановить LifeCycle после этапа 3 и выполнить этап 4, Source Nodes

### Community 58 - "profile/types.ts"
Cohesion: 0.25
Nodes (9): submit(), draftToProfile(), MedicalKey, medicalKeys, NumericProfileKey, Profile, ProfileDraft, profileToDraft() (+1 more)

### Community 59 - "analytics.rs"
Cohesion: 0.10
Nodes (26): build(), clip(), validate_range(), ai_report(), build_report(), Day, habit_metrics(), habit_rollup_weights_results_and_excludes_cancellations_and_pending() (+18 more)

### Community 61 - "Q: Stage 5 workout integration with habits Today calendar and schedule"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 5 workout integration with habits Today calendar and schedule, Source Nodes

### Community 62 - "AppState"
Cohesion: 0.06
Nodes (57): CurrentUser, color(), conflict(), event(), local_today(), not_found(), Search, settings() (+49 more)

### Community 63 - "Восстановление и этап 6 — 28 октября 2026"
Cohesion: 0.67
Nodes (3): Восстановление и этап 6 — 28 октября 2026, Итог этапа 6, Фактически выполненные проверки этапа 6

### Community 64 - "Повторное восстановление этапа 8 — 29 октября 2026"
Cohesion: 0.67
Nodes (3): Исправление по внешней проверке ChatGPT — 29 октября 2026, Повторное восстановление этапа 8 — 29 октября 2026, Реализация и локальная приёмка этапа 8 — 29 октября 2026

### Community 65 - "media.rs"
Cohesion: 0.19
Nodes (6): download(), MAX_BYTES, Media, routes(), upload(), verify_image()

### Community 66 - "analytics-page.tsx"
Cohesion: 0.35
Nodes (10): DayChart(), Metrics(), minutes(), number(), percent(), ReportView(), Day, Privacy (+2 more)

### Community 71 - "LifeCycle frontend"
Cohesion: 0.29
Nodes (7): AI-помощник `/ai`, LifeCycle frontend, Аналитика и удаление (этап 7), Интимный журнал (этап 6), Основные данные (этап 3), Привычки (этап 4), Тренировки (этап 5)

### Community 72 - "Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 6 intimacy journal architecture, privacy and integration after Stage 5, Source Nodes

### Community 73 - "Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: Stage 7 analytics and deletion integration with tasks notes calendar schedule Markdown, Source Nodes

## Knowledge Gaps
- **11 isolated node(s):** `lifecycle-api`, `Pending`, `Completed`, `Skipped`, `Cancelled` (+6 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 393 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `project_progress.md` (2× useful, score=1.996498607) _(code changed — re-verify)_
- `habits.rs` (2× useful, score=1.996057155)
- `schedule.rs` (2× useful, score=1.996057155)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `LifeCycle API` connect `LifeCycle API` to `README.md`, `Основные данные и планирование (этап 3)`?**
  _High betweenness centrality (0.350) - this node is a cross-community bridge._
- **What connects `lifecycle-api`, `Pending`, `Completed` to the rest of the system?**
  _11 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `project_projective.md` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Why does `pomodoro()` connect `auth_smoke.py` to `LifeCycle API`?**
  _High betweenness centrality (0.323) - this node is a cross-community bridge._
- **Should `AppState` be split into smaller, more focused modules?**
  _Cohesion score 0.0784313725490196 - nodes in this community are weakly interconnected._
- **Why does `Аналитика и удаление (этап 7)` connect `LifeCycle API` to `auth_smoke.py`?**
  _High betweenness centrality (0.323) - this node is a cross-community bridge._
- **Should `habit-controls.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14492753623188406 - nodes in this community are weakly interconnected._