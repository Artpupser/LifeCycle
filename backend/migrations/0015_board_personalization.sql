ALTER TABLE app.task_boards ADD COLUMN emoji TEXT NOT NULL DEFAULT '' CHECK (char_length(emoji)<=16);
ALTER TABLE app.board_columns ADD COLUMN color TEXT NOT NULL DEFAULT '#64748B' CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
