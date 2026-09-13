-- Runtime patch for databases that were created before these User fields existed.
-- This keeps the live schema aligned with Prisma without relying on broken shadow-db history.

ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "salesPrefix" TEXT,
ADD COLUMN IF NOT EXISTS "lastSequence" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "hasSystemAccess" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "users_salesPrefix_key"
ON "users"("salesPrefix");
