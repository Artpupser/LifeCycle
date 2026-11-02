CREATE TABLE app.navigation_preferences (
    user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
    ordering JSONB NOT NULL CHECK (jsonb_typeof(ordering)='array'),
    pinned JSONB NOT NULL CHECK (jsonb_typeof(pinned)='array'),
    revision BIGINT NOT NULL DEFAULT 1 CHECK (revision>=1)
);
