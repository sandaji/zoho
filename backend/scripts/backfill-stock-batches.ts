/**
 * One-time backfill for the "Insufficient stock: ... available 0" bug.
 *
 * Root cause: createProduct() and bulkImportProducts() in
 * ProductService both wrote initial stock straight into `Inventory`
 * (quantity/available), which is what the Products and Inventory pages
 * read — so those pages always looked correct. But POS sales deplete
 * stock via InventoryService.depleteStockFIFO(), which checks
 * `StockBatch` rows, not `Inventory.quantity`. Neither of those two
 * product-creation paths ever created a StockBatch, so any product
 * added with initial stock (via "Add Product" or "Import Products")
 * had real Inventory quantity but zero cost lots — the first sale of
 * that product always failed FIFO depletion with "available 0", no
 * matter how much stock the UI showed.
 *
 * That gap is now fixed going forward (both paths call
 * InventoryService.receiveStock, which creates the missing StockBatch).
 * This script is the retroactive fix: for every Inventory row with
 * quantity > 0 that doesn't already have enough StockBatch coverage,
 * it creates a compensating StockBatch for the shortfall.
 *
 * Cost caveat: for genuinely GRN-received stock this would already have
 * a batch and won't be touched. For the affected rows (no batch at
 * all), there's no historical unit cost to recover, so this uses each
 * product's current `cost_price` as the batch's unitCost — the same
 * assumption the (now-fixed) buggy code implicitly made. If a
 * product's cost_price has changed since it was imported, its FIFO
 * COGS from this point on will use the current price, not the
 * original import-time price. Review results before running for real,
 * or run with --dry-run first.
 *
 * Run with:
 *   cd backend
 *   npx tsx scripts/backfill-stock-batches.ts --dry-run   # preview only
 *   npx tsx scripts/backfill-stock-batches.ts              # apply
 */
import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  const inventoryRows = await prisma.inventory.findMany({
    where: { quantity: { gt: 0 } },
    include: { product: { select: { id: true, sku: true, name: true, cost_price: true } } },
  });

  console.log(
    `Found ${inventoryRows.length} Inventory rows with quantity > 0 to check.${dryRun ? " (dry run — no writes)" : ""}`,
  );

  let fixedCount = 0;
  let skippedCount = 0;

  for (const inv of inventoryRows) {
    const batches = await prisma.stockBatch.findMany({
      where: { productId: inv.productId, warehouseId: inv.warehouseId, isDepleted: false },
      select: { currentQuantity: true },
    });
    const batchTotal = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
    const shortfall = inv.quantity - batchTotal;

    if (shortfall <= 0) {
      skippedCount++;
      continue;
    }

    console.log(
      `${dryRun ? "[DRY RUN] Would create" : "Creating"} StockBatch for product ${inv.product.sku} (${inv.product.name}) in warehouse ${inv.warehouseId}: ` +
        `Inventory.quantity=${inv.quantity}, existing batch coverage=${batchTotal}, shortfall=${shortfall}, unitCost=${inv.product.cost_price} (current cost_price)`,
    );

    if (!dryRun) {
      await prisma.stockBatch.create({
        data: {
          productId: inv.productId,
          warehouseId: inv.warehouseId,
          initialQuantity: shortfall,
          currentQuantity: shortfall,
          unitCost: inv.product.cost_price,
          receivedAt: new Date(),
          isDepleted: false,
        },
      });
    }

    fixedCount++;
  }

  console.log(
    `${dryRun ? "Would fix" : "Fixed"} ${fixedCount} product/warehouse pairs. Skipped ${skippedCount} (already had sufficient batch coverage).`,
  );
  if (dryRun) {
    console.log("Re-run without --dry-run to apply these changes.");
  }
}

main()
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
