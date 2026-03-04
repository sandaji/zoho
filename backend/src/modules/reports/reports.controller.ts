import { Request, Response, NextFunction } from 'express';
import { Prisma, PrismaClient } from '@prisma/client';
import { AppError, ErrorCode } from '../../lib/errors.js';

const prisma = new PrismaClient();

/**
 * Financial Report Types
 */
interface InventoryValueMetric {
  totalValue: Prisma.Decimal;
  totalBatches: number;
  totalQuantity: number;
}

interface MonthlyRevenueMetric {
  revenue: Prisma.Decimal;
  cogs: Prisma.Decimal;
  grossProfit: Prisma.Decimal;
  grossProfitMargin: number; // percentage
  orderCount: number;
}

interface HighMarginOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: Prisma.Decimal;
  cogs: Prisma.Decimal;
  revenue: Prisma.Decimal;
  profitAmount: Prisma.Decimal;
  profitMargin: number; // percentage
  dispatchedAt: Date;
}

interface FinancialReportResponse {
  inventoryValue: InventoryValueMetric;
  monthlyRevenue: MonthlyRevenueMetric;
  highMarginOrders: HighMarginOrder[];
  generatedAt: Date;
}

/**
 * GET /v1/reports/financials
 * Returns comprehensive financial metrics for the dashboard
 * Requires admin or manager role
 */
export async function getFinancialReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        'User not authenticated',
        ErrorCode.UNAUTHORIZED
      );
    }

    // Use transaction for performance and consistency
    const report = await prisma.$transaction(async (tx) => {
      // ========================================
      // 1. INVENTORY VALUE (Current Stock)
      // ========================================
      const stockBatches = await tx.stockBatch.findMany({
        where: {
          isDepleted: false,
        },
        select: {
          id: true,
          currentQuantity: true,
          unitCost: true,
        },
      });

      let totalInventoryValue = new Prisma.Decimal(0);
      for (const batch of stockBatches) {
        const batchValue = new Prisma.Decimal(batch.currentQuantity.toString())
          .mul(batch.unitCost);
        totalInventoryValue = totalInventoryValue.add(batchValue);
      }

      const inventoryValue: InventoryValueMetric = {
        totalValue: totalInventoryValue,
        totalBatches: stockBatches.length,
        totalQuantity: stockBatches.reduce(
          (sum, batch) => sum + batch.currentQuantity,
          0
        ),
      };

      // ========================================
      // 2. CURRENT MONTH REVENUE & COGS
      // ========================================
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

      // Query dispatch items created this month with their associated sales order items
      const currentMonthDispatches = await tx.dispatchItem.findMany({
        where: {
          createdAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        include: {
          soItem: true,
          dispatchNote: {
            include: {
              salesOrder: true,
            },
          },
        },
      });

      let monthlyRevenue = new Prisma.Decimal(0);
      let monthlyCogs = new Prisma.Decimal(0);

      for (const dispatchItem of currentMonthDispatches) {
        // Revenue: qty dispatched * unit price
        const lineRevenue = new Prisma.Decimal(dispatchItem.qtyDispatched.toString())
          .mul(dispatchItem.soItem.unitPrice);
        monthlyRevenue = monthlyRevenue.add(lineRevenue);

        // COGS already precise from FIFO depletion
        monthlyCogs = monthlyCogs.add(dispatchItem.totalCogs);
      }

      const monthlyGrossProfit = monthlyRevenue.sub(monthlyCogs);
      const monthlyGrossProfitMargin =
        monthlyRevenue.toNumber() > 0
          ? (monthlyGrossProfit.toNumber() / monthlyRevenue.toNumber()) * 100
          : 0;

      // Count unique orders dispatched this month
      const uniqueOrders = new Set(
        currentMonthDispatches
          .map((d) => d.dispatchNote.salesOrderId)
      );

      const monthlyMetrics: MonthlyRevenueMetric = {
        revenue: monthlyRevenue,
        cogs: monthlyCogs,
        grossProfit: monthlyGrossProfit,
        grossProfitMargin: monthlyGrossProfitMargin,
        orderCount: uniqueOrders.size,
      };

      // ========================================
      // 3. HIGH-MARGIN ORDERS (Last 5)
      // ========================================
      const recentDispatches = await tx.dispatchNote.findMany({
        orderBy: {
          dispatchedAt: 'desc',
        },
        take: 5,
        include: {
          items: true,
          salesOrder: {
            include: {
              customer: true,
            },
          },
        },
      });

      const highMarginOrders: HighMarginOrder[] = [];

      for (const dispatchNote of recentDispatches) {
        let orderRevenue = new Prisma.Decimal(0);
        let orderCogs = new Prisma.Decimal(0);

        for (const dispatchItem of dispatchNote.items) {
          const itemRevenue = new Prisma.Decimal(
            dispatchItem.qtyDispatched.toString()
          ).mul(
            // Need SOItem to get unitPrice - fetch it
            await tx.soItem.findUnique({
              where: { id: dispatchItem.soItemId },
              select: { unitPrice: true },
            }).then(item => item?.unitPrice || 0)
          );

          orderRevenue = orderRevenue.add(itemRevenue);
          orderCogs = orderCogs.add(dispatchItem.totalCogs);
        }

        const orderProfit = orderRevenue.sub(orderCogs);
        const profitMargin =
          orderRevenue.toNumber() > 0
            ? (orderProfit.toNumber() / orderRevenue.toNumber()) * 100
            : 0;

        highMarginOrders.push({
          id: dispatchNote.salesOrder.id,
          soNumber: dispatchNote.salesOrder.soNumber,
          customerId: dispatchNote.salesOrder.customerId,
          customerName: dispatchNote.salesOrder.customer.name,
          totalAmount: dispatchNote.salesOrder.totalAmount as Prisma.Decimal,
          cogs: orderCogs,
          revenue: orderRevenue,
          profitAmount: orderProfit,
          profitMargin,
          dispatchedAt: dispatchNote.dispatchedAt,
        });
      }

      // Sort by profit margin descending
      highMarginOrders.sort((a, b) => b.profitMargin - a.profitMargin);

      return {
        inventoryValue,
        monthlyRevenue: monthlyMetrics,
        highMarginOrders: highMarginOrders.slice(0, 5),
        generatedAt: new Date(),
      };
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    next(error);
  }
}

export default { getFinancialReport };
