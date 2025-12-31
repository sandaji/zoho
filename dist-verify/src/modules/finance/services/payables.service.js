"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayablesService = void 0;
// backend/src/modules/finance/services/payables.service.ts
const db_1 = require("../../../lib/db");
const enums_1 = require("../../../generated/enums");
const errors_1 = require("../../../lib/errors");
class PayablesService {
    /**
     * Get all payables with vendor info
     */
    static async getAllPayables() {
        return await db_1.prisma.accountPayable.findMany({
            include: {
                payments: true
            },
            orderBy: { due_date: 'asc' }
        });
    }
    /**
     * Record a payment for a payable
     */
    static async recordPayment(data) {
        return await db_1.prisma.$transaction(async (tx) => {
            const ap = await tx.accountPayable.findUnique({
                where: { id: data.payableId }
            });
            if (!ap)
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Payable not found");
            if (data.amount > ap.balance) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Payment amount exceeds balance");
            }
            // 1. Create AP Payment record
            const payment = await tx.aPPayment.create({
                data: {
                    payment_no: `APP-${Date.now()}`,
                    ap_id: data.payableId,
                    amount: data.amount,
                    payment_date: new Date(),
                    payment_method: data.paymentMethod,
                    transaction_id: data.referenceNo,
                    notes: `Payment for bill ${ap.bill_no}`
                }
            });
            // 2. Update AP Balance and Status
            const newPaidAmount = ap.paid_amount + data.amount;
            const newBalance = ap.total_amount - newPaidAmount;
            const newStatus = newBalance <= 0 ? enums_1.APStatus.paid : enums_1.APStatus.partial;
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
exports.PayablesService = PayablesService;
