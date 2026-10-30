import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
// PaymentVoucherStatus is newer than the frozen generated/enums.ts shim, so it
// comes from the live client (same as ExpenseReportStatus elsewhere).
import { Prisma, PaymentVoucherStatus } from "../../../generated";
import { AccountType, PaymentMethod } from "../../../generated/enums.js";
import { AccountingService, DEFAULT_ACCOUNTS } from "./accounting.service";
import { BankTreasuryService } from "./bank-treasury.service";
import { JournalEntryService } from "./journal-entry.service";

// Same KSH tiers as LPOs, requisitions and expense reports.
const STANDARD_MAX = 10000;
const HIGH_VALUE_MAX = 100000;

function approvalTier(amount: number): "standard" | "high_value" | "executive" {
  if (amount < STANDARD_MAX) return "standard";
  if (amount < HIGH_VALUE_MAX) return "high_value";
  return "executive";
}

// Used when the voucher doesn't name an expense account.
export const GENERAL_EXPENSE_ACCOUNT = {
  code: "6900",
  name: "General Operating Expenses",
  type: AccountType.expense,
  category: "Operating Expenses",
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["APPROVED", "REJECTED", "DRAFT", "CANCELLED"],
  APPROVED: ["CANCELLED"], // PAID is only reachable through pay()
  REJECTED: ["DRAFT", "CANCELLED"],
  PAID: [],
  CANCELLED: [],
};

export interface VoucherInput {
  payeeName: string;
  category: string;
  description: string;
  amount: number;
  paymentMethod: string;
  referenceNo?: string;
  paymentDate: string;
  expenseAccountId?: string;
  status?: string;
}

const hasAnyApprove = (perms: string[]) =>
  perms.some((p) => p.startsWith("finance.voucher.approve_"));

