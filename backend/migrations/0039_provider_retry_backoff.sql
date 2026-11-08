ALTER TABLE app.game_feeds
 ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0 CHECK(failure_count>=0),
 ADD COLUMN retry_at TIMESTAMPTZ;
ALTER TABLE app.integrations
 ADD COLUMN failure_count INTEGER NOT NULL DEFAULT 0 CHECK(failure_count>=0),
 ADD COLUMN retry_at TIMESTAMPTZ;
