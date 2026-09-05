import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { ExpenseReportStatus, TransactionType, Prisma } from "../../../generated";

// ============================================================================
// APPROVAL THRESHOLDS (KSH) — same three-tier structure as
// purchasing.service.ts and requisition.service.ts. Duplicated on purpose,
// same reasoning as requisition.service.ts's comment on this.
// ============================================================================
enum ApprovalLevel {
  STANDARD = "standard",
  HIGH_VALUE = "high_value",
  EXECUTIVE = "executive",
}

const APPROVAL_THRESHOLDS = {
  STANDARD_MAX: 10000,
  HIGH_VALUE_MAX: 100000,
};

function getApprovalLevel(total: number): ApprovalLevel {
  if (total < APPROVAL_THRESHOLDS.STANDARD_MAX) return ApprovalLevel.STANDARD;
  if (total < APPROVAL_THRESHOLDS.HIGH_VALUE_MAX) return ApprovalLevel.HIGH_VALUE;
  return ApprovalLevel.EXECUTIVE;
}

const VALID_STATE_TRANSITIONS: Record<ExpenseReportStatus, ExpenseReportStatus[]> = {
  [ExpenseReportStatus.DRAFT]: [ExpenseReportStatus.SUBMITTED, ExpenseReportStatus.CANCELLED],
  [ExpenseReportStatus.SUBMITTED]: [
    ExpenseReportStatus.APPROVED,
    ExpenseReportStatus.REJECTED,
    ExpenseReportStatus.DRAFT,
    ExpenseReportStatus.CANCELLED,
  ],
  [ExpenseReportStatus.APPROVED]: [ExpenseReportStatus.POSTED, ExpenseReportStatus.CANCELLED],
  [ExpenseReportStatus.REJECTED]: [ExpenseReportStatus.DRAFT, ExpenseReportStatus.CANCELLED],
  [ExpenseReportStatus.POSTED]: [], // terminal — it's in the GL now
  [ExpenseReportStatus.CANCELLED]: [], // terminal
};

