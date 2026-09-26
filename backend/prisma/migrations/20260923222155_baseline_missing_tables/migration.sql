-- CreateEnum
CREATE TYPE "public"."approval_entity_type" AS ENUM ('PURCHASE_ORDER', 'PURCHASE_REQUISITION', 'EXPENSE_REPORT');

-- CreateEnum
CREATE TYPE "public"."approval_step_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."expense_report_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'POSTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."purchase_requisition_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."purchase_orders" ADD COLUMN     "department_id" TEXT,
ADD COLUMN     "project_code" TEXT,
ADD COLUMN     "source_requisition_id" TEXT;

-- CreateTable
CREATE TABLE "public"."approval_steps" (
    "id" TEXT NOT NULL,
    "entity_type" "public"."approval_entity_type" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "required_permission" TEXT NOT NULL,
    "status" "public"."approval_step_status" NOT NULL DEFAULT 'PENDING',
    "approver_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejection_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_report_items" (
    "id" TEXT NOT NULL,
    "expense_report_id" TEXT NOT NULL,
    "expense_date" TIMESTAMP(3) NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "receipt_url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_report_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."expense_reports" (
    "id" TEXT NOT NULL,
    "expense_number" TEXT NOT NULL,
    "status" "public"."expense_report_status" NOT NULL DEFAULT 'DRAFT',
    "employee_id" TEXT NOT NULL,
    "branch_id" TEXT,
    "department_id" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "posted_at" TIMESTAMP(3),
    "finance_transaction_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_requisition_items" (
    "id" TEXT NOT NULL,
    "purchase_requisition_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "estimated_unit_cost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimated_subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "product_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requisition_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."purchase_requisitions" (
    "id" TEXT NOT NULL,
    "requisition_number" TEXT NOT NULL,
    "status" "public"."purchase_requisition_status" NOT NULL DEFAULT 'DRAFT',
    "requested_by_id" TEXT NOT NULL,
    "branch_id" TEXT NOT NULL,
    "department_id" TEXT,
    "project_code" TEXT,
    "estimated_total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "submitted_at" TIMESTAMP(3),
    "approved_by_id" TEXT,
    "approved_at" TIMESTAMP(3),
    "rejected_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "approval_steps_entity_type_entity_id_idx" ON "public"."approval_steps"("entity_type" ASC, "entity_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "approval_steps_entity_type_entity_id_level_key" ON "public"."approval_steps"("entity_type" ASC, "entity_id" ASC, "level" ASC);

-- CreateIndex
CREATE INDEX "expense_report_items_category_idx" ON "public"."expense_report_items"("category" ASC);

-- CreateIndex
CREATE INDEX "expense_report_items_expense_date_idx" ON "public"."expense_report_items"("expense_date" ASC);

-- CreateIndex
CREATE INDEX "expense_report_items_expense_report_id_idx" ON "public"."expense_report_items"("expense_report_id" ASC);

-- CreateIndex
CREATE INDEX "expense_reports_department_id_idx" ON "public"."expense_reports"("department_id" ASC);

-- CreateIndex
CREATE INDEX "expense_reports_employee_id_idx" ON "public"."expense_reports"("employee_id" ASC);

-- CreateIndex
CREATE INDEX "expense_reports_expense_number_idx" ON "public"."expense_reports"("expense_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "expense_reports_expense_number_key" ON "public"."expense_reports"("expense_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "expense_reports_finance_transaction_id_key" ON "public"."expense_reports"("finance_transaction_id" ASC);

-- CreateIndex
CREATE INDEX "expense_reports_status_idx" ON "public"."expense_reports"("status" ASC);

-- CreateIndex
CREATE INDEX "purchase_requisition_items_product_id_idx" ON "public"."purchase_requisition_items"("product_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_requisition_items_purchase_requisition_id_idx" ON "public"."purchase_requisition_items"("purchase_requisition_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_requisitions_branch_id_idx" ON "public"."purchase_requisitions"("branch_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_requisitions_department_id_idx" ON "public"."purchase_requisitions"("department_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_requisitions_requested_by_id_idx" ON "public"."purchase_requisitions"("requested_by_id" ASC);

-- CreateIndex
CREATE INDEX "purchase_requisitions_requisition_number_idx" ON "public"."purchase_requisitions"("requisition_number" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_requisitions_requisition_number_key" ON "public"."purchase_requisitions"("requisition_number" ASC);

-- CreateIndex
CREATE INDEX "purchase_requisitions_status_idx" ON "public"."purchase_requisitions"("status" ASC);

-- CreateIndex
CREATE INDEX "purchase_orders_department_id_idx" ON "public"."purchase_orders"("department_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_source_requisition_id_key" ON "public"."purchase_orders"("source_requisition_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."approval_steps" ADD CONSTRAINT "approval_steps_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_report_items" ADD CONSTRAINT "expense_report_items_expense_report_id_fkey" FOREIGN KEY ("expense_report_id") REFERENCES "public"."expense_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_reports" ADD CONSTRAINT "expense_reports_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_reports" ADD CONSTRAINT "expense_reports_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_reports" ADD CONSTRAINT "expense_reports_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."expense_reports" ADD CONSTRAINT "expense_reports_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_orders" ADD CONSTRAINT "purchase_orders_source_requisition_id_fkey" FOREIGN KEY ("source_requisition_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_requisition_items" ADD CONSTRAINT "purchase_requisition_items_purchase_requisition_id_fkey" FOREIGN KEY ("purchase_requisition_id") REFERENCES "public"."purchase_requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."purchase_requisitions" ADD CONSTRAINT "purchase_requisitions_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "public"."users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

