-- Brain tasks moved to per-user SQLite (storage/brain/{userId}/brain.sqlite).
-- Run the app once so existing rows migrate automatically before applying this migration.

DROP TABLE IF EXISTS "BrainTask";
DROP TYPE IF EXISTS "BrainTaskType";
DROP TYPE IF EXISTS "BrainTaskStatus";
