import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { logger } from "@core/utils/logger";
import workflow from "../../workflow/workflow.service";
import { InventoryService } from "./inventory.service";

const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const forbid = (m: string) => new AppError(ErrorCode.FORBIDDEN, 403, m);
const notFound = (m: string) => new AppError(ErrorCode.NOT_FOUND, 404, m);
const round = (n: number) => Math.round(n * 100) / 100;

export interface CountCtx {
  userId: string;
  branchId?: string | null;
  perms: string[];
  /** Set for branch-scoped callers; undefined means every branch */
  branchIds?: string[];
}

/**
 * Stock count lifecycle
 *   DRAFT -> COUNTING -> REVIEW -> PENDING_APPROVAL -> POSTED
 * Counters never see the system quantity while counting (blind). The system quantity
 * is read at the moment each line is counted, so any stock movement afterwards makes
 * that line "stale" and it must be recounted before the variances can be posted.
 */
export class StockCountService {
  private async load(ctx: CountCtx, id: string) {
    const c = await prisma.stockCount.findUnique({ where: { id } });
    if (!c) throw notFound("Stock count not found");
    if (ctx.branchIds && !(c.branchId && ctx.branchIds.includes(c.branchId))) throw forbid("This count belongs to another branch.");
    return c;
  }

  private canSeeSystem(c: { status: string; blind: boolean }) {
    return !c.blind || !["DRAFT", "COUNTING"].includes(c.status);
  }

  /** Warehouses the caller may count, plus the product categories stocked in each. */
  async warehouses(ctx: CountCtx) {
    const whs = await prisma.warehouse.findMany({
      where: { isActive: true, ...(ctx.branchIds && { branchId: { in: ctx.branchIds } }) },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    });
    const cats = await prisma.product.findMany({ where: { category: { not: null } }, select: { category: true }, distinct: ["category"], orderBy: { category: "asc" } });
    return { warehouses: whs, categories: cats.map((c) => c.category as string) };
  }

