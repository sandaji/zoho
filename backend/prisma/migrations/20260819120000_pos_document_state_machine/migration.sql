-- Keep the existing unified sales_documents table and extend it for the
-- document lifecycle. Existing invoice records retain their audit history.
CREATE TYPE "sales_document_type_new" AS ENUM ('DRAFT', 'QUOTE', 'OPEN_INVOICE', 'CLOSED_INVOICE', 'CREDIT_NOTE');

ALTER TABLE "sales_documents"
  ALTER COLUMN "type" TYPE "sales_document_type_new"
  USING (CASE
    WHEN "type"::text = 'INVOICE' AND "status" IN ('PAID', 'CLOSED') THEN 'CLOSED_INVOICE'
    WHEN "type"::text = 'INVOICE' THEN 'OPEN_INVOICE'
    ELSE "type"::text
  END)::"sales_document_type_new";

ALTER TABLE "document_sequences"
  ALTER COLUMN "type" TYPE "sales_document_type_new"
  USING (CASE WHEN "type"::text = 'INVOICE' THEN 'OPEN_INVOICE' ELSE "type"::text END)::"sales_document_type_new";

DROP TYPE "sales_document_type";
ALTER TYPE "sales_document_type_new" RENAME TO "sales_document_type";

ALTER TABLE "sales_documents"
  ADD COLUMN "draft_number" TEXT,
  ADD COLUMN "quote_number" TEXT,
  ADD COLUMN "invoice_number" TEXT,
  ADD COLUMN "invoiced_by_id" TEXT,
  ADD COLUMN "closed_by_id" TEXT,
  ADD COLUMN "closed_at" TIMESTAMP(3);

-- Backfill the lifecycle numbers from the historical document identifier.
UPDATE "sales_documents"
SET
  "draft_number" = CASE WHEN "type" = 'DRAFT' THEN "documentId" END,
  "quote_number" = CASE WHEN "type" = 'QUOTE' THEN "documentId" END,
  "invoice_number" = CASE WHEN "type" IN ('OPEN_INVOICE', 'CLOSED_INVOICE') THEN "documentId" END,
  "invoiced_by_id" = CASE WHEN "type" IN ('OPEN_INVOICE', 'CLOSED_INVOICE') THEN "createdById" END;

-- Paid/closed historical invoices are closed documents in the new state machine.
UPDATE "sales_documents"
SET "closed_by_id" = "createdById", "closed_at" = "updatedAt"
WHERE "type" = 'CLOSED_INVOICE';

CREATE INDEX "sales_documents_invoiced_by_id_idx" ON "sales_documents"("invoiced_by_id");
CREATE INDEX "sales_documents_closed_by_id_idx" ON "sales_documents"("closed_by_id");

ALTER TABLE "sales_documents"
  ADD CONSTRAINT "sales_documents_invoiced_by_id_fkey"
  FOREIGN KEY ("invoiced_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "sales_documents_closed_by_id_fkey"
  FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
