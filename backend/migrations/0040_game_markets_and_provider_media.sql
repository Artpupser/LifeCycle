ALTER TABLE app.game_feeds ADD COLUMN kind TEXT NOT NULL DEFAULT 'offers' CHECK (kind IN ('offers','metadata'));
CREATE TABLE app.provider_media (
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 id UUID NOT NULL,
 source_url TEXT NOT NULL,
 media_id UUID REFERENCES app.media(id) ON DELETE SET NULL,
 failure_count INTEGER NOT NULL DEFAULT 0,
 retry_at TIMESTAMPTZ,
 PRIMARY KEY(user_id,id)
);
ALTER TABLE app.integration_auth_attempts ADD COLUMN integration_instance UUID;
ALTER TABLE app.integration_auth_attempts ADD COLUMN integration_revision BIGINT;
