CREATE TABLE app.users (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (email = lower(email)),
    CHECK (length(email) <= 254)
);

CREATE TABLE app.sessions (
    token_hash TEXT PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    CHECK (length(token_hash) = 64)
);

CREATE INDEX sessions_user_id_idx ON app.sessions(user_id);
CREATE INDEX sessions_expires_at_idx ON app.sessions(expires_at);

CREATE TABLE app.profiles (
    user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
    encrypted_data BYTEA NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE app.settings (
    user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
