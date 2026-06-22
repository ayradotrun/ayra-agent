-- Migrate legacy paid defaults to free model
UPDATE "User" SET "defaultModel" = 'google/gemma-4-31b-it:free'
WHERE "defaultModel" IN ('deepseek/deepseek-chat', 'deepseek/deepseek-v3');

UPDATE "Agent" SET "model" = 'google/gemma-4-31b-it:free'
WHERE "model" IN ('deepseek/deepseek-chat', 'deepseek/deepseek-v3');

ALTER TABLE "User" ALTER COLUMN "defaultModel" SET DEFAULT 'google/gemma-4-31b-it:free';
ALTER TABLE "Agent" ALTER COLUMN "model" SET DEFAULT 'google/gemma-4-31b-it:free';
