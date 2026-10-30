import hashlib
import json
from pathlib import Path
import subprocess
import tempfile
import time
from urllib.parse import urlsplit, urlunsplit
from uuid import uuid4


def run(*args, data=None):
    result = subprocess.run(args, input=data, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("Container or migration command failed; credentials and captured output are withheld")
    return result.stdout


def sql(query, database=""):
    return run("podman", "exec", "-i", "lifecycle_postgres_1", "sh", "-c", 'exec psql -X -At -U "$POSTGRES_USER" -d "${1:-$POSTGRES_DB}" -v ON_ERROR_STOP=1', "sh", database, data=query)


def verify_migrations(database=""):
    rows = sql("SELECT version,success,encode(checksum,'hex') FROM _sqlx_migrations ORDER BY version", database).splitlines()
    files = sorted((Path(__file__).resolve().parent.parent / "backend" / "migrations").glob("*.sql"))
    if len(rows) != len(files):
        raise RuntimeError("Applied migration count differs from repository")
    for path, row in zip(files, rows):
        version, success, checksum = row.split("|")
        if int(version) != int(path.name.split("_")[0]) or success != "t" or checksum != hashlib.sha384(path.read_bytes()).hexdigest():
            raise RuntimeError("Migration version, success or checksum mismatch")


def ready(container):
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        result = subprocess.run(["podman", "exec", container, "curl", "--fail", "--silent", "--max-time", "5", "http://127.0.0.1:8080/api/health/ready"], capture_output=True, text=True)
        if result.returncode == 0 and json.loads(result.stdout).get("status") == "ready":
            return
        time.sleep(0.5)
    raise RuntimeError("Isolated migration backend did not become ready")


def main():
    verify_migrations()
    print("PASS: applied migration versions and SHA-384 checksums match repository.", flush=True)
    container = json.loads(run("podman", "inspect", "lifecycle_backend_1"))[0]
    network = next(iter(container["NetworkSettings"]["Networks"]))
    database = "lifecycle_stage9_" + uuid4().hex
    name = "lifecycle-migrations-" + uuid4().hex
    shape = """
      SELECT table_name,column_name,data_type,is_nullable,coalesce(column_default,'') FROM information_schema.columns WHERE table_schema='app' ORDER BY 1,2;
      SELECT c.relname,pg_get_constraintdef(k.oid) FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' ORDER BY 1,2;
      SELECT tablename,indexname,indexdef FROM pg_indexes WHERE schemaname='app' ORDER BY 1,2;
    """
    expected = sql(shape)
    run("podman", "exec", "lifecycle_postgres_1", "sh", "-c", 'exec createdb -U "$POSTGRES_USER" "$1"', "sh", database)
    try:
        with tempfile.TemporaryDirectory(prefix="lifecycle-migrations-") as directory:
            env = Path(directory) / "backend.env"
            values = []
            for value in container["Config"]["Env"]:
                if value.startswith("DATABASE_URL="):
                    url = urlsplit(value.split("=", 1)[1])
                    value = "DATABASE_URL=" + urlunsplit(url._replace(path="/" + database))
                if "\n" in value or "\r" in value:
                    raise RuntimeError("Unsupported multiline container environment")
                values.append(value)
            env.touch(mode=0o600)
            env.write_text("\n".join(values) + "\n")
            run("podman", "run", "-d", "--name", name, "--network", network, "--env-file", str(env), container["Image"])
            ready(name)
            verify_migrations(database)
            if sql(shape, database) != expected:
                raise RuntimeError("Fresh database schema differs from running database")
            run("podman", "restart", name)
            ready(name)
            verify_migrations(database)
            print("PASS: production backend migrates an empty database, matches the running schema and restarts without reapplying migrations.")
    finally:
        subprocess.run(["podman", "rm", "-f", "--ignore", name], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        run("podman", "exec", "lifecycle_postgres_1", "sh", "-c", 'exec dropdb -U "$POSTGRES_USER" "$1"', "sh", database)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (RuntimeError, OSError, ValueError, KeyError, StopIteration) as error:
        print(f"FAIL: migration acceptance: {error}")
        raise SystemExit(1)
