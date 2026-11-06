-- Re-runnable: safe whether or not a previous attempt partly applied.
-- Note: productId is a camelCase column on both tables (no @map in the schema).
DO $$ BEGIN
  CREATE TYPE "purchase_order_line_type" AS ENUM ('STOCKED', 'NON_STOCK');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "purchase_order_items"
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "line_type" "purchase_order_line_type" NOT NULL DEFAULT 'STOCKED';

UPDATE "purchase_order_items" AS poi
SET "description" = p."name"
FROM "products" AS p
WHERE poi."productId" = p."id"
  AND poi."description" IS NULL;

-- Anything still without a description (no product to copy from) gets a placeholder
-- so the NOT NULL below cannot fail.
UPDATE "purchase_order_items" SET "description" = 'Item' WHERE "description" IS NULL;

ALTER TABLE "purchase_order_items"
  ALTER COLUMN "description" SET NOT NULL,
  ALTER COLUMN "productId" DROP NOT NULL;

ALTER TABLE "grn_items"
  ALTER COLUMN "productId" DROP NOT NULL;
