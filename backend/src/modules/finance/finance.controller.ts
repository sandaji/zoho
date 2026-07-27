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
import { BudgetService } from "./services/budget.service";
import { validationError } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { prisma } from "../../lib/db";

class FinanceController {
  private financeService = new FinanceService();
  private dashboardService = new DashboardFinanceService();
  private budgetService = new BudgetService();

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
      const branchId = req.query.branchId as string | undefined;
      const report = await AccountingService.getBalanceSheet(date, branchId);
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
      const branchId = req.query.branchId as string | undefined;

      const report = await AccountingService.getIncomeStatement(
        startDate,
        endDate,
        branchId,
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
      const branchId = req.query.branchId as string | undefined;

      const report = await AccountingService.getCashFlow(
        startDate,
        endDate,
        branchId,
      );
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error fetching Cash Flow:");
      next(error);
    }
  }

  async getTrialBalance(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const date = req.query.date
        ? new Date(req.query.date as string)
        : new Date();
      const branchId = req.query.branchId as string | undefined;
      const report = await AccountingService.getTrialBalance(date, branchId);
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error fetching Trial Balance:");
      next(error);
    }
  }

  // ============================================
  // Chart of Accounts CRUD
  // ============================================

  async getAccounts(
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const accounts = await prisma.chartOfAccount.findMany({
        orderBy: { account_code: "asc" },
      });
      res.status(200).json({ status: "success", data: accounts });
    } catch (error) {
      logger.error(error, "Error fetching Chart of Accounts:");
      next(error);
    }
  }

  async createAccount(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { code, name, type, category, is_active } = req.body;
      const account = await prisma.chartOfAccount.create({
        data: {
          account_code: code,
          account_name: name,
          account_type: type,
          category: category || "General",
          is_active: is_active ?? true,
          is_system: false,
        },
      });
      res.status(201).json({ status: "success", data: account });
    } catch (error) {
      logger.error(error, "Error creating account:");
      next(error);
    }
  }

  async updateAccount(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { name, category, is_active } = req.body;
      const account = await prisma.chartOfAccount.update({
        where: { id },
        data: {
          account_name: name,
          category,
          is_active,
        },
      });
      res.status(200).json({ status: "success", data: account });
    } catch (error) {
      logger.error(error, "Error updating account:");
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

  async getReceivableByPaymentId(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { paymentId } = req.params;
      if (!paymentId || Array.isArray(paymentId)) {
        throw validationError("paymentId is required");
      }
      const receivable =
        await ReceivablesService.getReceivableByPaymentId(paymentId);
      res.status(200).json({ status: "success", data: receivable });
    } catch (error) {
      logger.error(error, "Error fetching receivable by payment id:");
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

  async createBudget(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const {
        budgetName,
        fiscalYear,
        accountId,
        budgetedAmount,
        actualAmount,
        periodStart,
        periodEnd,
        periodType,
        notes,
        status,
      } = req.body;

      // @ts-ignore
      const userId = (req.user as any)?.userId || "system";

      const result = await this.budgetService.createBudget({
        budgetName,
        fiscalYear,
        accountId,
        budgetedAmount,
        actualAmount,
        periodStart,
        periodEnd,
        periodType,
        createdBy: userId,
        notes,
        status,
      });

      res.status(201).json({ status: "success", data: result.data });
    } catch (error) {
      logger.error(error, "Error creating budget:");
      next(error);
    }
  }

  async listBudgets(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const fiscalYear = req.query.fiscalYear
        ? Number(req.query.fiscalYear)
        : undefined;
      const accountId = req.query.accountId as string | undefined;

      const budgets = await prisma.budget.findMany({
        where: {
          ...(fiscalYear ? { fiscal_year: fiscalYear } : {}),
          ...(accountId ? { account_id: accountId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { account: true },
      });

      res.status(200).json({
        status: "success",
        data: budgets.map((budget) => ({
          id: budget.id,
          budgetName: budget.budget_name,
          fiscalYear: budget.fiscal_year,
          accountId: budget.account_id,
          accountCode: budget.account.account_code,
          accountName: budget.account.account_name,
          budgetedAmount: budget.budgeted_amount,
          actualAmount: budget.actual_amount,
          variance: budget.variance,
          variancePercent: budget.variance_percent,
          status: budget.status,
          periodStart: budget.period_start.toISOString(),
          periodEnd: budget.period_end.toISOString(),
        })),
      });
    } catch (error) {
      logger.error(error, "Error listing budgets:");
      next(error);
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
      const now = new Date();
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const periodLabel = now.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      });

      const taxTypeLabels: Record<string, string> = {
        vat: "VAT",
        income_tax: "Income Tax",
        payroll_tax: "Payroll Tax",
        withholding_tax: "Withholding Tax",
        sales_tax: "Sales Tax",
      };

      const records = await prisma.taxRecord.findMany({
        where: { createdAt: { gte: yearStart } },
      });

      const grouped = new Map<string, { taxable: number; tax: number }>();
      for (const r of records) {
        const cur = grouped.get(r.tax_type) || { taxable: 0, tax: 0 };
        cur.taxable += r.taxable_amount;
        cur.tax += r.tax_amount;
        grouped.set(r.tax_type, cur);
      }

      const totalTax = Array.from(grouped.values()).reduce(
        (s, v) => s + v.tax,
        0,
      );
      const totalTaxable = Array.from(grouped.values()).reduce(
        (s, v) => s + v.taxable,
        0,
      );

      const categories = Array.from(grouped.entries()).map(([type, v]) => ({
        category: taxTypeLabels[type] || type,
        rate: v.taxable > 0 ? Number(((v.tax / v.taxable) * 100).toFixed(2)) : 0,
        baseAmount: v.taxable,
        taxAmount: v.tax,
        percentage:
          totalTax > 0 ? Number(((v.tax / totalTax) * 100).toFixed(1)) : 0,
      }));

      const pendingRecord = await prisma.taxRecord.findFirst({
        where: { status: { in: ["pending", "overdue"] } },
        orderBy: { due_date: "asc" },
      });

      const taxSummary = {
        period: periodLabel,
        categories,
        totalTaxable,
        totalTax,
        effectiveRate:
          totalTaxable > 0
            ? Number(((totalTax / totalTaxable) * 100).toFixed(2))
            : 0,
        filingStatus: pendingRecord ? pendingRecord.status : "filed",
        filingDeadline: pendingRecord
          ? pendingRecord.due_date.toISOString().split("T")[0]
          : undefined,
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
      const bankAccounts = await AccountingService.getBankAccounts();

      const items = await Promise.all(
        bankAccounts.map(async (acc) => {
          const [totalLines, unreconciledLines, lastStatement] =
            await Promise.all([
              prisma.bankStatementLine.count({
                where: { statement: { account_id: acc.id } },
              }),
              prisma.bankStatementLine.findMany({
                where: {
                  statement: { account_id: acc.id },
                  is_reconciled: false,
                },
                orderBy: { date: "asc" },
              }),
              prisma.bankStatement.findFirst({
                where: { account_id: acc.id },
                orderBy: { upload_date: "desc" },
              }),
            ]);

          const unreconciledCount = unreconciledLines.length;
          const variance = unreconciledLines.reduce(
            (sum, l) => sum + l.amount,
            0,
          );
          const oldest = unreconciledLines[0];
          const daysOverdue = oldest
            ? Math.max(
                0,
                Math.floor(
                  (Date.now() - oldest.date.getTime()) / (1000 * 60 * 60 * 24),
                ),
              )
            : 0;

          let status: "reconciled" | "pending" | "discrepancy" = "reconciled";
          if (unreconciledCount > 0) {
            status = daysOverdue > 14 ? "discrepancy" : "pending";
          }

          return {
            accountId: acc.id,
            accountName: acc.account_name,
            status,
            lastReconciliationDate: (
              lastStatement?.upload_date || new Date()
            ).toISOString(),
            transactionCount: totalLines,
            amount: acc.current_balance,
            variance,
            daysOverdue,
          };
        }),
      );

      const reconciledCount = items.filter(
        (i) => i.status === "reconciled",
      ).length;
      const pendingCount = items.filter((i) => i.status === "pending").length;
      const discrepancyCount = items.filter(
        (i) => i.status === "discrepancy",
      ).length;

      const reconciliationStatus = {
        items,
        totalAccounts: items.length,
        reconciledCount,
        pendingCount,
        discrepancyCount,
        totalAmount: items.reduce((sum, i) => sum + i.amount, 0),
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
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth() - (periods - 1), 1);

      const [salesRows, expenseRows, payrollRows] = await Promise.all([
        prisma.$queryRaw<Array<{ year: number; month: number; revenue: number }>>`
          SELECT EXTRACT(YEAR FROM "createdAt")::INTEGER as year,
                 EXTRACT(MONTH FROM "createdAt")::INTEGER as month,
                 COALESCE(SUM(total), 0)::FLOAT as revenue
          FROM sales_documents
          WHERE "createdAt" >= ${startDate}
            AND status IN ('PAID', 'PARTIALLY_PAID', 'SENT')
          GROUP BY 1, 2
          ORDER BY 1, 2
        `,
        prisma.$queryRaw<Array<{ year: number; month: number; expenses: number }>>`
          SELECT EXTRACT(YEAR FROM "createdAt")::INTEGER as year,
                 EXTRACT(MONTH FROM "createdAt")::INTEGER as month,
                 COALESCE(SUM(amount), 0)::FLOAT as expenses
          FROM finance_transactions
          WHERE "createdAt" >= ${startDate}
            AND type = 'expense'
          GROUP BY 1, 2
          ORDER BY 1, 2
        `,
        prisma.$queryRaw<Array<{ year: number; month: number; payroll: number }>>`
          SELECT EXTRACT(YEAR FROM period_start)::INTEGER as year,
                 EXTRACT(MONTH FROM period_start)::INTEGER as month,
                 COALESCE(SUM(net_salary), 0)::FLOAT as payroll
          FROM payroll
          WHERE period_start >= ${startDate}
            AND status IN ('approved', 'paid')
          GROUP BY 1, 2
          ORDER BY 1, 2
        `,
      ]);

      const trends = [];
      for (let i = periods - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth() + 1;
        const revenue =
          salesRows.find((r) => r.year === y && r.month === m)?.revenue || 0;
        const opex =
          expenseRows.find((r) => r.year === y && r.month === m)?.expenses ||
          0;
        const payroll =
          payrollRows.find((r) => r.year === y && r.month === m)?.payroll ||
          0;
        const expenses = opex + payroll;
        const profit = revenue - expenses;

        trends.push({
          period: d.toLocaleDateString("en-US", {
            year: "2-digit",
            month: "short",
          }),
          revenue: Math.round(revenue),
          expenses: Math.round(expenses),
          profit: Math.round(profit),
          margin: revenue > 0 ? Number(((profit / revenue) * 100).toFixed(2)) : 0,
        });
      }

      const currentPeriod = trends[trends.length - 1];
      const previousPeriod = trends[trends.length - 2] || currentPeriod;

      const pctChange = (a: number, b: number) =>
        b !== 0 ? Number((((a - b) / Math.abs(b)) * 100).toFixed(2)) : 0;

      const trendData = {
        trends,
        currentPeriod,
        previousPeriod,
        revenueGrowth: pctChange(currentPeriod.revenue, previousPeriod.revenue),
        expenseChange: pctChange(
          currentPeriod.expenses,
          previousPeriod.expenses,
        ),
        profitChange: pctChange(currentPeriod.profit, previousPeriod.profit),
        marginTrend: Number(
          (currentPeriod.margin - previousPeriod.margin).toFixed(2),
        ),
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
      const now = new Date();
      const periodStart = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const previousPeriodStart = new Date(
        now.getFullYear(),
        now.getMonth() - 2,
        1,
      );
      const previousPeriodEnd = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        0,
      );

      // Top Customers - query sales documents grouped by customer
      const customerData = await prisma.$queryRaw<
        Array<{
          customerId: string;
          customerName: string;
          totalRevenue: number;
          invoiceCount: number;
          lastTransactionDate: Date;
        }>
      >`
        SELECT c.id as "customerId",
               c.name as "customerName",
               COALESCE(SUM(sd.total), 0)::FLOAT as "totalRevenue",
               COUNT(sd.id)::INTEGER as "invoiceCount",
               MAX(sd."createdAt") as "lastTransactionDate"
        FROM customers c
        LEFT JOIN sales_documents sd ON c.id = sd."customerId"
                                    AND sd."createdAt" >= ${periodStart}
                                    AND sd.status IN ('PAID', 'PARTIALLY_PAID', 'SENT')
        WHERE c."isActive" = true
        GROUP BY c.id, c.name
        HAVING COUNT(sd.id) > 0
        ORDER BY "totalRevenue" DESC
        LIMIT ${limit}
      `;

      // Get previous period revenue for trend calculation
      const previousCustomerRevenue = await prisma.$queryRaw<
        Array<{ customerId: string; revenue: number }>
      >`
        SELECT c.id as "customerId",
               COALESCE(SUM(sd.total), 0)::FLOAT as revenue
        FROM customers c
        LEFT JOIN sales_documents sd ON c.id = sd."customerId"
                                    AND sd."createdAt" >= ${previousPeriodStart}
                                    AND sd."createdAt" <= ${previousPeriodEnd}
                                    AND sd.status IN ('PAID', 'PARTIALLY_PAID', 'SENT')
        WHERE c."isActive" = true
        GROUP BY c.id
      `;

      const prevCustomerMap = new Map(
        previousCustomerRevenue.map((r) => [r.customerId, r.revenue]),
      );

      const topCustomers = customerData.map((c) => {
        const prevRevenue = prevCustomerMap.get(c.customerId) || 0;
        const trend =
          prevRevenue > 0
            ? Number((((c.totalRevenue - prevRevenue) / prevRevenue) * 100).toFixed(1))
            : 0;

        return {
          customerId: c.customerId,
          customerName: c.customerName,
          totalRevenue: Math.round(c.totalRevenue),
          invoiceCount: c.invoiceCount,
          averageInvoiceValue:
            c.invoiceCount > 0
              ? Math.round(c.totalRevenue / c.invoiceCount)
              : 0,
          outstandingBalance: 0, // Would need to query from customer.currentBalance
          lastTransactionDate: c.lastTransactionDate.toISOString(),
          trend,
        };
      });

      // Top Vendors - query purchase orders grouped by vendor
      const vendorData = await prisma.$queryRaw<
        Array<{
          vendorId: string;
          vendorName: string;
          totalExpenses: number;
          poCount: number;
          lastTransactionDate: Date;
        }>
      >`
        SELECT v.id as "vendorId",
               v.name as "vendorName",
               COALESCE(SUM(po.total), 0)::FLOAT as "totalExpenses",
               COUNT(po.id)::INTEGER as "poCount",
               MAX(po."createdAt") as "lastTransactionDate"
        FROM vendors v
        LEFT JOIN purchase_orders po ON v.id = po."vendorId"
                                    AND po."createdAt" >= ${periodStart}
                                    AND po.status IN ('APPROVED', 'CLOSED')
        WHERE v."isActive" = true
        GROUP BY v.id, v.name
        HAVING COUNT(po.id) > 0
        ORDER BY "totalExpenses" DESC
        LIMIT ${limit}
      `;

      // Get previous period expenses for trend calculation
      const previousVendorExpenses = await prisma.$queryRaw<
        Array<{ vendorId: string; expenses: number }>
      >`
        SELECT v.id as "vendorId",
               COALESCE(SUM(po.total), 0)::FLOAT as expenses
        FROM vendors v
        LEFT JOIN purchase_orders po ON v.id = po."vendorId"
                                    AND po."createdAt" >= ${previousPeriodStart}
                                    AND po."createdAt" <= ${previousPeriodEnd}
                                    AND po.status IN ('APPROVED', 'CLOSED')
        WHERE v."isActive" = true
        GROUP BY v.id
      `;

      const prevVendorMap = new Map(
        previousVendorExpenses.map((r) => [r.vendorId, r.expenses]),
      );

      const topVendors = vendorData.map((v) => {
        const prevExpenses = prevVendorMap.get(v.vendorId) || 0;
        const trend =
          prevExpenses > 0
            ? Number((((v.totalExpenses - prevExpenses) / prevExpenses) * 100).toFixed(1))
            : 0;

        return {
          customerId: v.vendorId,
          customerName: v.vendorName,
          totalRevenue: Math.round(v.totalExpenses),
          invoiceCount: v.poCount,
          averageInvoiceValue:
            v.poCount > 0 ? Math.round(v.totalExpenses / v.poCount) : 0,
          outstandingBalance: 0, // Would need to calculate from unpaid POs
          lastTransactionDate: v.lastTransactionDate.toISOString(),
          trend: -trend, // Negative trend for vendors indicates cost reduction
        };
      });

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
        periodStart: periodStart.toISOString().split("T")[0],
        periodEnd: now.toISOString().split("T")[0],
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
