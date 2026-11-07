ALTER TABLE app.labels DROP CONSTRAINT labels_kind_check;
ALTER TABLE app.labels ADD CONSTRAINT labels_kind_check
 CHECK (kind IN ('tag','category','toy','emotion','setting','position','porn_source','functional'));
-- Reference descriptions and image identifiers remain in encrypted_data.
-- Keep existing navigation order/pins and expose the newly available section once.
UPDATE app.navigation_preferences
SET ordering=ordering || '["/collections"]'::jsonb,
    pinned=pinned || '["/collections"]'::jsonb,
    revision=revision+1
WHERE NOT ordering @> '["/collections"]'::jsonb;
