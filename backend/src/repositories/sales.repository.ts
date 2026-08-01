import { PrismaClient, Prisma } from "../generated";
import { prisma as defaultPrisma } from "../lib/db";
import { sum, multiply } from "../utils/money";

export interface SalesFilterOptions {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  status?: string[];
  limit?: number;
}

export class SalesRepository {
  private db: PrismaClient;

  constructor(db: PrismaClient = defaultPrisma) {
    this.db = db;
  }

  /**
   * Get total revenue within optional date range and branch filter
   */
  async getRevenue(filters?: SalesFilterOptions): Promise<number> {
    const { startDate, endDate, branchId, status = ["PAID", "PARTIALLY_PAID", "SENT"] } = filters || {};

    const where: Prisma.SalesDocumentWhereInput = {
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
    };

    const aggregate = await this.db.salesDocument.aggregate({
      where,
      _sum: {
        total: true,
      },
    });

    return sum(aggregate._sum.total);
  }

  /**
   * Get detailed sales aggregate totals (revenue, subtotal, tax, count)
   */
  async getSalesTotals(filters?: SalesFilterOptions) {
    const { startDate, endDate, branchId, status = ["PAID", "PARTIALLY_PAID", "SENT"] } = filters || {};

    const where: Prisma.SalesDocumentWhereInput = {
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
    };

    const aggregate = await this.db.salesDocument.aggregate({
      where,
      _sum: {
        total: true,
        subtotal: true,
        tax: true,
      },
      _count: true,
    });

    return {
      total: sum(aggregate._sum.total),
      subtotal: sum(aggregate._sum.subtotal),
      tax: sum(aggregate._sum.tax),
      count: aggregate._count || 0,
    };
  }

  /**
   * Get invoices / sales documents matching filters
   */
  async getInvoices(filters?: SalesFilterOptions) {
    const { startDate, endDate, branchId, status, limit = 50 } = filters || {};

    return this.db.salesDocument.findMany({
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
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        branch: true,
        items: true,
      },
    });
  }

  /**
   * Get top customers by total order spend
   */
  async getTopCustomers(filters?: SalesFilterOptions) {
    const { startDate, endDate, branchId, limit = 5 } = filters || {};

    const where: Prisma.SalesDocumentWhereInput = {
      status: { in: ["PAID", "PARTIALLY_PAID", "SENT"] },
      ...(branchId ? { branchId } : {}),
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    };

    const grouped = await this.db.salesDocument.groupBy({
      by: ["customerId"],
      where,
      _sum: {
        total: true,
      },
      _count: true,
      orderBy: {
        _sum: {
          total: "desc",
        },
      },
      take: limit,
    });

    const customerIds = grouped.map((g) => g.customerId).filter(Boolean) as string[];
    const customers = await this.db.customer.findMany({
      where: { id: { in: customerIds } },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c.name]));

    return grouped.map((g) => ({
      customerId: g.customerId,
      customerName: customerMap.get(g.customerId) || "Unknown Customer",
      totalSpent: sum(g._sum.total),
      ordersCount: g._count,
    }));
  }

  /**
   * Get top products by quantity sold
   */
  async getTopProducts(filters?: SalesFilterOptions) {
    const { startDate, endDate, branchId, limit = 5 } = filters || {};

    const where: Prisma.SalesDocumentItemWhereInput = {
      salesDocument: {
        status: { in: ["PAID", "PARTIALLY_PAID", "SENT"] },
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
    };

    const grouped = await this.db.salesDocumentItem.groupBy({
      by: ["productId"],
      where,
      _sum: {
        qty: true,
        subtotal: true,
      },
      orderBy: {
        _sum: {
          qty: "desc",
        },
      },
      take: limit,
    });

    const productIds = grouped.map((g) => g.productId).filter(Boolean) as string[];
    const products = await this.db.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p.name]));

    return grouped.map((g) => ({
      productId: g.productId,
      productName: productMap.get(g.productId) || "Unknown Product",
      quantitySold: g._sum.qty || 0,
      totalRevenue: sum(g._sum.subtotal),
    }));
  }

  /**
   * Get sales trend grouped by day or month
   */
  async getSalesTrend(filters?: SalesFilterOptions) {
    const { startDate, endDate, branchId } = filters || {};

    const docs = await this.db.salesDocument.findMany({
      where: {
        status: { in: ["PAID", "PARTIALLY_PAID", "SENT"] },
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
      select: {
        createdAt: true,
        total: true,
      },
      orderBy: { createdAt: "asc" },
    });

    const monthlyMap = new Map<string, number>();

    docs.forEach((doc) => {
      const monthKey = doc.createdAt.toISOString().substring(0, 7); // YYYY-MM
      const current = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, sum(current, doc.total));
    });

    return Array.from(monthlyMap.entries()).map(([period, amount]) => ({
      period,
      amount,
    }));
  }

  async findCustomerById(id: string) {
    return this.db.customer.findUnique({ where: { id } });
  }

  async findBranchById(id: string) {
    return this.db.branch.findUnique({ where: { id } });
  }

  async findProductById(id: string) {
    return this.db.product.findUnique({ where: { id } });
  }
}

export const salesRepository = new SalesRepository();
