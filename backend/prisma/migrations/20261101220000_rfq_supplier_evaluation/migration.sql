-- Phase 3: RFQs, quote comparison and supplier evaluation

CREATE TABLE "rfqs" (
    "id" TEXT NOT NULL,
    "rfq_number" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "requisition_id" TEXT,
    "branch_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "closing_date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "exception_reason" TEXT,
    "created_by_id" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "awarded_quote_id" TEXT,
    "award_reason" TEXT,
    "awarded_by_id" TEXT,
    "awarded_at" TIMESTAMP(3),
    "po_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rfqs_rfq_number_key" ON "rfqs"("rfq_number");
CREATE INDEX "rfqs_status_closing_date_idx" ON "rfqs"("status", "closing_date");
CREATE INDEX "rfqs_branch_id_idx" ON "rfqs"("branch_id");

CREATE TABLE "rfq_items" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "product_id" TEXT,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rfq_items_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "rfq_items_rfq_id_idx" ON "rfq_items"("rfq_id");

CREATE TABLE "rfq_quotes" (
    "id" TEXT NOT NULL,
    "rfq_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "lead_time_days" INTEGER,
    "payment_terms" TEXT,
    "valid_until" TIMESTAMP(3),
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "entered_by_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rfq_quotes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rfq_quotes_rfq_id_vendor_id_key" ON "rfq_quotes"("rfq_id", "vendor_id");
CREATE INDEX "rfq_quotes_rfq_id_idx" ON "rfq_quotes"("rfq_id");

CREATE TABLE "rfq_quote_lines" (
    "id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rfq_quote_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "rfq_quote_lines_quote_id_item_id_key" ON "rfq_quote_lines"("quote_id", "item_id");
CREATE INDEX "rfq_quote_lines_quote_id_idx" ON "rfq_quote_lines"("quote_id");

CREATE TABLE "vendor_evaluations" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "evaluator_id" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "delivery" INTEGER NOT NULL,
    "quality" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "service" INTEGER NOT NULL,
    "overall" DOUBLE PRECISION NOT NULL,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendor_evaluations_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vendor_evaluations_vendor_id_evaluator_id_period_key" ON "vendor_evaluations"("vendor_id", "evaluator_id", "period");
CREATE INDEX "vendor_evaluations_vendor_id_idx" ON "vendor_evaluations"("vendor_id");
