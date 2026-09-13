/*
  Warnings:

  - A unique constraint covering the columns `[upc]` on the table `products` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('physical', 'digital', 'service');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('active', 'inactive', 'discontinued');

-- DropIndex
DROP INDEX "products_barcode_key";

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "dimension_unit" TEXT DEFAULT 'cm',
ADD COLUMN     "height" DOUBLE PRECISION,
ADD COLUMN     "image_url" TEXT,
ADD COLUMN     "lead_time_days" INTEGER,
ADD COLUMN     "length" DOUBLE PRECISION,
ADD COLUMN     "product_type" "product_type" NOT NULL DEFAULT 'physical',
ADD COLUMN     "reorder_quantity" INTEGER NOT NULL DEFAULT 20,
ADD COLUMN     "status" "product_status" NOT NULL DEFAULT 'active',
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "supplier_name" TEXT,
ADD COLUMN     "supplier_part_number" TEXT,
ADD COLUMN     "unit_of_measurement" TEXT NOT NULL DEFAULT 'pcs',
ADD COLUMN     "upc" TEXT,
ADD COLUMN     "weight" DOUBLE PRECISION,
ADD COLUMN     "weight_unit" TEXT DEFAULT 'kg',
ADD COLUMN     "width" DOUBLE PRECISION;

-- CreateIndex
CREATE UNIQUE INDEX "products_upc_key" ON "products"("upc");

-- CreateIndex
CREATE INDEX "products_upc_idx" ON "products"("upc");

-- CreateIndex
CREATE INDEX "products_category_idx" ON "products"("category");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");