  async list(ctx: CountCtx, q: { status?: string; warehouseId?: string }) {
    const rows = await prisma.stockCount.findMany({
      where: {
        ...(q.status && { status: q.status.toUpperCase() }),
        ...(q.warehouseId && { warehouseId: q.warehouseId }),
        ...(ctx.branchIds && { branchId: { in: ctx.branchIds } }),
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const [whs, lineAgg, counted] = await Promise.all([
      prisma.warehouse.findMany({ where: { id: { in: [...new Set(rows.map((r) => r.warehouseId))] } }, select: { id: true, name: true } }),
      prisma.stockCountLine.groupBy({ by: ["countId"], where: { countId: { in: rows.map((r) => r.id) } }, _count: true }),
      prisma.stockCountLine.groupBy({ by: ["countId"], where: { countId: { in: rows.map((r) => r.id) }, countedQty: { not: null } }, _count: true }),
    ]);
    const wn = new Map(whs.map((w) => [w.id, w.name]));
    const total = new Map(lineAgg.map((l) => [l.countId, l._count]));
    const done = new Map(counted.map((l) => [l.countId, l._count]));
    return rows.map((r) => ({ ...r, warehouse: wn.get(r.warehouseId) ?? r.warehouseId, lineCount: total.get(r.id) ?? 0, countedCount: done.get(r.id) ?? 0 }));
  }

  async get(ctx: CountCtx, id: string) {
    const c = await this.load(ctx, id);
    const [wh, lines] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: c.warehouseId }, select: { name: true } }),
      prisma.stockCountLine.findMany({ where: { countId: id }, orderBy: { productName: "asc" } }),
    ]);
    const live = await prisma.inventory.findMany({
      where: { warehouseId: c.warehouseId, productId: { in: lines.map((l) => l.productId) } },
      select: { productId: true, quantity: true },
    });
    const liveQty = new Map(live.map((l) => [l.productId, l.quantity]));
    const see = this.canSeeSystem(c);
    const mapped = lines.map((l) => {
      const variance = l.countedQty != null && l.systemQty != null ? l.countedQty - l.systemQty : null;
      const stale = l.countedQty != null && l.systemQty != null && (liveQty.get(l.productId) ?? 0) !== l.systemQty && !l.appliedAt;
      return {
        id: l.id,
        productId: l.productId,
        productName: l.productName,
        sku: l.sku,
        countedQty: l.countedQty,
        note: l.note,
        applied: !!l.appliedAt,
        ...(see && {
          systemQty: l.systemQty,
          variance,
          varianceValue: variance != null ? round(variance * l.unitCost) : null,
          stale: c.status === "REVIEW" ? stale : false,
        }),
      };
    });
    return {
      ...c,
      warehouse: wh?.name ?? c.warehouseId,
      systemVisible: see,
      lines: mapped,
      summary: see
        ? {
            lines: mapped.length,
            withVariance: mapped.filter((l: any) => l.variance).length,
            stale: mapped.filter((l: any) => l.stale).length,
            netValue: round(mapped.reduce((s: number, l: any) => s + (l.varianceValue ?? 0), 0)),
            absValue: round(mapped.reduce((s: number, l: any) => s + Math.abs(l.varianceValue ?? 0), 0)),
          }
        : null,
    };
  }

  async create(ctx: CountCtx, d: { warehouseId?: string; type?: string; category?: string; productIds?: string[]; notes?: string; blind?: boolean }) {
    if (!d.warehouseId) throw bad("Choose the warehouse to count.");
    const type = (d.type || "FULL").toUpperCase();
    if (!["FULL", "CYCLE"].includes(type)) throw bad("Type must be FULL or CYCLE.");
    if (type === "CYCLE" && !d.category?.trim() && !d.productIds?.length) throw bad("A cycle count needs a category or a list of products.");

    const wh = await prisma.warehouse.findUnique({ where: { id: d.warehouseId }, select: { id: true, branchId: true, isActive: true } });
    if (!wh || !wh.isActive) throw bad("That warehouse does not exist or is inactive.");
    if (ctx.branchIds && !ctx.branchIds.includes(wh.branchId)) throw forbid("That warehouse belongs to another branch.");

    const open = await prisma.stockCount.findFirst({
      where: { warehouseId: wh.id, status: { in: ["DRAFT", "COUNTING", "REVIEW", "PENDING_APPROVAL"] } },
      select: { countNumber: true },
    });
    if (open) throw bad(`${open.countNumber} is still open for this warehouse. Finish or cancel it first.`);

    const inv = await prisma.inventory.findMany({
      where: {
        warehouseId: wh.id,
        product: {
          status: { not: "discontinued" as any },
          ...(type === "CYCLE" && d.category?.trim() && { category: d.category.trim() }),
          ...(d.productIds?.length && { id: { in: d.productIds } }),
        },
      },
      select: { productId: true, product: { select: { name: true, sku: true, cost_price: true } } },
      take: 5001,
    });
    if (!inv.length) throw bad("No stocked products match that selection.");
    if (inv.length > 5000) throw bad("That is more than 5,000 lines. Count by category instead.");

    const count = await prisma.stockCount.count();
    const created = await prisma.$transaction(async (tx) => {
      const c = await tx.stockCount.create({
        data: {
          countNumber: `SC-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
          warehouseId: wh.id,
          branchId: wh.branchId,
          type,
          category: d.category?.trim() || null,
          blind: d.blind !== false,
          notes: d.notes?.trim() || null,
          createdById: ctx.userId,
        },
      });
      await tx.stockCountLine.createMany({
        data: inv.map((i) => ({
          countId: c.id,
          productId: i.productId,
          productName: i.product.name,
          sku: i.product.sku,
          unitCost: i.product.cost_price ?? 0,
        })),
      });
      return c;
    });
    return this.get(ctx, created.id);
  }

  async start(ctx: CountCtx, id: string) {
    const c = await this.load(ctx, id);
    if (c.status !== "DRAFT") throw bad(`This count is already ${c.status.toLowerCase().replace("_", " ")}.`);
    await prisma.stockCount.update({ where: { id }, data: { status: "COUNTING", startedAt: new Date() } });
    return this.get(ctx, id);
  }

  async enter(ctx: CountCtx, id: string, lineId: string, d: { countedQty?: number; note?: string }) {
    const c = await this.load(ctx, id);
    if (c.status !== "COUNTING") throw bad("Counts can only be entered while the count is in progress.");
    const qty = Number(d.countedQty);
    if (!Number.isInteger(qty) || qty < 0) throw bad("Enter a whole number, zero or more.");
    const line = await prisma.stockCountLine.findUnique({ where: { id: lineId } });
    if (!line || line.countId !== id) throw notFound("Count line not found");
    const live = await prisma.inventory.findUnique({
      where: { productId_warehouseId: { productId: line.productId, warehouseId: c.warehouseId } },
      select: { quantity: true },
    });
    await prisma.stockCountLine.update({
      where: { id: lineId },
      data: {
        countedQty: qty,
        systemQty: live?.quantity ?? 0,
        note: d.note?.trim() || null,
        countedById: ctx.userId,
        countedAt: new Date(),
      },
    });
    return { id: lineId, countedQty: qty };
  }

  async submit(ctx: CountCtx, id: string) {
    const c = await this.load(ctx, id);
    if (c.status !== "COUNTING") throw bad("Only a count in progress can be submitted for review.");
    const left = await prisma.stockCountLine.count({ where: { countId: id, countedQty: null } });
    if (left) throw bad(`${left} line(s) have not been counted yet. Enter a count for every product, using 0 where none was found.`);
    await prisma.stockCount.update({ where: { id }, data: { status: "REVIEW", submittedAt: new Date(), submittedById: ctx.userId } });
    return this.get(ctx, id);
  }

  /** Reviewer sends specific lines (or every stale one) back to be counted again. */
  async recount(ctx: CountCtx, id: string, d: { lineIds?: string[]; stale?: boolean }) {
    const c = await this.load(ctx, id);
    if (c.status !== "REVIEW") throw bad("Recounts can only be requested during review.");
    let ids = d.lineIds ?? [];
    if (d.stale) {
      const detail = await this.get(ctx, id);
      ids = [...ids, ...detail.lines.filter((l: any) => l.stale).map((l: any) => l.id)];
    }
    ids = [...new Set(ids)];
    if (!ids.length) throw bad("Pick at least one line to recount.");
    await prisma.$transaction([
      prisma.stockCountLine.updateMany({
        where: { countId: id, id: { in: ids } },
        data: { countedQty: null, systemQty: null, countedAt: null, countedById: null },
      }),
      prisma.stockCount.update({ where: { id }, data: { status: "COUNTING" } }),
    ]);
    return this.get(ctx, id);
  }

  /** Locks the count and sends any variance for approval. */
  async post(ctx: CountCtx, id: string) {
    const c = await this.load(ctx, id);
    if (c.status !== "REVIEW") throw bad("Only a count under review can be posted.");
    const detail = await this.get(ctx, id);
    const stale = detail.lines.filter((l: any) => l.stale);
    if (stale.length)
      throw bad(`${stale.length} line(s) had stock movements after they were counted. Send them back for recount before posting.`);

    const varLines = detail.lines.filter((l: any) => l.variance);
    if (!varLines.length) {
      await prisma.$transaction([
        prisma.stockCount.update({ where: { id }, data: { status: "POSTED", postedAt: new Date(), totalVarianceValue: 0 } }),
        prisma.inventory.updateMany({
          where: { warehouseId: c.warehouseId, productId: { in: detail.lines.map((l: any) => l.productId) } },
          data: { last_counted: new Date() },
        }),
      ]);
      return { count: await this.get(ctx, id), approval: null };
    }

    const absValue = detail.summary!.absValue;
    const netValue = detail.summary!.netValue;
    const approval = await workflow.start({
      code: "STOCK_COUNT",
      entityId: id,
      title: `Stock count ${c.countNumber}: ${varLines.length} variance(s), net KSh ${Math.round(netValue).toLocaleString()}`,
      summary: `${c.type} count of ${detail.warehouse}. ${varLines.length} of ${detail.lines.length} lines differ; gross variance KSh ${Math.round(absValue).toLocaleString()}.`,
      amount: absValue,
      branchId: c.branchId,
      requestedById: ctx.userId,
      payload: { countId: id, countNumber: c.countNumber },
    });
    await prisma.stockCount.update({ where: { id }, data: { status: "PENDING_APPROVAL", totalVarianceValue: netValue } });
    return { count: await this.get(ctx, id), approval };
  }

  async cancel(ctx: CountCtx, id: string, reason?: string) {
    const c = await this.load(ctx, id);
    if (["POSTED", "CANCELLED"].includes(c.status)) throw bad(`This count is already ${c.status.toLowerCase()}.`);
    if (c.status === "PENDING_APPROVAL") await workflow.cancelForEntity("STOCK_COUNT", id, ctx.userId, reason || "Count cancelled");
    await prisma.stockCount.update({ where: { id }, data: { status: "CANCELLED", notes: [c.notes, reason && `Cancelled: ${reason}`].filter(Boolean).join(" | ") || null } });
    return this.get(ctx, id);
  }

  // ----------------------------------------------------- workflow outcomes

  /** Applies every approved variance. Safe to retry: lines already applied are skipped. */
  async applyApproved(countId: string, approvalNumber: string, requesterId: string) {
    const c = await prisma.stockCount.findUnique({ where: { id: countId } });
    if (!c) throw new Error("Stock count no longer exists");
    if (c.status === "POSTED") return;
    const lines = await prisma.stockCountLine.findMany({ where: { countId, appliedAt: null } });
    const inv = new InventoryService();

    for (const l of lines) {
      if (l.countedQty == null) continue;
      const live = await prisma.inventory.findUnique({
        where: { productId_warehouseId: { productId: l.productId, warehouseId: c.warehouseId } },
        select: { quantity: true },
      });
      const delta = l.countedQty - (live?.quantity ?? 0);
      if (delta !== 0) {
        const moved = l.systemQty != null && l.systemQty !== (live?.quantity ?? 0);
        await inv.adjustInventory(
          {
            productId: l.productId,
            warehouseId: c.warehouseId,
            adjustmentType: delta > 0 ? "increase" : "decrease",
            quantity: Math.abs(delta),
            reason: "count_variance",
            reference: `${c.countNumber} / ${approvalNumber}`,
            notes: `Stock count ${c.countNumber}${moved ? ` (system moved from ${l.systemQty} to ${live?.quantity ?? 0} since counting)` : ""}`,
            unitCost: l.unitCost || undefined,
          } as any,
          requesterId,
        );
      }
      await prisma.stockCountLine.update({ where: { id: l.id }, data: { appliedAt: new Date() } });
    }
    await prisma.$transaction([
      prisma.stockCount.update({ where: { id: countId }, data: { status: "POSTED", postedAt: new Date() } }),
      prisma.inventory.updateMany({ where: { warehouseId: c.warehouseId, productId: { in: (await prisma.stockCountLine.findMany({ where: { countId }, select: { productId: true } })).map((x) => x.productId) } }, data: { last_counted: new Date() } }),
    ]);
    logger.info({ countId }, "Stock count posted");
  }

  /** Rejected or withdrawn: back to review so the variances can be checked and re-posted. */
  async returnToReview(countId: string, note: string) {
    const c = await prisma.stockCount.findUnique({ where: { id: countId }, select: { status: true, notes: true } });
    if (!c || c.status !== "PENDING_APPROVAL") return;
    await prisma.stockCount.update({ where: { id: countId }, data: { status: "REVIEW", notes: [c.notes, note].filter(Boolean).join(" | ") } });
  }
}

export default new StockCountService();
