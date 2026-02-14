/**
 * Finance Module - Service Layer
 */

import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { notFoundError, validationError } from "../../../lib/errors";
import {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionResponseDTO,
  TransactionListQueryDTO,
  FinancialReportDTO,
  RevenueAnalyticsDTO,
  GetMonthlyReportQueryDTO,
  MonthlyReportResponseDTO,
} from "../dto";

export class FinanceService {
  private prisma = prisma;

  async createTransaction(
    dto: CreateTransactionDTO
  ): Promise<TransactionResponseDTO> {
    try {
      logger.debug({ reference: dto.reference_no }, "Creating transaction");

      const transaction = await this.prisma.financeTransaction.create({
        data: {
          type: dto.type as any,
          reference_no: dto.reference_no,
          description: dto.description,
          amount: dto.amount,
          // salesId: dto.salesId, // Relation removed
          payrollId: dto.payrollId,
          payment_method: dto.payment_method,
          reference_doc: dto.reference_doc,
          notes: dto.notes,
        },
      });

      logger.info({
        id: transaction.id,
        referenceNo: transaction.reference_no,
      }, "Transaction created");

      return this.formatResponse(transaction);
    } catch (error) {
      logger.error({ error: error as Error }, "Failed to create transaction");
      throw error;
    }
  }

