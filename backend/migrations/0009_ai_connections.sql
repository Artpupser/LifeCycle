CREATE TABLE app.ai_runtime (
    singleton BOOLEAN PRIMARY KEY DEFAULT true CHECK(singleton),
    host_id UUID NOT NULL
);

CREATE TABLE app.ai_accounts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    encrypted_data BYTEA NOT NULL,
    UNIQUE(user_id,id)
);

ALTER TABLE app.ai_settings
    ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai' CHECK(provider IN ('openai','openrouter')),
    ADD COLUMN auth_mode TEXT NOT NULL DEFAULT 'api_key' CHECK(auth_mode IN ('api_key','login')),
    ADD COLUMN encrypted_openrouter_key BYTEA,
    ADD COLUMN active_account_id UUID,
    ADD CONSTRAINT ai_active_account FOREIGN KEY(user_id,active_account_id) REFERENCES app.ai_accounts(user_id,id),
    ADD CONSTRAINT ai_login_provider CHECK(auth_mode <> 'login' OR provider = 'openai');

ALTER TABLE app.ai_turns ADD COLUMN provider TEXT NOT NULL DEFAULT 'openai';

CREATE TABLE app.ai_login_attempts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    config_revision BIGINT NOT NULL,
    state_hash TEXT NOT NULL UNIQUE,
    encrypted_data BYTEA NOT NULL,
    phase TEXT NOT NULL CHECK(phase IN ('created','launched','exchanging','ready','failed')),
    error_code TEXT,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '10 minutes'
);
CREATE INDEX ai_login_attempts_expiry ON app.ai_login_attempts(expires_at);
