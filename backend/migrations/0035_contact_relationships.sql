-- Relationships belong to the existing contact book, never duplicate people.
-- Only owner/contact identifiers are structural; the relation kind stays encrypted.
CREATE TABLE app.contact_relationships (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
    source_id UUID NOT NULL,
    target_id UUID NOT NULL,
    relation_key TEXT NOT NULL,
    encrypted_data BYTEA NOT NULL,
    revision BIGINT NOT NULL DEFAULT 0 CHECK (revision >= 0),
    CHECK (source_id <> target_id),
    UNIQUE (user_id, relation_key),
    FOREIGN KEY (user_id, source_id) REFERENCES app.contacts(user_id, id) ON DELETE CASCADE,
    FOREIGN KEY (user_id, target_id) REFERENCES app.contacts(user_id, id) ON DELETE CASCADE
);
CREATE INDEX contact_relationships_source ON app.contact_relationships(user_id, source_id);
CREATE INDEX contact_relationships_target ON app.contact_relationships(user_id, target_id);

UPDATE app.navigation_preferences
SET ordering=ordering || '["/tree"]'::jsonb,
    pinned=pinned || '["/tree"]'::jsonb,
    revision=revision+1
WHERE NOT ordering @> '["/tree"]'::jsonb;