export class PaymentVoucherService {
  private validate(data: VoucherInput) {
    if (!data.payeeName?.trim())
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Payee is required.");
    if (!data.category?.trim())
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Category is required.");
    if (!data.description?.trim())
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Description is required.");
    if (!(data.amount > 0))
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Amount must be greater than zero.",
      );
    if (!Object.values(PaymentMethod).includes(data.paymentMethod as any))
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Invalid payment method.");
    if (!data.paymentDate || isNaN(new Date(data.paymentDate).getTime()))
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "A valid payment date is required.");
  }

  private async attachUsers<T extends Record<string, any>>(vouchers: T[]) {
    const ids = new Set<string>();
    for (const v of vouchers) {
      for (const k of ["requestedById", "approvedById", "paidById"]) {
        if (v[k]) ids.add(v[k]);
      }
    }
    const users = ids.size
      ? await prisma.user.findMany({
          where: { id: { in: [...ids] } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const byId = new Map(users.map((u) => [u.id, u]));
    return vouchers.map((v) => ({
      ...v,
      requestedBy: byId.get(v.requestedById) ?? null,
      approvedBy: v.approvedById ? (byId.get(v.approvedById) ?? null) : null,
      paidBy: v.paidById ? (byId.get(v.paidById) ?? null) : null,
    }));
  }

  async create(userId: string, branchId: string | undefined, data: VoucherInput) {
    const status = data.status ?? PaymentVoucherStatus.DRAFT;
    if (status !== "DRAFT" && status !== "SUBMITTED") {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `A voucher can only be created as DRAFT or SUBMITTED, not ${status}.`,
      );
    }
    this.validate(data);

    const voucher = await prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.paymentVoucher.count();
      return tx.paymentVoucher.create({
        data: {
          voucherNumber: `PV-${year}-${(count + 1).toString().padStart(5, "0")}`,
          status: status as PaymentVoucherStatus,
          payeeName: data.payeeName.trim(),
          category: data.category.trim(),
          description: data.description.trim(),
          amount: data.amount,
          paymentMethod: data.paymentMethod as PaymentMethod,
          referenceNo: data.referenceNo?.trim() || null,
          paymentDate: new Date(data.paymentDate),
          expenseAccountId: data.expenseAccountId || null,
          branchId: branchId ?? null,
          requestedById: userId,
          submittedAt: status === "SUBMITTED" ? new Date() : null,
        },
      });
    });
    return (await this.attachUsers([voucher]))[0];
  }

  async update(id: string, userId: string, data: VoucherInput) {
    const existing = await this.getRaw(id);
    if (existing.requestedById !== userId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "Only the person who raised this voucher can edit it.",
      );
    }
    if (existing.status !== "DRAFT") {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        `Cannot edit a voucher once it has left DRAFT (current status: ${existing.status}).`,
      );
    }
    this.validate(data);
    const voucher = await prisma.paymentVoucher.update({
      where: { id },
      data: {
        payeeName: data.payeeName.trim(),
        category: data.category.trim(),
        description: data.description.trim(),
        amount: data.amount,
        paymentMethod: data.paymentMethod as PaymentMethod,
        referenceNo: data.referenceNo?.trim() || null,
        paymentDate: new Date(data.paymentDate),
        expenseAccountId: data.expenseAccountId || null,
      },
    });
    return (await this.attachUsers([voucher]))[0];
  }

  private async getRaw(id: string) {
    const v = await prisma.paymentVoucher.findUnique({ where: { id } });
    if (!v) throw new AppError(ErrorCode.NOT_FOUND, 404, "Payment voucher not found");
    return v;
  }

  /** Owner, or anyone who views / approves / pays vouchers, may see one. */
  async get(id: string, userId: string, userPermissions: string[]) {
    const v = await this.getRaw(id);
    const privileged =
      userPermissions.includes("finance.voucher.view_all") ||
      userPermissions.includes("finance.voucher.pay") ||
      hasAnyApprove(userPermissions);
    if (!privileged && v.requestedById !== userId) {
      throw new AppError(
        ErrorCode.FORBIDDEN,
        403,
        "You can only view payment vouchers you raised.",
      );
    }

    let expenseAccount: { id: string; account_code: string; account_name: string } | null =
      null;
    if (v.expenseAccountId) {
      expenseAccount = await prisma.chartOfAccount.findUnique({
        where: { id: v.expenseAccountId },
        select: { id: true, account_code: true, account_name: true },
      });
    }
    const [withUsers] = await this.attachUsers([v]);
    return { ...withUsers, expenseAccount };
  }

  async list(query: {
    status?: PaymentVoucherStatus;
    skip?: number;
    take?: number;
    userId: string;
    userPermissions: string[];
  }) {
    const { status, skip = 0, take = 50, userId, userPermissions } = query;
    const seesAll =
      userPermissions.includes("finance.voucher.view_all") ||
      userPermissions.includes("finance.voucher.pay") ||
      hasAnyApprove(userPermissions);

    const where: Prisma.PaymentVoucherWhereInput = {
      ...(status && { status }),
      ...(!seesAll && { requestedById: userId }),
    };
    const [rows, total] = await Promise.all([
      prisma.paymentVoucher.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
      }),
      prisma.paymentVoucher.count({ where }),
    ]);
    return { vouchers: await this.attachUsers(rows), total };
  }

  async updateStatus(
    id: string,
    status: PaymentVoucherStatus,
    userId: string,
    userPermissions: string[],
    rejectionReason?: string,
  ) {
    const v = await this.getRaw(id);
    const isOwner = v.requestedById === userId;

    if (status === "PAID") {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        "A voucher becomes PAID only when payment is made (use the Pay action).",
      );
    }
    if (!VALID_TRANSITIONS[v.status]?.includes(status)) {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        `Cannot transition from ${v.status} to ${status}. Valid transitions: ${VALID_TRANSITIONS[v.status]?.join(", ") || "None"}`,
      );
    }

    if (status === "SUBMITTED" && !isOwner) {
      throw new AppError(ErrorCode.FORBIDDEN, 403, "Only the requester can submit this voucher.");
    }

    if (status === "APPROVED" || status === "REJECTED") {
      if (isOwner) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Segregation of Duties Violation: You cannot approve or reject your own payment voucher.",
        );
      }
      const tier = approvalTier(v.amount);
      const required = `finance.voucher.approve_${tier}`;
      const ok =
        userPermissions.includes(required) ||
        userPermissions.includes("finance.voucher.approve_executive");
      if (!ok) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          `Insufficient permission for this amount (KSH ${v.amount.toLocaleString()}). Requires '${required}'.`,
        );
      }
      if (status === "REJECTED" && !rejectionReason?.trim()) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "A rejection reason is required.",
        );
      }
    }

    if (status === "CANCELLED") {
      const canCancel = isOwner || userPermissions.includes("finance.voucher.pay");
      if (!canCancel) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Only the requester or finance can cancel a voucher.",
        );
      }
    }

    if (status === "DRAFT") {
      // Returned to the requester: they, or an approver, can send it back.
      if (!isOwner && !hasAnyApprove(userPermissions)) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Only the requester or an approver can return a voucher to draft.",
        );
      }
    }

    const data: Prisma.PaymentVoucherUpdateInput = { status };
    if (status === "SUBMITTED") {
      data.submittedAt = new Date();
      data.rejectedReason = null;
    } else if (status === "APPROVED") {
      data.approvedById = userId;
      data.approvedAt = new Date();
    } else if (status === "REJECTED") {
      data.approvedById = userId;
      data.rejectedReason = rejectionReason!.trim();
    } else if (status === "DRAFT") {
      data.submittedAt = null;
      data.approvedById = null;
      data.approvedAt = null;
    }

    const updated = await prisma.paymentVoucher.update({ where: { id }, data });
    return (await this.attachUsers([updated]))[0];
  }

  /**
   * Make the payment: GL entry (DR expense / CR cash-bank-mpesa) and the
   * treasury outflow, then mark the voucher PAID. All in one transaction so a
   * failed posting (e.g. closed fiscal period) leaves the voucher APPROVED.
   */
  async pay(id: string, userId: string) {
    const paid = await prisma.$transaction(async (tx) => {
      const v = await tx.paymentVoucher.findUnique({ where: { id } });
      if (!v) throw new AppError(ErrorCode.NOT_FOUND, 404, "Payment voucher not found");
      if (v.status !== "APPROVED") {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          `Only an APPROVED voucher can be paid (current status: ${v.status}).`,
        );
      }
      if (v.requestedById === userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Segregation of Duties Violation: You cannot pay a voucher you raised.",
        );
      }

      let expenseAccount;
      if (v.expenseAccountId) {
        expenseAccount = await tx.chartOfAccount.findUnique({
          where: { id: v.expenseAccountId },
        });
        if (!expenseAccount || expenseAccount.account_type !== AccountType.expense) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            400,
            "The voucher's expense account is missing or is not an expense account.",
          );
        }
      } else {
        expenseAccount = await AccountingService.getEnsureAccount(
          GENERAL_EXPENSE_ACCOUNT,
          tx,
        );
      }

      let assetDef = DEFAULT_ACCOUNTS.CASH_ON_HAND;
      if (v.paymentMethod === "mpesa") assetDef = DEFAULT_ACCOUNTS.MOBILE_MONEY;
      else if (v.paymentMethod === "bank_transfer" || v.paymentMethod === "card" || v.paymentMethod === "cheque")
        assetDef = DEFAULT_ACCOUNTS.BANK_ACCOUNT;
      const assetAccount = await AccountingService.getEnsureAccount(assetDef, tx);

      const payDate = new Date();
      await JournalEntryService.createJournalEntry(
        {
          entryDate: payDate,
          branchId: v.branchId ?? undefined,
          description: `Payment voucher ${v.voucherNumber} — ${v.payeeName}`,
          lines: [
            {
              accountId: expenseAccount.id,
              debit: new Prisma.Decimal(v.amount),
              credit: new Prisma.Decimal(0),
              description: `${v.category}: ${v.description}`,
            },
            {
              accountId: assetAccount.id,
              debit: new Prisma.Decimal(0),
              credit: new Prisma.Decimal(v.amount),
              description: `Paid via ${v.paymentMethod}${v.referenceNo ? ` (${v.referenceNo})` : ""}`,
            },
          ],
          sourceType: "PAYMENT_VOUCHER",
          sourceId: v.id,
          createdBy: userId,
        },
        tx,
      );

      await BankTreasuryService.recordTransaction(tx, {
        paymentMethod: v.paymentMethod,
        type: "expense",
        amount: v.amount,
        description: `Payment voucher ${v.voucherNumber} — ${v.payeeName}`,
        referenceNo: v.referenceNo || v.voucherNumber,
        category: "payment_voucher",
      });

      return tx.paymentVoucher.update({
        where: { id },
        data: { status: "PAID", paidById: userId, paidAt: payDate },
      });
    });
    return (await this.attachUsers([paid]))[0];
  }
}
