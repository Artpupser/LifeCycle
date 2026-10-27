# LifeCycle

Модульное приложение для личного расписания, задач, привычек и тренировок.
Требования: [project/project_projective.md](project/project_projective.md).
Текущее состояние и фактически выполненные проверки: [project/project_progress.md](project/project_progress.md).

## Локальный запуск

Нужны Docker Engine с Compose, Python 3 для генерации конфигурации. Для разработки вне контейнеров: Rust 1.96+, Node 24+, pnpm 11.3.0.

```sh
python3 scripts/setup_env.py
docker compose config --quiet
docker compose up --build --wait --wait-timeout 180
python3 scripts/smoke.py
```

Приложение открывается по адресу `http://localhost:8081`. API доступен на том же адресе с префиксом `/api`. Порт можно изменить в `.env` через `APP_PORT`; одновременно измените `APP_PUBLIC_URL`.

Генератор создаёт `.env` с уникальными секретами и правами `0600`; повторный запуск не меняет существующие секреты. `.env.example` содержит только имена параметров. Не помещайте `.env` в git и не публикуйте вывод `docker compose config` с подставленными секретами; для проверки используйте `--quiet`.

Compose поднимает PostgreSQL, Redis с паролем, Garage, Rust API, frontend с nginx и Mailpit для локальной почты. На loopback опубликованы frontend и интерфейс Mailpit `http://localhost:8025`. Данные БД, Redis, Garage и Mailpit хранятся в именованных томах. `docker compose down` сохраняет данные; удаление томов уничтожит их.

Для проверки входа в локальном окружении используйте любой тестовый email, затем откройте письмо в Mailpit. Сообщения не отправляются внешним адресатам. Для настоящей доставки задайте `SMTP_HOST`, `SMTP_PORT`, `SMTP_TLS=starttls` или `tls`, логин, пароль и адрес отправителя. Незашифрованный SMTP разрешён backend только для локального транспорта разработки.

Приватная анкета шифруется с `DATA_ENCRYPTION_KEY`. Сохраняйте ключ вместе с защищённой резервной копией конфигурации: его замена без миграции делает старые анкеты нечитаемыми. Генератор не заменяет существующие ключи. `TRUST_PROXY=true` предназначен только для закрытого backend за nginx, который перезаписывает `X-Real-IP`; при прямом доступе к API установите `false`.

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
docker compose config --quiet
python3 scripts/smoke.py
python3 scripts/auth_smoke.py
python3 scripts/core_smoke.py --check-oversize --check-completion
pnpm --dir frontend test:e2e
```

`/api/health/live` проверяет доступность процесса. `/api/health/ready` обращается к настоящим PostgreSQL, Redis и приватному Garage bucket; при сбое зависимости возвращается HTTP 503. Smoke проверяет SPA, reverse proxy и всю цепочку зависимостей. Успешная компиляция не заменяет этот интеграционный запуск.

После входа открывается `/today`. Этап 3 включает заметки и папки, задачи со списком/Kanban/Gantt, календарь и повторяющиеся расписания, Markdown с приватными изображениями, countdown и Pomodoro. API smoke проверяет сохранение данных, независимые отметки повторений, историю, изоляцию пользователей и реальные S3-загрузки. Флаг `--check-completion` дополнительно ждёт настоящий минутный интервал Pomodoro. Браузерные проверки требуют установленного Chromium (`pnpm --dir frontend exec playwright install chromium`); они работают с запущенным Compose и Mailpit.
