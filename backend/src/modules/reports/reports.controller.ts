import { Request, Response, NextFunction } from "express";
import { prisma } from "@core/database/prisma";
import { Prisma } from "../../generated";
import { AppError, ErrorCode } from "@core/errors/errors";
import { inventoryRepository } from "../../repositories/inventory.repository";
import { getMonthRange } from "../../utils/date";
import { sum, subtract, multiply, roundCurrency } from "../../utils/money";

type GroupBy = "day" | "week" | "month";

interface InventoryValueMetric {
  totalValue: number;
  totalBatches: number;
  totalQuantity: number;
}

interface MonthlyRevenueMetric {
  /** Values cover the requested date range; kept for existing API consumers. */
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossProfitMargin: number;
  orderCount: number;
}

interface TrendPoint {
  period: string;
  revenue: number;
  cogs: number;
  grossProfit: number;
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
  profitMargin: number;
  dispatchedAt: Date;
}

function queryString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function parseDateOnly(value: string | undefined, fallback: Date): Date {
  if (!value) {
    return new Date(Date.UTC(
      fallback.getFullYear(),
      fallback.getMonth(),
      fallback.getDate()
    ));
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AppError(
      ErrorCode.VALIDATION_ERROR,
      400,
      "Dates must use YYYY-MM-DD format"
    );
  }

  const parsed = new Date(value + "T00:00:00.000Z");
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Invalid report date");
  }
  return parsed;
}

function dateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function bucketStart(date: Date, groupBy: GroupBy): Date {
  const bucket = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));

  if (groupBy === "week") {
    const daysSinceMonday = (bucket.getUTCDay() + 6) % 7;
    bucket.setUTCDate(bucket.getUTCDate() - daysSinceMonday);
  } else if (groupBy === "month") {
    bucket.setUTCDate(1);
  }

  return bucket;
}

