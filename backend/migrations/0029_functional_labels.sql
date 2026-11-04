ALTER TABLE app.labels DROP CONSTRAINT labels_kind_check;
ALTER TABLE app.labels ADD CONSTRAINT labels_kind_check CHECK (kind IN ('tag','category','toy','emotion','setting','functional'));
ALTER TABLE app.labels ADD COLUMN function_key text CHECK (function_key IN ('ai_access','cost'));
ALTER TABLE app.labels ADD CONSTRAINT labels_function_kind CHECK ((kind='functional')=(function_key IS NOT NULL));
CREATE UNIQUE INDEX labels_function_unique ON app.labels(user_id,function_key) WHERE function_key IS NOT NULL;
ALTER TABLE app.labels ADD CONSTRAINT labels_user_id_unique UNIQUE (user_id,id);
CREATE SEQUENCE app.label_value_revision;
CREATE TABLE app.label_values (
 user_id uuid NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 label_id uuid NOT NULL,
 subject_kind text NOT NULL CHECK (subject_kind IN ('notes','tasks','habits','workouts','exercises','contacts','countdowns','intimacy','boards')),
 subject_id uuid NOT NULL,
 encrypted_value bytea NOT NULL,
 revision bigint NOT NULL DEFAULT nextval('app.label_value_revision'),
 PRIMARY KEY(user_id,label_id,subject_kind,subject_id),
 FOREIGN KEY(user_id,label_id) REFERENCES app.labels(user_id,id) ON DELETE CASCADE
);

-- Polymorphic values disappear with their owning object, including direct domain deletes.
CREATE FUNCTION app.remove_subject_labels() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 DELETE FROM app.label_values WHERE user_id=OLD.user_id AND subject_id=OLD.id AND
 (subject_kind=CASE TG_TABLE_NAME WHEN 'intimacy_entries' THEN 'intimacy' WHEN 'task_boards' THEN 'boards' ELSE TG_TABLE_NAME END OR (TG_TABLE_NAME='tasks' AND subject_kind='habits'));
 RETURN OLD;
END;
$$;
DO $$ DECLARE subject_table text; BEGIN
 FOREACH subject_table IN ARRAY ARRAY['notes','tasks','workouts','exercises','contacts','countdowns','intimacy_entries','task_boards'] LOOP
 EXECUTE format('CREATE TRIGGER remove_label_values AFTER DELETE ON app.%I FOR EACH ROW EXECUTE FUNCTION app.remove_subject_labels()',subject_table);
 END LOOP;
END $$;
