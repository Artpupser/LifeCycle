CREATE TABLE app.intimacy_entries (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL,
    encrypted_data BYTEA NOT NULL CHECK(octet_length(encrypted_data) BETWEEN 28 AND 1048576),
    revision BIGINT NOT NULL DEFAULT 0 CHECK(revision >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX intimacy_owner_start ON app.intimacy_entries(user_id,started_at DESC,id DESC);
