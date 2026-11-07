-- Fixed reference lists use the existing encrypted labels registry and seeding lifecycle.
-- Keep old personal rows for historical references; the UI only offers canonical fixed entries.
ALTER TABLE app.labels DROP CONSTRAINT labels_system_kind;
ALTER TABLE app.labels ADD CONSTRAINT labels_system_kind
 CHECK (NOT is_system OR function_key IS NOT NULL OR kind IN ('emotion','sex_type','lubricant','contraception'));
