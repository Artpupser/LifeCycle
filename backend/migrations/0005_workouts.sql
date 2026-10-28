CREATE TABLE app.exercises (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    data JSONB NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id,id)
);
CREATE TABLE app.workouts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    data JSONB NOT NULL,
    archived_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id,id)
);
CREATE TABLE app.workout_sessions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    workout_id UUID NOT NULL,
    habit_id UUID,
    occurrence_date DATE,
    habit_occurrence JSONB,
    snapshot JSONB NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('running','paused','completed','partial','cancelled')),
    step_index INTEGER NOT NULL DEFAULT 0 CHECK(step_index >= 0),
    elapsed_seconds BIGINT NOT NULL DEFAULT 0 CHECK(elapsed_seconds >= 0),
    segment_started_at TIMESTAMPTZ,
    results JSONB NOT NULL DEFAULT '[]',
    revision BIGINT NOT NULL DEFAULT 0,
    note TEXT NOT NULL DEFAULT '',
    habit_completed BOOLEAN NOT NULL DEFAULT false,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    FOREIGN KEY(user_id,workout_id) REFERENCES app.workouts(user_id,id),
    FOREIGN KEY(user_id,habit_id) REFERENCES app.tasks(user_id,id),
    CHECK((habit_id IS NULL) = (occurrence_date IS NULL)),
    CHECK((habit_id IS NULL) = (habit_occurrence IS NULL))
);
CREATE UNIQUE INDEX workout_one_active ON app.workout_sessions(user_id) WHERE status IN ('running','paused');
CREATE UNIQUE INDEX workout_one_completion ON app.workout_sessions(user_id,habit_id,occurrence_date) WHERE status='completed' AND habit_id IS NOT NULL;
CREATE INDEX workout_history ON app.workout_sessions(user_id,started_at DESC);
