-- Add new columns to finance_transactions for dashboard support
ALTER TABLE "finance_transactions" ADD COLUMN "category" TEXT;
ALTER TABLE "finance_transactions" ADD COLUMN "transactionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for new columns
CREATE INDEX "finance_transactions_category_idx" ON "finance_transactions"("category");
CREATE INDEX "finance_transactions_transactionDate_idx" ON "finance_transactions"("transactionDate");

-- Create savings_goals table
CREATE TABLE "savings_goals" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "targetAmount" DOUBLE PRECISION NOT NULL,
  "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "deadline" TIMESTAMP(3),
  "status" TEXT NOT NULL DEFAULT 'active',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);

-- Create indexes for savings_goals
CREATE INDEX "savings_goals_status_idx" ON "savings_goals"("status");
CREATE INDEX "savings_goals_createdAt_idx" ON "savings_goals"("createdAt");

-- Create daily_spending_limits table
CREATE TABLE "daily_spending_limits" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "limit" DOUBLE PRECISION NOT NULL DEFAULT 50000,
  "date" TIMESTAMP(3) NOT NULL,
  "spent" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  UNIQUE("date")
);

-- Create indexes for daily_spending_limits
CREATE INDEX "daily_spending_limits_date_idx" ON "daily_spending_limits"("date");
