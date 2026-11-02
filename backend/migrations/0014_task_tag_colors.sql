-- Presentation metadata only; task links, snapshots and existing colors are retained.
ALTER TABLE app.task_tags ADD COLUMN color TEXT NOT NULL DEFAULT '#6366F1'
    CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
