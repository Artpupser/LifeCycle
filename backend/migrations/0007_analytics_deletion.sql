CREATE TABLE app.analytics_privacy (
    user_id UUID PRIMARY KEY REFERENCES app.users(id),
    include_profile BOOLEAN NOT NULL DEFAULT false,
    include_intimacy BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE app.notes DROP CONSTRAINT notes_user_id_folder_id_fkey;
ALTER TABLE app.notes ADD FOREIGN KEY(user_id,folder_id) REFERENCES app.note_folders(user_id,id) ON DELETE SET NULL (folder_id);
ALTER TABLE app.tasks DROP CONSTRAINT tasks_user_id_parent_id_fkey;
ALTER TABLE app.tasks ADD FOREIGN KEY(user_id,parent_id) REFERENCES app.tasks(user_id,id) ON DELETE SET NULL (parent_id);
ALTER TABLE app.pomodoro_sessions DROP CONSTRAINT pomodoro_sessions_user_id_task_id_fkey;
ALTER TABLE app.pomodoro_sessions ADD FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id) ON DELETE SET NULL (task_id);
ALTER TABLE app.task_occurrences DROP CONSTRAINT task_occurrences_user_id_task_id_fkey;
ALTER TABLE app.task_occurrences ADD FOREIGN KEY(user_id) REFERENCES app.users(id);
ALTER TABLE app.habit_versions DROP CONSTRAINT habit_versions_user_id_task_id_fkey;
ALTER TABLE app.habit_versions ADD FOREIGN KEY(user_id) REFERENCES app.users(id);
ALTER TABLE app.habit_versions ADD COLUMN ended_at TIMESTAMPTZ;
ALTER TABLE app.habit_reminder_receipts DROP CONSTRAINT habit_reminder_receipts_user_id_task_id_fkey;
ALTER TABLE app.habit_reminder_receipts ADD FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id) ON DELETE CASCADE;
ALTER TABLE app.workout_sessions DROP CONSTRAINT workout_sessions_user_id_workout_id_fkey;
ALTER TABLE app.workout_sessions DROP CONSTRAINT workout_sessions_user_id_habit_id_fkey;

UPDATE app.habit_versions v SET ended_at=t.archived_at FROM app.tasks t WHERE v.user_id=t.user_id AND v.task_id=t.id AND t.archived_at IS NOT NULL;
DELETE FROM app.notes WHERE archived_at IS NOT NULL;
DELETE FROM app.note_folders WHERE archived_at IS NOT NULL;
DELETE FROM app.tasks WHERE archived_at IS NOT NULL;
DELETE FROM app.countdowns WHERE archived_at IS NOT NULL;
DELETE FROM app.workouts WHERE archived_at IS NOT NULL;
DELETE FROM app.exercises WHERE archived_at IS NOT NULL;

ALTER TABLE app.notes DROP COLUMN archived_at;
ALTER TABLE app.note_folders DROP COLUMN archived_at;
ALTER TABLE app.tasks DROP COLUMN archived_at;
ALTER TABLE app.countdowns DROP COLUMN archived_at;
ALTER TABLE app.workouts DROP COLUMN archived_at;
ALTER TABLE app.exercises DROP COLUMN archived_at;
CREATE INDEX notes_owner_idx ON app.notes(user_id);
CREATE INDEX tasks_owner_idx ON app.tasks(user_id);
CREATE INDEX occurrences_owner_date_idx ON app.task_occurrences(user_id,occurrence_date);
CREATE INDEX pomodoro_owner_end_idx ON app.pomodoro_sessions(user_id,ended_at);
CREATE INDEX workouts_owner_end_idx ON app.workout_sessions(user_id,ended_at);
