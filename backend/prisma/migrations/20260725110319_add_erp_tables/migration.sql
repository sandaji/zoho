/*
  Warnings:

  - You are about to drop the column `salesId` on the `accounts_receivable` table. All the data in the column will be lost.
  - The `status` column on the `cashier_sessions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `salesId` on the `deliveries` table. All the data in the column will be lost.
  - The `fromRole` column on the `employee_transfers` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `salesId` on the `finance_transactions` table. All the data in the column will be lost.
  - You are about to drop the column `supplier_name` on the `products` table. All the data in the column will be lost.
  - You are about to drop the column `driverId` on the `stock_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `last_sequence` on the `users` table. All the data in the column will be lost.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[name]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[idempotency_key]` on the table `sales_documents` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `toRole` on the `employee_transfers` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "cashier_session_status" AS ENUM ('OPEN', 'CLOSED', 'DISCREPANCY', 'RECONCILED');

-- CreateEnum
CREATE TYPE "approval_type" AS ENUM ('VENDOR_CHANGE', 'PO_APPROVAL', 'TRANSFER_APPROVAL', 'PRICE_ADJUSTMENT', 'STOCK_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "approval_status" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "purchase_order_status" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "sales_order_status" AS ENUM ('DRAFT', 'APPROVED', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "grn_status" AS ENUM ('COMPLETED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "VATType" AS ENUM ('INPUT', 'OUTPUT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "sales_document_status" ADD VALUE 'PARKED';
ALTER TYPE "sales_document_status" ADD VALUE 'HELD';
ALTER TYPE "sales_document_status" ADD VALUE 'CLOSED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "transfer_status" ADD VALUE 'PENDING_RECEIPT';
ALTER TYPE "transfer_status" ADD VALUE 'DISCREPANCY';

-- DropForeignKey
ALTER TABLE "accounts_receivable" DROP CONSTRAINT "accounts_receivable_salesId_fkey";

-- DropIndex
DROP INDEX "accounts_receivable_salesId_key";

-- DropIndex
DROP INDEX "deliveries_salesId_idx";

-- DropIndex
DROP INDEX "deliveries_salesId_key";

-- DropIndex
DROP INDEX "finance_transactions_salesId_idx";

-- DropIndex
DROP INDEX "sales_documents_source_document_id_key";

-- AlterTable
ALTER TABLE "accounts_receivable" DROP COLUMN "salesId";

-- AlterTable
ALTER TABLE "applicants" ADD COLUMN     "notes" TEXT;

-- AlterTable
ALTER TABLE "cashier_sessions" DROP COLUMN "status",
ADD COLUMN     "status" "cashier_session_status" NOT NULL DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "creditLimit" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "currentBalance" DECIMAL(65,30) NOT NULL DEFAULT 0.00,
ADD COLUMN     "customerType" TEXT NOT NULL DEFAULT 'RETAIL',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "deliveries" DROP COLUMN "salesId";

-- AlterTable
ALTER TABLE "employee_transfers" DROP COLUMN "fromRole",
ADD COLUMN     "fromRole" TEXT,
DROP COLUMN "toRole",
ADD COLUMN     "toRole" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "finance_transactions" DROP COLUMN "salesId";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "supplier_name",
ADD COLUMN     "vendorId" TEXT;

-- AlterTable
ALTER TABLE "sales_documents" ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "idempotency_key" TEXT;

-- AlterTable
ALTER TABLE "stock_transfers" DROP COLUMN "driverId",
ADD COLUMN     "attendantName" TEXT,
ADD COLUMN     "driverName" TEXT,
ADD COLUMN     "receivedAt" TIMESTAMP(3),
ADD COLUMN     "receivedById" TEXT,
ADD COLUMN     "truckRegNo" TEXT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "last_sequence",
DROP COLUMN "role",
ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'warehouse_staff';

-- DropEnum
DROP TYPE "CashierSessionStatus";

-- DropEnum
DROP TYPE "user_role";

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subcategories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subcategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "grnItemId" TEXT,
    "initialQuantity" INTEGER NOT NULL,
    "currentQuantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDepleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_orders" (
    "id" TEXT NOT NULL,
    "so_number" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "status" "sales_order_status" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "so_items" (
    "id" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty_requested" INTEGER NOT NULL,
    "qty_dispatched" INTEGER NOT NULL DEFAULT 0,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "so_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_notes" (
    "id" TEXT NOT NULL,
    "dn_number" TEXT NOT NULL,
    "salesOrderId" TEXT NOT NULL,
    "dispatchedById" TEXT NOT NULL,
    "dispatched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispatch_items" (
    "id" TEXT NOT NULL,
    "dispatchNoteId" TEXT NOT NULL,
    "soItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty_dispatched" INTEGER NOT NULL,
    "total_cogs" DECIMAL(65,30) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dispatch_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "website" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT 'NET_30',
    "leadTimeDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "po_number" TEXT NOT NULL,
    "status" "purchase_order_status" NOT NULL DEFAULT 'DRAFT',
    "vendorId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "destinationWarehouseId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "expected_delivery_date" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approval_requests" (
    "id" TEXT NOT NULL,
    "type" "approval_type" NOT NULL,
    "status" "approval_status" NOT NULL DEFAULT 'PENDING',
    "requestedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "data" JSONB NOT NULL,
    "referenceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DOUBLE PRECISION NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "received_quantity" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods_receipt_notes" (
    "id" TEXT NOT NULL,
    "grn_number" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "receivedById" TEXT NOT NULL,
    "status" "grn_status" NOT NULL DEFAULT 'COMPLETED',
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goods_receipt_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grn_items" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "poItemId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "qty_received" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "grn_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_headers" (
    "id" TEXT NOT NULL,
    "entry_no" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "period_id" TEXT NOT NULL,
    "journal_id" TEXT,
    "branch_id" TEXT,
    "description" TEXT NOT NULL,
    "total_debit" DECIMAL(19,2) NOT NULL,
    "total_credit" DECIMAL(19,2) NOT NULL,
    "source_type" TEXT,
    "source_id" TEXT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "journal_headers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_lines" (
    "id" TEXT NOT NULL,
    "header_id" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "line_no" INTEGER NOT NULL,
    "description" TEXT,
    "debit" DECIMAL(19,2) NOT NULL,
    "credit" DECIMAL(19,2) NOT NULL,

    CONSTRAINT "journal_lines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vat_transactions" (
    "id" TEXT NOT NULL,
    "transaction_no" TEXT NOT NULL,
    "vat_type" "VATType" NOT NULL,
    "source_type" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "source_line_id" TEXT,
    "taxable_amount" DECIMAL(19,2) NOT NULL,
    "vat_rate" DECIMAL(5,2) NOT NULL,
    "vat_amount" DECIMAL(19,2) NOT NULL,
    "is_claimable" BOOLEAN NOT NULL DEFAULT true,
    "claimed_date" TIMESTAMP(3),
    "claim_period" TEXT,
    "etims_synced" BOOLEAN NOT NULL DEFAULT false,
    "etims_synced_at" TIMESTAMP(3),
    "etims_cuin" TEXT,
    "etims_cusn" TEXT,
    "etims_qr_code" TEXT,
    "etims_error" TEXT,
    "branch_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vat_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE INDEX "categories_name_idx" ON "categories"("name");

-- CreateIndex
CREATE INDEX "subcategories_categoryId_idx" ON "subcategories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "subcategories_categoryId_name_key" ON "subcategories"("categoryId", "name");

-- CreateIndex
CREATE INDEX "stock_batches_productId_warehouseId_idx" ON "stock_batches"("productId", "warehouseId");

-- CreateIndex
CREATE INDEX "stock_batches_grnItemId_idx" ON "stock_batches"("grnItemId");

-- CreateIndex
CREATE INDEX "stock_batches_isDepleted_idx" ON "stock_batches"("isDepleted");

-- CreateIndex
CREATE INDEX "stock_batches_receivedAt_idx" ON "stock_batches"("receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "sales_orders_so_number_key" ON "sales_orders"("so_number");

-- CreateIndex
CREATE INDEX "sales_orders_so_number_idx" ON "sales_orders"("so_number");

-- CreateIndex
CREATE INDEX "sales_orders_customerId_idx" ON "sales_orders"("customerId");

-- CreateIndex
CREATE INDEX "sales_orders_branchId_idx" ON "sales_orders"("branchId");

-- CreateIndex
CREATE INDEX "sales_orders_status_idx" ON "sales_orders"("status");

-- CreateIndex
CREATE INDEX "so_items_salesOrderId_idx" ON "so_items"("salesOrderId");

-- CreateIndex
CREATE INDEX "so_items_productId_idx" ON "so_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "dispatch_notes_dn_number_key" ON "dispatch_notes"("dn_number");

-- CreateIndex
CREATE INDEX "dispatch_notes_dn_number_idx" ON "dispatch_notes"("dn_number");

-- CreateIndex
CREATE INDEX "dispatch_notes_salesOrderId_idx" ON "dispatch_notes"("salesOrderId");

-- CreateIndex
CREATE INDEX "dispatch_notes_dispatchedById_idx" ON "dispatch_notes"("dispatchedById");

-- CreateIndex
CREATE INDEX "dispatch_notes_dispatched_at_idx" ON "dispatch_notes"("dispatched_at");

-- CreateIndex
CREATE INDEX "dispatch_items_dispatchNoteId_idx" ON "dispatch_items"("dispatchNoteId");

-- CreateIndex
CREATE INDEX "dispatch_items_soItemId_idx" ON "dispatch_items"("soItemId");

-- CreateIndex
CREATE INDEX "dispatch_items_productId_idx" ON "dispatch_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_code_key" ON "vendors"("code");

-- CreateIndex
CREATE INDEX "vendors_code_idx" ON "vendors"("code");

-- CreateIndex
CREATE INDEX "vendors_name_idx" ON "vendors"("name");

-- CreateIndex
CREATE INDEX "vendors_isActive_idx" ON "vendors"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_number_key" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_po_number_idx" ON "purchase_orders"("po_number");

-- CreateIndex
CREATE INDEX "purchase_orders_vendorId_idx" ON "purchase_orders"("vendorId");

-- CreateIndex
CREATE INDEX "purchase_orders_branchId_idx" ON "purchase_orders"("branchId");

-- CreateIndex
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders"("status");

-- CreateIndex
CREATE INDEX "approval_requests_type_idx" ON "approval_requests"("type");

-- CreateIndex
CREATE INDEX "approval_requests_status_idx" ON "approval_requests"("status");

-- CreateIndex
CREATE INDEX "approval_requests_requestedById_idx" ON "approval_requests"("requestedById");

-- CreateIndex
CREATE INDEX "purchase_order_items_purchaseOrderId_idx" ON "purchase_order_items"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "purchase_order_items_productId_idx" ON "purchase_order_items"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "goods_receipt_notes_grn_number_key" ON "goods_receipt_notes"("grn_number");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_grn_number_idx" ON "goods_receipt_notes"("grn_number");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_purchaseOrderId_idx" ON "goods_receipt_notes"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "goods_receipt_notes_status_idx" ON "goods_receipt_notes"("status");

-- CreateIndex
CREATE INDEX "grn_items_grnId_idx" ON "grn_items"("grnId");

-- CreateIndex
CREATE INDEX "grn_items_poItemId_idx" ON "grn_items"("poItemId");

-- CreateIndex
CREATE UNIQUE INDEX "journal_headers_entry_no_key" ON "journal_headers"("entry_no");

-- CreateIndex
CREATE INDEX "journal_headers_entry_no_idx" ON "journal_headers"("entry_no");

-- CreateIndex
CREATE INDEX "journal_headers_entry_date_idx" ON "journal_headers"("entry_date");

-- CreateIndex
CREATE INDEX "journal_headers_period_id_idx" ON "journal_headers"("period_id");

-- CreateIndex
CREATE INDEX "journal_headers_branch_id_idx" ON "journal_headers"("branch_id");

-- CreateIndex
CREATE INDEX "journal_headers_source_type_source_id_idx" ON "journal_headers"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "journal_lines_header_id_idx" ON "journal_lines"("header_id");

-- CreateIndex
CREATE INDEX "journal_lines_account_id_idx" ON "journal_lines"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "vat_transactions_transaction_no_key" ON "vat_transactions"("transaction_no");

-- CreateIndex
CREATE INDEX "vat_transactions_transaction_no_idx" ON "vat_transactions"("transaction_no");

-- CreateIndex
CREATE INDEX "vat_transactions_vat_type_idx" ON "vat_transactions"("vat_type");

-- CreateIndex
CREATE INDEX "vat_transactions_source_type_source_id_idx" ON "vat_transactions"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "vat_transactions_claim_period_idx" ON "vat_transactions"("claim_period");

-- CreateIndex
CREATE INDEX "vat_transactions_etims_synced_idx" ON "vat_transactions"("etims_synced");

-- CreateIndex
CREATE INDEX "vat_transactions_branch_id_idx" ON "vat_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "vat_transactions_created_at_idx" ON "vat_transactions"("created_at");

-- CreateIndex
CREATE INDEX "cashier_sessions_status_idx" ON "cashier_sessions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "customers_name_key" ON "customers"("name");

-- CreateIndex
CREATE INDEX "customers_name_idx" ON "customers"("name");

-- CreateIndex
CREATE UNIQUE INDEX "sales_documents_idempotency_key_key" ON "sales_documents"("idempotency_key");

-- CreateIndex
CREATE INDEX "sales_documents_idempotency_key_idx" ON "sales_documents"("idempotency_key");

-- CreateIndex
CREATE INDEX "users_hasSystemAccess_idx" ON "users"("hasSystemAccess");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subcategories" ADD CONSTRAINT "subcategories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_grnItemId_fkey" FOREIGN KEY ("grnItemId") REFERENCES "grn_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "so_items" ADD CONSTRAINT "so_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "so_items" ADD CONSTRAINT "so_items_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_notes" ADD CONSTRAINT "dispatch_notes_dispatchedById_fkey" FOREIGN KEY ("dispatchedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_notes" ADD CONSTRAINT "dispatch_notes_salesOrderId_fkey" FOREIGN KEY ("salesOrderId") REFERENCES "sales_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_dispatchNoteId_fkey" FOREIGN KEY ("dispatchNoteId") REFERENCES "dispatch_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispatch_items" ADD CONSTRAINT "dispatch_items_soItemId_fkey" FOREIGN KEY ("soItemId") REFERENCES "so_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approval_requests" ADD CONSTRAINT "approval_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goods_receipt_notes" ADD CONSTRAINT "goods_receipt_notes_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_receipt_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "grn_items" ADD CONSTRAINT "grn_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_headers" ADD CONSTRAINT "journal_headers_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "fiscal_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_headers" ADD CONSTRAINT "journal_headers_journal_id_fkey" FOREIGN KEY ("journal_id") REFERENCES "journals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_headers" ADD CONSTRAINT "journal_headers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_header_id_fkey" FOREIGN KEY ("header_id") REFERENCES "journal_headers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vat_transactions" ADD CONSTRAINT "vat_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
