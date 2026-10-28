ALTER TABLE app.tasks ADD COLUMN habit JSONB;
ALTER TABLE app.tasks ADD CONSTRAINT tasks_habit_source CHECK ((source_kind = 'habit') = (habit IS NOT NULL));
CREATE UNIQUE INDEX tasks_habit_source_idx ON app.tasks(user_id,source_id) WHERE source_kind='habit';

CREATE TABLE app.habit_versions (
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    effective_from DATE NOT NULL,
    snapshot JSONB NOT NULL,
    PRIMARY KEY(user_id,task_id,effective_from),
    FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id)
);

CREATE TABLE app.habit_reminder_receipts (
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    occurrence_date DATE NOT NULL,
    dismissed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY(user_id,task_id,occurrence_date),
    FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id)
);
