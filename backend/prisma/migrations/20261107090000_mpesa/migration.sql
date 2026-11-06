-- Phase 11b: M-Pesa STK push requests

CREATE TABLE "mpesa_requests" (
    "id" TEXT NOT NULL,
    "checkout_request_id" TEXT,
    "merchant_request_id" TEXT,
    "phone" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "account_reference" TEXT NOT NULL,
    "description" TEXT,
    "branch_id" TEXT,
    "sales_document_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "result_code" INTEGER,
    "result_desc" TEXT,
    "receipt_number" TEXT,
    "paid_amount" DOUBLE PRECISION,
    "transaction_date" TIMESTAMP(3),
    "created_by_id" TEXT NOT NULL,
    "callback_raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "mpesa_requests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "mpesa_requests_checkout_request_id_key" ON "mpesa_requests"("checkout_request_id");
CREATE UNIQUE INDEX "mpesa_requests_receipt_number_key" ON "mpesa_requests"("receipt_number");
CREATE INDEX "mpesa_requests_status_createdAt_idx" ON "mpesa_requests"("status", "createdAt");
CREATE INDEX "mpesa_requests_sales_document_id_idx" ON "mpesa_requests"("sales_document_id");
CREATE INDEX "mpesa_requests_created_by_id_idx" ON "mpesa_requests"("created_by_id");
