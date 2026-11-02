---
type: "query"
date: "2026-10-31T10:29:06.112403+00:00"
question: "Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["notes.rs", "ai_access.rs", "boards.rs", "task_tags.rs", "tasks.rs", "TaskGantt()"]
---

# Q: Какие работы LifeCycle Upgrade v1 1.4–1.5 завершены и где контракты?

## Answer

Этапы 1.4–1.5 завершены. Исходный доступ AI уже реализован в ai_access.rs/ai_context.rs; добавлены атомарный bulk и фильтр notes. Новые boards.rs/task_tags.rs и миграция0013 организуют существующие Task без копирования. TaskGantt и PUT tasks/id/plan используют общий Schedule, UTC/DST и CAS. Итоговая проверка: make check, 13 миграций, все API smoke и20 Chromium. Подробные факты и ограничения: project/project_progress.md и backend/frontend README. Этапы1.6+ не выполнялись.

## Outcome

- Signal: useful

## Source Nodes

- notes.rs
- ai_access.rs
- boards.rs
- task_tags.rs
- tasks.rs
- TaskGantt()