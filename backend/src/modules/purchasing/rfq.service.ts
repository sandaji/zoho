import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { PurchasingService } from "./purchasing.service";

const bad = (m: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, m);
const forbid = (m: string) => new AppError(ErrorCode.FORBIDDEN, 403, m);
const notFound = (m: string) => new AppError(ErrorCode.NOT_FOUND, 404, m);
const round = (n: number, d = 2) => Math.round(n * 10 ** d) / 10 ** d;
const DAY = 86_400_000;

export interface RfqCtx {
  userId: string;
  branchId?: string | null;
  perms: string[];
  /** Set for branch-scoped callers; undefined means every branch */
  branchIds?: string[];
}

/** How a quote is scored: price counts most, then the supplier's track record, then lead time. */
export const WEIGHTS = { price: 0.5, performance: 0.3, leadTime: 0.2 };
const NEUTRAL_PERFORMANCE = 0.6; // used when a supplier has no history yet

// ---------------------------------------------------------------- supplier performance

export interface VendorScore {
  vendorId: string;
  onTimePct: number | null;
  fillRatePct: number | null;
  poCount: number;
  systemScore: number | null; // 1-5, from purchase orders and goods receipts
  manual: { overall: number; count: number; delivery: number; quality: number; price: number; service: number } | null;
  combined: number | null; // 1-5
}

export async function vendorScores(vendorIds: string[]): Promise<Map<string, VendorScore>> {
  const out = new Map<string, VendorScore>();
  if (!vendorIds.length) return out;
  const since = new Date(Date.now() - 365 * DAY);

  const [pos, evals] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { vendorId: { in: vendorIds }, createdAt: { gte: since }, status: { in: ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "CLOSED"] as any } },
      select: {
        vendorId: true,
        expectedDeliveryDate: true,
        items: { select: { quantity: true, receivedQuantity: true } },
        grns: { select: { receivedAt: true }, orderBy: { receivedAt: "asc" }, take: 1 },
      },
    }),
    prisma.vendorEvaluation.findMany({ where: { vendorId: { in: vendorIds }, createdAt: { gte: since } } }),
  ]);

  for (const vendorId of vendorIds) {
    const mine = pos.filter((p) => p.vendorId === vendorId);
    const dated = mine.filter((p) => p.expectedDeliveryDate && (p.grns.length || p.expectedDeliveryDate.getTime() + DAY < Date.now()));
    const onTime = dated.filter((p) => p.grns.length && p.grns[0].receivedAt.getTime() <= p.expectedDeliveryDate!.getTime() + DAY).length;
    const received = mine.filter((p) => p.grns.length);
    const ordered = received.reduce((s, p) => s + p.items.reduce((a, i) => a + i.quantity, 0), 0);
    const got = received.reduce((s, p) => s + p.items.reduce((a, i) => a + Math.min(i.receivedQuantity, i.quantity), 0), 0);

    const onTimePct = dated.length ? round((onTime / dated.length) * 100, 1) : null;
    const fillRatePct = ordered ? round((got / ordered) * 100, 1) : null;
    const parts = [onTimePct, fillRatePct].filter((x): x is number => x != null);
    const systemScore = parts.length ? round(1 + 4 * (parts.reduce((a, b) => a + b, 0) / parts.length / 100)) : null;

    const ev = evals.filter((e) => e.vendorId === vendorId);
    const avg = (k: "overall" | "delivery" | "quality" | "price" | "service") => round(ev.reduce((s, e) => s + e[k], 0) / ev.length);
    const manual = ev.length
      ? { overall: avg("overall"), count: ev.length, delivery: avg("delivery"), quality: avg("quality"), price: avg("price"), service: avg("service") }
      : null;

    const combined =
      systemScore != null && manual ? round(systemScore * 0.6 + manual.overall * 0.4) : (systemScore ?? manual?.overall ?? null);
    out.set(vendorId, { vendorId, onTimePct, fillRatePct, poCount: mine.length, systemScore, manual, combined });
  }
  return out;
}

export class RfqService {
  private async load(ctx: RfqCtx, id: string) {
    const r = await prisma.rfq.findUnique({ where: { id } });
    if (!r) throw notFound("RFQ not found");
    if (ctx.branchIds && !ctx.branchIds.includes(r.branchId)) throw forbid("This RFQ belongs to another branch.");
    return r;
  }

