# LifeCycle

Модульное приложение для личного расписания, задач, привычек и тренировок.
Требования: [project/project_projective.md](project/project_projective.md).
Текущее состояние и фактически выполненные проверки: [project/project_progress.md](project/project_progress.md).

## Локальный запуск

Нужны rootless Podman 5+ и podman-compose 1.6+, Python 3 для генерации конфигурации. Для разработки вне контейнеров: Rust 1.96+, Node 24+, pnpm 11.3.0.

```sh
python3 scripts/setup_env.py
podman compose config --quiet
podman compose up -d --build --force-recreate
podman compose ps
python3 scripts/smoke.py
```

Приложение открывается по адресу `http://localhost:8081`. API доступен на том же адресе с префиксом `/api`. Порт можно изменить в `.env` через `APP_PORT`; одновременно измените `APP_PUBLIC_URL`.

Генератор создаёт `.env` с уникальными секретами и правами `0600`; повторный запуск не меняет существующие секреты. `.env.example` содержит только имена параметров. Не помещайте `.env` в git и не публикуйте вывод `podman compose config` с подставленными секретами; для проверки используйте `--quiet`.

Compose поднимает PostgreSQL, Redis с паролем, Garage, Rust API, frontend с nginx и Mailpit для локальной почты. На loopback опубликованы frontend и интерфейс Mailpit `http://localhost:8025`. Данные БД, Redis, Garage и Mailpit хранятся в именованных томах. `podman compose down` сохраняет данные; удаление томов уничтожит их.

Для проверки входа в локальном окружении используйте любой тестовый email, затем откройте письмо в Mailpit. Сообщения не отправляются внешним адресатам. Для настоящей доставки задайте `SMTP_HOST`, `SMTP_PORT`, `SMTP_TLS=starttls` или `tls`, логин, пароль и адрес отправителя. Незашифрованный SMTP разрешён backend только для локального транспорта разработки.

Приватная анкета и содержимое интимного журнала шифруются с `DATA_ENCRYPTION_KEY`. Сохраняйте ключ вместе с защищённой резервной копией конфигурации: его замена без миграции делает старые анкеты и журнал нечитаемыми. Генератор не заменяет существующие ключи. `TRUST_PROXY=true` предназначен только для закрытого backend за nginx, который перезаписывает `X-Real-IP`; при прямом доступе к API установите `false`.

Compose явно использует `backend/Containerfile` и `frontend/Containerfile`, полные имена registry и SELinux-метку `:Z` для конфигурации Garage. Все healthcheck заданы в Compose; предупреждение Podman об отсутствии image HEALTHCHECK в OCI не отключает эти проверки. Для обновления после сборки используется `--force-recreate`: проверенный podman-compose не заменяет работающий контейнер только из-за смены ID образа при неизменной конфигурации. Именованные тома сохраняются. Перед smoke дождитесь healthy всех шести сервисов в `podman compose ps`. `podman compose` вызывает установленный `podman-compose`; те же команды доступны напрямую как `podman-compose`. Томами управляет Podman: существующие тома Docker автоматически в него не переносятся. Для переноса прежнего стенда нужны отдельные резервная копия и восстановление; команды запуска не удаляют старые тома.