export class ExpenseReportService {
  /**
   * Create an Expense Report. Each item is one receipt/purchase — vendor,
   * category, amount, and an optional receipt attachment URL, per
   * erp-finance-gap-analysis.md §1.1. File upload itself isn't handled
   * here — receiptUrl is expected to already be a resolved URL (wherever
   * the file was uploaded to), same as Product.image_url and
   * Delivery.podPhotoUrl elsewhere in this codebase.
   */
  async createExpenseReport(
    userId: string,
    data: {
      branchId?: string;
      departmentId?: string;
      items: {
        expenseDate: string;
        vendor: string;
        category: string;
        amount: number;
        description?: string;
        receiptUrl?: string;
      }[];
      notes?: string;
      status?: ExpenseReportStatus;
    },
  ) {
    const requestedStatus = data.status ?? ExpenseReportStatus.DRAFT;
    if (
      requestedStatus !== ExpenseReportStatus.DRAFT &&
      requestedStatus !== ExpenseReportStatus.SUBMITTED
    ) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `An Expense Report can only be created as DRAFT or SUBMITTED, not ${requestedStatus}.`,
      );
    }

    if (!data.items || data.items.length === 0) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "An Expense Report needs at least one line item.",
      );
    }

    for (const item of data.items) {
      if (item.amount <= 0) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          `Expense amount must be greater than zero (got ${item.amount} for "${item.vendor}").`,
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      const year = new Date().getFullYear();
      const count = await tx.expenseReport.count();
      const expenseNumber = `EXP-${year}-${(count + 1).toString().padStart(5, "0")}`;

      const totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);

      return tx.expenseReport.create({
        data: {
          expenseNumber,
          employeeId: userId,
          branchId: data.branchId,
          departmentId: data.departmentId,
          status: requestedStatus,
          submittedAt: requestedStatus === ExpenseReportStatus.SUBMITTED ? new Date() : null,
          totalAmount,
          notes: data.notes,
          items: {
            create: data.items.map((item) => ({
              expenseDate: new Date(item.expenseDate),
              vendor: item.vendor,
              category: item.category,
              amount: item.amount,
              description: item.description,
              receiptUrl: item.receiptUrl,
            })),
          },
        },
        include: { items: true, employee: true, department: true, branch: true },
      });
    });
  }

  /**
   * Update an Expense Report (DRAFT only) — same DRAFT-only-edit reasoning
   * used throughout this codebase's approval-workflow entities.
   */
  async updateExpenseReport(
    id: string,
    data: {
      departmentId?: string;
      items?: {
        expenseDate: string;
        vendor: string;
        category: string;
        amount: number;
        description?: string;
        receiptUrl?: string;
      }[];
      notes?: string;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.expenseReport.findUnique({ where: { id } });
      if (!existing) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Expense Report not found");
      }
      if (existing.status !== ExpenseReportStatus.DRAFT) {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          `Cannot edit an Expense Report once it has left DRAFT status (current status: ${existing.status}).`,
        );
      }

      const updateData: Prisma.ExpenseReportUpdateInput = {
        ...(data.departmentId !== undefined && {
          department: data.departmentId
            ? { connect: { id: data.departmentId } }
            : { disconnect: true },
        }),
        ...(data.notes !== undefined && { notes: data.notes }),
        updatedAt: new Date(),
      };

      if (data.items) {
        for (const item of data.items) {
          if (item.amount <= 0) {
            throw new AppError(
              ErrorCode.VALIDATION_ERROR,
              400,
              `Expense amount must be greater than zero (got ${item.amount} for "${item.vendor}").`,
            );
          }
        }
        updateData.totalAmount = data.items.reduce((sum, item) => sum + item.amount, 0);
        updateData.items = {
          deleteMany: {},
          create: data.items.map((item) => ({
            expenseDate: new Date(item.expenseDate),
            vendor: item.vendor,
            category: item.category,
            amount: item.amount,
            description: item.description,
            receiptUrl: item.receiptUrl,
          })),
        };
      }

      return tx.expenseReport.update({
        where: { id },
        data: updateData,
        include: { items: true, employee: true, department: true, branch: true },
      });
    });
  }

  async getExpenseReport(id: string) {
    const report = await prisma.expenseReport.findUnique({
      where: { id },
      include: {
        items: true,
        employee: true,
        approvedBy: true,
        department: true,
        branch: true,
      },
    });
    if (!report) throw new AppError(ErrorCode.NOT_FOUND, 404, "Expense Report not found");
    return report;
  }

  /**
   * List expense reports. Employees with only 'finance.expense.view' see
   * their own; anyone with 'finance.expense.view_all' sees everyone's —
   * this is the "employee submits, finance reviews everything" split from
   * erp-finance-gap-analysis.md §1.1, enforced here rather than trusting
   * the caller to only ask for their own.
   */
  async listExpenseReports(query: {
    status?: ExpenseReportStatus;
    departmentId?: string;
    skip?: number;
    take?: number;
    userId: string;
    userPermissions?: string[];
  }) {
    const { status, departmentId, skip = 0, take = 50, userId, userPermissions = [] } = query;

    const canViewAll = userPermissions.includes("finance.expense.view_all");

    const where: Prisma.ExpenseReportWhereInput = {
      ...(status && { status }),
      ...(departmentId && { departmentId }),
      ...(!canViewAll && { employeeId: userId }),
    };

    const [reports, total] = await Promise.all([
      prisma.expenseReport.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          employee: true,
          approvedBy: true,
          department: true,
          _count: { select: { items: true } },
        },
      }),
      prisma.expenseReport.count({ where }),
    ]);

    return { reports, total };
  }

  /**
   * Update Expense Report Status (Submit, Approve, Reject, Cancel).
   * Same three protections as PO/Requisition: valid transition, no
   * self-approval, threshold-based permission check.
   */
  async updateStatus(
    id: string,
    status: ExpenseReportStatus,
    userId: string,
    userPermissions: string[] = [],
    rejectionReason?: string,
  ) {
    const report = await this.getExpenseReport(id);

    if (!this.isValidStateTransition(report.status, status)) {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        `Cannot transition from ${report.status} to ${status}. Valid transitions: ${VALID_STATE_TRANSITIONS[report.status]?.join(", ") || "None"}`,
      );
    }

    if (status === ExpenseReportStatus.APPROVED) {
      if (report.employeeId === userId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Segregation of Duties Violation: You cannot approve your own Expense Report.",
        );
      }

      const approvalLevel = getApprovalLevel(report.totalAmount);
      const requiredPermission = `finance.expense.approve_${approvalLevel}`;
      const hasRequiredPermission =
        userPermissions.includes(requiredPermission) ||
        userPermissions.includes("finance.expense.approve_executive");

      if (!hasRequiredPermission) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          `Insufficient permission to approve this Expense Report (Amount: KSH ${report.totalAmount.toLocaleString()}). Requires '${requiredPermission}'.`,
        );
      }
    }

    if (status === ExpenseReportStatus.REJECTED && !rejectionReason) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "A rejection reason is required when rejecting an Expense Report.",
      );
    }

    const updateData: Prisma.ExpenseReportUpdateInput = { status };
    if (status === ExpenseReportStatus.SUBMITTED) {
      updateData.submittedAt = new Date();
    } else if (status === ExpenseReportStatus.APPROVED) {
      updateData.approvedBy = { connect: { id: userId } };
      updateData.approvedAt = new Date();
    } else if (status === ExpenseReportStatus.REJECTED) {
      updateData.approvedBy = { connect: { id: userId } };
      updateData.rejectedReason = rejectionReason;
    }

    return prisma.expenseReport.update({
      where: { id },
      data: updateData,
      include: { items: true, employee: true, approvedBy: true, department: true },
    });
  }

  /**
   * Post an APPROVED expense report to the General Ledger as a single
   * aggregate FinanceTransaction (type=expense), and mark the report
   * POSTED. Requires 'finance.expense.post' — this is the Senior
   * Accountant-tier action (can post, doesn't need approval authority).
   *
   * NOTE: this creates a FinanceTransaction, not a JournalEntry/
   * JournalHeader double-entry pair — matching how FinanceTransaction is
   * already used elsewhere in this codebase (e.g. payroll). If/when this
   * ERP standardizes all postings through JournalHeader/JournalLine
   * instead, this is the method to update.
   */
  async postToGL(id: string, userId: string) {
    return prisma.$transaction(async (tx) => {
      const report = await tx.expenseReport.findUnique({ where: { id }, include: { items: true } });
      if (!report) throw new AppError(ErrorCode.NOT_FOUND, 404, "Expense Report not found");
      if (report.status !== ExpenseReportStatus.APPROVED) {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          `Expense Report must be APPROVED to post (current status: ${report.status}).`,
        );
      }

      const referenceNo = `EXP-POST-${report.expenseNumber}`;
      const categorySummary = Array.from(new Set(report.items.map((i) => i.category))).join(", ");

      const transaction = await tx.financeTransaction.create({
        data: {
          type: TransactionType.expense,
          reference_no: referenceNo,
          description: `Expense report ${report.expenseNumber} (${categorySummary})`,
          amount: report.totalAmount,
          category: categorySummary,
          reference_doc: report.expenseNumber,
        },
      });

      return tx.expenseReport.update({
        where: { id },
        data: {
          status: ExpenseReportStatus.POSTED,
          postedAt: new Date(),
          financeTransactionId: transaction.id,
        },
        include: { items: true, employee: true, approvedBy: true },
      });
    });
  }

  private isValidStateTransition(
    currentStatus: ExpenseReportStatus,
    newStatus: ExpenseReportStatus,
  ): boolean {
    return VALID_STATE_TRANSITIONS[currentStatus]?.includes(newStatus) ?? false;
  }
}
