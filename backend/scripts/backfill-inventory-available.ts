/**
 * One-time backfill for the receiveGoods bug where `Inventory.available`
 * was never kept in sync with `Inventory.quantity` (stuck at its default
 * of 0 for anything received via a Purchase Order / GRN).
 *
 * This script:
 *   1. Recomputes `available = quantity - reserved` (clamped at 0) for
 *      every Inventory row, and fixes `status` to match.
 *   2. Re-syncs BranchInventory from the corrected Inventory rows so the
 *      Products/Inventory pages and POS agree again.
 *
 * Run with:
 *   cd backend
 *   npx ts-node scripts/backfill-inventory-available.ts
 *
 * (If ts-node isn't installed: npm install -D ts-node, or compile with tsc
 * and run the resulting .js with node.)
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";
import { synchronizeBranchInventoryForWarehouse } from "../src/lib/inventory-sync";

async function main() {
  const allInventory = await prisma.inventory.findMany();

  console.log(`Found ${allInventory.length} inventory rows to check.`);

  let fixedCount = 0;

  for (const inv of allInventory) {
    const correctAvailable = Math.max(0, inv.quantity - inv.reserved);

    if (correctAvailable !== inv.available) {
      const reorderLevel = 10; // matches the default used elsewhere in Inventory logic
      const status =
        correctAvailable <= 0
          ? "out_of_stock"
          : inv.quantity < reorderLevel
            ? "low_stock"
            : "in_stock";

      await prisma.inventory.update({
        where: { id: inv.id },
        data: {
          available: correctAvailable,
          status: status as any,
        },
      });

      fixedCount++;
      console.log(
        `Fixed inventory ${inv.id} (product ${inv.productId}, warehouse ${inv.warehouseId}): available ${inv.available} -> ${correctAvailable}`,
      );
    }
  }

  console.log(`Corrected ${fixedCount} Inventory rows. Re-syncing BranchInventory...`);

  // Re-sync BranchInventory for every distinct (product, warehouse) pair so
  // the branch-level read model reflects the corrected warehouse data.
  const distinctPairs = await prisma.inventory.findMany({
    select: { productId: true, warehouseId: true },
    distinct: ["productId", "warehouseId"],
  });

  await prisma.$transaction(async (tx) => {
    for (const pair of distinctPairs) {
      await synchronizeBranchInventoryForWarehouse(
        tx,
        pair.productId,
        pair.warehouseId,
      );
    }
  });

  console.log(`Re-synced BranchInventory for ${distinctPairs.length} product/warehouse pairs.`);
  console.log("Done.");
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
