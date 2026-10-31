-- Individual opt-in. Existing content remains private until its owner shares it.
ALTER TABLE app.notes ADD COLUMN ai_shared BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN ai_access_revision BIGINT NOT NULL DEFAULT 0;
ALTER TABLE app.workouts ADD COLUMN ai_shared BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN ai_access_revision BIGINT NOT NULL DEFAULT 0;

-- Retire duplicate training/personalization switches without touching credentials.
UPDATE app.ai_settings SET permissions=(permissions - 'workout_editor' - 'personalization') ||
    jsonb_build_object('workouts',coalesce((permissions->>'workouts')::boolean,false) OR coalesce((permissions->>'workout_editor')::boolean,false)),
    revision=revision+1,updated_at=now();
DELETE FROM app.ai_previews;
UPDATE app.ai_turns SET status='cancelled',error_code='ai_permissions_changed',finished_at=now() WHERE status='pending';
DELETE FROM app.ai_login_attempts;
