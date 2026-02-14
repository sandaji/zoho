/**
 * Dashboard Finance Service
 * Handles finance dashboard endpoints for the Coinest-style dashboard
 */

import { prisma } from '../../../lib/db';
import { logger } from '../../../lib/logger';

export class DashboardFinanceService {
  /**
   * Get recent financial transactions with filtering and pagination
   */
  async getTransactions(params: {
    limit?: number;
    type?: 'income' | 'expense';
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const {
        limit = 5,
        type,
        startDate,
        endDate,
      } = params;

      // Validate limit
      const finalLimit = Math.min(Math.max(1, limit), 50);

      // Build where clause
      const where: any = {};

      if (type) {
        where.type = type;
      }

      if (startDate || endDate) {
        where.transactionDate = {};
        if (startDate) {
          where.transactionDate.gte = new Date(startDate);
        }
        if (endDate) {
          where.transactionDate.lte = new Date(endDate);
        }
      }

      const [transactions, total] = await Promise.all([
        prisma.financeTransaction.findMany({
          where,
          orderBy: { transactionDate: 'desc' },
          take: finalLimit,
          select: {
            id: true,
            type: true,
            category: true,
            amount: true,
            transactionDate: true,
            description: true,
            reference_doc: true,
          },
        }),
        prisma.financeTransaction.count({ where }),
      ]);

      // Transform response
      const transformedTransactions = transactions.map((txn) => ({
        id: txn.id,
        type: txn.type,
        category: txn.category || 'other',
        amount: txn.amount,
        date: txn.transactionDate.toISOString(),
        description: txn.description,
        reference: txn.reference_doc,
      }));

      return {
        success: true,
        data: {
          transactions: transformedTransactions,
          total,
        },
      };
    } catch (error) {
      logger.error(error, 'Error fetching transactions');
      throw {
        success: false,
        error: {
          code: 'TRANSACTION_FETCH_ERROR',
          message: 'Failed to fetch transactions',
        },
      };
    }
  }

