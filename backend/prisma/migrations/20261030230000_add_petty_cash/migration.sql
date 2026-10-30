-- Petty cash imprest funds and their ledger of movements

CREATE TYPE "petty_cash_entry_type" AS ENUM ('TOPUP', 'DISBURSEMENT');

CREATE TABLE "petty_cash_funds" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "branch_id" TEXT,
    "custodian_id" TEXT NOT NULL,
    "imprest_amount" DOUBLE PRECISION NOT NULL,
    "max_per_transaction" DOUBLE PRECISION NOT NULL,
    "balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "petty_cash_funds_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "petty_cash_entries" (
    "id" TEXT NOT NULL,
    "entry_number" TEXT NOT NULL,
    "fund_id" TEXT NOT NULL,
    "type" "petty_cash_entry_type" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "payee" TEXT,
    "category" TEXT,
    "description" TEXT NOT NULL,
    "receipt_ref" TEXT,
    "entry_date" TIMESTAMP(3) NOT NULL,
    "counter_account_id" TEXT,
    "journal_header_id" TEXT,
    "recorded_by_id" TEXT NOT NULL,
    "voided_at" TIMESTAMP(3),
    "voided_by_id" TEXT,
    "void_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "petty_cash_entries_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "petty_cash_funds_custodian_id_idx" ON "petty_cash_funds"("custodian_id");
CREATE INDEX "petty_cash_funds_branch_id_idx" ON "petty_cash_funds"("branch_id");
CREATE UNIQUE INDEX "petty_cash_entries_entry_number_key" ON "petty_cash_entries"("entry_number");
CREATE INDEX "petty_cash_entries_fund_id_idx" ON "petty_cash_entries"("fund_id");
CREATE INDEX "petty_cash_entries_entry_date_idx" ON "petty_cash_entries"("entry_date");
CREATE INDEX "petty_cash_entries_recorded_by_id_idx" ON "petty_cash_entries"("recorded_by_id");

ALTER TABLE "petty_cash_entries"
  ADD CONSTRAINT "petty_cash_entries_fund_id_fkey"
  FOREIGN KEY ("fund_id") REFERENCES "petty_cash_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
