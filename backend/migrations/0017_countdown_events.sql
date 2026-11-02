ALTER TABLE app.countdowns
    ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'once' CHECK (recurrence IN ('once','daily','monthly','yearly')),
    ADD COLUMN target_time TIME,
    ADD COLUMN timezone TEXT,
    ADD COLUMN description TEXT NOT NULL DEFAULT '',
    ADD COLUMN details JSONB NOT NULL DEFAULT '{}',
    ADD COLUMN display JSONB NOT NULL DEFAULT '{}';
UPDATE app.countdowns SET recurrence='yearly' WHERE repeat_yearly;
