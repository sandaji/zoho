/**
 * Promotions: percent off, amount off (per unit) and buy-X-get-Y.
 *
 * Rules the till relies on:
 *  - Evaluation happens on the server when a sale is created; the client only
 *    gets a preview and can never choose a promotion discount itself.
 *  - At most ONE promotion applies per line (the one giving the customer the
 *    biggest discount). Promotions never stack with each other.
 *  - A promotion discount is added on top of any manual line discount, capped
 *    at the line value, and skipped for a line if the net unit price would fall
 *    below cost (unless the promotion explicitly allows it).
 *  - Whoever creates a promotion cannot activate it (unless they hold
 *    admin.system.manage).
 */
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";

export const PROMO_TYPES = ["PERCENT_OFF", "AMOUNT_OFF", "BUY_X_GET_Y"] as const;
export const PROMO_SCOPES = ["ALL", "CATEGORY", "PRODUCT"] as const;

export interface PromoLineInput {
  productId: string;
  quantity: number;
  unitPrice: number;
  /** Manual discount already on the line (absolute, pre-tax). */
  manualDiscount?: number;
}
export interface AppliedPromo {
  promotionId: string;
  code: string;
  name: string;
  amount: number;
}
export interface PromoLineResult {
  productId: string;
  discount: number;
  promotion: AppliedPromo | null;
}

export interface PromoCtx {
  userId: string;
  perms: string[];
}

const bad = (msg: string) => new AppError(ErrorCode.VALIDATION_ERROR, 400, msg);
const nf = (msg = "Promotion not found") => new AppError(ErrorCode.NOT_FOUND, 404, msg);

type PromoRow = NonNullable<Awaited<ReturnType<typeof prisma.promotion.findFirst>>>;

function discountFor(p: PromoRow, qty: number, unitPrice: number): number {
  const lineValue = Math.floor(qty * unitPrice);
  if (qty < (p.minQuantity || 1)) return 0;
  let d = 0;
  if (p.type === "PERCENT_OFF") d = Math.floor((lineValue * p.value) / 100);
  else if (p.type === "AMOUNT_OFF") d = Math.floor(p.value * qty);
  else if (p.type === "BUY_X_GET_Y") {
    const buy = p.buyQty ?? 0;
    const get = p.getQty ?? 0;
    if (buy < 1 || get < 1) return 0;
    const free = Math.floor(qty / (buy + get)) * get;
    d = Math.floor(free * unitPrice);
  }
  return Math.max(0, Math.min(d, lineValue));
}

export class PromotionService {
  // ------------------------------------------------------------ evaluation

