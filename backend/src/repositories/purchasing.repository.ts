import { PrismaClient, Prisma } from "../generated";
import { prisma as defaultPrisma } from "../lib/db";
import { sum } from "../utils/money";

export interface PurchasingFilterOptions {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  status?: string[];
}

export class PurchasingRepository {
  private db: PrismaClient;

  constructor(db: PrismaClient = defaultPrisma) {
    this.db = db;
  }

  /**
   * Get pending delivery count
   */
  async getPendingDeliveriesCount(): Promise<number> {
    return this.db.delivery.count({
      where: {
        status: { in: ["pending", "assigned", "in_transit"] },
      },
    });
  }

  /**
   * Get purchase order summary
   */
  async getPurchaseOrders(filters?: PurchasingFilterOptions) {
    const { startDate, endDate, branchId, status } = filters || {};

    return this.db.purchaseOrder.findMany({
      where: {
        ...(status && status.length > 0 ? { status: { in: status } } : {}),
        ...(branchId ? { branchId } : {}),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
    });
  }
}

export const purchasingRepository = new PurchasingRepository();
