```sh
cd /home/hacker/projects/LifeCycle

# Создать .env и недостающие секреты
python3 scripts/setup_env.py

# Проверить конфигурацию
podman compose config --quiet

# Собрать и запустить все сервисы
podman compose up -d --build --force-recreate

# Посмотреть состояние
podman compose ps
```

```sh
# Когда все шесть сервисов будут healthy, проверь приложение:
python3 scripts/smoke.py
```

```sh
podman compose logs -f          # все логи
podman compose logs -f backend  # логи API
podman compose down             # остановить всё, сохранив данные
```
