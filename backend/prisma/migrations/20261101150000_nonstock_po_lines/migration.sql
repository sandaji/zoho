CREATE TYPE "purchase_order_line_type" AS ENUM ('STOCKED', 'NON_STOCK');

ALTER TABLE "purchase_order_items"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "line_type" "purchase_order_line_type" NOT NULL DEFAULT 'STOCKED';

UPDATE "purchase_order_items" AS poi
SET "description" = p."name"
FROM "products" AS p
WHERE poi."product_id" = p."id";

ALTER TABLE "purchase_order_items"
  ALTER COLUMN "description" SET NOT NULL,
  ALTER COLUMN "product_id" DROP NOT NULL;

ALTER TABLE "grn_items"
  ALTER COLUMN "product_id" DROP NOT NULL;
