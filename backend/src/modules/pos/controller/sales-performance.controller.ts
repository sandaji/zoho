/**
 * SalesPerformanceController
 *
 * GET /sales-documents/performance
 *
 * Returns aggregated sales statistics for the dashboard:
 *   - By item (top products by revenue and quantity)
 *   - By day (daily revenue trend for the selected period)
 *   - By salesman prefix (revenue grouped by user salesPrefix)
 *
 * Query params:
 *   branchId   - filter to one branch (omit for all branches if admin)
 *   startDate  - ISO date string (defaults to 30 days ago)
 *   endDate    - ISO date string (defaults to today)
 *   limit      - max items per group (default 10)
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../../lib/db';
import { AppError, ErrorCode } from '../../../lib/errors';
import { SalesDocumentType, SalesDocumentStatus } from '../../../generated';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SalesPerformanceData {
  period: { startDate: string; endDate: string; days: number };
  summary: {
    totalRevenue:     number;
    totalTax:         number;
    totalDiscount:    number;
    totalOrders:      number;
    avgOrderValue:    number;
  };
  byItem: {
    productId:    string;
    sku:          string;
    name:         string;
    totalQty:     number;
    totalRevenue: number;
    orderCount:   number;
  }[];
  byDay: {
    date:         string;
    revenue:      number;
    orderCount:   number;
    avgOrderValue: number;
  }[];
  bySalesman: {
    userId:       string;
    name:         string;
    salesPrefix:  string | null;
    totalRevenue: number;
    orderCount:   number;
    avgOrderValue: number;
  }[];
}

// ── Controller ────────────────────────────────────────────────────────────────

export class SalesPerformanceController {

  async getSalesPerformance(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) throw new AppError(ErrorCode.UNAUTHORIZED, 401, 'Not authenticated');

      // ── Parse query params ──
      const branchId  = req.query.branchId as string | undefined;
      const limitRaw  = parseInt(req.query.limit as string ?? '10', 10);
      const limit     = isNaN(limitRaw) ? 10 : Math.min(limitRaw, 50);

      const endDate   = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();
      endDate.setHours(23, 59, 59, 999);

      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      startDate.setHours(0, 0, 0, 0);

      const days = Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));

      // ── Scope filter ──
      const baseWhere: any = {
        type:      SalesDocumentType.INVOICE,
        status:    SalesDocumentStatus.PAID,
        issueDate: { gte: startDate, lte: endDate },
        ...(branchId ? { branchId } : {}),
      };

      // ── Parallel queries ──
      const [documents, itemAggRaw, salespersonRaw] = await Promise.all([

        // 1. All matching documents for day aggregation
        prisma.salesDocument.findMany({
          where: baseWhere,
          select: {
            total:    true,
            tax:      true,
            discount: true,
            issueDate: true,
            createdById: true,
          },
          orderBy: { issueDate: 'asc' },
        }),

        // 2. Item-level aggregation
        prisma.salesDocumentItem.findMany({
          where: {
            salesDocument: baseWhere,
          },
          select: {
            quantity:  true,
            total:     true,
            productId: true,
            product:   { select: { name: true, sku: true } },
            salesDocumentId: true,
          },
        }),

        // 3. Salesperson aggregation
        prisma.salesDocument.groupBy({
          by:     ['createdById'],
          where:  baseWhere,
          _sum:   { total: true },
          _count: { id: true },
        }),

      ]);

      // ── Summary ──
      const totalRevenue  = documents.reduce((s, d) => s + d.total, 0);
      const totalTax      = documents.reduce((s, d) => s + d.tax, 0);
      const totalDiscount = documents.reduce((s, d) => s + d.discount, 0);
      const totalOrders   = documents.length;
      const avgOrderValue = totalOrders ? totalRevenue / totalOrders : 0;

      // ── By item ──
      const itemMap = new Map<string, {
        productId: string; sku: string; name: string;
        totalQty: number; totalRevenue: number; docIds: Set<string>;
      }>();

      for (const row of itemAggRaw) {
        const existing = itemMap.get(row.productId);
        if (existing) {
          existing.totalQty     += row.quantity;
          existing.totalRevenue += row.total;
          existing.docIds.add(row.salesDocumentId);
        } else {
          itemMap.set(row.productId, {
            productId:    row.productId,
            sku:          row.product.sku,
            name:         row.product.name,
            totalQty:     row.quantity,
            totalRevenue: row.total,
            docIds:       new Set([row.salesDocumentId]),
          });
        }
      }

      const byItem = Array.from(itemMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit)
        .map(({ docIds, ...rest }) => ({ ...rest, orderCount: docIds.size }));

      // ── By day ──
      const dayMap = new Map<string, { revenue: number; orderCount: number }>();
      for (const doc of documents) {
        const key = doc.issueDate.toISOString().split('T')[0]!;
        const entry = dayMap.get(key) ?? { revenue: 0, orderCount: 0 };
        entry.revenue    += doc.total;
        entry.orderCount += 1;
        dayMap.set(key, entry);
      }

      const byDay = Array.from(dayMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, { revenue, orderCount }]) => ({
          date,
          revenue,
          orderCount,
          avgOrderValue: orderCount ? revenue / orderCount : 0,
        }));

      // ── By salesman ──
      // Fetch user details for the grouped userIds
      const userIds = salespersonRaw.map(r => r.createdById);
      const users   = await prisma.user.findMany({
        where:  { id: { in: userIds } },
        select: { id: true, name: true, salesPrefix: true },
      });
      const userById = Object.fromEntries(users.map(u => [u.id, u]));

      const bySalesman = salespersonRaw
        .map(row => ({
          userId:        row.createdById,
          name:          userById[row.createdById]?.name ?? 'Unknown',
          salesPrefix:   userById[row.createdById]?.salesPrefix ?? null,
          totalRevenue:  row._sum.total ?? 0,
          orderCount:    row._count.id,
          avgOrderValue: row._count.id ? (row._sum.total ?? 0) / row._count.id : 0,
        }))
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, limit);

      const response: SalesPerformanceData = {
        period:    { startDate: startDate.toISOString(), endDate: endDate.toISOString(), days },
        summary:   { totalRevenue, totalTax, totalDiscount, totalOrders, avgOrderValue },
        byItem,
        byDay,
        bySalesman,
      };

      res.json({ success: true, data: response });
    } catch (err) {
      next(err);
    }
  }
}
