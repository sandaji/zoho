-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "user_role" ADD VALUE 'branch_manager';
ALTER TYPE "user_role" ADD VALUE 'hr';
ALTER TYPE "user_role" ADD VALUE 'accountant';

-- CreateTable
CREATE TABLE "employee_transfers" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fromBranchId" TEXT,
    "toBranchId" TEXT NOT NULL,
    "fromRole" "user_role",
    "toRole" "user_role" NOT NULL,
    "transferDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_transfers_userId_idx" ON "employee_transfers"("userId");

-- CreateIndex
CREATE INDEX "employee_transfers_fromBranchId_idx" ON "employee_transfers"("fromBranchId");

-- CreateIndex
CREATE INDEX "employee_transfers_toBranchId_idx" ON "employee_transfers"("toBranchId");

-- CreateIndex
CREATE INDEX "employee_transfers_transferDate_idx" ON "employee_transfers"("transferDate");

-- AddForeignKey
ALTER TABLE "employee_transfers" ADD CONSTRAINT "employee_transfers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_transfers" ADD CONSTRAINT "employee_transfers_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_transfers" ADD CONSTRAINT "employee_transfers_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
