import { Request, Response, NextFunction } from "express";
import { FinanceService } from "./finance.service";
import { AccountingService } from "./services/accounting.service";
import { BankService } from "./services/bank.service";
import { GeneralLedgerService } from "./services/gl.service";
import { ReceivablesService } from "./services/receivables.service";
import { PayablesService } from "./services/payables.service";
import { PeriodService } from "./services/period.service";
import { DashboardFinanceService } from "./services/dashboard.service";
import { AlertsService } from "./services/alerts.service";
import { logger } from "../../lib/logger";

class FinanceController {
  private financeService = new FinanceService();
  private dashboardService = new DashboardFinanceService();

  async getFinancialSummary(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const summary = await this.financeService.getFinancialSummary();
      res.status(200).json({
        status: "success",
        data: summary,
      });
    } catch (error) {
      logger.error(error, "Error fetching financial summary:");
      next(error);
    }
  }

  async getIncomeStatement(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const incomeStatement = await this.financeService.getIncomeStatement();
      res.status(200).json({
        status: "success",
        data: incomeStatement,
      });
    } catch (error) {
      logger.error(error, "Error fetching income statement:");
      next(error);
    }
  }

  async getRevenueExpenseChartData(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const chartData = await this.financeService.getRevenueExpenseChartData();
      res.status(200).json({
        status: "success",
        data: chartData,
      });
    } catch (error) {
      logger.error(error, "Error fetching revenue expense chart data:");
      next(error);
    }
  }

  async getTopSellingProducts(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const products = await this.financeService.getTopSellingProducts(limit);
      res.status(200).json({
        status: "success",
        data: products,
      });
    } catch (error) {
      logger.error(error, "Error fetching top products:");
      next(error);
    }
  }

  async getSalesByPaymentMethod(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const data = await this.financeService.getSalesByPaymentMethod();
      res.status(200).json({
        status: "success",
        data,
      });
    } catch (error) {
      logger.error(error, "Error fetching sales by payment method:");
      next(error);
    }
  }

  async getFinancialKPIs(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const kpis = await this.financeService.getFinancialKPIs();
      res.status(200).json({
        status: "success",
        data: kpis,
      });
    } catch (error) {
      logger.error(error, "Error fetching financial KPIs:");
      logger.error(error, "Error fetching financial KPIs:");
      next(error);
    }
  }

  // ============================================
  // New Core Financial Reports (Accounting Engine)
  // ============================================

  async getBalanceSheet(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const date = req.query.date
        ? new Date(req.query.date as string)
        : new Date();
      const report = await AccountingService.getBalanceSheet(date);
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error fetching Balance Sheet:");
      next(error);
    }
  }

  async getProfitAndLoss(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const report = await AccountingService.getIncomeStatement(
        startDate,
        endDate,
      );
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error fetching Profit & Loss:");
      next(error);
    }
  }

  async getCashFlowStatement(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const report = await AccountingService.getCashFlow(startDate, endDate);
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error fetching Cash Flow:");
      next(error);
    }
  }

  async getPLQuickPreview(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const startDate = req.query.startDate
        ? new Date(req.query.startDate as string)
        : new Date(new Date().getFullYear(), 0, 1);
      const endDate = req.query.endDate
        ? new Date(req.query.endDate as string)
        : new Date();

      const incomeStatement = await this.financeService.getIncomeStatement();

      // Format as P&L Quick Preview
      const plPreview = {
        period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
        revenue: incomeStatement.revenue,
        cogs: incomeStatement.cogs,
        grossProfit: incomeStatement.grossProfit,
        grossMarginPercent: incomeStatement.grossMargin,
        operatingExpenses: incomeStatement.operatingExpenses,
        operatingIncome:
          incomeStatement.grossProfit - incomeStatement.operatingExpenses,
        netIncome: incomeStatement.netIncome,
        netMarginPercent: incomeStatement.netMargin,
        ebitda: incomeStatement.netIncome + 0, // Simplified - would need interest, tax, etc.
      };

      res.status(200).json({
        status: "success",
        data: { current: plPreview },
      });
    } catch (error) {
      logger.error(error, "Error fetching P&L quick preview:");
      next(error);
    }
  }

  // ============================================
  // Bank Reconciliation
  // ============================================

  private bankService = new BankService();

  async getBankAccounts(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const accounts = await AccountingService.getBankAccounts();
      res.status(200).json({ status: "success", data: accounts });
    } catch (error) {
      logger.error(error, "Error fetching bank accounts:");
      next(error);
    }
  }

  async uploadBankStatement(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Simplified file handling: Assume plain text body or specific parsing field if using multer (not configured here yet)
      // For MVP, we'll accept raw CSV string in body.fileContent

      const { accountId, fileContent, filename } = req.body;
      // User ID from Auth Middleware
      // @ts-ignore
      const userId = (req.user as any)?.userId || "system";

      const result = await this.bankService.importStatement(
        accountId,
        fileContent,
        filename,
        userId,
      );

      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error uploading bank statement:");
      next(error);
    }
  }

  async getReconciliationData(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const accountId = req.query.accountId as string;
      if (!accountId) {
        res.status(400).json({
          status: "error",
          message: "accountId query parameter is required",
        });
        return;
      }
      const data = await this.bankService.getReconciliationData(accountId);
      res.status(200).json({ status: "success", data });
    } catch (error) {
      logger.error(error, "Error fetching reconciliation data:");
      next(error);
    }
  }

  async reconcileTransaction(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { bankLineId, journalEntryId } = req.body;
      const result = await this.bankService.reconcileItems(
        bankLineId,
        journalEntryId,
      );
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error reconciling transaction:");
      next(error);
    }
  }

  // ============================================
  // General Ledger
  // ============================================

  async createManualJournalEntry(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { date, description, journalId, lines } = req.body;
      // @ts-ignore
      const userId = (req.user as any)?.userId || "system";

      const result = await GeneralLedgerService.createManualEntry({
        date: new Date(date),
        description,
        journalId,
        lines,
        userId,
      });

      res.status(201).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error creating journal entry:");
      next(error);
    }
  }

  async getJournals(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const journals = await GeneralLedgerService.getJournals();
      res.status(200).json({ status: "success", data: journals });
    } catch (error) {
      logger.error(error, "Error fetching journals:");
      next(error);
    }
  }

  async getLedgerEntries(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { accountId, journalId, startDate, endDate } = req.query;
      const entries = await GeneralLedgerService.getLedgerEntries({
        accountId: (accountId as string) || undefined,
        journalId: (journalId as string) || undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });
      res.status(200).json({ status: "success", data: entries });
    } catch (error) {
      logger.error(error, "Error fetching ledger entries:");
      next(error);
    }
  }

  // ============================================
  // Accounts Receivable
  // ============================================

  async getReceivables(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const receivables = await ReceivablesService.getAllReceivables();
      res.status(200).json({ status: "success", data: receivables });
    } catch (error) {
      logger.error(error, "Error fetching receivables:");
      next(error);
    }
  }

  async recordARPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { receivableId, amount, paymentMethod, referenceNo } = req.body;
      // @ts-ignore
      const userId = (req.user as any)?.userId || "system";

      const result = await ReceivablesService.recordPayment({
        receivableId,
        amount,
        paymentMethod,
        referenceNo,
        userId,
      });
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error recording AR payment:");
      next(error);
    }
  }

  async getARAgingReport(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const report = await ReceivablesService.getAgingReport();
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error fetching AR aging report:");
      next(error);
    }
  }

  async getARAgingSummary(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const summary = await ReceivablesService.getARAgingSummary();
      res.status(200).json({ status: "success", data: summary });
    } catch (error) {
      logger.error(error, "Error fetching AR aging summary:");
      next(error);
    }
  }

  // ============================================
  // Accounts Payable
  // ============================================

  async getPayables(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const payables = await PayablesService.getAllPayables();
      res.status(200).json({ status: "success", data: payables });
    } catch (error) {
      logger.error(error, "Error fetching payables:");
      next(error);
    }
  }

  async recordAPPayment(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { payableId, amount, paymentMethod, referenceNo } = req.body;
      // @ts-ignore
      const userId = (req.user as any)?.userId || "system";

      const result = await PayablesService.recordPayment({
        payableId,
        amount,
        paymentMethod,
        referenceNo,
        userId,
      });
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error recording AP payment:");
      next(error);
    }
  }

  async getAPStatusSummary(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const summary = await PayablesService.getAPStatusSummary();
      res.status(200).json({ status: "success", data: summary });
    } catch (error) {
      logger.error(error, "Error fetching AP status summary:");
      next(error);
    }
  }

  // ============================================
  // Period Management
  // ============================================

  async initializeFiscalYear(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { year } = req.body;
      const result = await PeriodService.initializeFiscalYear(parseInt(year));
      res.status(201).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error initializing fiscal year:");
      next(error);
    }
  }

  async lockFiscalPeriod(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      // @ts-ignore
      const userId = (req.user as any)?.userId;
      if (!userId) {
        res
          .status(401)
          .json({ status: "error", message: "User not authenticated" });
        return;
      }
      if (!id) {
        res
          .status(400)
          .json({ status: "error", message: "Period ID is required" });
        return;
      }
      const result = await PeriodService.lock(id as string, userId);
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error locking fiscal period:");
      next(error);
    }
  }

  async unlockFiscalPeriod(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res
          .status(400)
          .json({ status: "error", message: "Period ID is required" });
        return;
      }
      const result = await PeriodService.unlock(id as string);
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error unlocking fiscal period:");
      next(error);
    }
  }

  async getFiscalPeriods(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const year = req.query.year
        ? parseInt(req.query.year as string)
        : undefined;
      const result = await PeriodService.getFiscalPeriods(year);
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error fetching fiscal periods:");
      next(error);
    }
  }

  // ============================================
  // Dashboard Finance Endpoints
  // ============================================

  async getTransactions(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const type = req.query.type as "income" | "expense" | undefined;
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await this.dashboardService.getTransactions({
        limit,
        type,
        startDate,
        endDate,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, "Error in getTransactions:");
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch transactions",
        },
      });
    }
  }

  async getExpenseCategories(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const period = (req.query.period || "month") as
        | "today"
        | "week"
        | "month"
        | "year";
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await this.dashboardService.getExpenseCategories({
        period,
        startDate,
        endDate,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, "Error in getExpenseCategories:");
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch expense categories",
        },
      });
    }
  }

  async getDailySpending(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const date = req.query.date as string | undefined;

      const result = await this.dashboardService.getDailySpending({
        date,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, "Error in getDailySpending:");
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch daily spending",
        },
      });
    }
  }

  async getSavingsGoals(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const status = (req.query.status || "active") as
        | "active"
        | "completed"
        | "all";

      const result = await this.dashboardService.getSavingsGoals({
        status,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, "Error in getSavingsGoals:");
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch savings goals",
        },
      });
    }
  }

  async createSavingsGoal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { name, description, targetAmount, deadline } = req.body;

      if (!name || !targetAmount) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETERS",
            message: "Name and targetAmount are required",
          },
        });
        return;
      }

      const result = await this.dashboardService.createSavingsGoal({
        name,
        description,
        targetAmount,
        deadline,
      });

      res.status(201).json(result);
    } catch (error) {
      logger.error(error, "Error in createSavingsGoal:");
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create savings goal",
        },
      });
    }
  }

  async updateSavingsGoal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const {
        name,
        description,
        targetAmount,
        currentAmount,
        deadline,
        status,
      } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETERS",
            message: "Goal ID is required",
          },
        });
        return;
      }

      const result = await this.dashboardService.updateSavingsGoal(
        id as string,
        {
          name,
          description,
          targetAmount,
          currentAmount,
          deadline,
          status,
        },
      );

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, "Error in updateSavingsGoal:");
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update savings goal",
        },
      });
    }
  }

  async deleteSavingsGoal(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_PARAMETERS",
            message: "Goal ID is required",
          },
        });
        return;
      }

      const result = await this.dashboardService.deleteSavingsGoal(id);

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, "Error in deleteSavingsGoal:");
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete savings goal",
        },
      });
    }
  }

  async getFinancialAlerts(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const alerts = await AlertsService.getFinancialAlerts();
      res.status(200).json({
        status: "success",
        data: alerts,
      });
    } catch (error) {
      logger.error(error, "Error fetching financial alerts:");
      next(error);
    }
  }

  // Phase 3 Controller Methods - Tax, Reconciliation, Trends, Top Customers

  async getTaxSummary(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Generate mock tax summary - replace with actual calculation
      const taxSummary = {
        period: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
        }),
        categories: [
          {
            category: "Income Tax",
            rate: 15,
            baseAmount: 1000000,
            taxAmount: 150000,
            percentage: 45,
          },
          {
            category: "VAT",
            rate: 16,
            baseAmount: 500000,
            taxAmount: 80000,
            percentage: 24,
          },
          {
            category: "Withholding Tax",
            rate: 5,
            baseAmount: 200000,
            taxAmount: 10000,
            percentage: 3,
          },
          {
            category: "Other Taxes",
            rate: 10,
            baseAmount: 300000,
            taxAmount: 90000,
            percentage: 28,
          },
        ],
        totalTaxable: 2000000,
        totalTax: 330000,
        effectiveRate: 16.5,
        filingStatus: "filed",
        filingDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
      };

      res.status(200).json({
        status: "success",
        data: taxSummary,
      });
    } catch (error) {
      logger.error(error, "Error fetching tax summary:");
      next(error);
    }
  }

  async getReconciliationStatus(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      // Generate mock reconciliation status - replace with actual reconciliation data
      const reconciliationStatus = {
        items: [
          {
            accountId: "1",
            accountName: "Main Operating Account",
            status: "reconciled",
            lastReconciliationDate: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactionCount: 245,
            amount: 500000,
            variance: 0,
            daysOverdue: 0,
          },
          {
            accountId: "2",
            accountName: "Petty Cash",
            status: "pending",
            lastReconciliationDate: new Date(
              Date.now() - 14 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactionCount: 89,
            amount: 25000,
            variance: 500,
            daysOverdue: 7,
          },
          {
            accountId: "3",
            accountName: "Savings Account",
            status: "reconciled",
            lastReconciliationDate: new Date(
              Date.now() - 3 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            transactionCount: 34,
            amount: 1000000,
            variance: 0,
            daysOverdue: 0,
          },
        ],
        totalAccounts: 3,
        reconciledCount: 2,
        pendingCount: 1,
        discrepancyCount: 0,
        totalAmount: 1525000,
      };

      res.status(200).json({
        status: "success",
        data: reconciliationStatus,
      });
    } catch (error) {
      logger.error(error, "Error fetching reconciliation status:");
      next(error);
    }
  }

  async getPeriodComparisonTrends(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const periods = parseInt(req.query.periods as string) || 12;

      // Generate mock trend data - replace with actual calculation
      const trends = [];
      const now = new Date();
      for (let i = periods - 1; i >= 0; i--) {
        const date = new Date(now);
        date.setMonth(date.getMonth() - i);
        const baseRevenue = 500000 + Math.random() * 200000;
        const baseExpenses = 300000 + Math.random() * 100000;
        trends.push({
          period: date.toLocaleDateString("en-US", {
            year: "2-digit",
            month: "short",
          }),
          revenue: Math.round(baseRevenue),
          expenses: Math.round(baseExpenses),
          profit: Math.round(baseRevenue - baseExpenses),
          margin:
            Math.round(
              ((baseRevenue - baseExpenses) / baseRevenue) * 100 * 100,
            ) / 100,
        });
      }

      const currentPeriod = trends[trends.length - 1];
      const previousPeriod = trends[trends.length - 2] || trends[0];
      const revenueGrowth =
        ((currentPeriod.revenue - previousPeriod.revenue) /
          previousPeriod.revenue) *
        100;
      const expenseChange =
        ((currentPeriod.expenses - previousPeriod.expenses) /
          previousPeriod.expenses) *
        100;
      const profitChange =
        ((currentPeriod.profit - previousPeriod.profit) /
          previousPeriod.profit) *
        100;
      const marginTrend = currentPeriod.margin - previousPeriod.margin;

      const trendData = {
        trends,
        currentPeriod,
        previousPeriod,
        revenueGrowth,
        expenseChange,
        profitChange,
        marginTrend,
      };

      res.status(200).json({
        status: "success",
        data: trendData,
      });
    } catch (error) {
      logger.error(error, "Error fetching period trends:");
      next(error);
    }
  }

  async getTopCustomersVendors(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 5;

      // Generate mock top customers/vendors - replace with actual database query
      const topCustomers = Array.from(
        { length: Math.min(limit, 5) },
        (_, i) => ({
          customerId: `C${i + 1}`,
          customerName: `Customer ${String.fromCharCode(65 + i)}`,
          totalRevenue: 500000 - i * 50000 + Math.random() * 10000,
          invoiceCount: 15 - i * 2,
          averageInvoiceValue: 30000 - i * 3000 + Math.random() * 5000,
          outstandingBalance: 20000 - i * 2000 + Math.random() * 3000,
          lastTransactionDate: new Date(
            Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          trend: 5 - i + Math.random() * 10,
        }),
      );

      const topVendors = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
        customerId: `V${i + 1}`,
        customerName: `Vendor ${String.fromCharCode(65 + i)}`,
        totalRevenue: 400000 - i * 40000 + Math.random() * 10000,
        invoiceCount: 20 - i * 3,
        averageInvoiceValue: 25000 - i * 2500 + Math.random() * 5000,
        outstandingBalance: 30000 - i * 3000 + Math.random() * 5000,
        lastTransactionDate: new Date(
          Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
        trend: -(3 + i) - Math.random() * 5,
      }));

      const data = {
        topCustomers,
        topVendors,
        totalCustomerRevenue: topCustomers.reduce(
          (sum, c) => sum + c.totalRevenue,
          0,
        ),
        totalVendorExpenses: topVendors.reduce(
          (sum, v) => sum + v.totalRevenue,
          0,
        ),
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0],
        periodEnd: new Date().toISOString().split("T")[0],
      };

      res.status(200).json({
        status: "success",
        data,
      });
    } catch (error) {
      logger.error(error, "Error fetching top customers/vendors:");
      next(error);
    }
  }
}

export default new FinanceController();