  /**
   * Get expense breakdown by category
   */
  async getExpenseCategories(params: {
    period?: 'today' | 'week' | 'month' | 'year';
    startDate?: string;
    endDate?: string;
  }) {
    try {
      const { period = 'month', startDate, endDate } = params;

      // Calculate date range
      const now = new Date();
      let dateFrom = new Date();
      let dateTo = now;

      if (startDate && endDate) {
        dateFrom = new Date(startDate);
        dateTo = new Date(endDate);
      } else {
        switch (period) {
          case 'today':
            dateFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            dateFrom = new Date(now);
            dateFrom.setDate(now.getDate() - now.getDay());
            break;
          case 'year':
            dateFrom = new Date(now.getFullYear(), 0, 1);
            dateTo = new Date(now.getFullYear(), 11, 31);
            break;
          case 'month':
          default:
            dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
            dateTo = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
      }

      // Get all expense transactions for the period
      const transactions = await prisma.financeTransaction.findMany({
        where: {
          type: 'expense',
          transactionDate: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
        select: {
          category: true,
          amount: true,
        },
      });

      // Aggregate by category
      const categoryMap = new Map<string, { amount: number; count: number }>();

      transactions.forEach((txn) => {
        const category = txn.category || 'other';
        const current = categoryMap.get(category) || { amount: 0, count: 0 };
        current.amount += txn.amount;
        current.count += 1;
        categoryMap.set(category, current);
      });

      // Convert to array and sort by amount
      let categories = Array.from(categoryMap.entries()).map(([category, data]) => ({
        category:
          category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' '),
        amount: data.amount,
        count: data.count,
        percentage: 0,
      }));

      // Calculate total
      const totalExpenses = categories.reduce((sum, cat) => sum + cat.amount, 0);

      // Calculate percentages and sort
      categories = categories
        .map((cat) => ({
          ...cat,
          percentage:
            totalExpenses > 0
              ? Math.round((cat.amount / totalExpenses) * 100 * 10) / 10
              : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Keep top 5, rest goes to "Other"
      let finalCategories = categories.slice(0, 5);
      const other = categories.slice(5);

      if (other.length > 0) {
        const otherTotal = other.reduce((sum, cat) => sum + cat.amount, 0);
        const otherCount = other.reduce((sum, cat) => sum + cat.count, 0);
        finalCategories.push({
          category: 'Other',
          amount: otherTotal,
          count: otherCount,
          percentage: Math.round((otherTotal / totalExpenses) * 100 * 10) / 10,
        });
      }

      // Recalculate percentages to ensure they sum to 100
      const sum = finalCategories.reduce((acc, cat) => acc + cat.percentage, 0);
      if (sum !== 100) {
        const diff = 100 - sum;
        if (finalCategories.length > 0) {
          finalCategories[0].percentage += diff;
        }
      }

      const periodStr =
        startDate && endDate
          ? `${startDate} to ${endDate}`
          : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      return {
        success: true,
        data: {
          categories: finalCategories,
          totalExpenses,
          period: periodStr,
        },
      };
    } catch (error) {
      logger.error(error, 'Error fetching expense categories');
      throw {
        success: false,
        error: {
          code: 'CATEGORY_FETCH_ERROR',
          message: 'Failed to fetch expense categories',
        },
      };
    }
  }

  /**
   * Get daily spending limit and progress
   */
  async getDailySpending(params: { date?: string }) {
    try {
      const dateStr = params.date ? new Date(params.date) : new Date();
      const dateOnly = new Date(
        dateStr.getFullYear(),
        dateStr.getMonth(),
        dateStr.getDate()
      );

      // Get or create daily spending limit
      let dailyLimit = await prisma.dailySpendingLimit.findUnique({
        where: { date: dateOnly },
      });

      if (!dailyLimit) {
        // Create new daily limit entry
        dailyLimit = await prisma.dailySpendingLimit.create({
          data: {
            date: dateOnly,
            limit: 50000, // Default limit in KES
            spent: 0,
          },
        });
      }

      // Calculate actual spending for the day
      const dayStart = new Date(
        dateOnly.getFullYear(),
        dateOnly.getMonth(),
        dateOnly.getDate()
      );
      const dayEnd = new Date(
        dateOnly.getFullYear(),
        dateOnly.getMonth(),
        dateOnly.getDate() + 1
      );

      const dailyTransactions = await prisma.financeTransaction.aggregate({
        where: {
          type: 'expense',
          transactionDate: {
            gte: dayStart,
            lt: dayEnd,
          },
        },
        _sum: {
          amount: true,
        },
        _count: true,
      });

      const spent = dailyTransactions._sum.amount || 0;
      const transactionCount = dailyTransactions._count || 0;

      // Update the spent amount in the database
      if (spent !== dailyLimit.spent) {
        await prisma.dailySpendingLimit.update({
          where: { date: dateOnly },
          data: { spent },
        });
      }

      const remaining = dailyLimit.limit - spent;
      const percentage =
        dailyLimit.limit > 0
          ? Math.round((spent / dailyLimit.limit) * 100 * 10) / 10
          : 0;

      return {
        success: true,
        data: {
          spent,
          limit: dailyLimit.limit,
          remaining: Math.max(0, remaining),
          percentage,
          date: dateOnly.toISOString().split('T')[0],
          transactions: transactionCount,
        },
      };
    } catch (error) {
      logger.error(error, 'Error fetching daily spending');
      throw {
        success: false,
        error: {
          code: 'DAILY_SPENDING_ERROR',
          message: 'Failed to fetch daily spending',
        },
      };
    }
  }

  /**
   * Get all savings goals with progress
   */
  async getSavingsGoals(params: { status?: 'active' | 'completed' | 'all' }) {
    try {
      const { status = 'active' } = params;

      const where: any = {};
      if (status !== 'all') {
        where.status = status;
      }

      const goals = await prisma.savingsGoal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      });

      // Transform goals with calculated fields
      const transformedGoals = goals.map((goal) => ({
        id: goal.id,
        name: goal.name,
        description: goal.description,
        targetAmount: goal.targetAmount,
        currentAmount: goal.currentAmount,
        remaining: Math.max(0, goal.targetAmount - goal.currentAmount),
        percentage:
          goal.targetAmount > 0
            ? Math.round((goal.currentAmount / goal.targetAmount) * 100 * 10) / 10
            : 0,
        deadline: goal.deadline ? goal.deadline.toISOString() : null,
        status: goal.status,
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      }));

      // Calculate totals
      const totalSaved = transformedGoals.reduce(
        (sum, goal) => sum + goal.currentAmount,
        0
      );
      const totalTarget = transformedGoals.reduce(
        (sum, goal) => sum + goal.targetAmount,
        0
      );

      return {
        success: true,
        data: {
          goals: transformedGoals,
          totalSaved,
          totalTarget,
        },
      };
    } catch (error) {
      logger.error(error, 'Error fetching savings goals');
      throw {
        success: false,
        error: {
          code: 'SAVINGS_GOALS_ERROR',
          message: 'Failed to fetch savings goals',
        },
      };
    }
  }

  /**
   * Create a new savings goal
   */
  async createSavingsGoal(data: {
    name: string;
    description?: string;
    targetAmount: number;
    deadline?: string;
  }) {
    try {
      if (!data.name || data.targetAmount <= 0) {
        throw new Error('Invalid goal data');
      }

      const goal = await prisma.savingsGoal.create({
        data: {
          name: data.name,
          description: data.description,
          targetAmount: data.targetAmount,
          currentAmount: 0,
          deadline: data.deadline ? new Date(data.deadline) : null,
          status: 'active',
        },
      });

      return {
        success: true,
        data: {
          id: goal.id,
          name: goal.name,
          description: goal.description,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
          remaining: goal.targetAmount,
          percentage: 0,
          deadline: goal.deadline ? goal.deadline.toISOString() : null,
          status: goal.status,
          createdAt: goal.createdAt.toISOString(),
          updatedAt: goal.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error(error, 'Error creating savings goal');
      throw {
        success: false,
        error: {
          code: 'CREATE_GOAL_ERROR',
          message: 'Failed to create savings goal',
        },
      };
    }
  }

  /**
   * Update a savings goal
   */
  async updateSavingsGoal(
    id: string,
    data: {
      name?: string;
      description?: string;
      targetAmount?: number;
      currentAmount?: number;
      deadline?: string;
      status?: string;
    }
  ) {
    try {
      const goal = await prisma.savingsGoal.findUnique({ where: { id } });
      if (!goal) {
        throw new Error('Goal not found');
      }

      const updated = await prisma.savingsGoal.update({
        where: { id },
        data: {
          name: data.name || goal.name,
          description: data.description !== undefined ? data.description : goal.description,
          targetAmount: data.targetAmount || goal.targetAmount,
          currentAmount:
            data.currentAmount !== undefined
              ? data.currentAmount
              : goal.currentAmount,
          deadline: data.deadline ? new Date(data.deadline) : goal.deadline,
          status: data.status || goal.status,
        },
      });

      const remaining = Math.max(0, updated.targetAmount - updated.currentAmount);
      const percentage =
        updated.targetAmount > 0
          ? Math.round((updated.currentAmount / updated.targetAmount) * 100 * 10) / 10
          : 0;

      return {
        success: true,
        data: {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          targetAmount: updated.targetAmount,
          currentAmount: updated.currentAmount,
          remaining,
          percentage,
          deadline: updated.deadline ? updated.deadline.toISOString() : null,
          status: updated.status,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      logger.error(error, 'Error updating savings goal');
      throw {
        success: false,
        error: {
          code: 'UPDATE_GOAL_ERROR',
          message: 'Failed to update savings goal',
        },
      };
    }
  }

  /**
   * Delete a savings goal
   */
  async deleteSavingsGoal(id: string) {
    try {
      const goal = await prisma.savingsGoal.findUnique({ where: { id } });
      if (!goal) {
        throw new Error('Goal not found');
      }

      await prisma.savingsGoal.delete({ where: { id } });

      return {
        success: true,
        data: { message: 'Goal deleted successfully' },
      };
    } catch (error) {
      logger.error(error, 'Error deleting savings goal');
      throw {
        success: false,
        error: {
          code: 'DELETE_GOAL_ERROR',
          message: 'Failed to delete savings goal',
        },
      };
    }
  }
}
