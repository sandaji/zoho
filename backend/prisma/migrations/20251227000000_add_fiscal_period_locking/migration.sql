-- AlterTable
ALTER TABLE "fiscal_periods" ADD COLUMN "isLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedById" TEXT;

-- CreateIndex
CREATE INDEX "fiscal_periods_lockedById_idx" ON "fiscal_periods"("lockedById");

-- AddForeignKey
ALTER TABLE "fiscal_periods" ADD CONSTRAINT "fiscal_periods_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
