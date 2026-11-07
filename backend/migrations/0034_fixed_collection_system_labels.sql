-- Fixed collection entries share the label registry and are system-owned,
-- but have no functional adapter. Keep ordinary/custom labels user-owned.
ALTER TABLE app.labels DROP CONSTRAINT labels_system_function;
ALTER TABLE app.labels ADD CONSTRAINT labels_system_kind
 CHECK (NOT is_system OR function_key IS NOT NULL OR kind IN ('emotion','sex_type'));
-- labels_function_kind still binds functional adapters to functional labels;
-- labels_ai_single and labels_system_function_unique retain their guarantees.
