-- Manual migration: add last_sequence column to users
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "last_sequence" integer DEFAULT 0;

-- Ensure NOT NULL if desired after backfilling
-- ALTER TABLE "users" ALTER COLUMN "last_sequence" SET NOT NULL;