function nextBucket(date: Date, groupBy: GroupBy): Date {
  const next = new Date(date);
  if (groupBy === "day") next.setUTCDate(next.getUTCDate() + 1);
  else if (groupBy === "week") next.setUTCDate(next.getUTCDate() + 7);
  else next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

function inferGroupBy(startDate: Date, endDate: Date): GroupBy {
  const dayCount = Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  if (dayCount <= 45) return "day";
  if (dayCount <= 180) return "week";
  return "month";
}

/**
 * GET /v1/reports/financials
 * Returns a date-filtered sales summary, trend, inventory valuation, and
 * highest-margin dispatched orders. Branch access comes from RBAC middleware.
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
        "User not authenticated"
      );
    }

    if (req.onlyOwnedRecords) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Reports require branch or global access"
      );
    }

    const defaults = getMonthRange();
    const startDate = parseDateOnly(queryString(req.query.startDate), defaults.startDate);
    const endDate = parseDateOnly(queryString(req.query.endDate), defaults.endDate);
    const requestedBranchId = queryString(req.query.branchId);
    const requestedGroupBy = queryString(req.query.groupBy);

    if (endDate < startDate) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "End date must be on or after start date"
      );
    }

    const dayCount =
      Math.floor((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
    if (dayCount > 366) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Report date range cannot exceed 366 days"
      );
    }

    let groupBy: GroupBy;
    if (requestedGroupBy === "day" || requestedGroupBy === "week" || requestedGroupBy === "month") {
      groupBy = requestedGroupBy;
    } else if (requestedGroupBy) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "groupBy must be day, week, or month"
      );
    } else {
      groupBy = inferGroupBy(startDate, endDate);
    }

    const authorizedBranchIds = req.authorizedBranchIds ?? [];
    if (
      requestedBranchId &&
      authorizedBranchIds.length > 0 &&
      !authorizedBranchIds.includes(requestedBranchId)
    ) {
      throw new AppError(ErrorCode.FORBIDDEN, 403, "Branch access denied");
    }

    const branchIds = requestedBranchId
      ? [requestedBranchId]
      : authorizedBranchIds.length > 0
        ? authorizedBranchIds
        : undefined;
    const endExclusive = new Date(endDate.getTime() + 86_400_000);

    const dispatchWhere: Prisma.DispatchItemWhereInput = {
      createdAt: { gte: startDate, lt: endExclusive },
      ...(branchIds?.length
        ? {
            dispatchNote: {
              is: {
                salesOrder: {
                  is: {
                    branchId:
                      branchIds.length === 1
                        ? branchIds[0]
                        : { in: branchIds },
                  },
                },
              },
            },
          }
        : {}),
    };

    const [stockBatches, dispatchItems] = await Promise.all([
      inventoryRepository.getStockBatches(
        branchIds ? { branchIds } : undefined
      ),
      prisma.dispatchItem.findMany({
        where: dispatchWhere,
        select: {
          createdAt: true,
          qtyDispatched: true,
          totalCogs: true,
          soItem: {
            select: {
              unitPrice: true,
            },
          },
          dispatchNote: {
            select: {
              salesOrderId: true,
              dispatchedAt: true,
              salesOrder: {
                select: {
                  id: true,
                  soNumber: true,
                  customerId: true,
                  totalAmount: true,
                  customer: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    let totalInventoryValue = 0;
    let totalQuantity = 0;
    for (const batch of stockBatches) {
      totalInventoryValue = sum(
        totalInventoryValue,
        multiply(batch.currentQuantity, batch.unitCost)
      );
      totalQuantity += batch.currentQuantity;
    }

    const inventoryValue: InventoryValueMetric = {
      totalValue: roundCurrency(totalInventoryValue),
      totalBatches: stockBatches.length,
      totalQuantity,
    };

    let revenue = 0;
    let cogs = 0;
    const orderIds = new Set<string>();
    const trendBuckets = new Map<
      string,
      { revenue: number; cogs: number; orderIds: Set<string> }
    >();
    const orderTotals = new Map<
      string,
      {
        id: string;
        soNumber: string;
        customerId: string;
        customerName: string;
        totalAmount: number;
        revenue: number;
        cogs: number;
        dispatchedAt: Date;
      }
    >();

    for (const item of dispatchItems) {
      const order = item.dispatchNote.salesOrder;
      const lineRevenue = multiply(item.qtyDispatched, item.soItem.unitPrice);
      const lineCogs = Number(item.totalCogs);
      const orderId = item.dispatchNote.salesOrderId;
      const bucketKey = dateKey(bucketStart(item.createdAt, groupBy));

      revenue = sum(revenue, lineRevenue);
      cogs = sum(cogs, lineCogs);
      orderIds.add(orderId);

      const bucket = trendBuckets.get(bucketKey) ?? {
        revenue: 0,
        cogs: 0,
        orderIds: new Set<string>(),
      };
      bucket.revenue = sum(bucket.revenue, lineRevenue);
      bucket.cogs = sum(bucket.cogs, lineCogs);
      bucket.orderIds.add(orderId);
      trendBuckets.set(bucketKey, bucket);

      const orderTotal = orderTotals.get(orderId) ?? {
        id: order.id,
        soNumber: order.soNumber,
        customerId: order.customerId,
        customerName: order.customer.name,
        totalAmount: order.totalAmount,
        revenue: 0,
        cogs: 0,
        dispatchedAt: item.dispatchNote.dispatchedAt,
      };
      orderTotal.revenue = sum(orderTotal.revenue, lineRevenue);
      orderTotal.cogs = sum(orderTotal.cogs, lineCogs);
      if (item.dispatchNote.dispatchedAt > orderTotal.dispatchedAt) {
        orderTotal.dispatchedAt = item.dispatchNote.dispatchedAt;
      }
      orderTotals.set(orderId, orderTotal);
    }

    const monthlyRevenue: MonthlyRevenueMetric = {
      revenue: roundCurrency(revenue),
      cogs: roundCurrency(cogs),
      grossProfit: roundCurrency(subtract(revenue, cogs)),
      grossProfitMargin:
        revenue > 0 ? roundCurrency(((revenue - cogs) / revenue) * 100) : 0,
      orderCount: orderIds.size,
    };

    const trend: TrendPoint[] = [];
    const lastBucket = bucketStart(endDate, groupBy);
    for (
      let cursor = bucketStart(startDate, groupBy);
      cursor <= lastBucket;
      cursor = nextBucket(cursor, groupBy)
    ) {
      const period = dateKey(cursor);
      const bucket = trendBuckets.get(period);
      const periodRevenue = bucket?.revenue ?? 0;
      const periodCogs = bucket?.cogs ?? 0;
      trend.push({
        period,
        revenue: roundCurrency(periodRevenue),
        cogs: roundCurrency(periodCogs),
        grossProfit: roundCurrency(subtract(periodRevenue, periodCogs)),
        orderCount: bucket?.orderIds.size ?? 0,
      });
    }

    const highMarginOrders: HighMarginOrder[] = [...orderTotals.values()]
      .map((order) => ({
        ...order,
        revenue: roundCurrency(order.revenue),
        cogs: roundCurrency(order.cogs),
        profitAmount: roundCurrency(subtract(order.revenue, order.cogs)),
        profitMargin:
          order.revenue > 0
            ? roundCurrency(
                ((order.revenue - order.cogs) / order.revenue) * 100
              )
            : 0,
      }))
      .sort(
        (left, right) =>
          right.profitMargin - left.profitMargin ||
          right.profitAmount - left.profitAmount
      )
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        filters: {
          startDate: dateKey(startDate),
          endDate: dateKey(endDate),
          branchId: branchIds?.length === 1 ? branchIds[0] : null,
          groupBy,
        },
        inventoryValue,
        monthlyRevenue,
        trend,
        highMarginOrders,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
}
