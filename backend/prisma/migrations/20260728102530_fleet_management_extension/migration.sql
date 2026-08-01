-- AlterEnum
ALTER TYPE "delivery_status" ADD VALUE 'returned_to_base';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "sales_order_status" ADD VALUE 'DELIVERED';
ALTER TYPE "sales_order_status" ADD VALUE 'DELIVERY_FAILED';

-- AlterTable
ALTER TABLE "deliveries" ADD COLUMN     "deliveryOtp" TEXT,
ADD COLUMN     "podPhotoUrl" TEXT,
ADD COLUMN     "podSignatureUrl" TEXT,
ALTER COLUMN "destination" DROP NOT NULL;

-- AlterTable
ALTER TABLE "trucks" ADD COLUMN     "vehicle_type" TEXT;

-- CreateTable
CREATE TABLE "delivery_dispatch_notes" (
    "id" TEXT NOT NULL,
    "deliveryId" TEXT NOT NULL,
    "dispatchNoteId" TEXT NOT NULL,

    CONSTRAINT "delivery_dispatch_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "delivery_dispatch_notes_deliveryId_idx" ON "delivery_dispatch_notes"("deliveryId");

-- CreateIndex
CREATE INDEX "delivery_dispatch_notes_dispatchNoteId_idx" ON "delivery_dispatch_notes"("dispatchNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "delivery_dispatch_notes_deliveryId_dispatchNoteId_key" ON "delivery_dispatch_notes"("deliveryId", "dispatchNoteId");

-- AddForeignKey
ALTER TABLE "delivery_dispatch_notes" ADD CONSTRAINT "delivery_dispatch_notes_deliveryId_fkey" FOREIGN KEY ("deliveryId") REFERENCES "deliveries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_dispatch_notes" ADD CONSTRAINT "delivery_dispatch_notes_dispatchNoteId_fkey" FOREIGN KEY ("dispatchNoteId") REFERENCES "dispatch_notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
