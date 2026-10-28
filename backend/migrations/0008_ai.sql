CREATE TABLE app.ai_settings (
    user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
    model TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
    enabled BOOLEAN NOT NULL DEFAULT false,
    permissions JSONB NOT NULL DEFAULT '{}',
    encrypted_key BYTEA,
    revision BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.ai_chats (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id,id)
);
CREATE INDEX ai_chats_owner ON app.ai_chats(user_id,created_at DESC);

CREATE TABLE app.ai_previews (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    chat_id UUID NOT NULL,
    chat_version BIGINT NOT NULL,
    config_revision BIGINT NOT NULL,
    encrypted_data BYTEA NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '5 minutes',
    FOREIGN KEY(user_id,chat_id) REFERENCES app.ai_chats(user_id,id) ON DELETE CASCADE
);
CREATE INDEX ai_previews_owner ON app.ai_previews(user_id,expires_at);

CREATE TABLE app.ai_turns (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    chat_id UUID NOT NULL,
    preview_id UUID NOT NULL,
    config_revision BIGINT NOT NULL,
    model TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('pending','completed','failed','cancelled')),
    error_code TEXT,
    encrypted_data BYTEA NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    FOREIGN KEY(user_id,chat_id) REFERENCES app.ai_chats(user_id,id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX ai_one_pending ON app.ai_turns(user_id) WHERE status='pending';
CREATE INDEX ai_turn_history ON app.ai_turns(user_id,chat_id,created_at,id);
