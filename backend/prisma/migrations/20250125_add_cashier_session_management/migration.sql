-- STEP 2: Add Cashier Session Management
-- Creates CashierSession model for shift management and cash reconciliation
-- Also adds sessionId field to SalesDocument for linking POS sales to cashier sessions

-- Create the cashier_session_status enum
CREATE TYPE "CashierSessionStatus" AS ENUM ('OPEN', 'CLOSED', 'DISCREPANCY', 'RECONCILED');

-- Create the cashier_sessions table
CREATE TABLE "cashier_sessions" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "sessionNo" TEXT NOT NULL UNIQUE,
  "userId" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "status" "CashierSessionStatus" NOT NULL DEFAULT 'OPEN',
  "opening_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "closing_balance" DOUBLE PRECISION,
  "expected_cash" DOUBLE PRECISION,
  "actual_cash" DOUBLE PRECISION,
  "cash_variance" DOUBLE PRECISION,
  "total_sales_count" INTEGER NOT NULL DEFAULT 0,
  "total_sales_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_cash_received" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_card_received" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_mpesa_received" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "total_other_received" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "opened_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closed_at" TIMESTAMP(3),
  "reconciled_at" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "cashier_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cashier_sessions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "cashier_sessions_branchId_sessionNo_key" UNIQUE("branchId", "sessionNo")
);

-- Create indexes on cashier_sessions
CREATE INDEX "cashier_sessions_userId_idx" ON "cashier_sessions"("userId");
CREATE INDEX "cashier_sessions_branchId_idx" ON "cashier_sessions"("branchId");
CREATE INDEX "cashier_sessions_status_idx" ON "cashier_sessions"("status");
CREATE INDEX "cashier_sessions_opened_at_idx" ON "cashier_sessions"("opened_at");
CREATE INDEX "cashier_sessions_sessionNo_idx" ON "cashier_sessions"("sessionNo");

-- Add sessionId field to sales_documents
ALTER TABLE "sales_documents" ADD COLUMN "sessionId" TEXT;

-- Add foreign key constraint for sessionId
ALTER TABLE "sales_documents" ADD CONSTRAINT "sales_documents_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "cashier_sessions" ("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create index on sessionId for sales_documents
CREATE INDEX "sales_documents_sessionId_idx" ON "sales_documents"("sessionId");
