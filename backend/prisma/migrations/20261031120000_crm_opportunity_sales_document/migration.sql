-- Link a CRM deal to the quotation or invoice raised for it
ALTER TABLE "crm_opportunities" ADD COLUMN "sales_document_id" TEXT;

CREATE INDEX "crm_opportunities_sales_document_id_idx" ON "crm_opportunities"("sales_document_id");
