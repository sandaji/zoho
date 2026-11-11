import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";

/**
 * Customer statement: every invoice, credit note, payment and void for one customer, in date order,
 * with debit, credit and a cumulative balance. Built live from the sales documents and payments,
 * so it can never drift from them and needs no extra posting step.
 *
 *   Debit  = customer owes more  (invoice)
 *   Credit = customer owes less  (payment, credit note, void reversal)
 *   Balance = cumulative debit - credit (positive = customer owes us)
 *
 * Payments with method "credit" are on-account sales, not money received, so they are not receipts.
 */

const INVOICE_TYPES = ["OPEN_INVOICE", "CLOSED_INVOICE", "INVOICE"];
const NOT_POSTED = ["DRAFT", "PARKED", "HELD"];
const r2 = (n: number) => Math.round(n * 100) / 100;
const MAX_ENTRIES = 5000;

export type LedgerKind = "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "VOID";

export interface LedgerEntry {
  date: string; // ISO
  kind: LedgerKind;
  invoiceNumber: string; // the invoice this line belongs to
  description: string;
  method: string | null;
  paymentReference: string | null;
  debit: number;
  credit: number;
  balance: number;
  salesDocumentId: string | null;
  branchId: string | null;
  recordedBy: string | null;
}

const ORDER: Record<LedgerKind, number> = { INVOICE: 0, CREDIT_NOTE: 1, PAYMENT: 2, VOID: 3 };

export class CustomerLedgerService {
  static async statement(customerId: string, opts: { from?: string; to?: string } = {}) {
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new AppError(ErrorCode.NOT_FOUND, 404, "Customer not found");

    const from = opts.from ? new Date(opts.from + "T00:00:00.000Z") : null;
    const to = opts.to ? new Date(opts.to + "T23:59:59.999Z") : null;
    if ((from && isNaN(+from)) || (to && isNaN(+to))) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Dates must look like 2026-11-30");
    }

    const [docs, payments] = await Promise.all([
      prisma.salesDocument.findMany({
        where: {
          customerId,
          type: { in: [...INVOICE_TYPES, "CREDIT_NOTE"] as any },
          status: { notIn: NOT_POSTED as any },
        },
        select: {
          id: true,
          documentId: true,
          invoiceNumber: true,
          type: true,
          status: true,
          total: true,
          issueDate: true,
          updatedAt: true,
          branchId: true,
          createdById: true,
          sourceDocumentId: true,
          sourceDocument: { select: { documentId: true, invoiceNumber: true } },
        },
      }),
      prisma.payment.findMany({
        where: { customerId, NOT: { method: "credit" as any } },
        select: {
          id: true,
          amount: true,
          paymentDate: true,
          method: true,
          reference: true,
          createdById: true,
          notes: true,
          salesDocumentId: true,
          salesDocument: { select: { id: true, documentId: true, invoiceNumber: true, branchId: true } },
        },
      }),
    ]);

    const label = (d: { invoiceNumber: string | null; documentId: string }) => d.invoiceNumber || d.documentId;

    type Raw = Omit<LedgerEntry, "balance" | "date"> & { at: Date };
    const raw: Raw[] = [];

    for (const d of docs) {
      const isCredit = d.type === "CREDIT_NOTE";
      const num = label(d);
      if (isCredit) {
        raw.push({
          at: d.issueDate,
          kind: "CREDIT_NOTE",
          invoiceNumber: d.sourceDocument ? label(d.sourceDocument) : num,
          description: `Credit note ${num}${d.sourceDocument ? ` against ${label(d.sourceDocument)}` : ""}`,
          method: null,
          paymentReference: null,
          debit: 0,
          credit: r2(Math.abs(d.total)),
          salesDocumentId: d.id,
          branchId: d.branchId,
          recordedBy: d.createdById,
        });
        continue;
      }
      raw.push({
        at: d.issueDate,
        kind: "INVOICE",
        invoiceNumber: num,
        description: `Invoice ${num}`,
        method: null,
        paymentReference: null,
        debit: r2(d.total),
        credit: 0,
        salesDocumentId: d.id,
        branchId: d.branchId,
        recordedBy: d.createdById,
      });
      if (d.status === "VOID") {
        // Keep the original invoice visible and show it being cancelled, so the history stays honest.
        raw.push({
          at: d.updatedAt > d.issueDate ? d.updatedAt : d.issueDate,
          kind: "VOID",
          invoiceNumber: num,
          description: `Invoice ${num} voided`,
          method: null,
          paymentReference: null,
          debit: 0,
          credit: r2(d.total),
          salesDocumentId: d.id,
          branchId: d.branchId,
          recordedBy: null,
        });
      }
    }

