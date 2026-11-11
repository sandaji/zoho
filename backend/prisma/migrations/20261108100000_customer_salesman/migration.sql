-- Every customer belongs to a salesman. Existing customers stay NULL until assigned
-- (the Customers page has an "Unassigned" filter for the clean-up).
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "salesman_id" TEXT;
CREATE INDEX IF NOT EXISTS "customers_salesman_id_idx" ON "customers" ("salesman_id");
