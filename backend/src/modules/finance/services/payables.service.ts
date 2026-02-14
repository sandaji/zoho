// backend/src/modules/finance/services/payables.service.ts
import { prisma } from "../../../lib/db";
import { APStatus, PaymentMethod } from "../../../generated";
import { AppError, ErrorCode } from "../../../lib/errors";

export class PayablesService {
  /**
   * Get all payables with vendor info
   */
  static async getAllPayables() {
    return await prisma.accountPayable.findMany({
      include: {
        payments: true
      },
      orderBy: { due_date: 'asc' }
    });
  }

  /**
   * Record a payment for a payable
   */
  static async recordPayment(data: {
    payableId: string;
    amount: number;
    paymentMethod: string;
    referenceNo: string;
    userId: string;
  }) {
    return await prisma.$transaction(async (tx) => {
      const ap = await tx.accountPayable.findUnique({
        where: { id: data.payableId }
      });

      if (!ap) throw new AppError(ErrorCode.NOT_FOUND as any, 404, "Payable not found");
      if (data.amount > ap.balance) {
        throw new AppError(ErrorCode.VALIDATION_ERROR as any, 400, "Payment amount exceeds balance");
      }

      // 1. Create AP Payment record
      const payment = await tx.aPPayment.create({
        data: {
          payment_no: `APP-${Date.now()}`,
          ap_id: data.payableId,
          amount: data.amount,
          payment_date: new Date(),
          payment_method: data.paymentMethod as PaymentMethod,
          transaction_id: data.referenceNo,
          notes: `Payment for bill ${ap.bill_no}`
        }
      });

      // 2. Update AP Balance and Status
      const newPaidAmount = ap.paid_amount + data.amount;
      const newBalance = ap.total_amount - newPaidAmount;
      const newStatus = newBalance <= 0 ? APStatus.paid : APStatus.partial;

      await tx.accountPayable.update({
        where: { id: data.payableId },
        data: {
          paid_amount: newPaidAmount,
          balance: newBalance,
          status: newStatus,
          paid_date: newBalance <= 0 ? new Date() : undefined
        }
      });

      return payment;
    });
  }
}