    for (const p of payments) {
      const num = p.salesDocument ? label(p.salesDocument) : "—";
      raw.push({
        at: p.paymentDate,
        kind: "PAYMENT",
        invoiceNumber: num,
        description: `Payment received${p.notes ? ` — ${p.notes}` : ""}`,
        method: String(p.method),
        paymentReference: p.reference ?? null,
        debit: 0,
        credit: r2(p.amount),
        salesDocumentId: p.salesDocumentId,
        branchId: p.salesDocument?.branchId ?? null,
        recordedBy: p.createdById,
      });
    }

    raw.sort((a, b) => +a.at - +b.at || ORDER[a.kind] - ORDER[b.kind]);

    // Cumulative balance across the full history, then cut the requested window.
    let running = 0;
    const all: LedgerEntry[] = raw.map((e) => {
      running = r2(running + e.debit - e.credit);
      const { at, ...rest } = e;
      return { ...rest, date: at.toISOString(), balance: running };
    });
    const fullClosing = running;

    const inWindow = all.filter((e) => (!from || new Date(e.date) >= from) && (!to || new Date(e.date) <= to));
    const openingBalance = from ? this.balanceBefore(all, from) : 0;

    const entries = inWindow.slice(-MAX_ENTRIES);
    const totalDebit = r2(inWindow.reduce((s, e) => s + e.debit, 0));
    const totalCredit = r2(inWindow.reduce((s, e) => s + e.credit, 0));
    const closingBalance = r2(openingBalance + totalDebit - totalCredit);

    // Name lookups for "recorded by" and the salesman
    const userIds = Array.from(new Set([customer.salesmanId, ...entries.map((e) => e.recordedBy)].filter(Boolean) as string[]));
    const users = userIds.length
      ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } })
      : [];
    const nameOf = new Map(users.map((u) => [u.id, u.name]));

    const recorded = Number(customer.currentBalance);
    return {
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        creditLimit: Number(customer.creditLimit),
        salesmanId: customer.salesmanId,
        salesmanName: customer.salesmanId ? nameOf.get(customer.salesmanId) ?? null : null,
      },
      from: opts.from ?? null,
      to: opts.to ?? null,
      openingBalance,
      totalDebit,
      totalCredit,
      closingBalance,
      // Balance through today regardless of the window, compared with the figure stored on the customer.
      currentLedgerBalance: fullClosing,
      recordedBalance: r2(recorded),
      difference: r2(recorded - fullClosing),
      truncated: inWindow.length > MAX_ENTRIES,
      entries: entries.map((e) => ({ ...e, recordedByName: e.recordedBy ? nameOf.get(e.recordedBy) ?? null : null })),
    };
  }

  private static balanceBefore(all: LedgerEntry[], from: Date) {
    let b = 0;
    for (const e of all) {
      if (new Date(e.date) < from) b = e.balance;
      else break;
    }
    return b;
  }

  static async csv(customerId: string, opts: { from?: string; to?: string }) {
    const s = await this.statement(customerId, opts);
    const esc = (v: unknown) => {
      let t = v === null || v === undefined ? "" : String(v);
      if (/^[=+\-@]/.test(t)) t = "'" + t; // stop spreadsheet formula injection
      return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
    };
    const lines = [
      `Statement for ${s.customer.name} (${s.customer.code})`,
      `Salesman,${esc(s.customer.salesmanName ?? "Unassigned")}`,
      `Period,${s.from ?? "start"},${s.to ?? "today"}`,
      `Opening balance,${s.openingBalance}`,
      "",
      "Date,Invoice No,Type,Description,Method,Reference,Debit,Credit,Balance,Recorded by",
      ...s.entries.map((e) =>
        [e.date.slice(0, 10), e.invoiceNumber, e.kind, e.description, e.method, e.paymentReference, e.debit || "", e.credit || "", e.balance, e.recordedByName]
          .map(esc)
          .join(","),
      ),
      `,,,,,,${s.totalDebit},${s.totalCredit},${s.closingBalance},Closing balance`,
    ];
    return { filename: `statement-${s.customer.code}.csv`, body: lines.join("\r\n") };
  }

  /** People who can be assigned as a customer's salesman: active users with system access. */
  static async salesmen() {
    return prisma.user.findMany({
      where: { isActive: true, hasSystemAccess: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    });
  }

  static async assertValidSalesman(userId: string) {
    const u = await prisma.user.findFirst({ where: { id: userId, isActive: true }, select: { id: true } });
    if (!u) throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "That salesman does not exist or is inactive");
  }
}
