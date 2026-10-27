CREATE TABLE app.note_folders (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    UNIQUE (user_id,id)
);

CREATE TABLE app.notes (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    folder_id UUID,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags JSONB NOT NULL DEFAULT '[]',
    color TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    FOREIGN KEY (user_id,folder_id) REFERENCES app.note_folders(user_id,id)
);
CREATE INDEX notes_owner_idx ON app.notes(user_id) WHERE archived_at IS NULL;

CREATE TABLE app.tasks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo','in_progress','completed','rejected')),
    tags JSONB NOT NULL DEFAULT '[]',
    color TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
    parent_id UUID,
    due_at TIMESTAMPTZ,
    schedule JSONB,
    source_kind TEXT NOT NULL DEFAULT 'manual',
    source_id UUID,
    occurrence_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ,
    UNIQUE(user_id,id),
    UNIQUE(user_id,source_kind,source_id,occurrence_date),
    FOREIGN KEY(user_id,parent_id) REFERENCES app.tasks(user_id,id)
);
CREATE INDEX tasks_owner_idx ON app.tasks(user_id) WHERE archived_at IS NULL;
CREATE INDEX tasks_due_idx ON app.tasks(user_id,due_at);

CREATE TABLE app.task_occurrences (
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    occurrence_date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('todo','in_progress','completed','rejected')),
    snapshot JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id,task_id,occurrence_date),
    FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id)
);

CREATE TABLE app.media (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    object_key TEXT NOT NULL UNIQUE,
    content_type TEXT NOT NULL,
    size BIGINT NOT NULL CHECK (size > 0 AND size <= 8388608),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.countdowns (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    icon TEXT NOT NULL,
    target_date DATE NOT NULL,
    repeat_yearly BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE app.pomodoro_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    task_id UUID,
    phase TEXT NOT NULL CHECK (phase IN ('work','break')),
    status TEXT NOT NULL CHECK (status IN ('running','paused','completed','cancelled')),
    duration_seconds BIGINT NOT NULL CHECK (duration_seconds > 0),
    elapsed_seconds BIGINT NOT NULL DEFAULT 0 CHECK (elapsed_seconds >= 0),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    segment_started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id)
);
CREATE UNIQUE INDEX pomodoro_single_active_idx ON app.pomodoro_sessions(user_id) WHERE status IN ('running','paused');

CREATE TABLE app.activity_events (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    event_type TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_events_owner_date_idx ON app.activity_events(user_id,occurred_at);
