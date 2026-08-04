-- CreateEnum
CREATE TYPE "dispatch_mode" AS ENUM ('RIDER', 'TRUCK');

-- AlterTable
ALTER TABLE "stock_transfers" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" TEXT,
ADD COLUMN     "dispatchMode" "dispatch_mode",
ADD COLUMN     "vehicleRegistration" TEXT;

-- CreateIndex
CREATE INDEX "stock_transfers_approvedById_idx" ON "stock_transfers"("approvedById");

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
