CREATE TABLE app.user_action_history (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 section TEXT NOT NULL, operation TEXT NOT NULL, entity_key TEXT NOT NULL DEFAULT '',
 occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_action_history_owner_date ON app.user_action_history(user_id,occurred_at DESC,id DESC);
INSERT INTO app.user_action_history(id,user_id,section,operation,entity_key,occurred_at)
 SELECT id,user_id,entity_type,event_type,coalesce(entity_id::text,''),occurred_at FROM app.activity_events;
UPDATE app.navigation_preferences SET ordering=ordering||'["/history"]'::jsonb,pinned=pinned||'["/history"]'::jsonb,revision=revision+1 WHERE NOT ordering @> '["/history"]'::jsonb;
