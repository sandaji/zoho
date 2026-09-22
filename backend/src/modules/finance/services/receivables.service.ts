// backend/src/modules/finance/services/receivables.service.ts
//
// Accounts receivable data lives on SalesDocument (type INVOICE) and
// Customer.currentBalance — the invoice lifecycle in
// pos/services/sales.service.ts already tracks paymentStatus/paidAmount/
// balance/dueDate per invoice. The separate AccountReceivable table
// (accounts_receivable) is a parallel model nothing in the app ever writes
// to; these reads/writes go straight to the real source instead.
import { prisma } from '@core/database/db';
import { Prisma } from "../../../generated";
import {
  SalesDocumentType,
  SalesDocumentStatus,
  PaymentStatus,
} from "../../../generated/enums.js";
import { AppError, ErrorCode } from '@core/errors/errors';
import { AccountingService, DEFAULT_ACCOUNTS } from "./accounting.service";
import { JournalEntryService } from "./journal-entry.service";
import { SalesService } from "../../pos/services/sales.service";

// A "receivable" is an issued invoice that hasn't been fully paid or voided.
// PARKED/HELD carts are excluded — they're suspended POS transactions, not
// finalized customer obligations, even though they're stored as type
// INVOICE with paymentStatus UNPAID.
const OPEN_INVOICE_STATUSES: SalesDocumentStatus[] = [
  SalesDocumentStatus.SENT,
  SalesDocumentStatus.PARTIALLY_PAID,
];

function daysOverdue(dueDate: Date | null, today: Date): number {
  if (!dueDate || today <= dueDate) return 0;
  return Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
}

function toARShape(doc: {
  id: string;
  documentId: string;
  branchId: string;
  total: number;
  paidAmount: number;
  balance: number;
  issueDate: Date;
  dueDate: Date | null;
  paymentStatus: PaymentStatus | null;
  customer: { name: string; email: string | null; phone: string | null } | null;
  payments?: unknown;
}) {
  return {
    id: doc.id,
    invoice_no: doc.documentId,
    customer_name: doc.customer?.name ?? "Walk-in / No customer",
    customer_email: doc.customer?.email ?? null,
    customer_phone: doc.customer?.phone ?? null,
    branch_id: doc.branchId,
    total_amount: doc.total,
    paid_amount: doc.paidAmount,
    balance: doc.balance,
    invoice_date: doc.issueDate,
    due_date: doc.dueDate,
    status: doc.paymentStatus === PaymentStatus.PARTIALLY_PAID ? "partial" : "outstanding",
    aging_days: daysOverdue(doc.dueDate, new Date()),
    payments: doc.payments,
  };
}

export class ReceivablesService {
  /**
   * Get all open receivables (unpaid/partially-paid invoices) with customer info
   */
  static async getAllReceivables() {
    const invoices = await prisma.salesDocument.findMany({
      where: {
        type: SalesDocumentType.INVOICE,
        balance: { gt: 0 },
        status: { in: OPEN_INVOICE_STATUSES },
      },
      include: { customer: true, payments: true },
      orderBy: { dueDate: "asc" },
    });

    return invoices.map(toARShape);
  }

