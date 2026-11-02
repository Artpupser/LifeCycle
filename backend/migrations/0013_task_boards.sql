-- Boards organize existing tasks; deleting a board or column never deletes tasks.
CREATE TABLE app.task_boards (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
    view TEXT NOT NULL DEFAULT 'kanban' CHECK (view IN ('kanban','gantt')),
    zoom TEXT NOT NULL DEFAULT 'week' CHECK (zoom IN ('day','week','fortnight')),
    revision BIGINT NOT NULL DEFAULT 0,
    UNIQUE(user_id,id)
);
CREATE TABLE app.board_columns (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    board_id UUID NOT NULL,
    name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 100),
    position INTEGER NOT NULL CHECK (position >= 0),
    UNIQUE(user_id,board_id,id),
    FOREIGN KEY(user_id,board_id) REFERENCES app.task_boards(user_id,id) ON DELETE CASCADE
);
CREATE TABLE app.board_items (
    user_id UUID NOT NULL,
    task_id UUID NOT NULL,
    board_id UUID NOT NULL,
    column_id UUID NOT NULL,
    position INTEGER NOT NULL CHECK (position >= 0),
    PRIMARY KEY(user_id,task_id),
    FOREIGN KEY(user_id,task_id) REFERENCES app.tasks(user_id,id) ON DELETE CASCADE,
    FOREIGN KEY(user_id,board_id,column_id) REFERENCES app.board_columns(user_id,board_id,id)
);
CREATE INDEX board_items_order_idx ON app.board_items(user_id,board_id,column_id,position);
CREATE TABLE app.task_tags (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES app.users(id),
    name TEXT NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 64),
    revision BIGINT NOT NULL DEFAULT 0,
    UNIQUE(user_id,name)
);
INSERT INTO app.task_tags(id,user_id,name)
SELECT gen_random_uuid(),user_id,name FROM (
    SELECT DISTINCT user_id,jsonb_array_elements_text(tags) AS name FROM app.tasks WHERE source_kind='manual'
) existing;
