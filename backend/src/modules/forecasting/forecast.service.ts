import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";

/**
 * Demand forecasting + reorder planning (Phase 12).
 *
 * Method (deliberately simple and explainable):
 *  - Daily demand = 0.6 * (units sold in last 28 days / 28) + 0.4 * (units sold in last 90 days / 90).
 *    Recent sales weigh more, but the longer window damps one-off spikes.
 *  - Variability = std-dev of weekly demand over the last 12 weeks -> safety stock
 *    = z * sigma_daily * sqrt(lead time), z = 1.65 (~95% service level).
 *  - Reorder point = daily * lead time + safety stock.
 *  - Suggested order = daily * (lead time + cover days) + safety - (stock on hand + on order),
 *    never negative.
 * Stock is summed across all warehouses; "on order" is open PO lines plus
 * submitted/approved requisition lines not yet converted.
 */

const SALE_TYPES = ["OPEN_INVOICE", "CLOSED_INVOICE", "INVOICE"] as const;
const EXCLUDED_STATUS = ["VOID", "DRAFT", "PARKED", "HELD"] as const;
const DAY = 86400000;
const Z = 1.65;
const DEFAULT_LEAD_DAYS = 7;

export type Urgency = "STOCKOUT" | "CRITICAL" | "REORDER" | "OK" | "OVERSTOCK" | "NO_DEMAND";

export interface ForecastRow {
  productId: string;
  sku: string;
  name: string;
  category: string | null;
  vendorId: string | null;
  costPrice: number;
  onHand: number;
  onOrder: number;
  sold28: number;
  sold90: number;
  dailyDemand: number;
  forecastNext30: number;
  leadTimeDays: number;
  safetyStock: number;
  reorderPoint: number;
  daysOfCover: number | null;
  suggestedQty: number;
  suggestedCost: number;
  trend: "UP" | "DOWN" | "FLAT";
  urgency: Urgency;
}

export interface ForecastOptions {
  coverDays?: number; // how many days of demand to cover beyond lead time (default 30)
  category?: string;
  onlyActionable?: boolean;
  search?: string;
}

const r2 = (n: number) => Math.round(n * 100) / 100;