  /** Quotes can only be entered before the closing date; past it the RFQ closes by itself. */
  private async autoClose() {
    await prisma.rfq.updateMany({ where: { status: "OPEN", closingDate: { lt: new Date() } }, data: { status: "CLOSED", closedAt: new Date() } });
  }

  async options(ctx: RfqCtx) {
    const [vendors, warehouses] = await Promise.all([
      prisma.vendor.findMany({ where: { isActive: true }, select: { id: true, code: true, name: true, paymentTerms: true, leadTimeDays: true }, orderBy: { name: "asc" } }),
      prisma.warehouse.findMany({ where: { isActive: true, ...(ctx.branchIds && { branchId: { in: ctx.branchIds } }) }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return { vendors, warehouses };
  }

  async productSearch(search?: string) {
    if (!search?.trim()) return [];
    return prisma.product.findMany({
      where: {
        isActive: true,
        OR: [{ name: { contains: search.trim(), mode: "insensitive" } }, { sku: { contains: search.trim(), mode: "insensitive" } }],
      },
      select: { id: true, name: true, sku: true, vendorId: true },
      take: 15,
    });
  }

  /** Approved requisitions that can be turned into an RFQ (no LPO raised from them yet). */
  async requisitions(ctx: RfqCtx) {
    const rows = await prisma.purchaseRequisition.findMany({
      where: { status: "APPROVED" as any, purchaseOrder: null, ...(ctx.branchIds && { branchId: { in: ctx.branchIds } }) },
      select: { id: true, requisitionNumber: true, estimatedTotal: true, _count: { select: { items: true } } },
      orderBy: { approvedAt: "desc" },
      take: 50,
    });
    return rows.map((r) => ({ id: r.id, number: r.requisitionNumber, estimatedTotal: r.estimatedTotal, items: r._count.items }));
  }

  async list(ctx: RfqCtx, q: { status?: string }) {
    await this.autoClose();
    const rows = await prisma.rfq.findMany({
      where: { ...(q.status && { status: q.status.toUpperCase() }), ...(ctx.branchIds && { branchId: { in: ctx.branchIds } }) },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    const ids = rows.map((r) => r.id);
    const [quotes, items] = await Promise.all([
      prisma.rfqQuote.groupBy({ by: ["rfqId", "status"], where: { rfqId: { in: ids } }, _count: true }),
      prisma.rfqItem.groupBy({ by: ["rfqId"], where: { rfqId: { in: ids } }, _count: true }),
    ]);
    return rows.map((r) => ({
      ...r,
      itemCount: items.find((i) => i.rfqId === r.id)?._count ?? 0,
      invited: quotes.filter((x) => x.rfqId === r.id).reduce((s, x) => s + x._count, 0),
      submitted: quotes.find((x) => x.rfqId === r.id && x.status === "SUBMITTED")?._count ?? 0,
    }));
  }

  async create(
    ctx: RfqCtx,
    d: {
      title?: string;
      closingDate?: string;
      warehouseId?: string;
      requisitionId?: string;
      items?: { productId?: string; description?: string; quantity: number }[];
      vendorIds?: string[];
      notes?: string;
      exceptionReason?: string;
    },
  ) {
    if (!d.title?.trim()) throw bad("Give the RFQ a title.");
    const closing = new Date(d.closingDate ?? "");
    if (Number.isNaN(closing.getTime()) || closing.getTime() < Date.now()) throw bad("The closing date must be in the future.");

    let branchId = ctx.branchId ?? undefined;
    if (d.warehouseId) {
      const wh = await prisma.warehouse.findUnique({ where: { id: d.warehouseId }, select: { branchId: true } });
      if (!wh) throw bad("Delivery warehouse not found.");
      branchId = wh.branchId;
    }
    if (!branchId) throw bad("Choose the delivery warehouse so the RFQ belongs to a branch.");
    if (ctx.branchIds && !ctx.branchIds.includes(branchId)) throw forbid("That warehouse belongs to another branch.");

    let items = d.items ?? [];
    if (!items.length && d.requisitionId) {
      const req = await prisma.purchaseRequisition.findUnique({ where: { id: d.requisitionId }, include: { items: true } });
      if (!req) throw bad("Requisition not found.");
      items = req.items.map((i) => ({ productId: i.productId ?? undefined, description: i.description, quantity: i.quantity }));
    }
    if (!items.length) throw bad("Add at least one item to quote.");
    const prodIds = items.map((i) => i.productId).filter(Boolean) as string[];
    const products = prodIds.length ? await prisma.product.findMany({ where: { id: { in: prodIds } }, select: { id: true, name: true } }) : [];
    const pn = new Map(products.map((p) => [p.id, p.name]));
    for (const i of items) {
      if (!(Number.isInteger(i.quantity) && i.quantity > 0)) throw bad("Quantities must be whole numbers above zero.");
      if (i.productId && !pn.has(i.productId)) throw bad("One of the products no longer exists.");
      if (!i.productId && !i.description?.trim()) throw bad("Every item needs a product or a description.");
    }

    const vendorIds = [...new Set(d.vendorIds ?? [])];
    if (!vendorIds.length) throw bad("Invite at least one vendor.");
    const vendors = await prisma.vendor.findMany({ where: { id: { in: vendorIds }, isActive: true }, select: { id: true } });
    if (vendors.length !== vendorIds.length) throw bad("One of the invited vendors is missing or inactive.");
    if (vendorIds.length < 3 && (d.exceptionReason?.trim().length ?? 0) < 10)
      throw bad("Competitive quoting needs at least 3 vendors. To invite fewer, give the reason (e.g. sole supplier) in the exception field.");

    const count = await prisma.rfq.count();
    const rfq = await prisma.$transaction(async (tx) => {
      const r = await tx.rfq.create({
        data: {
          rfqNumber: `RFQ-${new Date().getFullYear()}-${String(count + 1).padStart(4, "0")}`,
          title: d.title!.trim(),
          requisitionId: d.requisitionId || null,
          branchId: branchId!,
          warehouseId: d.warehouseId || null,
          closingDate: closing,
          notes: d.notes?.trim() || null,
          exceptionReason: vendorIds.length < 3 ? d.exceptionReason!.trim() : null,
          createdById: ctx.userId,
        },
      });
      await tx.rfqItem.createMany({
        data: items.map((i) => ({
          rfqId: r.id,
          productId: i.productId || null,
          description: i.productId ? pn.get(i.productId)! : i.description!.trim(),
          quantity: i.quantity,
        })),
      });
      await tx.rfqQuote.createMany({ data: vendorIds.map((vendorId) => ({ rfqId: r.id, vendorId })) });
      return r;
    });
    return this.get(ctx, rfq.id);
  }

  async send(ctx: RfqCtx, id: string) {
    const r = await this.load(ctx, id);
    if (r.status !== "DRAFT") throw bad(`This RFQ is already ${r.status.toLowerCase()}.`);
    if (r.closingDate.getTime() < Date.now()) throw bad("The closing date has passed. Extend it first.");
    await prisma.rfq.update({ where: { id }, data: { status: "OPEN", sentAt: new Date() } });
    return this.get(ctx, id);
  }

  async extend(ctx: RfqCtx, id: string, closingDate: string) {
    const r = await this.load(ctx, id);
    if (!["DRAFT", "OPEN", "CLOSED"].includes(r.status)) throw bad("This RFQ can no longer be changed.");
    const d = new Date(closingDate);
    if (Number.isNaN(d.getTime()) || d.getTime() < Date.now()) throw bad("The new closing date must be in the future.");
    await prisma.rfq.update({ where: { id }, data: { closingDate: d, ...(r.status === "CLOSED" && { status: "OPEN", closedAt: null }) } });
    return this.get(ctx, id);
  }

  async recordQuote(
    ctx: RfqCtx,
    id: string,
    vendorId: string,
    d: { leadTimeDays?: number; paymentTerms?: string; validUntil?: string; notes?: string; lines?: { itemId: string; unitPrice: number }[] },
  ) {
    await this.autoClose();
    const r = await this.load(ctx, id);
    if (r.status !== "OPEN") throw bad("Quotes can only be recorded while the RFQ is open (before its closing date).");
    const quote = await prisma.rfqQuote.findUnique({ where: { rfqId_vendorId: { rfqId: id, vendorId } } });
    if (!quote) throw bad("That vendor was not invited to this RFQ.");

    const items = await prisma.rfqItem.findMany({ where: { rfqId: id }, select: { id: true } });
    const lines = d.lines ?? [];
    for (const it of items) {
      const l = lines.find((x) => x.itemId === it.id);
      if (!l || !(Number(l.unitPrice) > 0)) throw bad("Enter a unit price above zero for every item.");
    }
    if (!(Number(d.leadTimeDays) >= 0) || d.leadTimeDays === undefined) throw bad("Enter the lead time in days.");
    const validUntil = d.validUntil ? new Date(d.validUntil) : null;
    if (validUntil && (Number.isNaN(validUntil.getTime()) || validUntil.getTime() < Date.now() - DAY)) throw bad("The quote's validity date is already past.");

    await prisma.$transaction([
      prisma.rfqQuoteLine.deleteMany({ where: { quoteId: quote.id } }),
      prisma.rfqQuoteLine.createMany({ data: items.map((it) => ({ quoteId: quote.id, itemId: it.id, unitPrice: Number(lines.find((x) => x.itemId === it.id)!.unitPrice) })) }),
      prisma.rfqQuote.update({
        where: { id: quote.id },
        data: {
          status: "SUBMITTED",
          leadTimeDays: Number(d.leadTimeDays),
          paymentTerms: d.paymentTerms?.trim() || null,
          validUntil,
          notes: d.notes?.trim() || null,
          submittedAt: new Date(),
          enteredById: ctx.userId,
        },
      }),
    ]);
    return this.get(ctx, id);
  }

  async declineQuote(ctx: RfqCtx, id: string, vendorId: string, reason?: string) {
    const r = await this.load(ctx, id);
    if (r.status !== "OPEN") throw bad("Only an open RFQ can record a declined invitation.");
    const quote = await prisma.rfqQuote.findUnique({ where: { rfqId_vendorId: { rfqId: id, vendorId } } });
    if (!quote) throw bad("That vendor was not invited to this RFQ.");
    await prisma.$transaction([
      prisma.rfqQuoteLine.deleteMany({ where: { quoteId: quote.id } }),
      prisma.rfqQuote.update({ where: { id: quote.id }, data: { status: "DECLINED", notes: reason?.trim() || null, submittedAt: new Date(), enteredById: ctx.userId } }),
    ]);
    return this.get(ctx, id);
  }

  async close(ctx: RfqCtx, id: string) {
    const r = await this.load(ctx, id);
    if (r.status !== "OPEN") throw bad(`This RFQ is already ${r.status.toLowerCase()}.`);
    const n = await prisma.rfqQuote.count({ where: { rfqId: id, status: "SUBMITTED" } });
    if (!n) throw bad("No quotes have been recorded yet. Record at least one, or cancel the RFQ.");
    await prisma.rfq.update({ where: { id }, data: { status: "CLOSED", closedAt: new Date() } });
    return this.get(ctx, id);
  }

  async cancel(ctx: RfqCtx, id: string, reason?: string) {
    const r = await this.load(ctx, id);
    if (["AWARDED", "CANCELLED"].includes(r.status)) throw bad(`This RFQ is already ${r.status.toLowerCase()}.`);
    await prisma.rfq.update({ where: { id }, data: { status: "CANCELLED", notes: [r.notes, reason && `Cancelled: ${reason}`].filter(Boolean).join(" | ") || null } });
    return this.get(ctx, id);
  }

  async get(ctx: RfqCtx, id: string) {
    await this.autoClose();
    const r = await this.load(ctx, id);
    const [items, quotes] = await Promise.all([
      prisma.rfqItem.findMany({ where: { rfqId: id }, orderBy: { createdAt: "asc" } }),
      prisma.rfqQuote.findMany({ where: { rfqId: id }, orderBy: { createdAt: "asc" } }),
    ]);
    const lines = quotes.length ? await prisma.rfqQuoteLine.findMany({ where: { quoteId: { in: quotes.map((q) => q.id) } } }) : [];
    const vendors = await prisma.vendor.findMany({ where: { id: { in: quotes.map((q) => q.vendorId) } }, select: { id: true, name: true, code: true } });
    const vn = new Map(vendors.map((v) => [v.id, v]));
    const scores = await vendorScores(quotes.map((q) => q.vendorId));
    const po = r.poId ? await prisma.purchaseOrder.findUnique({ where: { id: r.poId }, select: { id: true, poNumber: true, status: true } }) : null;

    const now = Date.now();
    const full = quotes.map((q) => {
      const ql = lines.filter((l) => l.quoteId === q.id);
      const total = round(items.reduce((s, it) => s + it.quantity * (ql.find((l) => l.itemId === it.id)?.unitPrice ?? 0), 0));
      return {
        id: q.id,
        vendorId: q.vendorId,
        vendor: vn.get(q.vendorId) ?? null,
        status: q.status,
        leadTimeDays: q.leadTimeDays,
        paymentTerms: q.paymentTerms,
        validUntil: q.validUntil,
        expired: !!q.validUntil && q.validUntil.getTime() + DAY < now,
        notes: q.notes,
        submittedAt: q.submittedAt,
        prices: Object.fromEntries(ql.map((l) => [l.itemId, l.unitPrice])),
        total: q.status === "SUBMITTED" ? total : null,
        performance: scores.get(q.vendorId) ?? null,
      };
    });

    // Scoring across the quotes that were actually submitted
    const live = full.filter((q) => q.status === "SUBMITTED" && q.total != null);
    const minTotal = Math.min(...live.map((q) => q.total!));
    const minLead = Math.min(...live.map((q) => Math.max(1, q.leadTimeDays ?? 1)));
    const ranked = live
      .map((q) => {
        const perf = q.performance?.combined != null ? q.performance.combined / 5 : NEUTRAL_PERFORMANCE;
        const parts = {
          price: minTotal / q.total!,
          performance: perf,
          leadTime: minLead / Math.max(1, q.leadTimeDays ?? 1),
        };
        const score = round(100 * (WEIGHTS.price * parts.price + WEIGHTS.performance * parts.performance + WEIGHTS.leadTime * parts.leadTime), 1);
        return { quoteId: q.id, score, parts: { price: round(parts.price * 100, 0), performance: round(parts.performance * 100, 0), leadTime: round(parts.leadTime * 100, 0) } };
      })
      .sort((a, b) => b.score - a.score);

    const lowestPriceQuoteId = live.length ? live.reduce((a, b) => (b.total! < a.total! ? b : a)).id : null;
    const lowestPerItem = Object.fromEntries(
      items.map((it) => {
        const prices = live.map((q) => q.prices[it.id]).filter((p) => p != null);
        return [it.id, prices.length ? Math.min(...prices) : null];
      }),
    );

    return {
      ...r,
      items,
      quotes: full,
      po,
      comparison: {
        weights: WEIGHTS,
        ranking: ranked,
        recommendedQuoteId: ranked[0]?.quoteId ?? null,
        lowestPriceQuoteId,
        lowestPerItem,
      },
    };
  }

  /** Awards the RFQ to one quote and raises a DRAFT purchase order for it. */
  async award(ctx: RfqCtx, id: string, d: { quoteId?: string; reason?: string }) {
    const detail = await this.get(ctx, id);
    if (detail.status !== "CLOSED") throw bad("Close the RFQ before awarding it.");
    if (detail.createdById === ctx.userId && !ctx.perms.includes("admin.system.manage"))
      throw forbid("Segregation of Duties: someone other than the person who ran this RFQ must award it.");
    const q = detail.quotes.find((x) => x.id === d.quoteId);
    if (!q || q.status !== "SUBMITTED") throw bad("Choose one of the submitted quotes.");
    if (q.expired) throw bad("That quote's validity has expired. Ask the vendor to re-confirm, then record it again.");

    const rec = detail.comparison.recommendedQuoteId;
    const cheapest = detail.comparison.lowestPriceQuoteId;
    const needsReason = q.id !== rec || q.id !== cheapest;
    if (needsReason && (d.reason?.trim().length ?? 0) < 10)
      throw bad("This is not both the best-scoring and the lowest-priced quote. Give the reason for choosing it (at least 10 characters).");

    // Stocked lines need the product to be set up as supplied by this vendor
    const prodIds = detail.items.map((i) => i.productId).filter(Boolean) as string[];
    const products = prodIds.length ? await prisma.product.findMany({ where: { id: { in: prodIds } }, select: { id: true, name: true, vendorId: true } }) : [];
    const wrong = products.filter((p) => p.vendorId !== q.vendorId);
    if (wrong.length)
      throw bad(`${wrong.map((p) => p.name).join(", ")} ${wrong.length > 1 ? "are" : "is"} not set up as supplied by ${q.vendor?.name}. Link ${wrong.length > 1 ? "them" : "it"} to this vendor on the product page, then award again.`);

    const po = await new PurchasingService().createPurchaseOrder(ctx.userId, {
      vendorId: q.vendorId,
      warehouseId: detail.warehouseId ?? undefined,
      branchId: detail.warehouseId ? undefined : detail.branchId,
      items: detail.items.map((it) => ({
        productId: it.productId ?? undefined,
        description: it.description,
        lineType: it.productId ? ("STOCKED" as const) : ("NON_STOCK" as const),
        quantity: it.quantity,
        unitPrice: q.prices[it.id],
      })),
      notes: `Awarded from ${detail.rfqNumber} (${detail.title}).${needsReason ? ` Reason: ${d.reason!.trim()}` : ""}`,
      expectedDeliveryDate: new Date(Date.now() + (q.leadTimeDays ?? 0) * DAY).toISOString(),
    });

    await prisma.rfq.update({
      where: { id },
      data: { status: "AWARDED", awardedQuoteId: q.id, awardReason: d.reason?.trim() || null, awardedById: ctx.userId, awardedAt: new Date(), poId: po.id },
    });
    return this.get(ctx, id);
  }
}

// ---------------------------------------------------------------- supplier evaluation

export class SupplierPerformanceService {
  async scorecards(search?: string) {
    const vendors = await prisma.vendor.findMany({
      where: { isActive: true, ...(search && { name: { contains: search, mode: "insensitive" } }) },
      select: { id: true, code: true, name: true },
      orderBy: { name: "asc" },
      take: 300,
    });
    const scores = await vendorScores(vendors.map((v) => v.id));
    return vendors.map((v) => ({ ...v, score: scores.get(v.id)! }));
  }

  async scorecard(vendorId: string) {
    const v = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true, code: true, name: true, paymentTerms: true, leadTimeDays: true } });
    if (!v) throw notFound("Vendor not found");
    const [scores, evals, rfqs] = await Promise.all([
      vendorScores([vendorId]),
      prisma.vendorEvaluation.findMany({ where: { vendorId }, orderBy: { createdAt: "desc" }, take: 20 }),
      prisma.rfqQuote.count({ where: { vendorId, status: "SUBMITTED" } }),
    ]);
    const users = evals.length ? await prisma.user.findMany({ where: { id: { in: evals.map((e) => e.evaluatorId) } }, select: { id: true, name: true } }) : [];
    const un = new Map(users.map((u) => [u.id, u.name]));
    return { vendor: v, score: scores.get(vendorId)!, quotesSubmitted: rfqs, evaluations: evals.map((e) => ({ ...e, evaluator: un.get(e.evaluatorId) ?? "—" })) };
  }

  async evaluate(userId: string, vendorId: string, d: { delivery?: number; quality?: number; price?: number; service?: number; comments?: string }) {
    const v = await prisma.vendor.findUnique({ where: { id: vendorId }, select: { id: true } });
    if (!v) throw notFound("Vendor not found");
    const r = [d.delivery, d.quality, d.price, d.service].map(Number);
    if (r.some((x) => !Number.isInteger(x) || x < 1 || x > 5)) throw bad("Rate delivery, quality, price and service from 1 to 5.");
    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const data = { delivery: r[0], quality: r[1], price: r[2], service: r[3], overall: round(r.reduce((a, b) => a + b, 0) / 4), comments: d.comments?.trim() || null };
    await prisma.vendorEvaluation.upsert({
      where: { vendorId_evaluatorId_period: { vendorId, evaluatorId: userId, period } },
      create: { vendorId, evaluatorId: userId, period, ...data },
      update: data,
    });
    return this.scorecard(vendorId);
  }
}

export default new RfqService();
export const supplierPerformance = new SupplierPerformanceService();
