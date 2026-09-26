/*
  Warnings:

  - A unique constraint covering the columns `[grnId]` on the table `accounts_payable` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[account_number,branch_id]` on the table `bank_accounts` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `vendorId` to the `accounts_payable` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "bank_accounts_account_number_key";

-- AlterTable
ALTER TABLE "accounts_payable" ADD COLUMN     "branch_id" TEXT,
ADD COLUMN     "grnId" TEXT,
ADD COLUMN     "vendorId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "accounts_receivable" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "bank_transactions" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "finance_transactions" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "tax_records" ADD COLUMN     "branch_id" TEXT;

-- AlterTable
ALTER TABLE "vendors" ADD COLUMN     "currentBalance" DECIMAL(65,30) NOT NULL DEFAULT 0.00;

-- CreateIndex
CREATE UNIQUE INDEX "accounts_payable_grnId_key" ON "accounts_payable"("grnId");

-- CreateIndex
CREATE INDEX "accounts_payable_vendorId_idx" ON "accounts_payable"("vendorId");

-- CreateIndex
CREATE INDEX "accounts_payable_branch_id_idx" ON "accounts_payable"("branch_id");

-- CreateIndex
CREATE INDEX "accounts_receivable_branch_id_idx" ON "accounts_receivable"("branch_id");

-- CreateIndex
CREATE INDEX "bank_accounts_branch_id_idx" ON "bank_accounts"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_account_number_branch_id_key" ON "bank_accounts"("account_number", "branch_id");

-- CreateIndex
CREATE INDEX "bank_transactions_branch_id_idx" ON "bank_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "budgets_branch_id_idx" ON "budgets"("branch_id");

-- CreateIndex
CREATE INDEX "finance_transactions_branch_id_idx" ON "finance_transactions"("branch_id");

-- CreateIndex
CREATE INDEX "tax_records_branch_id_idx" ON "tax_records"("branch_id");

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_receivable" ADD CONSTRAINT "accounts_receivable_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts_payable" ADD CONSTRAINT "accounts_payable_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_receipt_notes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_records" ADD CONSTRAINT "tax_records_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
