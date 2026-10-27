.PHONY: setup check up down smoke graph

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
	docker compose config --quiet

up: setup
	docker compose up --build --wait --wait-timeout 180

down:
	docker compose down

smoke:
	python3 scripts/smoke.py

graph:
	graphify update .
