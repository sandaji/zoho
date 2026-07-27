// backend/src/modules/finance/services/receivables.service.ts
import { prisma } from "../../../lib/db";
import { ARStatus, PaymentMethod, Prisma } from "../../../generated";
import { AppError, ErrorCode } from "../../../lib/errors";
import { AccountingService, DEFAULT_ACCOUNTS } from "./accounting.service";
import { JournalEntryService } from "./journal-entry.service";

export class ReceivablesService {
  /**
   * Get all receivables with customer info
   */
  static async getAllReceivables() {
    return await prisma.accountReceivable.findMany({
      include: {
        payments: true,
      },
      orderBy: { due_date: "asc" },
    });
  }

  /**
   * Record a payment for a receivable and post to GL
   */
  static async recordPayment(data: {
    receivableId: string;
    amount: number;
    paymentMethod: string;
    referenceNo: string;
    userId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const ar = await tx.accountReceivable.findUnique({
        where: { id: data.receivableId },
      });

      if (!ar)
        throw new AppError(
          ErrorCode.NOT_FOUND as any,
          404,
          "Receivable not found"
        );
      if (data.amount > ar.balance) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR as any,
          400,
          "Payment amount exceeds balance"
        );
      }

      // 1. Create AR Payment record
      const payment = await tx.aRPayment.create({
        data: {
          payment_no: `ARP-${Date.now()}`,
          ar_id: data.receivableId,
          amount: data.amount,
          payment_date: new Date(),
          payment_method: data.paymentMethod as PaymentMethod,
          transaction_id: data.referenceNo,
          notes: `Payment for invoice ${ar.invoice_no}`,
        },
      });

      // 2. Update AR Balance and Status
      const newPaidAmount = ar.paid_amount + data.amount;
      const newBalance = ar.total_amount - newPaidAmount;
      const newStatus = newBalance <= 0 ? ARStatus.paid : ARStatus.partial;

      await tx.accountReceivable.update({
        where: { id: data.receivableId },
        data: {
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          paid_date: newBalance <= 0 ? new Date() : undefined,
        },
      });

      // 3. Decrement customer balance if matched
      const customer = await tx.customer.findUnique({
        where: { name: ar.customer_name },
      });
      if (customer) {
        await tx.customer.update({
          where: { id: customer.id },
          data: { currentBalance: { decrement: data.amount } },
        });
      }

      // 4. Post to General Ledger: DR Cash (Bank/Mobile Money) / CR Accounts Receivable
      const arAccount = await AccountingService.getEnsureAccount(
        DEFAULT_ACCOUNTS.ACCOUNTS_RECEIVABLE,
        tx
      );

      let assetAccountDef = DEFAULT_ACCOUNTS.CASH_ON_HAND;
      if (data.paymentMethod === "mpesa")
        assetAccountDef = DEFAULT_ACCOUNTS.MOBILE_MONEY;
      else if (
        data.paymentMethod === "card" ||
        data.paymentMethod === "bank_transfer"
      )
        assetAccountDef = DEFAULT_ACCOUNTS.BANK_ACCOUNT;

      const assetAccount = await AccountingService.getEnsureAccount(
        assetAccountDef,
        tx
      );

      await JournalEntryService.createJournalEntry(
        {
          entryDate: new Date(),
          description: `AR Payment Collection for Invoice #${ar.invoice_no} (${payment.payment_no})`,
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
              description: `Clear AR Invoice #${ar.invoice_no}`,
            },
          ],
          sourceType: "AR_PAYMENT",
          sourceId: payment.id,
          createdBy: data.userId,
        },
        tx
      );

      return payment;
    });
  }

  /**
   * Get Aging Report
   */
  static async getAgingReport() {
    const today = new Date();
    const receivables = await prisma.accountReceivable.findMany({
      where: { status: { in: [ARStatus.outstanding, ARStatus.partial] } },
    });

    const report = {
      current: 0,
      "1-30_days": 0,
      "31-60_days": 0,
      "61-90_days": 0,
      over_90_days: 0,
      total: 0,
    };

    receivables.forEach((ar) => {
      const diffTime = Math.abs(today.getTime() - ar.due_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isOverdue = today > ar.due_date;

      if (!isOverdue) {
        report.current += ar.balance;
      } else if (diffDays <= 30) {
        report["1-30_days"] += ar.balance;
      } else if (diffDays <= 60) {
        report["31-60_days"] += ar.balance;
      } else if (diffDays <= 90) {
        report["61-90_days"] += ar.balance;
      } else {
        report["over_90_days"] += ar.balance;
      }
      report.total += ar.balance;
    });

    return report;
  }

  /**
   * Resolve a receivable by AR payment id
   */
  static async getReceivableByPaymentId(paymentId: string) {
    const payment = await prisma.aRPayment.findUnique({
      where: { id: paymentId },
      include: { account_receivable: true },
    });

    if (!payment) {
      throw new AppError(
        ErrorCode.NOT_FOUND as any,
        404,
        "AR payment not found"
      );
    }

    return {
      paymentId: payment.id,
      receivableId: payment.ar_id,
      invoiceNo: payment.account_receivable.invoice_no,
      customerName: payment.account_receivable.customer_name,
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

    const receivables = await prisma.accountReceivable.findMany({
      where: { status: { in: [ARStatus.outstanding, ARStatus.partial] } },
    });

    const today = new Date();
    const counts: Record<string, number> = {
      current: 0,
      "1-30_days": 0,
      "31-60_days": 0,
      "61-90_days": 0,
      over_90_days: 0,
    };

    receivables.forEach((ar) => {
      const diffTime = Math.abs(today.getTime() - ar.due_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const isOverdue = today > ar.due_date;

      if (!isOverdue) counts.current++;
      else if (diffDays <= 30) counts["1-30_days"]++;
      else if (diffDays <= 60) counts["31-60_days"]++;
      else if (diffDays <= 90) counts["61-90_days"]++;
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
