-- Finance acknowledgment stage for Purchase Orders (LPOs).
--
-- Workflow: DRAFT -> SUBMITTED (procurement) -> ACKNOWLEDGED (finance)
--           -> APPROVED (MD / admin) -> received / closed.

-- New status, placed before APPROVED to mirror the schema's declared order.
ALTER TYPE "purchase_order_status" ADD VALUE IF NOT EXISTS 'ACKNOWLEDGED' BEFORE 'APPROVED';

-- Who acknowledged the LPO and when.
ALTER TABLE "purchase_orders"
  ADD COLUMN IF NOT EXISTS "acknowledgedById" TEXT,
  ADD COLUMN IF NOT EXISTS "acknowledgedAt" TIMESTAMP(3);

ALTER TABLE "purchase_orders"
  ADD CONSTRAINT "purchase_orders_acknowledgedById_fkey"
  FOREIGN KEY ("acknowledgedById") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