Garage 2.5 автоматически создаёт локальную одноузловую раскладку, приватный bucket и S3-ключ через `--single-node --default-bucket`. Регион `garage` согласован с `infra/garage.toml`. Этот профиль предназначен для разработки: для production нужны резервируемый Garage, TLS на reverse proxy и управление секретами. Основание конфигурации: [официальный quick start Garage](https://garagehq.deuxfleurs.fr/documentation/quick-start/).

## Структура

- `backend/` — Rust API, конфигурация, подключения, миграции и тесты.
- `frontend/` — React/TypeScript SPA, UI-компоненты и Vite/nginx proxy.
- `infra/` — конфигурация хранилища.
- `scripts/` — генерация секретов и сквозная проверка.
- `project/` — требования, решения и прогресс по этапам.
- `graphify-out/` — граф связей проекта.

Контракты: [backend/README.md](backend/README.md), [frontend/README.md](frontend/README.md).

## Проверки

```sh
cargo fmt --manifest-path backend/Cargo.toml --check
cargo clippy --manifest-path backend/Cargo.toml --all-targets --locked -- -D warnings
cargo test --manifest-path backend/Cargo.toml --locked
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend typecheck
pnpm --dir frontend lint
pnpm --dir frontend test
pnpm --dir frontend build
podman compose config --quiet
python3 scripts/smoke.py
python3 scripts/auth_smoke.py
python3 scripts/core_smoke.py --check-oversize --check-completion
python3 scripts/habits_smoke.py
python3 scripts/workouts_smoke.py
python3 scripts/intimacy_smoke.py
python3 scripts/analytics_smoke.py --check-completion
python3 scripts/ai_smoke.py --check-provider-error
python3 scripts/ai_connections_smoke.py
pnpm --dir frontend test:e2e
```

`/api/health/live` проверяет доступность процесса. `/api/health/ready` обращается к настоящим PostgreSQL, Redis и приватному Garage bucket; при сбое зависимости возвращается HTTP 503. Smoke проверяет SPA, reverse proxy и всю цепочку зависимостей. Успешная компиляция не заменяет этот интеграционный запуск.

После входа открывается `/today`. Этапы 3–5 включают привычки с подпривычками, отметками, сериями, статистикой, напоминаниями и интеграцией Today/календаря, а также заметки и папки, задачи со списком/Kanban/Gantt, календарь и повторяющиеся расписания, Markdown с приватными изображениями, countdown и Pomodoro. API smoke проверяет сохранение данных, независимые отметки повторений, историю, изоляцию пользователей и реальные S3-загрузки. Флаг `--check-completion` дополнительно ждёт настоящий минутный интервал Pomodoro. Браузерные проверки требуют установленного Chromium (`pnpm --dir frontend exec playwright install chromium`); они работают с запущенным Compose и Mailpit.

Этап 5 добавляет `/workouts`: библиотеку собственных упражнений с техникой и изображениями, конструктор кругов/повторов/отдыха, линейную прогрессию нагрузки и серверное выполнение с таймерами, паузой и историей. Выберите тренировку в привычке: её появление в Today/календаре открывает нужный план, а полное выполнение отмечает привычку в одной транзакции. Подробные правила и ограничения — в контрактах backend/frontend. Этап 6 добавляет `/sex`: приватный интимный журнал с полной добровольной анкетой, несколькими событиями в день, Markdown и отдельной описательной статистикой по периоду/типу. Анкеты шифруются на сервере, изменения защищены revision, удаление явно подтверждается. Правила времени/DST, границы приватности и метаданных — в контрактах backend/frontend. Этап 7 добавляет `/analytics`: реальные события и итоги задач, привычек, тренировок и Pomodoro, динамику по дням и отдельные разрешения для минимальных сводок профиля/интимного журнала. Архивация во всех модулях заменена физическим удалением с сохранением исторических результатов. Миграция 7 также удаляет прежние архивированные шаблоны, сохраняя их историю. Этап 8 добавляет `/ai`: чаты, явные разрешения, точный предпросмотр, OpenAI API, OpenRouter API и официальный локальный вход через ChatGPT. Настоящий вход ChatGPT и завершённый ответ подтверждены пользователем и сервером; результаты и ограничения проверки API-альтернатив зафиксированы в журнале. Этап 9 не начат.

## Подключение AI

Откройте `/ai` после входа. OpenAI API и OpenRouter используют разные ключи, которые вводятся только в интерфейсе и хранятся зашифрованными на сервере. Для ChatGPT выберите «OpenAI → Вход через ChatGPT», сохраните настройки, нажмите Continue with ChatGPT, затем загрузите модели, выберите модель, разрешите сообщения и сохраните. Перед отправкой всегда проверьте предпросмотр.

Вход ChatGPT предназначен для локального HTTP-развёртывания на localhost/127.0.0.1 и браузера на том же компьютере; открытая регистрация OpenAI требует callback на `127.0.0.1`. Для удалённого сервера/телефона используйте API-ключ. Подходящий тариф, разрешения и лимиты определяет OpenAI. OpenRouter также может требовать оплату; LifeCycle включает ZDR и запрет сбора данных, поэтому некоторые модели недоступны.

Проверка настоящего API-ответа с тремя синтетическими вопросами (ключ вводится скрыто, после проверки тестовое подключение удаляется):

```sh
python3 scripts/ai_live_smoke.py --provider openrouter --model openai/gpt-4.1-mini
python3 scripts/ai_live_smoke.py --provider openai --model gpt-4.1-mini
```

Скрипт создаёт отдельный тестовый аккаунт, проверяет заметку/диалог/отзыв и не передаёт данные вашего личного аккаунта. Для Login завершите вход через интерфейс и проверьте настоящий ответ там. Локальные тесты транспорта и OAuth не считаются успешной внешней приёмкой. Подробные контракты и ограничения — в backend/README.md.
