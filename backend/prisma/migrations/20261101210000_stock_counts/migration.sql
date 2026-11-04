-- Phase 2: stock counts (full / cycle) with blind counting and approved variance posting

CREATE TABLE "stock_counts" (
    "id" TEXT NOT NULL,
    "count_number" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "blind" BOOLEAN NOT NULL DEFAULT true,
    "category" TEXT,
    "notes" TEXT,
    "created_by_id" TEXT NOT NULL,
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "submitted_by_id" TEXT,
    "posted_at" TIMESTAMP(3),
    "total_variance_value" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_counts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stock_counts_count_number_key" ON "stock_counts"("count_number");
CREATE INDEX "stock_counts_warehouse_id_status_idx" ON "stock_counts"("warehouse_id", "status");
CREATE INDEX "stock_counts_branch_id_idx" ON "stock_counts"("branch_id");

CREATE TABLE "stock_count_lines" (
    "id" TEXT NOT NULL,
    "count_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "system_qty" INTEGER,
    "counted_qty" INTEGER,
    "note" TEXT,
    "counted_by_id" TEXT,
    "counted_at" TIMESTAMP(3),
    "applied_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "stock_count_lines_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "stock_count_lines_count_id_product_id_key" ON "stock_count_lines"("count_id", "product_id");
CREATE INDEX "stock_count_lines_count_id_idx" ON "stock_count_lines"("count_id");
