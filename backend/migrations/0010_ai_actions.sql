-- Additive upgrade: never modifies existing provider credentials or user entities.
CREATE TABLE app.ai_preferences (
    user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL DEFAULT 0,
    encrypted_data BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE app.ai_actions (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    source_turn_id UUID REFERENCES app.ai_turns(id) ON DELETE SET NULL,
    config_revision BIGINT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('prepared','applied','undone','dismissed')),
    encrypted_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ai_actions_owner ON app.ai_actions(user_id,created_at DESC,id);
