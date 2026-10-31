-- Exercises have their own opt-in, independent of the plans that reference them.
ALTER TABLE app.exercises ADD COLUMN ai_shared BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN ai_access_revision BIGINT NOT NULL DEFAULT 0;

CREATE TABLE app.workout_preferences (
    user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL DEFAULT 0,
    encrypted_data BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Old previews/history used implicit access through shared plans.
UPDATE app.ai_settings SET revision=revision+1,updated_at=now();
DELETE FROM app.ai_previews;
UPDATE app.ai_turns SET status='cancelled',error_code='ai_permissions_changed',finished_at=now() WHERE status='pending';
DELETE FROM app.ai_login_attempts;
