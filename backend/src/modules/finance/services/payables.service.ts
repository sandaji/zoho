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
        payments: true,
      },
      orderBy: { due_date: "asc" },
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
        where: { id: data.payableId },
      });

      if (!ap)
        throw new AppError(
          ErrorCode.NOT_FOUND as any,
          404,
          "Payable not found",
        );
      if (data.amount > ap.balance) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR as any,
          400,
          "Payment amount exceeds balance",
        );
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
          notes: `Payment for bill ${ap.bill_no}`,
        },
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
          paid_date: newBalance <= 0 ? new Date() : undefined,
        },
      });

      return payment;
    });
  }

  /**
   * Get AP Status Summary
   */
  static async getAPStatusSummary() {
    const today = new Date();
    const allPayables = await prisma.accountPayable.findMany({
      where: {
        status: {
          in: [APStatus.outstanding, APStatus.partial, APStatus.scheduled],
        },
      },
    });

    // Count and sum by status
    const statusCounts = {
      outstanding: 0,
      partial: 0,
      scheduled: 0,
      paid: 0,
    };

    const statusTotals = {
      outstanding: 0,
      partial: 0,
      scheduled: 0,
      paid: 0,
    };

    allPayables.forEach((ap) => {
      statusCounts[ap.status as keyof typeof statusCounts]++;
      statusTotals[ap.status as keyof typeof statusTotals] += ap.balance;
    });

    // Get paid amounts (for percentage calculation)
    const paidPayables = await prisma.accountPayable.findMany({
      where: { status: APStatus.paid },
    });
    statusCounts.paid = paidPayables.length;
    statusTotals.paid = paidPayables.reduce(
      (sum, ap) => sum + ap.total_amount,
      0,
    );

    // Calculate upcoming payments (due within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const upcomingPayables = allPayables.filter(
      (ap) => ap.due_date <= thirtyDaysFromNow,
    );
    const upcomingTotal = upcomingPayables.reduce(
      (sum, ap) => sum + ap.balance,
      0,
    );

    // Calculate overdue
    const overduePayables = allPayables.filter((ap) => ap.due_date < today);
    const overdueTotal = overduePayables.reduce(
      (sum, ap) => sum + ap.balance,
      0,
    );

    const totalPayables =
      statusTotals.outstanding + statusTotals.partial + statusTotals.scheduled;
    const totalAll = totalPayables || 1; // Avoid division by zero

    const items = [
      {
        status: "outstanding" as const,
        label: "Outstanding",
        count: statusCounts.outstanding,
        totalAmount: statusTotals.outstanding,
        percentage: (statusTotals.outstanding / totalAll) * 100,
      },
      {
        status: "partial" as const,
        label: "Partially Paid",
        count: statusCounts.partial,
        totalAmount: statusTotals.partial,
        percentage: (statusTotals.partial / totalAll) * 100,
      },
      {
        status: "scheduled" as const,
        label: "Scheduled",
        count: statusCounts.scheduled,
        totalAmount: statusTotals.scheduled,
        percentage: (statusTotals.scheduled / totalAll) * 100,
      },
      {
        status: "paid" as const,
        label: "Paid",
        count: statusCounts.paid,
        totalAmount: statusTotals.paid,
        percentage: (statusTotals.paid / (totalAll + statusTotals.paid)) * 100,
      },
    ];

    return {
      items: items.filter((item) => item.count > 0 || item.totalAmount > 0),
      totalPayables,
      upcomingPayments: upcomingTotal,
      overdueAmount: overdueTotal,
    };
  }
}
