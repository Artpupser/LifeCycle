
#!/bin/sh

# git-repair.sh
# Проверка и попытка восстановления повреждённых loose objects Git.
# Оригиналы повреждённых файлов сохраняются в карантине.

set -u

log() {
    printf '%s\n' "[git-repair] $*"
}

fail() {
    log "ERROR: $*"
    exit 1
}

command -v git >/dev/null 2>&1 ||
    fail "Git не установлен"

git rev-parse --is-inside-work-tree >/dev/null 2>&1 ||
    fail "Запустите скрипт внутри рабочего каталога Git"

# Определяем реальные служебные пути, включая worktree.
OBJECTS=$(git rev-parse --path-format=absolute --git-path objects) ||
    fail "Не удалось определить каталог объектов"

COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir) ||
    fail "Не удалось определить Git-директорию"

[ -d "$OBJECTS" ] ||
    fail "Каталог objects отсутствует"

[ -w "$COMMON_DIR" ] ||
    fail "Нет прав записи в Git-директорию"

# Временные файлы для диагностики.
TMP=$(mktemp -d) ||
    fail "Не удалось создать временный каталог"

trap 'rm -rf "$TMP"' EXIT 2>/dev/null ||
    trap 'rm -rf "$TMP"' 0
trap 'exit 130' 2
trap 'exit 143' 15

# Карантин находится вне objects.
STAMP=$(date +%Y%m%d-%H%M%S)
QUARANTINE="$COMMON_DIR/repair-quarantine-$STAMP"

if [ -e "$QUARANTINE" ]; then
    fail "Каталог карантина уже существует"
fi

log "Проверка репозитория..."

if git fsck --full >"$TMP/fsck-before.log" 2>&1; then
    log "git fsck: ошибок целостности не обнаружено"
else
    log "git fsck: обнаружены проблемы"
fi

log "Поиск повреждённых loose objects..."

# Сканируем только отдельные объекты, не pack-файлы.
find "$OBJECTS" -type f >"$TMP/files"

: >"$TMP/corrupt"
CHECKED=0
DAMAGED=0

while IFS= read -r FILE; do
    BASE=${FILE##*/}
    DIR=${FILE%/*}
    PREFIX=${DIR##*/}
    OID="$PREFIX$BASE"

    # Поддержка SHA-1 и SHA-256.
    if ! printf '%s\n' "$OID" |
        LC_ALL=C grep -Eq '^([[:xdigit:]]{40}|[[:xdigit:]]{64})$'
    then
        continue
    fi

    # Убеждаемся, что имя каталога состоит из 2 hex-символов.
    if ! printf '%s\n' "$PREFIX" |
        LC_ALL=C grep -Eq '^[[:xdigit:]]{2}$'
    then
        continue
    fi

    CHECKED=$((CHECKED + 1))

    # Git сам пытается распаковать и прочитать объект.
    if ! git cat-file -p "$OID" >/dev/null 2>&1; then
        log "Повреждён: $OID"
        printf '%s\n' "$FILE" >>"$TMP/corrupt"
        DAMAGED=$((DAMAGED + 1))
    fi
done <"$TMP/files"

log "Проверено loose objects: $CHECKED"
log "Обнаружено повреждений: $DAMAGED"

if [ "$DAMAGED" -eq 0 ]; then
    if git fsck --full; then
        log "Репозиторий прошёл проверку"
        exit 0
    fi

    log "Есть другие проблемы: отсутствующие объекты,"
    log "повреждённые pack-файлы или ошибки связности."
    log "Автоматическое исправление не выполняется."
    exit 1
fi

# Перемещаем объекты, не удаляя их.
mkdir -p "$QUARANTINE" ||
    fail "Не удалось создать карантин"

log "Карантин: $QUARANTINE"

while IFS= read -r FILE; do
    BASE=${FILE##*/}
    DIR=${FILE%/*}
    PREFIX=${DIR##*/}
    OID="$PREFIX$BASE"

    mv "$FILE" "$QUARANTINE/$OID" ||
        fail "Не удалось переместить $OID"
done <"$TMP/corrupt"

log "Повреждённые файлы сохранены"

# Попытка повторного получения объектов с сервера.
if [ -n "$(git remote)" ]; then
    log "Повторная загрузка объектов из remote..."

    if git fetch --all --refetch; then
        log "Fetch завершён"
    else
        log "Fetch завершился с ошибкой"
    fi
else
    log "Remote не настроен: восстановление через fetch невозможно"
fi

log "Повторная проверка целостности..."

if git fsck --full >"$TMP/fsck-after.log" 2>&1; then
    log "SUCCESS: репозиторий прошёл git fsck"
    log "Карантин: $QUARANTINE"
    exit 0
else
    log "WARNING: остаются проблемы с репозиторием"
    cat "$TMP/fsck-after.log"
    log "Повреждённые оригиналы: $QUARANTINE"
    log "Не удаляйте карантин до полного восстановления"
    exit 1
fi
