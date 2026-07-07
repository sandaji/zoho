-- Corrective migration: align DB column names with Prisma schema expectations
-- Run this manually in your PostgreSQL DB, then re-run the seed.
--
-- Root cause of "Invalid email or password":
--   prisma.user.findUnique throws a DB column error because column names in the
--   database do not match what Prisma's generated client expects based on schema.prisma.
--
-- Mismatches found:
--   1. "salesPrefix" (camelCase in DB) vs "sales_prefix" (expected by @map("sales_prefix"))
--   2. "last_sequence" (snake_case in DB) vs "lastSequence" (expected — no @map in schema)

-- ── Fix 1: salesPrefix → sales_prefix ────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'salesPrefix'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'sales_prefix'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "salesPrefix" TO "sales_prefix";
    RAISE NOTICE 'Renamed salesPrefix to sales_prefix';
  END IF;
END$$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "sales_prefix" TEXT;

-- ── Fix 2: last_sequence → "lastSequence" ────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_sequence'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'lastSequence'
  ) THEN
    ALTER TABLE "users" RENAME COLUMN "last_sequence" TO "lastSequence";
    RAISE NOTICE 'Renamed last_sequence to lastSequence';
  END IF;
END$$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "lastSequence" INTEGER NOT NULL DEFAULT 0;

-- Drop the old snake_case column if both now exist (cleanup)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'last_sequence'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'lastSequence'
  ) THEN
    ALTER TABLE "users" DROP COLUMN "last_sequence";
    RAISE NOTICE 'Dropped duplicate last_sequence column';
  END IF;
END$$;

-- ── Fix 3: Rebuild unique index with correct name ─────────────────────────────
DROP INDEX IF EXISTS "users_salesPrefix_key";
CREATE UNIQUE INDEX IF NOT EXISTS "users_sales_prefix_key" ON "users"("sales_prefix");

-- ── Fix 4: Ensure hasSystemAccess exists ──────────────────────────────────────
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "hasSystemAccess" BOOLEAN NOT NULL DEFAULT false;
