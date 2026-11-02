CREATE TABLE app.pomodoro_configs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id,id)
);
CREATE TABLE app.pomodoro_runs (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    config_id UUID,
    task_id UUID,
    name TEXT NOT NULL,
    data JSONB NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running','paused','completed','cancelled')),
    elapsed_seconds BIGINT NOT NULL DEFAULT 0,
    segment_started_at TIMESTAMPTZ,
    anchors JSONB NOT NULL,
    processed_intervals BIGINT NOT NULL DEFAULT 0,
    revision BIGINT NOT NULL DEFAULT 0,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    UNIQUE(user_id,id),
    FOREIGN KEY(user_id,config_id) REFERENCES app.pomodoro_configs(user_id,id) ON DELETE SET NULL (config_id),
    FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id) ON DELETE SET NULL (task_id)
);
CREATE UNIQUE INDEX pomodoro_single_run_idx ON app.pomodoro_runs(user_id) WHERE status IN ('running','paused');
ALTER TABLE app.pomodoro_sessions
    ADD COLUMN run_id UUID,
    ADD COLUMN interval_index BIGINT,
    ADD COLUMN interval_kind TEXT CHECK(interval_kind IN ('w','c','mc')),
    ADD COLUMN program_name TEXT,
    ADD UNIQUE(user_id,run_id,interval_index),
    ADD FOREIGN KEY(user_id,run_id) REFERENCES app.pomodoro_runs(user_id,id);
