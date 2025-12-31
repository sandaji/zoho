-- CreateEnum
CREATE TYPE "account_type" AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- CreateEnum
CREATE TYPE "period_type" AS ENUM ('monthly', 'quarterly', 'annually');

-- CreateEnum
CREATE TYPE "budget_status" AS ENUM ('draft', 'submitted', 'approved', 'active', 'closed');

-- CreateEnum
CREATE TYPE "ar_status" AS ENUM ('outstanding', 'partial', 'paid', 'overdue', 'written_off');

-- CreateEnum
CREATE TYPE "ap_status" AS ENUM ('outstanding', 'partial', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "bank_account_type" AS ENUM ('checking', 'savings', 'credit_line', 'money_market');

-- CreateEnum
CREATE TYPE "forecast_type" AS ENUM ('revenue', 'expense', 'cashflow', 'profit');

-- CreateEnum
CREATE TYPE "forecast_status" AS ENUM ('draft', 'active', 'archived');

-- CreateEnum
CREATE TYPE "alert_type" AS ENUM ('budget_exceeded', 'low_cash_balance', 'overdue_receivable', 'overdue_payable', 'unusual_transaction', 'forecast_deviation', 'compliance_issue');

-- CreateEnum
CREATE TYPE "alert_severity" AS ENUM ('low', 'medium', 'high', 'critical');

-- CreateEnum
CREATE TYPE "alert_status" AS ENUM ('active', 'acknowledged', 'resolved', 'dismissed');

-- CreateEnum
CREATE TYPE "tax_type" AS ENUM ('vat', 'income_tax', 'payroll_tax', 'withholding_tax', 'sales_tax');

-- CreateEnum
CREATE TYPE "tax_status" AS ENUM ('pending', 'filed', 'paid', 'overdue');

-- CreateTable
CREATE TABLE "chart_of_accounts" (
    "id" TEXT NOT NULL,
    "account_code" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type" "account_type" NOT NULL,
    "parent_id" TEXT,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chart_of_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "entry_no" TEXT NOT NULL,
    "entry_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "account_id" TEXT NOT NULL,
    "debit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "credit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reference_type" TEXT,
    "reference_id" TEXT,
    "batch_id" TEXT,
    "description" TEXT NOT NULL,
    "notes" TEXT,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_date" TIMESTAMP(3),
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_date" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" TEXT NOT NULL,
    "budget_name" TEXT NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "account_id" TEXT NOT NULL,
    "period_type" "period_type" NOT NULL DEFAULT 'monthly',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "budgeted_amount" DOUBLE PRECISION NOT NULL,
    "actual_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "variance_percent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "budget_status" NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_date" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_receivable" (
    "id" TEXT NOT NULL,
    "invoice_no" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "invoice_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_date" TIMESTAMP(3),
    "status" "ar_status" NOT NULL DEFAULT 'outstanding',
    "aging_days" INTEGER NOT NULL DEFAULT 0,
    "salesId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_receivable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ar_payments" (
    "id" TEXT NOT NULL,
    "payment_no" TEXT NOT NULL,
    "ar_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bank_name" TEXT,
    "check_no" TEXT,
    "transaction_id" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ar_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts_payable" (
    "id" TEXT NOT NULL,
    "bill_no" TEXT NOT NULL,
    "vendor_name" TEXT NOT NULL,
    "vendor_email" TEXT,
    "vendor_phone" TEXT,
    "total_amount" DOUBLE PRECISION NOT NULL,
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "bill_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_date" TIMESTAMP(3),
    "status" "ap_status" NOT NULL DEFAULT 'outstanding',
    "aging_days" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_payable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ap_payments" (
    "id" TEXT NOT NULL,
    "payment_no" TEXT NOT NULL,
    "ap_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "payment_method" "payment_method" NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bank_name" TEXT,
    "check_no" TEXT,
    "transaction_id" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ap_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "branch" TEXT,
    "account_type" "bank_account_type" NOT NULL DEFAULT 'checking',
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "current_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "available_balance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "overdraft_limit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL,
    "transaction_no" TEXT NOT NULL,
    "bank_account_id" TEXT NOT NULL,
    "transaction_type" "transaction_type" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "balance_after" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "reference_no" TEXT,
    "category" TEXT,
    "is_reconciled" BOOLEAN NOT NULL DEFAULT false,
    "reconciled_date" TIMESTAMP(3),
    "transaction_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_forecasts" (
    "id" TEXT NOT NULL,
    "forecast_name" TEXT NOT NULL,
    "forecast_type" "forecast_type" NOT NULL,
    "fiscal_year" INTEGER NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "forecast_data" JSONB NOT NULL,
    "actual_data" JSONB,
    "accuracy_score" DOUBLE PRECISION,
    "mape" DOUBLE PRECISION,
    "model_type" TEXT,
    "model_params" JSONB,
    "status" "forecast_status" NOT NULL DEFAULT 'draft',
    "created_by" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_forecasts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_alerts" (
    "id" TEXT NOT NULL,
    "alert_type" "alert_type" NOT NULL,
    "severity" "alert_severity" NOT NULL DEFAULT 'medium',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "threshold_value" DOUBLE PRECISION,
    "current_value" DOUBLE PRECISION,
    "status" "alert_status" NOT NULL DEFAULT 'active',
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "recipients" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_records" (
    "id" TEXT NOT NULL,
    "tax_type" "tax_type" NOT NULL,
    "tax_period" TEXT NOT NULL,
    "taxable_amount" DOUBLE PRECISION NOT NULL,
    "tax_rate" DOUBLE PRECISION NOT NULL,
    "tax_amount" DOUBLE PRECISION NOT NULL,
    "status" "tax_status" NOT NULL DEFAULT 'pending',
    "filing_date" TIMESTAMP(3),
    "due_date" TIMESTAMP(3) NOT NULL,
    "filed_by" TEXT,
    "payment_status" TEXT NOT NULL DEFAULT 'unpaid',
    "paid_amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tax_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chart_of_accounts_account_code_key" ON "chart_of_accounts"("account_code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_account_code_idx" ON "chart_of_accounts"("account_code");

-- CreateIndex
CREATE INDEX "chart_of_accounts_account_type_idx" ON "chart_of_accounts"("account_type");

-- CreateIndex
CREATE INDEX "chart_of_accounts_category_idx" ON "chart_of_accounts"("category");

-- CreateIndex
CREATE UNIQUE INDEX "journal_entries_entry_no_key" ON "journal_entries"("entry_no");

-- CreateIndex
CREATE INDEX "journal_entries_account_id_idx" ON "journal_entries"("account_id");

-- CreateIndex
CREATE INDEX "journal_entries_entry_no_idx" ON "journal_entries"("entry_no");

-- CreateIndex
CREATE INDEX "journal_entries_entry_date_idx" ON "journal_entries"("entry_date");

-- CreateIndex
CREATE INDEX "journal_entries_batch_id_idx" ON "journal_entries"("batch_id");

-- CreateIndex
CREATE INDEX "journal_entries_reference_type_reference_id_idx" ON "journal_entries"("reference_type", "reference_id");

-- CreateIndex
CREATE INDEX "budgets_account_id_idx" ON "budgets"("account_id");

-- CreateIndex
CREATE INDEX "budgets_fiscal_year_idx" ON "budgets"("fiscal_year");

-- CreateIndex
CREATE INDEX "budgets_status_idx" ON "budgets"("status");

-- CreateIndex
CREATE UNIQUE INDEX "budgets_account_id_fiscal_year_period_start_key" ON "budgets"("account_id", "fiscal_year", "period_start");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_receivable_invoice_no_key" ON "accounts_receivable"("invoice_no");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_receivable_salesId_key" ON "accounts_receivable"("salesId");

-- CreateIndex
CREATE INDEX "accounts_receivable_invoice_no_idx" ON "accounts_receivable"("invoice_no");

-- CreateIndex
CREATE INDEX "accounts_receivable_customer_name_idx" ON "accounts_receivable"("customer_name");

-- CreateIndex
CREATE INDEX "accounts_receivable_status_idx" ON "accounts_receivable"("status");

-- CreateIndex
CREATE INDEX "accounts_receivable_due_date_idx" ON "accounts_receivable"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "ar_payments_payment_no_key" ON "ar_payments"("payment_no");

-- CreateIndex
CREATE INDEX "ar_payments_ar_id_idx" ON "ar_payments"("ar_id");

-- CreateIndex
CREATE INDEX "ar_payments_payment_no_idx" ON "ar_payments"("payment_no");

-- CreateIndex
CREATE INDEX "ar_payments_payment_date_idx" ON "ar_payments"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_bill_no_key" ON "accounts_payable"("bill_no");

-- CreateIndex
CREATE INDEX "accounts_payable_bill_no_idx" ON "accounts_payable"("bill_no");

-- CreateIndex
CREATE INDEX "accounts_payable_vendor_name_idx" ON "accounts_payable"("vendor_name");

-- CreateIndex
CREATE INDEX "accounts_payable_status_idx" ON "accounts_payable"("status");

-- CreateIndex
CREATE INDEX "accounts_payable_due_date_idx" ON "accounts_payable"("due_date");

-- CreateIndex
CREATE UNIQUE INDEX "ap_payments_payment_no_key" ON "ap_payments"("payment_no");

-- CreateIndex
CREATE INDEX "ap_payments_ap_id_idx" ON "ap_payments"("ap_id");

-- CreateIndex
CREATE INDEX "ap_payments_payment_no_idx" ON "ap_payments"("payment_no");

-- CreateIndex
CREATE INDEX "ap_payments_payment_date_idx" ON "ap_payments"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_account_number_key" ON "bank_accounts"("account_number");

-- CreateIndex
CREATE INDEX "bank_accounts_account_number_idx" ON "bank_accounts"("account_number");

-- CreateIndex
CREATE INDEX "bank_accounts_bank_name_idx" ON "bank_accounts"("bank_name");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_transaction_no_key" ON "bank_transactions"("transaction_no");

-- CreateIndex
CREATE INDEX "bank_transactions_bank_account_id_idx" ON "bank_transactions"("bank_account_id");

-- CreateIndex
CREATE INDEX "bank_transactions_transaction_no_idx" ON "bank_transactions"("transaction_no");

-- CreateIndex
CREATE INDEX "bank_transactions_transaction_date_idx" ON "bank_transactions"("transaction_date");

-- CreateIndex
CREATE INDEX "financial_forecasts_fiscal_year_idx" ON "financial_forecasts"("fiscal_year");

-- CreateIndex
CREATE INDEX "financial_forecasts_forecast_type_idx" ON "financial_forecasts"("forecast_type");

-- CreateIndex
CREATE INDEX "financial_forecasts_status_idx" ON "financial_forecasts"("status");

-- CreateIndex
CREATE INDEX "financial_alerts_alert_type_idx" ON "financial_alerts"("alert_type");

-- CreateIndex
CREATE INDEX "financial_alerts_severity_idx" ON "financial_alerts"("severity");

-- CreateIndex
CREATE INDEX "financial_alerts_status_idx" ON "financial_alerts"("status");

-- CreateIndex
CREATE INDEX "tax_records_tax_type_idx" ON "tax_records"("tax_type");

-- CreateIndex
CREATE INDEX "tax_records_tax_period_idx" ON "tax_records"("tax_period");

-- CreateIndex
CREATE INDEX "tax_records_status_idx" ON "tax_records"("status");

-- CreateIndex
CREATE INDEX "tax_records_due_date_idx" ON "tax_records"("due_date");

-- AddForeignKey
ALTER TABLE "chart_of_accounts" ADD CONSTRAINT "chart_of_accounts_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "chart_of_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "chart_of_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_salesId_fkey" FOREIGN KEY ("salesId") REFERENCES "sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ar_payments" ADD CONSTRAINT "ar_payments_ar_id_fkey" FOREIGN KEY ("ar_id") REFERENCES "accounts_receivable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ap_payments" ADD CONSTRAINT "ap_payments_ap_id_fkey" FOREIGN KEY ("ap_id") REFERENCES "accounts_payable"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
