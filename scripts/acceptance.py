import argparse
import os
from pathlib import Path
import subprocess
import sys

from auth_smoke import origin_url


def main():
    parser = argparse.ArgumentParser(description="Stage 9 acceptance against running LifeCycle services")
    parser.add_argument("--url", default=os.environ.get("APP_URL", "http://localhost:8081"), type=origin_url)
    parser.add_argument("--mailpit-url", default=os.environ.get("MAILPIT_URL", "http://localhost:8025"), type=origin_url)
    parser.add_argument("--check-migrations", action="store_true", help="Also check the local Podman database and migrate an isolated temporary database")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent.parent
    suites = [
        ("smoke.py", []),
        ("auth_smoke.py", []),
        ("core_smoke.py", ["--check-oversize", "--check-completion"]),
        ("habits_smoke.py", []),
        ("workouts_smoke.py", []),
        ("intimacy_smoke.py", []),
        ("analytics_smoke.py", ["--check-completion"]),
        ("ai_smoke.py", []),
        ("ai_connections_smoke.py", []),
    ]
    try:
        if args.check_migrations:
            subprocess.run([sys.executable, str(root / "scripts" / "migrations_smoke.py")], cwd=root, check=True)
        for name, flags in suites:
            print(f"Running {name}", flush=True)
            options = ["--url", args.url]
            if name != "smoke.py":
                options += ["--mailpit-url", args.mailpit_url]
            subprocess.run([sys.executable, str(root / "scripts" / name), *options, *flags], cwd=root, check=True)
        print("Running Chromium end-to-end acceptance", flush=True)
        subprocess.run(["pnpm", "--dir", "frontend", "test:e2e"], cwd=root, env={**os.environ, "APP_URL": args.url, "MAILPIT_URL": args.mailpit_url}, check=True)
    except (subprocess.CalledProcessError, OSError):
        print("FAIL: Stage 9 acceptance did not complete; resolve the failing check above.", file=sys.stderr)
        return 1
    print("PASS: all API and Chromium integration scenarios, including real one-minute timers.")
    print("AI previews and permissions were checked without external inference; provider acceptance is recorded separately.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
