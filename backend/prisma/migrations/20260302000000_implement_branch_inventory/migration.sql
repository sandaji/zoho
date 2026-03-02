-- CreateBranchInventory table for multi-branch inventory management
CREATE TABLE "branch_inventory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reorder_level" INTEGER NOT NULL DEFAULT 10,
    "reorder_quantity" INTEGER NOT NULL DEFAULT 20,
    "reserved" INTEGER NOT NULL DEFAULT 0,
    "available" INTEGER NOT NULL DEFAULT 0,
    "status" "inventory_status" NOT NULL DEFAULT 'in_stock',
    "local_price" DOUBLE PRECISION,
    "bin_location" TEXT,
    "last_counted" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "branch_inventory_pkey" PRIMARY KEY ("id")
);

-- Migrate existing product quantities to BranchInventory
-- For each product with a branchId, create a BranchInventory record
INSERT INTO "branch_inventory" (
    "id",
    "productId",
    "branchId",
    "quantity",
    "reorder_level",
    "reorder_quantity",
    "reserved",
    "available",
    "status",
    "bin_location",
    "createdAt",
    "updatedAt"
)
SELECT
    concat('bi_', gen_random_uuid()::text),
    "id" as "productId",
    COALESCE("branchId", (SELECT "id" FROM "branches" ORDER BY "createdAt" ASC LIMIT 1)) as "branchId",
    "quantity",
    "reorder_level",
    "reorder_quantity",
    0 as "reserved",
    "quantity" as "available",
    'in_stock'::"inventory_status" as "status",
    NULL as "bin_location",
    "createdAt",
    "updatedAt"
FROM "products"
WHERE "isActive" = true;

-- Add foreign key constraints
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "branch_inventory" ADD CONSTRAINT "branch_inventory_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create unique constraint to ensure one inventory record per product per branch
CREATE UNIQUE INDEX "branch_inventory_productId_branchId_key" ON "branch_inventory"("productId", "branchId");

-- Create indexes for performance
CREATE INDEX "branch_inventory_productId_idx" ON "branch_inventory"("productId");
CREATE INDEX "branch_inventory_branchId_idx" ON "branch_inventory"("branchId");
CREATE INDEX "branch_inventory_status_idx" ON "branch_inventory"("status");

-- Drop the branchId column from products (no longer needed)
ALTER TABLE "products" DROP CONSTRAINT IF EXISTS "products_branchId_fkey";
ALTER TABLE "products" DROP COLUMN IF EXISTS "branchId";

-- Drop the inventory columns from products table (they now live in BranchInventory)
ALTER TABLE "products" DROP COLUMN IF EXISTS "quantity";
ALTER TABLE "products" DROP COLUMN IF EXISTS "reorder_level";
ALTER TABLE "products" DROP COLUMN IF EXISTS "reorder_quantity";
