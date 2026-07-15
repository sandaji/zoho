import { InventoryStatus, type Prisma } from "../generated";

/**
 * Keeps the branch-level inventory projection aligned with the sum of its
 * warehouse records. Warehouse inventory is the operational source of truth
 * used by POS; BranchInventory is the branch-facing read model used by the
 * products screens.
 */
export async function synchronizeBranchInventory(
  tx: Prisma.TransactionClient,
  productId: string,
  branchId: string,
) {
  const [totals, existing] = await Promise.all([
    tx.inventory.aggregate({
      where: { productId, warehouse: { branchId } },
      _sum: { quantity: true, reserved: true, available: true },
    }),
    tx.branchInventory.findUnique({
      where: { productId_branchId: { productId, branchId } },
    }),
  ]);

  const quantity = totals._sum.quantity ?? 0;
  const reserved = totals._sum.reserved ?? 0;
  const available = totals._sum.available ?? 0;
  const reorderLevel = existing?.reorder_level ?? 10;
  const status = available <= 0
    ? InventoryStatus.out_of_stock
    : quantity < reorderLevel
      ? InventoryStatus.low_stock
      : InventoryStatus.in_stock;

  return tx.branchInventory.upsert({
    where: { productId_branchId: { productId, branchId } },
    create: {
      productId,
      branchId,
      quantity,
      reserved,
      available,
      status,
      reorder_level: reorderLevel,
      reorder_quantity: existing?.reorder_quantity ?? 20,
      last_counted: new Date(),
    },
    update: { quantity, reserved, available, status, last_counted: new Date() },
  });
}

export async function synchronizeBranchInventoryForWarehouse(
  tx: Prisma.TransactionClient,
  productId: string,
  warehouseId: string,
) {
  const warehouse = await tx.warehouse.findUnique({
    where: { id: warehouseId },
    select: { branchId: true },
  });

  if (!warehouse) throw new Error(`Warehouse ${warehouseId} not found while synchronizing inventory`);
  return synchronizeBranchInventory(tx, productId, warehouse.branchId);
}
