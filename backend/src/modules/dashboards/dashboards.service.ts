import { prisma } from "@core/database/db";

/**
 * Read-only aggregations for the role dashboards.
 * `branchIds` is undefined for head-office / GLOBAL callers and a list for branch-scoped ones.
 */
export interface DashScope {
  branchIds?: string[];
}

const NET_TYPES = ["INVOICE", "OPEN_INVOICE", "CLOSED_INVOICE"] as const;
const round = (n: number) => Math.round(n * 100) / 100;
const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export class DashboardsService {
  private salesWhere(s: DashScope, from: Date, to?: Date) {
    return {
      status: { notIn: ["VOID", "DRAFT"] as any },
      issueDate: { gte: from, ...(to && { lt: to }) },
      ...(s.branchIds && { branchId: { in: s.branchIds } }),
    };
  }

  /** Net sales (invoices minus credit notes) between two dates. */
  private async netSales(s: DashScope, from: Date, to?: Date) {
    const [inv, cn] = await Promise.all([
      prisma.salesDocument.aggregate({
        where: { ...this.salesWhere(s, from, to), type: { in: NET_TYPES as any } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.salesDocument.aggregate({
        where: { ...this.salesWhere(s, from, to), type: "CREDIT_NOTE" as any },
        _sum: { total: true },
      }),
    ]);
    return {
      total: round((inv._sum.total ?? 0) - Math.abs(cn._sum.total ?? 0)),
      count: inv._count,
      refunds: round(Math.abs(cn._sum.total ?? 0)),
    };
  }

  private async pendingApprovals(s: DashScope, entityTypes?: string[]) {
    const where: any = { status: "PENDING", ...(entityTypes && { entityType: { in: entityTypes } }) };
    if (s.branchIds) where.OR = [{ branchId: { in: s.branchIds } }, { branchId: null }];
    const rows = await prisma.workflowInstance.groupBy({ by: ["entityType"], where, _count: true, _sum: { amount: true } });
    return rows.map((r) => ({ entityType: r.entityType, count: r._count, amount: round(r._sum.amount ?? 0) }));
  }

  // ----------------------------------------------------------------- executive

  async executive(s: DashScope) {
    const now = new Date();
    const today = startOfDay(now);
    const monthStart = startOfMonth(now);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevSameDay = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), 28), 23, 59, 59);

    const branchFilter = s.branchIds ? { branch_id: { in: s.branchIds } } : {};
    const [todaySales, mtd, prevMtd, ar, arOver, ap, apOver, findings, expensesPending, approvals, branchRows] = await Promise.all([
      this.netSales(s, today),
      this.netSales(s, monthStart),
      this.netSales(s, prevMonthStart, prevSameDay),
      prisma.accountReceivable.aggregate({ where: { ...branchFilter, balance: { gt: 0 } }, _sum: { balance: true } }),
      prisma.accountReceivable.aggregate({ where: { ...branchFilter, balance: { gt: 0 }, due_date: { lt: now } }, _sum: { balance: true }, _count: true }),
      prisma.accountPayable.aggregate({ where: { ...branchFilter, balance: { gt: 0 } }, _sum: { balance: true } }),
      prisma.accountPayable.aggregate({ where: { ...branchFilter, balance: { gt: 0 }, due_date: { lt: now } }, _sum: { balance: true }, _count: true }),
      prisma.auditFinding.groupBy({ by: ["severity"], where: { status: { in: ["OPEN", "ACKNOWLEDGED", "IN_REMEDIATION"] } }, _count: true }),
      prisma.expenseReport.aggregate({ where: { status: "SUBMITTED" as any, ...(s.branchIds && { branchId: { in: s.branchIds } }) }, _sum: { totalAmount: true }, _count: true }),
      this.pendingApprovals(s),
      prisma.salesDocument.groupBy({
        by: ["branchId"],
        where: { ...this.salesWhere(s, monthStart), type: { in: NET_TYPES as any } },
        _sum: { total: true },
      }),
    ]);

    const branches = branchRows.length
      ? await prisma.branch.findMany({ where: { id: { in: branchRows.map((b) => b.branchId) } }, select: { id: true, name: true } })
      : [];
    const nameOf = new Map(branches.map((b) => [b.id, b.name]));

    const inv = await this.inventoryValue(s);
    const growth = prevMtd.total > 0 ? round(((mtd.total - prevMtd.total) / prevMtd.total) * 100) : null;
    const cash = await this.cashflow(s);

    return {
      generatedAt: now.toISOString(),
      sales: { today: todaySales, monthToDate: mtd, previousMonthSamePeriod: prevMtd.total, growthPct: growth },
      branches: branchRows
        .map((b) => ({ branchId: b.branchId, name: nameOf.get(b.branchId) ?? b.branchId, revenue: round(b._sum.total ?? 0) }))
        .sort((a, b) => b.revenue - a.revenue),
      receivables: { outstanding: round(ar._sum.balance ?? 0), overdue: round(arOver._sum.balance ?? 0), overdueCount: arOver._count },
      payables: { outstanding: round(ap._sum.balance ?? 0), overdue: round(apOver._sum.balance ?? 0), overdueCount: apOver._count },
      cashflow: cash,
      inventory: inv,
      expenses: { pendingCount: expensesPending._count, pendingAmount: round(expensesPending._sum.totalAmount ?? 0) },
      approvals,
      pendingApprovalCount: approvals.reduce((n, a) => n + a.count, 0),
      auditFindings: Object.fromEntries(findings.map((f) => [f.severity, f._count])),
    };
  }

  private async cashflow(s: DashScope) {
    const from = startOfMonth();
    const [inflow] = await Promise.all([
      prisma.payment.aggregate({
        where: { paymentDate: { gte: from }, ...(s.branchIds && { salesDocument: { branchId: { in: s.branchIds } } }) },
        _sum: { amount: true },
      }),
    ]);
    return { collectedThisMonth: round(inflow._sum.amount ?? 0) };
  }

  private async inventoryValue(s: DashScope) {
    const rows = await prisma.inventory.findMany({
      where: { quantity: { gt: 0 }, ...(s.branchIds && { warehouse: { branchId: { in: s.branchIds } } }) },
      select: { quantity: true, product: { select: { cost_price: true } } },
      take: 50000,
    });
    const value = rows.reduce((sum, r) => sum + r.quantity * (r.product?.cost_price ?? 0), 0);
    const [low, out] = await Promise.all([
      prisma.inventory.count({ where: { status: "low_stock", ...(s.branchIds && { warehouse: { branchId: { in: s.branchIds } } }) } }),
      prisma.inventory.count({ where: { status: "out_of_stock", ...(s.branchIds && { warehouse: { branchId: { in: s.branchIds } } }) } }),
    ]);
    return { value: round(value), lowStock: low, outOfStock: out };
  }

  // ----------------------------------------------------------------- inventory

  async inventory(s: DashScope) {
    const wh = s.branchIds ? { warehouse: { branchId: { in: s.branchIds } } } : {};
    const since = new Date(Date.now() - 7 * 86_400_000);
    const [value, attention, movements, warehouses, pending] = await Promise.all([
      this.inventoryValue(s),
      prisma.inventory.findMany({
        where: { status: { in: ["low_stock", "out_of_stock"] as any }, ...wh },
        select: {
          id: true,
          quantity: true,
          available: true,
          status: true,
          product: { select: { name: true, sku: true } },
          warehouse: { select: { name: true } },
        },
        orderBy: { available: "asc" },
        take: 15,
      }),
      prisma.stockMovement.groupBy({
        by: ["type"],
        where: { createdAt: { gte: since }, ...(s.branchIds && { warehouse: { branchId: { in: s.branchIds } } }) },
        _count: true,
        _sum: { quantity: true },
      }),
      prisma.inventory.groupBy({ by: ["warehouseId"], where: wh, _sum: { quantity: true } }),
      this.pendingApprovals(s, ["STOCK_ADJUSTMENT", "STOCK_TRANSFER"]),
    ]);
    const names = warehouses.length
      ? await prisma.warehouse.findMany({ where: { id: { in: warehouses.map((w) => w.warehouseId) } }, select: { id: true, name: true } })
      : [];
    const nameOf = new Map(names.map((n) => [n.id, n.name]));
    return {
      generatedAt: new Date().toISOString(),
      value,
      needsAttention: attention.map((a) => ({
        id: a.id,
        product: a.product?.name,
        sku: a.product?.sku,
        warehouse: a.warehouse?.name,
        quantity: a.quantity,
        available: a.available,
        status: a.status,
      })),
      movementsLast7Days: movements.map((m) => ({ type: m.type, count: m._count, units: m._sum.quantity ?? 0 })),
      stockByWarehouse: warehouses
        .map((w) => ({ warehouse: nameOf.get(w.warehouseId) ?? w.warehouseId, units: w._sum.quantity ?? 0 }))
        .sort((a, b) => b.units - a.units),
      pendingApprovals: pending,
    };
  }

  // --------------------------------------------------------------------- sales

  async sales(s: DashScope, userId?: string, ownOnly = false) {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const since = startOfDay(new Date(now.getTime() - 13 * 86_400_000));
    const own = ownOnly && userId ? { createdById: userId } : {};

    const [docs, byUser, items, ar, today, mtd] = await Promise.all([
      prisma.salesDocument.findMany({
        where: { ...this.salesWhere(s, since), ...own, type: { in: NET_TYPES as any } },
        select: { issueDate: true, total: true },
        take: 30000,
      }),
      prisma.salesDocument.groupBy({
        by: ["createdById"],
        where: { ...this.salesWhere(s, monthStart), ...own, type: { in: NET_TYPES as any } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.salesDocumentItem.groupBy({
        by: ["productId"],
        where: { salesDocument: { ...this.salesWhere(s, monthStart), ...own, type: { in: NET_TYPES as any } } },
        _sum: { total: true, quantity: true },
        orderBy: { _sum: { total: "desc" } },
        take: 8,
      }),
      prisma.accountReceivable.aggregate({
        where: { ...(s.branchIds && { branch_id: { in: s.branchIds } }), balance: { gt: 0 }, due_date: { lt: now } },
        _sum: { balance: true },
        _count: true,
      }),
      this.netSales(s, startOfDay(now)),
      this.netSales(s, monthStart),
    ]);

    const series = new Map<string, number>();
    for (let i = 0; i < 14; i++) series.set(dayKey(new Date(since.getTime() + i * 86_400_000)), 0);
    for (const d of docs) {
      const k = dayKey(d.issueDate);
      if (series.has(k)) series.set(k, (series.get(k) ?? 0) + d.total);
    }

    const topUsers = byUser.sort((a, b) => (b._sum.total ?? 0) - (a._sum.total ?? 0)).slice(0, 8);
    const [users, products, pending] = await Promise.all([
      topUsers.length ? prisma.user.findMany({ where: { id: { in: topUsers.map((u) => u.createdById) } }, select: { id: true, name: true, email: true } }) : [],
      items.length ? prisma.product.findMany({ where: { id: { in: items.map((i) => i.productId) } }, select: { id: true, name: true } }) : [],
      this.pendingApprovals(s, ["PRICE_OVERRIDE", "CREDIT_NOTE"]),
    ]);
    const uName = new Map(users.map((u) => [u.id, u.name || u.email]));
    const pName = new Map(products.map((p) => [p.id, p.name]));

    return {
      generatedAt: now.toISOString(),
      today,
      monthToDate: mtd,
      daily: [...series.entries()].map(([date, total]) => ({ date, total: round(total) })),
      topSellers: topUsers.map((u) => ({ userId: u.createdById, name: uName.get(u.createdById) ?? "Unknown", revenue: round(u._sum.total ?? 0), documents: u._count })),
      topProducts: items.map((i) => ({ productId: i.productId, name: pName.get(i.productId) ?? "Unknown", revenue: round(i._sum.total ?? 0), units: i._sum.quantity ?? 0 })),
      overdueReceivables: { amount: round(ar._sum.balance ?? 0), count: ar._count },
      pendingApprovals: pending,
    };
  }
}

export default new DashboardsService();