  /** Best single promotion per line. Pure read: safe to call for previews. */
  static async evaluate(input: { branchId?: string | null; lines: PromoLineInput[]; at?: Date }): Promise<Map<string, PromoLineResult>> {
    const at = input.at ?? new Date();
    const out = new Map<string, PromoLineResult>();
    if (input.lines.length === 0) return out;

    const promos = await prisma.promotion.findMany({
      where: { status: "ACTIVE", startsAt: { lte: at }, endsAt: { gte: at } },
    });
    if (promos.length === 0) return out;

    const products = await prisma.product.findMany({
      where: { id: { in: input.lines.map((l) => l.productId) } },
      select: { id: true, category: true, cost_price: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    for (const line of input.lines) {
      const product = byId.get(line.productId);
      if (!product) continue;
      const lineValue = Math.floor(line.quantity * line.unitPrice);
      const manual = Math.max(0, line.manualDiscount ?? 0);
      const room = Math.max(0, lineValue - manual);
      if (room <= 0) continue;

      let best: { p: PromoRow; amount: number } | null = null;
      for (const p of promos) {
        const branches = p.branchIds ?? [];
        if (branches.length > 0 && (!input.branchId || !branches.includes(input.branchId))) continue;
        if (p.scope === "PRODUCT" && !(p.productIds ?? []).includes(line.productId)) continue;
        if (p.scope === "CATEGORY" && !(product.category && (p.categories ?? []).includes(product.category))) continue;

        let amount = Math.min(discountFor(p, line.quantity, line.unitPrice), room);
        if (amount <= 0) continue;
        if (!p.allowBelowCost) {
          const netUnit = (lineValue - manual - amount) / line.quantity;
          if (netUnit < product.cost_price) continue;
        }
        amount = Math.floor(amount);
        if (!best || amount > best.amount) best = { p, amount };
      }
      if (best) {
        out.set(line.productId, {
          productId: line.productId,
          discount: best.amount,
          promotion: { promotionId: best.p.id, code: best.p.code, name: best.p.name, amount: best.amount },
        });
      }
    }
    return out;
  }

  /** Preview for the till: looks up catalogue prices itself. */
  static async preview(branchId: string | null, items: { productId: string; quantity: number }[]) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const products = await prisma.product.findMany({
      where: { id: { in: items.map((i) => i.productId) }, isActive: true },
      select: { id: true, unit_price: true },
    });
    const price = new Map(products.map((p) => [p.id, p.unit_price]));
    const lines = items
      .filter((i) => price.has(i.productId) && Number(i.quantity) > 0)
      .map((i) => ({ productId: i.productId, quantity: Math.floor(Number(i.quantity)), unitPrice: price.get(i.productId)! }));
    const res = await PromotionService.evaluate({ branchId, lines });
    return [...res.values()];
  }

  /** Called inside the sale transaction, after the invoice row exists. */
  static async recordRedemptions(
    tx: { promotionRedemption: { createMany: (args: { data: any[] }) => Promise<unknown> } },
    input: { salesDocumentId: string; branchId?: string | null; lines: { productId: string; quantity: number; promotion: AppliedPromo | null }[] },
  ) {
    const data = input.lines
      .filter((l) => l.promotion && l.promotion.amount > 0)
      .map((l) => ({
        promotionId: l.promotion!.promotionId,
        salesDocumentId: input.salesDocumentId,
        productId: l.productId,
        branchId: input.branchId ?? null,
        quantity: l.quantity,
        amount: l.promotion!.amount,
      }));
    if (data.length) await tx.promotionRedemption.createMany({ data });
  }

  // ------------------------------------------------------------ management

  private static async autoEnd() {
    await prisma.promotion.updateMany({ where: { status: "ACTIVE", endsAt: { lt: new Date() } }, data: { status: "ENDED" } });
  }

  static async options() {
    const [cats, branches] = await Promise.all([
      prisma.product.findMany({ where: { category: { not: null } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
      prisma.branch.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    return { categories: cats.map((c) => c.category as string), branches };
  }

  static async productSearch(q: string) {
    const s = (q ?? "").trim();
    if (s.length < 2) return [];
    return prisma.product.findMany({
      where: { isActive: true, OR: [{ name: { contains: s, mode: "insensitive" } }, { sku: { contains: s, mode: "insensitive" } }] },
      select: { id: true, name: true, sku: true, unit_price: true },
      take: 15,
    });
  }

  static async list(status?: string) {
    await PromotionService.autoEnd();
    const rows = await prisma.promotion.findMany({
      where: status ? { status } : {},
      orderBy: [{ createdAt: "desc" }],
    });
    const stats = await prisma.promotionRedemption.groupBy({
      by: ["promotionId"],
      where: { promotionId: { in: rows.map((r) => r.id) } },
      _sum: { amount: true, quantity: true },
      _count: { _all: true },
    });
    const sm = new Map(stats.map((s) => [s.promotionId, s]));
    return rows.map((r) => ({
      ...r,
      redemptions: sm.get(r.id)?._count._all ?? 0,
      discountGiven: sm.get(r.id)?._sum.amount ?? 0,
    }));
  }

  static async get(id: string) {
    const p = await prisma.promotion.findUnique({ where: { id } });
    if (!p) throw nf();
    const agg = await prisma.promotionRedemption.aggregate({
      where: { promotionId: id },
      _sum: { amount: true, quantity: true },
      _count: { _all: true },
    });
    return { ...p, redemptions: agg._count._all, discountGiven: agg._sum.amount ?? 0, unitsDiscounted: agg._sum.quantity ?? 0 };
  }

  private static clean(d: any) {
    const type = String(d.type ?? "");
    if (!PROMO_TYPES.includes(type as any)) throw bad("Choose a promotion type");
    const scope = String(d.scope ?? "ALL");
    if (!PROMO_SCOPES.includes(scope as any)) throw bad("Invalid scope");
    const name = String(d.name ?? "").trim();
    if (name.length < 3) throw bad("Give the promotion a name");
    const startsAt = new Date(d.startsAt);
    const endsAt = new Date(d.endsAt);
    if (isNaN(+startsAt) || isNaN(+endsAt)) throw bad("Start and end dates are required");
    if (endsAt <= startsAt) throw bad("The end must be after the start");
    const value = Number(d.value ?? 0);
    let buyQty: number | null = null;
    let getQty: number | null = null;
    if (type === "PERCENT_OFF" && !(value > 0 && value <= 100)) throw bad("Percentage must be between 0 and 100");
    if (type === "AMOUNT_OFF" && !(value > 0)) throw bad("Enter the amount off per unit");
    if (type === "BUY_X_GET_Y") {
      buyQty = Math.floor(Number(d.buyQty));
      getQty = Math.floor(Number(d.getQty));
      if (!(buyQty >= 1 && getQty >= 1)) throw bad("Buy and free quantities must be at least 1");
    }
    const categories: string[] = scope === "CATEGORY" ? (d.categories ?? []).map(String) : [];
    const productIds: string[] = scope === "PRODUCT" ? (d.productIds ?? []).map(String) : [];
    if (scope === "CATEGORY" && categories.length === 0) throw bad("Pick at least one category");
    if (scope === "PRODUCT" && productIds.length === 0) throw bad("Pick at least one product");
    return {
      name,
      description: d.description ? String(d.description) : null,
      type,
      value: type === "BUY_X_GET_Y" ? 0 : value,
      buyQty,
      getQty,
      scope,
      categories,
      productIds,
      branchIds: (d.branchIds ?? []).map(String),
      minQuantity: Math.max(1, Math.floor(Number(d.minQuantity ?? 1))),
      startsAt,
      endsAt,
      allowBelowCost: !!d.allowBelowCost,
    };
  }

  static async create(ctx: PromoCtx, d: any) {
    const data = PromotionService.clean(d);
    const code = String(d.code ?? "").trim().toUpperCase() || `PR-${Date.now().toString(36).toUpperCase()}`;
    if (await prisma.promotion.findUnique({ where: { code } })) throw bad(`Code ${code} is already used`);
    return prisma.promotion.create({ data: { ...data, code, status: "DRAFT", createdById: ctx.userId } });
  }

  static async update(ctx: PromoCtx, id: string, d: any) {
    const p = await prisma.promotion.findUnique({ where: { id } });
    if (!p) throw nf();
    if (!["DRAFT", "PAUSED"].includes(p.status)) throw bad("Only draft or paused promotions can be edited. Pause it first.");
    const data = PromotionService.clean(d);
    // Editing an already-approved promotion sends it back for a fresh activation.
    return prisma.promotion.update({
      where: { id },
      data: { ...data, ...(p.activatedById ? { status: "DRAFT", activatedById: null, activatedAt: null } : {}) },
    });
  }

  static async activate(ctx: PromoCtx, id: string) {
    const p = await prisma.promotion.findUnique({ where: { id } });
    if (!p) throw nf();
    if (p.status !== "DRAFT") throw bad("Only draft promotions can be activated");
    if (p.createdById === ctx.userId && !ctx.perms.includes("admin.system.manage")) {
      throw new AppError(ErrorCode.FORBIDDEN, 403, "Someone other than the person who created a promotion must activate it");
    }
    if (p.endsAt <= new Date()) throw bad("This promotion has already ended. Change its dates first.");
    return prisma.promotion.update({ where: { id }, data: { status: "ACTIVE", activatedById: ctx.userId, activatedAt: new Date() } });
  }

  static async pause(id: string) {
    const p = await prisma.promotion.findUnique({ where: { id } });
    if (!p) throw nf();
    if (p.status !== "ACTIVE") throw bad("Only active promotions can be paused");
    return prisma.promotion.update({ where: { id }, data: { status: "PAUSED" } });
  }

  /** Resume a paused promotion that was already approved and not edited. */
  static async resume(id: string) {
    const p = await prisma.promotion.findUnique({ where: { id } });
    if (!p) throw nf();
    if (p.status !== "PAUSED" || !p.activatedById) throw bad("Only a paused, previously approved promotion can be resumed");
    if (p.endsAt <= new Date()) throw bad("This promotion has already ended");
    return prisma.promotion.update({ where: { id }, data: { status: "ACTIVE" } });
  }

  static async end(id: string) {
    const p = await prisma.promotion.findUnique({ where: { id } });
    if (!p) throw nf();
    if (p.status === "ENDED") return p;
    return prisma.promotion.update({ where: { id }, data: { status: "ENDED" } });
  }
}

export default PromotionService;
