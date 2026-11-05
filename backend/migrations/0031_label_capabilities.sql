-- Shared label cardinality and object access reuse native AI permission fields.
ALTER TABLE app.labels ADD COLUMN repeatable boolean NOT NULL DEFAULT true;
UPDATE app.labels SET repeatable=false WHERE function_key='ai_access';
ALTER TABLE app.labels ADD CONSTRAINT labels_ai_single CHECK (function_key IS DISTINCT FROM 'ai_access' OR NOT repeatable);
DO $$ DECLARE object_table text; BEGIN
 FOREACH object_table IN ARRAY ARRAY['tasks','contacts','countdowns','intimacy_entries','task_boards'] LOOP
  EXECUTE format('ALTER TABLE app.%I ADD COLUMN ai_shared boolean NOT NULL DEFAULT false, ADD COLUMN ai_access_revision bigint NOT NULL DEFAULT 0', object_table);
 END LOOP;
END $$;
-- Context policy became stricter: do not reuse a preview or conversation scope
-- prepared before object labels became authoritative for every section.
UPDATE app.ai_settings SET revision=revision+1,updated_at=now();
DELETE FROM app.ai_previews;
UPDATE app.ai_turns SET status='cancelled',error_code='ai_permissions_changed',finished_at=now() WHERE status='pending';
DELETE FROM app.ai_login_attempts;