  /**
   * Record a payment against an invoice and post to GL.
   *
   * `receivableId` is a SalesDocument id (what getAllReceivables now
   * returns as `id`). The actual payment/balance/customer-balance/treasury
   * movement is delegated to SalesService.recordPayment — the same path a
   * cashier recording an invoice payment through the POS/sales UI uses, so
   * there's one place that owns "what happens when an invoice gets paid."
   * This method adds the AR-clearing GL entry on top, since
   * SalesService.recordPayment doesn't post to the GL itself.
   */
  static async recordPayment(data: {
    receivableId: string;
    amount: number;
    paymentMethod: string;
    referenceNo: string;
    userId: string;
  }) {
    const invoice = await prisma.salesDocument.findUnique({
      where: { id: data.receivableId },
    });

    if (!invoice || invoice.type !== SalesDocumentType.INVOICE) {
      throw new AppError(
        ErrorCode.NOT_FOUND as any,
        404,
        "Receivable not found",
      );
    }
    if (data.amount > invoice.balance) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR as any,
        400,
        "Payment amount exceeds balance",
      );
    }

    const payment = await SalesService.recordPayment({
      documentId: data.receivableId,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      reference: data.referenceNo,
      userId: data.userId,
    });

    // Post to General Ledger: DR Cash (Bank/Mobile Money) / CR Accounts Receivable
    const arAccount = await AccountingService.getEnsureAccount(
      DEFAULT_ACCOUNTS.ACCOUNTS_RECEIVABLE,
    );

    let assetAccountDef = DEFAULT_ACCOUNTS.CASH_ON_HAND;
    if (data.paymentMethod === "mpesa")
      assetAccountDef = DEFAULT_ACCOUNTS.MOBILE_MONEY;
    else if (
      data.paymentMethod === "card" ||
      data.paymentMethod === "bank_transfer"
    )
      assetAccountDef = DEFAULT_ACCOUNTS.BANK_ACCOUNT;

    const assetAccount = await AccountingService.getEnsureAccount(assetAccountDef);

    await JournalEntryService.createJournalEntry({
      entryDate: new Date(),
      description: `AR Payment Collection for Invoice #${invoice.documentId} (${payment.id})`,
      lines: [
        {
          accountId: assetAccount.id,
          debit: new Prisma.Decimal(data.amount),
          credit: new Prisma.Decimal(0),
          description: `Collection via ${data.paymentMethod}`,
        },
        {
          accountId: arAccount.id,
          debit: new Prisma.Decimal(0),
          credit: new Prisma.Decimal(data.amount),
          description: `Clear AR Invoice #${invoice.documentId}`,
        },
      ],
      sourceType: "AR_PAYMENT",
      sourceId: payment.id,
      createdBy: data.userId,
    });

    return payment;
  }

  /**
   * Get Aging Report
   */
  static async getAgingReport() {
    const today = new Date();
    const invoices = await prisma.salesDocument.findMany({
      where: {
        type: SalesDocumentType.INVOICE,
        balance: { gt: 0 },
        status: { in: OPEN_INVOICE_STATUSES },
      },
    });

    const report = {
      current: 0,
      "1-30_days": 0,
      "31-60_days": 0,
      "61-90_days": 0,
      over_90_days: 0,
      total: 0,
    };

    invoices.forEach((doc) => {
      const days = daysOverdue(doc.dueDate, today);

      if (days === 0) {
        report.current += doc.balance;
      } else if (days <= 30) {
        report["1-30_days"] += doc.balance;
      } else if (days <= 60) {
        report["31-60_days"] += doc.balance;
      } else if (days <= 90) {
        report["61-90_days"] += doc.balance;
      } else {
        report.over_90_days += doc.balance;
      }
      report.total += doc.balance;
    });

    return report;
  }

  /**
   * Resolve a receivable by (sales document) payment id
   */
  static async getReceivableByPaymentId(paymentId: string) {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: { salesDocument: true, customer: true },
    });

    if (!payment) {
      throw new AppError(
        ErrorCode.NOT_FOUND as any,
        404,
        "Payment not found",
      );
    }

    return {
      paymentId: payment.id,
      receivableId: payment.salesDocumentId,
      invoiceNo: payment.salesDocument.documentId,
      customerName: payment.customer?.name ?? null,
    };
  }

  /**
   * Get AR Aging Summary with detailed buckets
   */
  static async getARAgingSummary() {
    const aging = await this.getAgingReport();

    const buckets = [
      {
        bucket: "current" as const,
        label: "Not Yet Due",
        amount: aging.current,
        color: "bg-green-100",
      },
      {
        bucket: "1-30_days" as const,
        label: "1-30 Days",
        amount: aging["1-30_days"],
        color: "bg-yellow-100",
      },
      {
        bucket: "31-60_days" as const,
        label: "31-60 Days",
        amount: aging["31-60_days"],
        color: "bg-orange-100",
      },
      {
        bucket: "61-90_days" as const,
        label: "61-90 Days",
        amount: aging["61-90_days"],
        color: "bg-red-100",
      },
      {
        bucket: "over_90_days" as const,
        label: "Over 90 Days",
        amount: aging["over_90_days"],
        color: "bg-red-200",
      },
    ];

    const today = new Date();
    const invoices = await prisma.salesDocument.findMany({
      where: {
        type: SalesDocumentType.INVOICE,
        balance: { gt: 0 },
        status: { in: OPEN_INVOICE_STATUSES },
      },
    });

    const counts: Record<string, number> = {
      current: 0,
      "1-30_days": 0,
      "31-60_days": 0,
      "61-90_days": 0,
      over_90_days: 0,
    };

    invoices.forEach((doc) => {
      const days = daysOverdue(doc.dueDate, today);

      if (days === 0) counts.current++;
      else if (days <= 30) counts["1-30_days"]++;
      else if (days <= 60) counts["31-60_days"]++;
      else if (days <= 90) counts["61-90_days"]++;
      else counts["over_90_days"]++;
    });

    const totalAmount = aging.total || 1;
    const bucketsWithData = buckets.map((bucket) => ({
      ...bucket,
      count: counts[bucket.bucket],
      percentage: (bucket.amount / totalAmount) * 100,
    }));

    return {
      aging,
      buckets: bucketsWithData,
      totalOutstanding: aging.total,
      criticalOverdue: aging["over_90_days"],
    };
  }
}
