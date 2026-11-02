ALTER TABLE app.countdowns
    ADD COLUMN contact_id UUID,
    ADD COLUMN contact_birthday BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN contact_snapshot BYTEA,
    ADD CONSTRAINT countdown_contact_owner FOREIGN KEY (user_id,contact_id)
        REFERENCES app.contacts(user_id,id),
    ADD CONSTRAINT birthday_has_contact CHECK (NOT contact_birthday OR contact_id IS NOT NULL),
    ADD CONSTRAINT snapshot_is_detached CHECK (contact_snapshot IS NULL OR contact_id IS NULL);
CREATE UNIQUE INDEX one_birthday_per_contact ON app.countdowns(user_id,contact_id) WHERE contact_birthday;
CREATE INDEX countdown_contact ON app.countdowns(user_id,contact_id) WHERE contact_id IS NOT NULL;
