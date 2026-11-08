CREATE TABLE app.integrations (
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL,
 instance_id UUID NOT NULL DEFAULT gen_random_uuid(),
 encrypted_config BYTEA NOT NULL,
 encrypted_snapshot BYTEA,
 revision BIGINT NOT NULL DEFAULT 1 CHECK(revision>0),
 last_synced_at TIMESTAMPTZ,
 last_attempt_at TIMESTAMPTZ,
 last_error TEXT,
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,provider)
);
CREATE TABLE app.integration_auth_attempts (
 token_hash TEXT PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 provider TEXT NOT NULL,
 session_hash TEXT NOT NULL,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX integration_attempts_expiry ON app.integration_auth_attempts(expires_at);
CREATE TABLE app.game_feeds (
 id TEXT PRIMARY KEY,
 data JSONB NOT NULL,
 last_error BOOLEAN NOT NULL DEFAULT false,
 checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE app.gaming_preferences (
 user_id UUID PRIMARY KEY REFERENCES app.users(id) ON DELETE CASCADE,
 notify_free BOOLEAN NOT NULL DEFAULT true,
 initialized_at TIMESTAMPTZ,
 initialized_sources JSONB NOT NULL DEFAULT '[]',
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE app.game_offer_marks (
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 offer_id TEXT NOT NULL,
 PRIMARY KEY(user_id,offer_id)
);
CREATE TABLE app.game_offer_seen (
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 offer_id TEXT NOT NULL,
 seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,offer_id)
);
CREATE TABLE app.feedback_notifications (
 id UUID PRIMARY KEY,
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 dedupe_key TEXT NOT NULL,
 encrypted_data BYTEA NOT NULL,
 read_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(user_id,dedupe_key)
);
CREATE INDEX feedback_notifications_unread ON app.feedback_notifications(user_id,created_at) WHERE read_at IS NULL;
-- Existing navigation settings keep their order/pins; the new section becomes discoverable.
UPDATE app.navigation_preferences SET ordering=ordering||'"/videogames"'::jsonb,
 pinned=pinned||'"/videogames"'::jsonb,revision=revision+1
 WHERE NOT ordering @> '["/videogames"]'::jsonb;
