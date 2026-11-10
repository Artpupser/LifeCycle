-- Preserve the removed light palette as the new warm light palette.
UPDATE app.settings SET data=jsonb_set(data,'{theme}','"sand"'::jsonb) WHERE data->>'theme'='rose';
CREATE TABLE app.feedback_push_subscriptions (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 session_hash TEXT NOT NULL REFERENCES app.sessions(token_hash) ON DELETE CASCADE,
 endpoint_hash TEXT NOT NULL UNIQUE,
 encrypted_data BYTEA NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 failure_count INTEGER NOT NULL DEFAULT 0,
 retry_at TIMESTAMPTZ
);
CREATE INDEX feedback_push_user ON app.feedback_push_subscriptions(user_id);
CREATE TABLE app.feedback_push_deliveries (
 notification_id UUID NOT NULL REFERENCES app.feedback_notifications(id) ON DELETE CASCADE,
 subscription_id UUID NOT NULL REFERENCES app.feedback_push_subscriptions(id) ON DELETE CASCADE,
 sent_at TIMESTAMPTZ,
 failure_count INTEGER NOT NULL DEFAULT 0,
 retry_at TIMESTAMPTZ,
 PRIMARY KEY(notification_id,subscription_id)
);
