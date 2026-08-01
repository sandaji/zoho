import { PrismaClient, Prisma } from "../generated";
import { prisma as defaultPrisma } from "../lib/db";
import { sum } from "../utils/money";

export interface FinanceFilterOptions {
  startDate?: Date;
  endDate?: Date;
  branchId?: string;
  type?: string;
}

export class FinanceRepository {
  private db: PrismaClient;

  constructor(db: PrismaClient = defaultPrisma) {
    this.db = db;
  }

  /**
   * Get total finance transactions expenses + payroll expenses
   */
  async getExpenses(filters?: FinanceFilterOptions): Promise<number> {
    const { startDate, endDate, branchId } = filters || {};

    // 1. Finance transactions (type = 'EXPENSE')
    const transactions = await this.db.financeTransaction.groupBy({
      by: ["type"],
      where: {
        type: "EXPENSE",
        ...(branchId ? { branchId } : {}),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      _sum: {
        amount: true,
      },
    });

    const txExpenses = sum(transactions[0]?._sum.amount);

    // 2. Payroll expenses
    const payroll = await this.db.payroll.aggregate({
      where: {
        status: { in: ["approved", "paid"] },
        ...(startDate || endDate
          ? {
              period_start: {
                ...(startDate ? { gte: startDate } : {}),
              },
              period_end: {
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      _sum: {
        net_salary: true,
      },
    });

    const payrollExpenses = sum(payroll._sum.net_salary);

    return sum(txExpenses, payrollExpenses);
  }

  /**
   * Get overall cash balance across active bank accounts
   */
  async getCashBalance(filters?: FinanceFilterOptions): Promise<number> {
    const accounts = await this.db.bankAccount.aggregate({
      where: {
        isActive: true,
      },
      _sum: {
        balance: true,
      },
    });

    return sum(accounts._sum.balance);
  }

  /**
   * Get finance transaction breakdown (INCOME vs EXPENSE)
   */
  async getTransactionSummary(filters?: FinanceFilterOptions) {
    const { startDate, endDate, branchId } = filters || {};

    const grouped = await this.db.financeTransaction.groupBy({
      by: ["type"],
      where: {
        ...(branchId ? { branchId } : {}),
        ...(startDate || endDate
          ? {
              createdAt: {
                ...(startDate ? { gte: startDate } : {}),
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      _sum: {
        amount: true,
      },
    });

    let totalIncome = 0;
    let totalExpense = 0;

    grouped.forEach((g) => {
      const amt = sum(g._sum.amount);
      if (g.type === "INCOME") totalIncome = amt;
      if (g.type === "EXPENSE") totalExpense = amt;
    });

    return { totalIncome, totalExpense };
  }

  /**
   * Get payroll summary
   */
  async getPayrollSummary(filters?: FinanceFilterOptions) {
    const { startDate, endDate } = filters || {};

    const aggregate = await this.db.payroll.aggregate({
      where: {
        status: { in: ["approved", "paid"] },
        ...(startDate || endDate
          ? {
              period_start: {
                ...(startDate ? { gte: startDate } : {}),
              },
              period_end: {
                ...(endDate ? { lte: endDate } : {}),
              },
            }
          : {}),
      },
      _sum: {
        net_salary: true,
        base_salary: true,
      },
    });

    return {
      netSalary: sum(aggregate._sum.net_salary),
      baseSalary: sum(aggregate._sum.base_salary),
    };
  }
}

export const financeRepository = new FinanceRepository();
