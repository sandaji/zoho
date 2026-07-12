import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";

export class BudgetService {
  async createBudget(input: {
    budgetName: string;
    fiscalYear: number;
    accountId: string;
    budgetedAmount: number;
    actualAmount?: number;
    periodStart: string;
    periodEnd: string;
    periodType?: "monthly" | "quarterly" | "annually";
    createdBy: string;
    notes?: string;
    status?: "draft" | "submitted" | "approved" | "active" | "closed";
  }) {
    try {
      const account = await prisma.chartOfAccount.findUnique({
        where: { id: input.accountId },
        select: { id: true, account_code: true, account_name: true },
      });

      if (!account) {
        throw new Error("Account not found");
      }

      const variance = (input.actualAmount ?? 0) - input.budgetedAmount;
      const variancePercent =
        input.budgetedAmount > 0 ? (variance / input.budgetedAmount) * 100 : 0;

      const budget = await prisma.budget.create({
        data: {
          budget_name: input.budgetName,
          fiscal_year: input.fiscalYear,
          account_id: input.accountId,
          period_type: input.periodType ?? "monthly",
          period_start: new Date(input.periodStart),
          period_end: new Date(input.periodEnd),
          budgeted_amount: input.budgetedAmount,
          actual_amount: input.actualAmount ?? 0,
          variance,
          variance_percent: Number(variancePercent.toFixed(2)),
          status: input.status ?? "draft",
          created_by: input.createdBy,
          notes: input.notes,
        },
        include: { account: true },
      });

      return {
        success: true,
        data: {
          budget: {
            id: budget.id,
            budgetName: budget.budget_name,
            fiscalYear: budget.fiscal_year,
            accountId: budget.account_id,
            accountCode: account.account_code,
            accountName: account.account_name,
            budgetedAmount: budget.budgeted_amount,
            actualAmount: budget.actual_amount,
            variance: budget.variance,
            variancePercent: budget.variance_percent,
            status: budget.status,
          },
        },
      };
    } catch (error) {
      logger.error(error, "Error creating budget");
      throw {
        success: false,
        error: {
          code: "CREATE_BUDGET_ERROR",
          message: "Failed to create budget",
        },
      };
    }
  }
}
