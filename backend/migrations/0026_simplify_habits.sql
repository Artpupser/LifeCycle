-- Retire habit-only sub-items and reminders; keep recorded result status and notes.
DROP TABLE app.habit_reminder_receipts;
UPDATE app.tasks SET habit=habit-'sub_habits'-'reminder_enabled'-'reminder_minutes_before',
 schedule=jsonb_set(jsonb_set(jsonb_set(schedule,'{time}','null'),'{duration_minutes}', '1'),'{recurrence}',to_jsonb(CASE WHEN schedule->>'recurrence'='once' THEN 'daily' ELSE schedule->>'recurrence' END)) WHERE source_kind='habit';
UPDATE app.habit_versions SET snapshot=jsonb_set(snapshot,'{habit}',(snapshot->'habit')-'sub_habits'-'reminder_enabled'-'reminder_minutes_before');
UPDATE app.task_occurrences SET snapshot=jsonb_set(snapshot,'{task,habit}',(snapshot#>'{task,habit}')-'sub_habits'-'reminder_enabled'-'reminder_minutes_before') WHERE snapshot#>>'{task,source_kind}'='habit';
UPDATE app.task_occurrences SET snapshot=jsonb_set(snapshot,'{habit_mark}',(snapshot->'habit_mark')-'completed_sub_habits') WHERE jsonb_typeof(snapshot->'habit_mark')='object';
UPDATE app.settings SET data=data-'reminders_enabled'-'reminder_minutes_before';

-- Keep old rules for past unrecorded dates, and activate the simplified current rule now.
INSERT INTO app.habit_versions(user_id,task_id,effective_from,snapshot)
SELECT user_id,id,(CURRENT_TIMESTAMP AT TIME ZONE (schedule->>'timezone'))::date,to_jsonb(t)-'user_id'
FROM app.tasks t WHERE source_kind='habit'
ON CONFLICT(user_id,task_id,effective_from) DO UPDATE SET snapshot=EXCLUDED.snapshot;
