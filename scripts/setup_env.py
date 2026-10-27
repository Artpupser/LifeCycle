import base64
import os
from pathlib import Path
import secrets
import tempfile


def main():
    root = Path(__file__).resolve().parents[1]
    path = root / ".env"
    if path.is_symlink():
        raise ValueError(".env должен быть обычным файлом")
    values = {
        "POSTGRES_PASSWORD": secrets.token_hex(24),
        "REDIS_PASSWORD": secrets.token_hex(24),
        "GARAGE_RPC_SECRET": secrets.token_hex(32),
        "S3_ACCESS_KEY_ID": "GK" + secrets.token_hex(16),
        "S3_SECRET_ACCESS_KEY": secrets.token_hex(32),
        "AUTH_CODE_SECRET": secrets.token_hex(32),
        "DATA_ENCRYPTION_KEY": base64.b64encode(secrets.token_bytes(32)).decode(),
    }
    existing = path.read_text() if path.exists() else ""
    lines = existing.splitlines()
    known = {line.split("=", 1)[0] for line in lines if "=" in line}
    for line in (root / ".env.example").read_text().splitlines():
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, default = line.split("=", 1)
        if key not in known:
            lines.append(f"{key}={values.get(key, default)}")
    for index, line in enumerate(lines):
        if "=" in line:
            key, value = line.split("=", 1)
            if key in values and not value:
                lines[index] = f"{key}={values[key]}"
    with tempfile.NamedTemporaryFile(mode="w", dir=root, prefix=".env.", delete=False) as stream:
        temporary = Path(stream.name)
        stream.write("\n".join(lines) + "\n")
    os.replace(temporary, path)
    print(".env обновлён: существующие значения сохранены, недостающие ключи добавлены, права 0600.")


if __name__ == "__main__":
    main()
