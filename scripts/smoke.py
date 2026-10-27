import argparse
import json
from urllib.request import urlopen


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://localhost:8081")
    args = parser.parse_args()
    base = args.url.rstrip("/")
    with urlopen(base + "/api/health/live", timeout=10) as response:
        assert response.status == 200
        assert json.load(response)["status"] == "ok"
    with urlopen(base + "/api/health/ready", timeout=15) as response:
        assert response.status == 200
        report = json.load(response)
        assert report["status"] == "ready"
        assert report["checks"] == {"postgres": "ok", "redis": "ok", "garage": "ok"}
    with urlopen(base + "/", timeout=10) as response:
        assert response.status == 200
        assert 'id="root"' in response.read().decode()
    print("PASS: SPA → reverse proxy → Rust API → PostgreSQL, Redis, Garage.")


if __name__ == "__main__":
    main()
