/*
  Warnings:

  - The values [PENDING,IN_TRANSIT,COMPLETED,PENDING_RECEIPT] on the enum `transfer_status` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `attendantName` on the `stock_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `driverName` on the `stock_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `sourceId` on the `stock_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `stock_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `transferNo` on the `stock_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `truckRegNo` on the `stock_transfers` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `transfer_items` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[document_id]` on the table `stock_transfers` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `destinationWarehouseId` to the `stock_transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `document_id` to the `stock_transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sourceWarehouseId` to the `stock_transfers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `requested_qty` to the `transfer_items` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "transfer_status_new" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'DISPATCHED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'DISCREPANCY');
ALTER TABLE "public"."stock_transfers" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "stock_transfers" ALTER COLUMN "status" TYPE "transfer_status_new" USING ("status"::text::"transfer_status_new");
ALTER TYPE "transfer_status" RENAME TO "transfer_status_old";
ALTER TYPE "transfer_status_new" RENAME TO "transfer_status";
DROP TYPE "public"."transfer_status_old";
ALTER TABLE "stock_transfers" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- DropForeignKey
ALTER TABLE "stock_transfers" DROP CONSTRAINT "stock_transfers_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "stock_transfers" DROP CONSTRAINT "stock_transfers_targetId_fkey";

-- DropIndex
DROP INDEX "stock_transfers_sourceId_idx";

-- DropIndex
DROP INDEX "stock_transfers_targetId_idx";

-- DropIndex
DROP INDEX "stock_transfers_transferNo_key";

-- AlterTable
ALTER TABLE "stock_transfers" DROP COLUMN "attendantName",
DROP COLUMN "driverName",
DROP COLUMN "sourceId",
DROP COLUMN "targetId",
DROP COLUMN "transferNo",
DROP COLUMN "truckRegNo",
ADD COLUMN     "destinationWarehouseId" TEXT NOT NULL,
ADD COLUMN     "dispatchedAt" TIMESTAMP(3),
ADD COLUMN     "document_id" TEXT NOT NULL,
ADD COLUMN     "driverId" TEXT,
ADD COLUMN     "sourceWarehouseId" TEXT NOT NULL,
ADD COLUMN     "truckId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "transfer_items" DROP COLUMN "quantity",
ADD COLUMN     "batchId" TEXT,
ADD COLUMN     "damaged_qty" INTEGER,
ADD COLUMN     "dispatched_qty" INTEGER,
ADD COLUMN     "received_qty" INTEGER,
ADD COLUMN     "requested_qty" INTEGER NOT NULL,
ADD COLUMN     "unitCost" DECIMAL(19,2);

-- CreateIndex
CREATE UNIQUE INDEX "stock_transfers_document_id_key" ON "stock_transfers"("document_id");

-- CreateIndex
CREATE INDEX "stock_transfers_sourceWarehouseId_idx" ON "stock_transfers"("sourceWarehouseId");

-- CreateIndex
CREATE INDEX "stock_transfers_destinationWarehouseId_idx" ON "stock_transfers"("destinationWarehouseId");

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_sourceWarehouseId_fkey" FOREIGN KEY ("sourceWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destinationWarehouseId_fkey" FOREIGN KEY ("destinationWarehouseId") REFERENCES "warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "trucks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
