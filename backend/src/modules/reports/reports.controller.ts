import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../lib/prisma';
import { Prisma } from '../../generated';
import { AppError, ErrorCode } from '../../lib/errors';
import { dashboardMetricsService } from '../../services/dashboard-metrics.service';
import { inventoryRepository } from '../../repositories/inventory.repository';
import { getMonthRange } from '../../utils/date';
import { sum, subtract, multiply, roundCurrency } from '../../utils/money';

/**
 * Financial Report Types
 */
interface InventoryValueMetric {
  totalValue: number;
  totalBatches: number;
  totalQuantity: number;
}

interface MonthlyRevenueMetric {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossProfitMargin: number; // percentage
  orderCount: number;
}

interface HighMarginOrder {
  id: string;
  soNumber: string;
  customerId: string;
  customerName: string;
  totalAmount: number;
  cogs: number;
  revenue: number;
  profitAmount: number;
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
 * Returns comprehensive financial metrics for the dashboard using DashboardMetricsService & Repositories
 */
export async function getFinancialReport(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new AppError(
        ErrorCode.UNAUTHORIZED,
        401,
        'User not authenticated'
      );
    }

    const monthRange = getMonthRange();

    const [stockBatches, currentMonthDispatches] = await Promise.all([
      inventoryRepository.getStockBatches(),
      prisma.dispatchItem.findMany({
        where: {
          createdAt: {
            gte: monthRange.startDate,
            lte: monthRange.endDate,
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
      }),
    ]);

    let totalInventoryValue = 0;
    let totalQuantity = 0;
    for (const batch of stockBatches) {
      const batchValue = multiply(batch.currentQuantity, batch.unitCost);
      totalInventoryValue = sum(totalInventoryValue, batchValue);
      totalQuantity += batch.currentQuantity;
    }

    const inventoryValue: InventoryValueMetric = {
      totalValue: totalInventoryValue,
      totalBatches: stockBatches.length,
      totalQuantity,
    };

    let monthlyRevenue = 0;
    let monthlyCogs = 0;

    for (const dispatchItem of currentMonthDispatches) {
      const lineRevenue = multiply(dispatchItem.qtyDispatched, dispatchItem.soItem.unitPrice);
      monthlyRevenue = sum(monthlyRevenue, lineRevenue);
      monthlyCogs = sum(monthlyCogs, dispatchItem.totalCogs);
    }

    const monthlyGrossProfit = subtract(monthlyRevenue, monthlyCogs);
    const monthlyGrossProfitMargin =
      monthlyRevenue > 0
        ? roundCurrency((monthlyGrossProfit / monthlyRevenue) * 100)
        : 0;

    const uniqueOrders = new Set(
      currentMonthDispatches.map((d: any) => d.dispatchNote.salesOrderId)
    );

    const monthlyMetrics: MonthlyRevenueMetric = {
      revenue: monthlyRevenue,
      cogs: monthlyCogs,
      grossProfit: monthlyGrossProfit,
      grossProfitMargin: monthlyGrossProfitMargin,
      orderCount: uniqueOrders.size,
    };

    const response: FinancialReportResponse = {
      inventoryValue,
      monthlyRevenue: monthlyMetrics,
      highMarginOrders: [],
      generatedAt: new Date(),
    };

    res.status(200).json({
      success: true,
      data: response,
    });
  } catch (error) {
    next(error);
  }
}
