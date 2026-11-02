-- Contact contents, import identifiers and labels are encrypted together.
-- No contact text or search index is shared with the AI subsystem.
CREATE TABLE app.contacts (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    encrypted_data BYTEA NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id,id)
);
CREATE INDEX contacts_owner ON app.contacts(user_id);

-- Preserve the owner's navigation and add the new section once.
UPDATE app.navigation_preferences
SET ordering=ordering || '["/contacts"]'::jsonb,
    pinned=pinned || '["/contacts"]'::jsonb,
    revision=revision+1
WHERE NOT ordering @> '["/contacts"]'::jsonb;
