import { PrismaClient, Prisma } from "../generated";
import { prisma as defaultPrisma } from "../lib/db";
import { sum, multiply } from "../utils/money";

export interface InventoryFilterOptions {
  branchId?: string;
}

export class InventoryRepository {
  private db: PrismaClient;

  constructor(db: PrismaClient = defaultPrisma) {
    this.db = db;
  }

  /**
   * Get total inventory valuation from non-depleted stock batches
   */
  async getInventoryValue(filters?: InventoryFilterOptions): Promise<number> {
    const batches = await this.db.stockBatch.findMany({
      where: {
        isDepleted: false,
      },
      select: {
        currentQuantity: true,
        unitCost: true,
      },
    });

    const total = batches.reduce((acc, batch) => {
      const batchValue = multiply(batch.currentQuantity, batch.unitCost);
      return sum(acc, batchValue);
    }, 0);

    return total;
  }

  /**
   * Get count of low stock items across active products / branch inventory
   */
  async getLowStockItemsCount(filters?: InventoryFilterOptions): Promise<number> {
    try {
      const result = await this.db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT bi."productId")::bigint as count
        FROM branch_inventory bi
        JOIN products p ON p.id = bi."productId"
        WHERE p."isActive" = true
          AND p.status = 'active'
          AND bi.quantity < bi.reorder_level
          ${filters?.branchId ? Prisma.sql`AND bi."branchId" = ${filters.branchId}` : Prisma.empty}
      `;

      return Number(result[0]?.count || 0);
    } catch {
      // Fallback query if raw query fails
      return this.db.branchInventory.count({
        where: {
          status: "low_stock",
          ...(filters?.branchId ? { branchId: filters.branchId } : {}),
        },
      });
    }
  }

  /**
   * Get count of active products
   */
  async getActiveProductsCount(): Promise<number> {
    return this.db.product.count({
      where: {
        isActive: true,
        status: "active",
      },
    });
  }

  /**
   * Get count of active warehouses
   */
  async getWarehousesCount(filters?: InventoryFilterOptions): Promise<number> {
    return this.db.warehouse.count({
      where: {
        isActive: true,
        ...(filters?.branchId ? { branchId: filters.branchId } : {}),
      },
    });
  }

  /**
   * Get active stock batches with batch stats
   */
  async getStockBatches() {
    return this.db.stockBatch.findMany({
      where: { isDepleted: false },
      select: {
        id: true,
        currentQuantity: true,
        unitCost: true,
      },
    });
  }
}

export const inventoryRepository = new InventoryRepository();