  async getTransaction(id: string): Promise<TransactionResponseDTO> {
    try {
      const transaction = await this.prisma.financeTransaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw notFoundError("Transaction", id);
      }

      return this.formatResponse(transaction);
    } catch (error) {
      logger.error({ error: error as Error }, "Failed to fetch transaction");
      throw error;
    }
  }

  async listTransactions(
    query: TransactionListQueryDTO
  ): Promise<{ data: TransactionResponseDTO[]; total: number }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.type) where.type = query.type;
      if (query.salesId) where.salesId = query.salesId;
      if (query.payrollId) where.payrollId = query.payrollId;

      if (query.startDate || query.endDate) {
        where.createdAt = {};
        if (query.startDate) {
          where.createdAt.gte = new Date(query.startDate);
        }
        if (query.endDate) {
          where.createdAt.lte = new Date(query.endDate);
        }
      }

      const [data, total] = await Promise.all([
        this.prisma.financeTransaction.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        this.prisma.financeTransaction.count({ where }),
      ]);

      return {
        data: data.map((t: any) => this.formatResponse(t)),
        total,
      };
    } catch (error) {
      logger.error({ error: error as Error }, "Failed to list transactions");
      throw error;
    }
  }

  async updateTransaction(
    id: string,
    dto: UpdateTransactionDTO
  ): Promise<TransactionResponseDTO> {
    try {
      const transaction = await this.prisma.financeTransaction.findUnique({
        where: { id },
      });

      if (!transaction) {
        throw notFoundError("Transaction", id);
      }

      const updated = await this.prisma.financeTransaction.update({
        where: { id },
        data: {
          description: dto.description ?? transaction.description,
          amount: dto.amount ?? transaction.amount,
          payment_method: dto.payment_method ?? transaction.payment_method,
          notes: dto.notes,
        },
      });

      logger.info({ id, amount: updated.amount }, "Transaction updated");

      return this.formatResponse(updated);
    } catch (error) {
      logger.error({ error: error as Error }, "Failed to update transaction");
      throw error;
    }
  }

  async getFinancialReport(
    startDate: string,
    endDate: string
  ): Promise<FinancialReportDTO> {
    try {
      logger.debug({ startDate, endDate }, "Generating financial report");

      const transactions = await this.prisma.financeTransaction.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      const income = transactions
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const expenses = transactions
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const transfers = transactions
        .filter((t: any) => t.type === "transfer")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const adjustments = transactions
        .filter((t: any) => t.type === "adjustment")
        .reduce((sum: number, t: any) => sum + t.amount, 0);

      const net = income - expenses;

      return {
        period_start: startDate,
        period_end: endDate,
        income,
        expenses,
        transfers,
        adjustments,
        net,
      };
    } catch (error) {
      logger.error({ error: error as Error }, "Failed to generate financial report");
      throw error;
    }
  }

  async getRevenueAnalytics(
    startDate: string,
    endDate: string
  ): Promise<RevenueAnalyticsDTO> {
    try {
      logger.debug({ startDate, endDate }, "Generating revenue analytics");

      const sales = await this.prisma.salesDocument.findMany({
        where: {
          createdAt: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        },
      });

      const total_sales = sales.length;
      const total_revenue = sales.reduce(
        (sum: number, s: any) => sum + s.grand_total,
        0
      );
      const average_order_value =
        total_sales > 0 ? total_revenue / total_sales : 0;
      const total_discount = sales.reduce(
        (sum: number, s: any) => sum + s.discount,
        0
      );
      const total_subtotal = sales.reduce(
        (sum: number, s: any) => sum + s.total_amount,
        0
      );
      const discount_percentage =
        total_subtotal > 0 ? (total_discount / total_subtotal) * 100 : 0;
      const tax_amount = sales.reduce((sum: number, s: any) => sum + s.tax, 0);

      return {
        total_sales,
        total_revenue,
        average_order_value,
        discount_percentage,
        tax_amount,
      };
    } catch (error) {
      logger.error({ error: error as Error }, "Failed to generate revenue analytics");
      throw error;
    }
  }

  private formatResponse(transaction: any): TransactionResponseDTO {
    return {
      id: transaction.id,
      type: transaction.type,
      reference_no: transaction.reference_no,
      description: transaction.description,
      amount: transaction.amount,
      salesId: transaction.salesId,
      payrollId: transaction.payrollId,
      payment_method: transaction.payment_method,
      reference_doc: transaction.reference_doc,
      notes: transaction.notes,
      createdAt: transaction.createdAt.toISOString(),
    };
  }

  /**
   * Get comprehensive monthly financial report
   */
  async getMonthlyReport(
    query: GetMonthlyReportQueryDTO
  ): Promise<MonthlyReportResponseDTO> {
    try {
      logger.debug({
        month: query.month,
        year: query.year,
      }, "Generating monthly report");

      if (query.month < 1 || query.month > 12) {
        throw validationError("month must be between 1 and 12");
      }

      // Calculate period
      const startDate = new Date(query.year, query.month - 1, 1);
      const endDate = new Date(query.year, query.month, 0, 23, 59, 59);
      const yearStr = query.year.toString();

      // Get transactions
      const transactions = await this.prisma.financeTransaction.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Get sales for revenue
      const sales = await this.prisma.salesDocument.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      // Get payroll for expenses
      const payrolls = await this.prisma.payroll.findMany({
        where: {
          period_start: {
            lte: endDate,
          },
          period_end: {
            gte: startDate,
          },
        },
      });

      // Calculate revenue metrics
      const totalRevenue = sales.reduce(
        (sum: number, s: any) => sum + s.grand_total,
        0
      );
      const totalSales = sales.length;
      const avgOrderValue = totalSales > 0 ? totalRevenue / totalSales : 0;

      // Calculate expense metrics
      const expenses = transactions.filter((t: any) => t.type === "expense");
      const totalExpenses = expenses.reduce(
        (sum: number, t: any) => sum + t.amount,
        0
      );
      const avgExpense =
        expenses.length > 0 ? totalExpenses / expenses.length : 0;

      // Calculate payroll metrics
      const totalPayroll = payrolls.reduce(
        (sum: number, p: any) => sum + p.net_salary,
        0
      );

      // Calculate profit
      const grossProfit = totalRevenue - totalExpenses;
      const netProfit = grossProfit - totalPayroll;
      const marginPercentage =
        totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

      // Transaction breakdown
      const typeGroups: Record<string, any[]> = {};
      transactions.forEach((t: any) => {
        if (!typeGroups[t.type]) typeGroups[t.type] = [];
        (typeGroups[t.type] ?? []).push(t);
      });

      const transactionsByType = Object.entries(typeGroups).map(
        ([type, txns]) => ({
          type,
          amount: txns.reduce((sum: number, t: any) => sum + t.amount, 0),
          count: txns.length,
          percentage:
            transactions.length > 0
              ? (txns.length / transactions.length) * 100
              : 0,
        })
      );

      // Expense categories (from descriptions)
      const expensesByCategory: Record<string, number> = {};
      expenses.forEach((e: any) => {
        const category = this.extractCategory(e.description);
        expensesByCategory[category] =
          (expensesByCategory[category] || 0) + e.amount;
      });

      const expenseCategoryBreakdown = Object.entries(expensesByCategory).map(
        ([category, amount]) => ({
          category,
          amount,
          percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        })
      );

      return {
        month: query.month,
        year: yearStr,
        period_start: startDate.toISOString().split("T")[0] ?? "",
        period_end: endDate.toISOString().split("T")[0] ?? "",
        total_revenue: totalRevenue,
        total_sales: totalSales,
        average_order_value: avgOrderValue,
        total_expenses: totalExpenses,
        expense_count: expenses.length,
        average_expense: avgExpense,
        total_payroll: totalPayroll,
        payroll_count: payrolls.length,
        average_salary:
          payrolls.length > 0 ? totalPayroll / payrolls.length : 0,
        gross_profit: grossProfit,
        net_profit: netProfit,
        margin_percentage: marginPercentage,
        transactions_by_type: transactionsByType,
        expenses_by_category: expenseCategoryBreakdown,
      };
    } catch (error) {
      logger.error({ error: error as Error }, "Failed to generate monthly report");
      throw error;
    }
  }

  /**
   * Helper: Extract category from expense description
   */
  private extractCategory(description: string): string {
    const categories: Record<string, string[]> = {
      office: ["office", "rent", "utilities", "supplies"],
      travel: ["travel", "fuel", "maintenance", "vehicle"],
      marketing: ["marketing", "advertising", "promotion", "campaign"],
      salaries: ["salary", "payroll", "wage", "compensation"],
      operations: ["operations", "equipment", "tools", "services"],
    };

    const lowerDesc = description.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((kw: string) => lowerDesc.includes(kw))) {
        return category;
      }
    }

    return "other";
  }
}
