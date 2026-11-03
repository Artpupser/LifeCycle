CREATE TABLE app.operator_preferences (
 user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
 enabled BOOLEAN NOT NULL DEFAULT true, encrypted_key BYTEA
);
CREATE TABLE app.operator_cache (
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 number_key TEXT NOT NULL, encrypted_data BYTEA NOT NULL,
 checked_at TIMESTAMPTZ NOT NULL DEFAULT now(), expires_at TIMESTAMPTZ NOT NULL,
 PRIMARY KEY(user_id,number_key)
);
CREATE INDEX operator_cache_expiry ON app.operator_cache(expires_at);
