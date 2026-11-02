-- Store catalog identifiers as well as historical emoji without rewriting existing boards.
ALTER TABLE app.task_boards DROP CONSTRAINT task_boards_emoji_check;
ALTER TABLE app.task_boards ADD CONSTRAINT task_boards_emoji_check CHECK (char_length(emoji) <= 128);