export class ForecastService {
  async compute(opts: ForecastOptions = {}): Promise<{ generatedAt: string; coverDays: number; rows: ForecastRow[]; summary: Record<string, number> }> {
    const coverDays = Math.min(Math.max(Math.round(opts.coverDays ?? 30), 1), 365);
    const now = Date.now();
    const since90 = new Date(now - 90 * DAY);

    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        product_type: "physical",
        ...(opts.category ? { category: opts.category } : {}),
        ...(opts.search
          ? {
              OR: [
                { name: { contains: opts.search, mode: "insensitive" as const } },
                { sku: { contains: opts.search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        sku: true,
        name: true,
        category: true,
        vendorId: true,
        cost_price: true,
        lead_time_days: true,
      },
    });
    const ids = products.map((p) => p.id);
    if (ids.length === 0) return { generatedAt: new Date().toISOString(), coverDays, rows: [], summary: {} };

    const [saleLines, stock, poLines, reqLines] = await Promise.all([
      prisma.salesDocumentItem.findMany({
        where: {
          productId: { in: ids },
          salesDocument: {
            type: { in: [...SALE_TYPES] as any },
            status: { notIn: [...EXCLUDED_STATUS] as any },
            issueDate: { gte: since90 },
          },
        },
        select: { productId: true, quantity: true, salesDocument: { select: { issueDate: true } } },
      }),
      prisma.inventory.groupBy({
        by: ["productId"],
        where: { productId: { in: ids } },
        _sum: { available: true },
      }),
      prisma.purchaseOrderItem.findMany({
        where: {
          productId: { in: ids },
          purchaseOrder: { status: { in: ["SUBMITTED", "ACKNOWLEDGED", "APPROVED", "PARTIALLY_RECEIVED"] as any } },
        },
        select: { productId: true, quantity: true, receivedQuantity: true },
      }),
      prisma.purchaseRequisitionItem.findMany({
        where: {
          productId: { in: ids },
          purchaseRequisition: { status: { in: ["SUBMITTED", "APPROVED"] as any } },
        },
        select: { productId: true, quantity: true },
      }),
    ]);

    // Weekly buckets: index 0 = most recent 7 days ... 11 = oldest (84 days). Days 85-90 fall in the 90-day total only.
    const weekly = new Map<string, number[]>();
    const sold28 = new Map<string, number>();
    const sold90 = new Map<string, number>();
    for (const l of saleLines) {
      if (!l.productId) continue;
      const age = (now - l.salesDocument.issueDate.getTime()) / DAY;
      const q = Number(l.quantity) || 0;
      sold90.set(l.productId, (sold90.get(l.productId) ?? 0) + q);
      if (age <= 28) sold28.set(l.productId, (sold28.get(l.productId) ?? 0) + q);
      const w = Math.floor(age / 7);
      if (w < 12) {
        const arr = weekly.get(l.productId) ?? new Array(12).fill(0);
        arr[w] += q;
        weekly.set(l.productId, arr);
      }
    }
    const onHandMap = new Map(stock.map((s) => [s.productId, s._sum.available ?? 0]));
    const onOrder = new Map<string, number>();
    for (const p of poLines) {
      if (!p.productId) continue;
      onOrder.set(p.productId, (onOrder.get(p.productId) ?? 0) + Math.max(0, p.quantity - p.receivedQuantity));
    }
    for (const p of reqLines) {
      if (!p.productId) continue;
      onOrder.set(p.productId, (onOrder.get(p.productId) ?? 0) + p.quantity);
    }

    const rows: ForecastRow[] = products.map((p) => {
      const s28 = sold28.get(p.id) ?? 0;
      const s90 = sold90.get(p.id) ?? 0;
      const daily = 0.6 * (s28 / 28) + 0.4 * (s90 / 90);
      const wk = weekly.get(p.id) ?? new Array(12).fill(0);
      const mean = wk.reduce((a, b) => a + b, 0) / 12;
      const variance = wk.reduce((a, b) => a + (b - mean) ** 2, 0) / 12;
      const sigmaDaily = Math.sqrt(variance) / Math.sqrt(7);
      const lead = p.lead_time_days && p.lead_time_days > 0 ? p.lead_time_days : DEFAULT_LEAD_DAYS;
      const safety = Math.ceil(Z * sigmaDaily * Math.sqrt(lead));
      const reorderPoint = Math.ceil(daily * lead + safety);
      const onHand = onHandMap.get(p.id) ?? 0;
      const ordered = onOrder.get(p.id) ?? 0;
      const cover = daily > 0 ? onHand / daily : null;
      const needed = daily * (lead + coverDays) + safety - (onHand + ordered);
      const suggestedQty = daily > 0 ? Math.max(0, Math.ceil(needed)) : 0;

      const recent = (wk[0]! + wk[1]! + wk[2]! + wk[3]!) / 4;
      const prior = (wk[4]! + wk[5]! + wk[6]! + wk[7]!) / 4;
      const trend: ForecastRow["trend"] =
        prior === 0 && recent === 0 ? "FLAT" : recent > prior * 1.2 ? "UP" : recent < prior * 0.8 ? "DOWN" : "FLAT";

      let urgency: Urgency;
      if (daily === 0) urgency = onHand > 0 && s90 === 0 ? "NO_DEMAND" : "NO_DEMAND";
      else if (onHand <= 0) urgency = "STOCKOUT";
      else if (onHand + ordered < reorderPoint && (cover ?? 0) < lead) urgency = "CRITICAL";
      else if (onHand + ordered <= reorderPoint) urgency = "REORDER";
      else if (cover !== null && cover > 180) urgency = "OVERSTOCK";
      else urgency = "OK";

      return {
        productId: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        vendorId: p.vendorId,
        costPrice: p.cost_price,
        onHand,
        onOrder: ordered,
        sold28: r2(s28),
        sold90: r2(s90),
        dailyDemand: r2(daily),
        forecastNext30: Math.round(daily * 30),
        leadTimeDays: lead,
        safetyStock: safety,
        reorderPoint,
        daysOfCover: cover === null ? null : Math.round(cover),
        suggestedQty,
        suggestedCost: r2(suggestedQty * p.cost_price),
        trend,
        urgency,
      };
    });

    const order: Record<Urgency, number> = { STOCKOUT: 0, CRITICAL: 1, REORDER: 2, OK: 3, OVERSTOCK: 4, NO_DEMAND: 5 };
    rows.sort((a, b) => order[a.urgency] - order[b.urgency] || b.dailyDemand - a.dailyDemand);

    const summary: Record<string, number> = {
      STOCKOUT: 0, CRITICAL: 0, REORDER: 0, OK: 0, OVERSTOCK: 0, NO_DEMAND: 0,
      suggestedSpend: 0,
    };
    for (const r of rows) {
      summary[r.urgency] = (summary[r.urgency] ?? 0) + 1;
      summary.suggestedSpend = (summary.suggestedSpend ?? 0) + r.suggestedCost;
    }
    summary.suggestedSpend = r2(summary.suggestedSpend ?? 0);

    return {
      generatedAt: new Date().toISOString(),
      coverDays,
      rows: opts.onlyActionable ? rows.filter((r) => r.suggestedQty > 0) : rows,
      summary,
    };
  }

  /** Raise ONE draft requisition from chosen products (quantities editable by the caller). Goes through normal approval. */
  async createRequisition(
    userId: string,
    input: { branchId: string; notes?: string; items: { productId: string; quantity: number }[] },
  ) {
    if (!input.branchId) throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "branchId is required");
    const items = (input.items ?? []).filter((i) => i.productId && Number(i.quantity) > 0);
    if (items.length === 0) throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Add at least one item");
    if (items.length > 200) throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Too many items (max 200)");

    const branch = await prisma.branch.findUnique({ where: { id: input.branchId }, select: { id: true } });
    if (!branch) throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");

    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) } },
      select: { id: true, name: true, sku: true, cost_price: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));
    const lines = items.map((i) => {
      const p = byId.get(i.productId);
      if (!p) throw new AppError(ErrorCode.NOT_FOUND, 404, `Product ${i.productId} not found`);
      const qty = Math.ceil(Number(i.quantity));
      return {
        productId: p.id,
        description: `${p.name} (${p.sku})`,
        quantity: qty,
        estimatedUnitCost: p.cost_price,
        estimatedSubtotal: r2(qty * p.cost_price),
      };
    });

    const requisitionNumber = `REQ-FC-${Date.now().toString(36).toUpperCase()}`;
    return prisma.purchaseRequisition.create({
      data: {
        requisitionNumber,
        status: "DRAFT",
        requestedById: userId,
        branchId: input.branchId,
        estimatedTotal: r2(lines.reduce((s, l) => s + l.estimatedSubtotal, 0)),
        notes: input.notes?.slice(0, 500) || "Raised from demand forecast",
        items: { create: lines },
      },
      select: { id: true, requisitionNumber: true, estimatedTotal: true },
    });
  }
}

export const forecastService = new ForecastService();
