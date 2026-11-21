-- A voided sale or a credited return gives the promotion discount back in the promotion's totals.
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "reversed_quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "promotion_redemptions" ADD COLUMN IF NOT EXISTS "reversed_amount" DOUBLE PRECISION NOT NULL DEFAULT 0;
