-- History visibility is separate from operational results and idempotency records.
CREATE TABLE app.history_removals (
 user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('task','habit','pomodoro','workout','ai','activity')),
 item_key TEXT NOT NULL, removed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 PRIMARY KEY(user_id,kind,item_key)
);
