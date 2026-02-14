// backend/src/modules/finance/services/receivables.service.ts
import { prisma } from "../../../lib/db";
import { ARStatus, PaymentMethod } from "../../../generated";
import { AppError, ErrorCode } from "../../../lib/errors";

export class ReceivablesService {
  /**
   * Get all receivables with customer info
   */
  static async getAllReceivables() {
    return await prisma.accountReceivable.findMany({
      include: {
        // sales: true, // Relation not in schema
        payments: true
      },
      orderBy: { due_date: 'asc' }
    });
  }

  /**
   * Record a payment for a receivable
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
        where: { id: data.receivableId }
      });

      if (!ar) throw new AppError(ErrorCode.NOT_FOUND as any, 404, "Receivable not found");
      if (data.amount > ar.balance) {
        throw new AppError(ErrorCode.VALIDATION_ERROR as any, 400, "Payment amount exceeds balance");
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
          notes: `Payment for invoice ${ar.invoice_no}`
        }
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
          paid_date: newBalance <= 0 ? new Date() : undefined
        }
      });

      // 3. Create Journal Entry (Debit Cash/Bank, Credit AR)
      // Logic would be similar to AccountingService but specifically for AR
      // For now, we rely on the generic GL service or manual JE if needed.
      // In a full Odoo-style system, this would be automated here.

      return payment;
    });
  }

  /**
   * Get Aging Report
   */
  static async getAgingReport() {
    const today = new Date();
    const receivables = await prisma.accountReceivable.findMany({
      where: { status: { in: [ARStatus.outstanding, ARStatus.partial] } }
    });

    const report = {
      current: 0,
      '1-30_days': 0,
      '31-60_days': 0,
      '61-90_days': 0,
      'over_90_days': 0,
      total: 0
    };

    receivables.forEach(ar => {
      const diffTime = Math.abs(today.getTime() - ar.due_date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const isOverdue = today > ar.due_date;

      if (!isOverdue) {
        report.current += ar.balance;
      } else if (diffDays <= 30) {
        report['1-30_days'] += ar.balance;
      } else if (diffDays <= 60) {
        report['31-60_days'] += ar.balance;
      } else if (diffDays <= 90) {
        report['61-90_days'] += ar.balance;
      } else {
        report['over_90_days'] += ar.balance;
      }
      report.total += ar.balance;
    });

    return report;
  }
}
