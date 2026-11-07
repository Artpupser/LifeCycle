ALTER TABLE app.labels DROP CONSTRAINT labels_kind_check;
ALTER TABLE app.labels ADD CONSTRAINT labels_kind_check CHECK (kind IN ('tag','category','toy','emotion','setting','position','porn_source','feelings_after','sex_type','functional'));
ALTER TABLE app.users ADD COLUMN collection_labels_synced boolean NOT NULL DEFAULT false;
