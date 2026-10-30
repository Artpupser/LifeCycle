COMPOSE ?= podman compose

.PHONY: setup check up down smoke acceptance graph

setup:
	python3 scripts/setup_env.py

check:
	cargo fmt --manifest-path backend/Cargo.toml --check
	cargo clippy --manifest-path backend/Cargo.toml --all-targets --locked -- -D warnings
	cargo test --manifest-path backend/Cargo.toml --locked
	pnpm --dir frontend typecheck
	pnpm --dir frontend lint
	pnpm --dir frontend test
	pnpm --dir frontend build
	$(COMPOSE) config --quiet

up: setup
	$(COMPOSE) up -d --build --force-recreate

down:
	$(COMPOSE) down

smoke:
	python3 scripts/smoke.py

acceptance:
	python3 scripts/acceptance.py --check-migrations

graph:
	graphify update .
