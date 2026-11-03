ALTER TABLE app.task_tags RENAME TO legacy_task_tags;
CREATE TABLE app.labels (
 id UUID PRIMARY KEY, user_id UUID NOT NULL REFERENCES app.users(id) ON DELETE CASCADE,
 kind TEXT NOT NULL CHECK(kind IN ('tag','category')), name_key TEXT NOT NULL,
 encrypted_data BYTEA NOT NULL, revision BIGINT NOT NULL DEFAULT 0,
 UNIQUE(user_id,kind,name_key)
);
ALTER TABLE app.countdowns ADD COLUMN tags JSONB NOT NULL DEFAULT '[]'::jsonb;
UPDATE app.countdowns SET tags=jsonb_build_array(category) WHERE lower(category) NOT IN ('birthday','день рождения','др','anniversary','годовщина','holiday','праздник','personal','личное','work','работа','other','событие');
UPDATE app.countdowns SET category=CASE lower(category)
 WHEN 'день рождения' THEN 'birthday' WHEN 'др' THEN 'birthday' WHEN 'birthday' THEN 'birthday'
 WHEN 'годовщина' THEN 'anniversary' WHEN 'anniversary' THEN 'anniversary'
 WHEN 'праздник' THEN 'holiday' WHEN 'holiday' THEN 'holiday'
 WHEN 'личное' THEN 'personal' WHEN 'personal' THEN 'personal'
 WHEN 'работа' THEN 'work' WHEN 'work' THEN 'work' ELSE 'other' END;
ALTER TABLE app.countdowns ADD CONSTRAINT countdown_category_enum CHECK(category IN ('birthday','anniversary','holiday','personal','work','other') OR category ~ '^custom:[0-9a-f-]{36}$');
UPDATE app.navigation_preferences SET ordering=ordering||'["/labels"]'::jsonb,pinned=pinned||'["/labels"]'::jsonb,revision=revision+1 WHERE NOT ordering @> '["/labels"]'::jsonb;
