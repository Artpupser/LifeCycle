-- Preserve existing label definitions, encrypted values and revisions.
ALTER TABLE app.labels ADD COLUMN is_system boolean NOT NULL DEFAULT false;
UPDATE app.labels SET is_system=true WHERE function_key IS NOT NULL;
DROP INDEX app.labels_function_unique;
CREATE UNIQUE INDEX labels_system_function_unique ON app.labels(user_id,function_key) WHERE is_system;
ALTER TABLE app.labels ADD CONSTRAINT labels_system_function CHECK (NOT is_system OR function_key IS NOT NULL);
ALTER TABLE app.label_values ADD COLUMN id uuid NOT NULL DEFAULT gen_random_uuid();
ALTER TABLE app.label_values ADD COLUMN aad_version smallint NOT NULL DEFAULT 0 CHECK (aad_version IN (0,1));
ALTER TABLE app.label_values DROP CONSTRAINT label_values_pkey;
ALTER TABLE app.label_values ADD PRIMARY KEY(user_id,id);
CREATE INDEX label_values_subject ON app.label_values(user_id,subject_kind,subject_id,label_id);

-- Subjects without a native tag field use registry ID bindings owned by labels.
-- Rename and deletion therefore share the catalog's existing lifecycle.
CREATE TABLE app.label_subject_tags (
 user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 label_id uuid NOT NULL,
 subject_kind text NOT NULL CHECK (subject_kind IN ('exercises','intimacy','boards')),
 subject_id uuid NOT NULL,
 PRIMARY KEY(user_id,label_id,subject_kind,subject_id),
 FOREIGN KEY(user_id,label_id) REFERENCES app.labels(user_id,id) ON DELETE CASCADE
);
CREATE OR REPLACE FUNCTION app.remove_subject_labels() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM app.label_values WHERE user_id=OLD.user_id AND subject_id=OLD.id AND
 (subject_kind=CASE TG_TABLE_NAME WHEN 'intimacy_entries' THEN 'intimacy' WHEN 'task_boards' THEN 'boards' ELSE TG_TABLE_NAME END OR (TG_TABLE_NAME='tasks' AND subject_kind='habits'));
 DELETE FROM app.label_subject_tags WHERE user_id=OLD.user_id AND subject_id=OLD.id AND
 subject_kind=CASE TG_TABLE_NAME WHEN 'intimacy_entries' THEN 'intimacy' WHEN 'task_boards' THEN 'boards' ELSE TG_TABLE_NAME END;
 RETURN OLD;
END;
$$;
