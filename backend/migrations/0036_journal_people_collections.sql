-- A relationship endpoint is either an owned contact or the owner's profile.
-- Generated nullable references preserve contact ownership and deletion cascades.
ALTER TABLE app.contact_relationships
    DROP CONSTRAINT contact_relationships_user_id_source_id_fkey,
    DROP CONSTRAINT contact_relationships_user_id_target_id_fkey,
    ADD COLUMN source_contact_id UUID GENERATED ALWAYS AS
        (CASE WHEN source_id = user_id THEN NULL ELSE source_id END) STORED,
    ADD COLUMN target_contact_id UUID GENERATED ALWAYS AS
        (CASE WHEN target_id = user_id THEN NULL ELSE target_id END) STORED,
    ADD FOREIGN KEY (user_id, source_contact_id) REFERENCES app.contacts(user_id, id) ON DELETE CASCADE,
    ADD FOREIGN KEY (user_id, target_contact_id) REFERENCES app.contacts(user_id, id) ON DELETE CASCADE;

-- Old encrypted journal values are read as notes by the intimacy owner.
DELETE FROM app.labels WHERE kind = 'feelings_after';
ALTER TABLE app.labels DROP CONSTRAINT labels_kind_check;
ALTER TABLE app.labels ADD CONSTRAINT labels_kind_check CHECK
    (kind IN ('tag','category','toy','emotion','setting','position','porn_source','lubricant','contraception','sex_type','functional'));
