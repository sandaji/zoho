import { Request, Response, NextFunction } from 'express';
import { FinanceService } from './finance.service';
import { AccountingService } from './services/accounting.service';
import { BankService } from './services/bank.service';
import { GeneralLedgerService } from './services/gl.service';
import { ReceivablesService } from './services/receivables.service';
import { PayablesService } from './services/payables.service';
import { PeriodService } from './services/period.service';
import { DashboardFinanceService } from './services/dashboard.service';
import { logger } from '../../lib/logger';

class FinanceController {
  private financeService = new FinanceService();
  private dashboardService = new DashboardFinanceService();

  async getFinancialSummary(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const summary = await this.financeService.getFinancialSummary();
      res.status(200).json({
        status: 'success',
        data: summary,
      });
    } catch (error) {
      logger.error(error, "Error fetching financial summary:");
      next(error);
    }
  }

  async getIncomeStatement(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const incomeStatement = await this.financeService.getIncomeStatement();
      res.status(200).json({
        status: 'success',
        data: incomeStatement,
      });
    } catch (error) {
      logger.error(error, "Error fetching income statement:");
      next(error);
    }
  }

  async getRevenueExpenseChartData(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const chartData = await this.financeService.getRevenueExpenseChartData();
      res.status(200).json({
        status: 'success',
        data: chartData,
      });
    } catch (error) {
      logger.error(error, "Error fetching revenue expense chart data:");
      next(error);
    }
  }

  async getTopSellingProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const products = await this.financeService.getTopSellingProducts(limit);
      res.status(200).json({
        status: 'success',
        data: products,
      });
    } catch (error) {
      logger.error(error, "Error fetching top products:");
      next(error);
    }
  }

  async getSalesByPaymentMethod(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await this.financeService.getSalesByPaymentMethod();
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      logger.error(error, "Error fetching sales by payment method:");
      next(error);
    }
  }

  async getFinancialKPIs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const kpis = await this.financeService.getFinancialKPIs();
      res.status(200).json({
        status: 'success',
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

  async getBalanceSheet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = req.query.date ? new Date(req.query.date as string) : new Date();
      const report = await AccountingService.getBalanceSheet(date);
      res.status(200).json({ status: 'success', data: report });
    } catch (error) {
      logger.error(error, "Error fetching Balance Sheet:");
      next(error);
    }
  }

  async getProfitAndLoss(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const report = await AccountingService.getIncomeStatement(startDate, endDate);
      res.status(200).json({ status: 'success', data: report });
    } catch (error) {
      logger.error(error, "Error fetching Profit & Loss:");
      next(error);
    }
  }

  async getCashFlowStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(new Date().getFullYear(), 0, 1);
      const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

      const report = await AccountingService.getCashFlow(startDate, endDate);
      res.status(200).json({ status: 'success', data: report });
    } catch (error) {
      logger.error(error, "Error fetching Cash Flow:");
      next(error);
    }
  }

  // ============================================
  // Bank Reconciliation
  // ============================================

  private bankService = new BankService();

  async getBankAccounts(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accounts = await AccountingService.getBankAccounts();
      res.status(200).json({ status: 'success', data: accounts });
    } catch (error) {
      logger.error(error, "Error fetching bank accounts:");
      next(error);
    }
  }

  async uploadBankStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Simplified file handling: Assume plain text body or specific parsing field if using multer (not configured here yet)
      // For MVP, we'll accept raw CSV string in body.fileContent

      const { accountId, fileContent, filename } = req.body;
      // User ID from Auth Middleware
      // @ts-ignore
      const userId = (req.user as any)?.userId || 'system';

      const result = await this.bankService.importStatement(accountId, fileContent, filename, userId);

      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error uploading bank statement:");
      next(error);
    }
  }

  async getReconciliationData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const accountId = req.query.accountId as string;
      if (!accountId) {
        res.status(400).json({
          status: 'error',
          message: 'accountId query parameter is required'
        });
        return;
      }
      const data = await this.bankService.getReconciliationData(accountId);
      res.status(200).json({ status: 'success', data });
    } catch (error) {
      logger.error(error, "Error fetching reconciliation data:");
      next(error);
    }
  }

  async reconcileTransaction(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { bankLineId, journalEntryId } = req.body;
      const result = await this.bankService.reconcileItems(bankLineId, journalEntryId);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error reconciling transaction:");
      next(error);
    }
  }

  // ============================================
  // General Ledger
  // ============================================

  async createManualJournalEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { date, description, journalId, lines } = req.body;
      // @ts-ignore
      const userId = (req.user as any)?.userId || 'system';

      const result = await GeneralLedgerService.createManualEntry({
        date: new Date(date),
        description,
        journalId,
        lines,
        userId
      });

      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error creating journal entry:");
      next(error);
    }
  }

  async getJournals(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const journals = await GeneralLedgerService.getJournals();
      res.status(200).json({ status: 'success', data: journals });
    } catch (error) {
      logger.error(error, "Error fetching journals:");
      next(error);
    }
  }

  async getLedgerEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { accountId, journalId, startDate, endDate } = req.query;
      const entries = await GeneralLedgerService.getLedgerEntries({
        accountId: accountId as string || undefined,
        journalId: journalId as string || undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });
      res.status(200).json({ status: 'success', data: entries });
    } catch (error) {
      logger.error(error, "Error fetching ledger entries:");
      next(error);
    }
  }

  // ============================================
  // Accounts Receivable
  // ============================================

  async getReceivables(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const receivables = await ReceivablesService.getAllReceivables();
      res.status(200).json({ status: 'success', data: receivables });
    } catch (error) {
      logger.error(error, "Error fetching receivables:");
      next(error);
    }
  }

  async recordARPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { receivableId, amount, paymentMethod, referenceNo } = req.body;
      // @ts-ignore
      const userId = (req.user as any)?.userId || 'system';

      const result = await ReceivablesService.recordPayment({
        receivableId,
        amount,
        paymentMethod,
        referenceNo,
        userId
      });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error recording AR payment:");
      next(error);
    }
  }

  async getARAgingReport(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const report = await ReceivablesService.getAgingReport();
      res.status(200).json({ status: 'success', data: report });
    } catch (error) {
      logger.error(error, "Error fetching AR aging report:");
      next(error);
    }
  }

  // ============================================
  // Accounts Payable
  // ============================================

  async getPayables(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payables = await PayablesService.getAllPayables();
      res.status(200).json({ status: 'success', data: payables });
    } catch (error) {
      logger.error(error, "Error fetching payables:");
      next(error);
    }
  }

  async recordAPPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { payableId, amount, paymentMethod, referenceNo } = req.body;
      // @ts-ignore
      const userId = (req.user as any)?.userId || 'system';

      const result = await PayablesService.recordPayment({
        payableId,
        amount,
        paymentMethod,
        referenceNo,
        userId
      });
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error recording AP payment:");
      next(error);
    }
  }

  // ============================================
  // Period Management
  // ============================================

  async initializeFiscalYear(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { year } = req.body;
      const result = await PeriodService.initializeFiscalYear(parseInt(year));
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error initializing fiscal year:");
      next(error);
    }
  }

  async lockFiscalPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      // @ts-ignore
      const userId = (req.user as any)?.userId;
      if (!userId) {
        res.status(401).json({ status: 'error', message: 'User not authenticated' });
        return;
      }
      if (!id) {
        res.status(400).json({ status: 'error', message: 'Period ID is required' });
        return;
      }
      const result = await PeriodService.lock(id as string, userId);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error locking fiscal period:");
      next(error);
    }
  }

  async unlockFiscalPeriod(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ status: 'error', message: 'Period ID is required' });
        return;
      }
      const result = await PeriodService.unlock(id as string);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error unlocking fiscal period:");
      next(error);
    }
  }

  async getFiscalPeriods(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const result = await PeriodService.getFiscalPeriods(year);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      logger.error(error, "Error fetching fiscal periods:");
      next(error);
    }
  }

  // ============================================
  // Dashboard Finance Endpoints
  // ============================================

  async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;
      const type = req.query.type as 'income' | 'expense' | undefined;
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
      logger.error(error, 'Error in getTransactions:');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch transactions',
        },
      });
    }
  }

  async getExpenseCategories(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const period = (req.query.period || 'month') as 'today' | 'week' | 'month' | 'year';
      const startDate = req.query.startDate as string | undefined;
      const endDate = req.query.endDate as string | undefined;

      const result = await this.dashboardService.getExpenseCategories({
        period,
        startDate,
        endDate,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, 'Error in getExpenseCategories:');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch expense categories',
        },
      });
    }
  }

  async getDailySpending(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const date = req.query.date as string | undefined;

      const result = await this.dashboardService.getDailySpending({
        date,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, 'Error in getDailySpending:');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch daily spending',
        },
      });
    }
  }

  async getSavingsGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = (req.query.status || 'active') as 'active' | 'completed' | 'all';

      const result = await this.dashboardService.getSavingsGoals({
        status,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, 'Error in getSavingsGoals:');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch savings goals',
        },
      });
    }
  }

  async createSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, description, targetAmount, deadline } = req.body;

      if (!name || !targetAmount) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Name and targetAmount are required',
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
      logger.error(error, 'Error in createSavingsGoal:');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to create savings goal',
        },
      });
    }
  }

  async updateSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const { name, description, targetAmount, currentAmount, deadline, status } = req.body;

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Goal ID is required',
          },
        });
        return;
      }

      const result = await this.dashboardService.updateSavingsGoal(id as string, {
        name,
        description,
        targetAmount,
        currentAmount,
        deadline,
        status,
      });

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, 'Error in updateSavingsGoal:');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to update savings goal',
        },
      });
    }
  }

  async deleteSavingsGoal(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_PARAMETERS',
            message: 'Goal ID is required',
          },
        });
        return;
      }

      const result = await this.dashboardService.deleteSavingsGoal(id);

      res.status(200).json(result);
    } catch (error) {
      logger.error(error, 'Error in deleteSavingsGoal:');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to delete savings goal',
        },
      });
    }
  }
}

export default new FinanceController();
