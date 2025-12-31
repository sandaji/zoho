"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const finance_service_1 = require("./finance.service");
const accounting_service_1 = require("./services/accounting.service");
const bank_service_1 = require("./services/bank.service");
const gl_service_1 = require("./services/gl.service");
const receivables_service_1 = require("./services/receivables.service");
const payables_service_1 = require("./services/payables.service");
const period_service_1 = require("./services/period.service");
const logger_1 = require("../../lib/logger");
class FinanceController {
    constructor() {
        this.financeService = new finance_service_1.FinanceService();
        // ============================================
        // Bank Reconciliation
        // ============================================
        this.bankService = new bank_service_1.BankService();
    }
    async getFinancialSummary(_req, res, next) {
        try {
            const summary = await this.financeService.getFinancialSummary();
            res.status(200).json({
                status: 'success',
                data: summary,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching financial summary:");
            next(error);
        }
    }
    async getIncomeStatement(_req, res, next) {
        try {
            const incomeStatement = await this.financeService.getIncomeStatement();
            res.status(200).json({
                status: 'success',
                data: incomeStatement,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching income statement:");
            next(error);
        }
    }
    async getRevenueExpenseChartData(_req, res, next) {
        try {
            const chartData = await this.financeService.getRevenueExpenseChartData();
            res.status(200).json({
                status: 'success',
                data: chartData,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching revenue expense chart data:");
            next(error);
        }
    }
    async getTopSellingProducts(req, res, next) {
        try {
            const limit = parseInt(req.query.limit) || 10;
            const products = await this.financeService.getTopSellingProducts(limit);
            res.status(200).json({
                status: 'success',
                data: products,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching top products:");
            next(error);
        }
    }
    async getSalesByPaymentMethod(_req, res, next) {
        try {
            const data = await this.financeService.getSalesByPaymentMethod();
            res.status(200).json({
                status: 'success',
                data,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching sales by payment method:");
            next(error);
        }
    }
    async getFinancialKPIs(_req, res, next) {
        try {
            const kpis = await this.financeService.getFinancialKPIs();
            res.status(200).json({
                status: 'success',
                data: kpis,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching financial KPIs:");
            logger_1.logger.error(error, "Error fetching financial KPIs:");
            next(error);
        }
    }
    // ============================================
    // New Core Financial Reports (Accounting Engine)
    // ============================================
    async getBalanceSheet(req, res, next) {
        try {
            const date = req.query.date ? new Date(req.query.date) : new Date();
            const report = await accounting_service_1.AccountingService.getBalanceSheet(date);
            res.status(200).json({ status: 'success', data: report });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching Balance Sheet:");
            next(error);
        }
    }
    async getProfitAndLoss(req, res, next) {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), 0, 1);
            const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
            const report = await accounting_service_1.AccountingService.getIncomeStatement(startDate, endDate);
            res.status(200).json({ status: 'success', data: report });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching Profit & Loss:");
            next(error);
        }
    }
    async getCashFlowStatement(req, res, next) {
        try {
            const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(new Date().getFullYear(), 0, 1);
            const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
            const report = await accounting_service_1.AccountingService.getCashFlow(startDate, endDate);
            res.status(200).json({ status: 'success', data: report });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching Cash Flow:");
            next(error);
        }
    }
    async getBankAccounts(_req, res, next) {
        try {
            const accounts = await accounting_service_1.AccountingService.getBankAccounts();
            res.status(200).json({ status: 'success', data: accounts });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching bank accounts:");
            next(error);
        }
    }
    async uploadBankStatement(req, res, next) {
        try {
            // Simplified file handling: Assume plain text body or specific parsing field if using multer (not configured here yet)
            // For MVP, we'll accept raw CSV string in body.fileContent
            const { accountId, fileContent, filename } = req.body;
            // User ID from Auth Middleware
            // @ts-ignore
            const userId = req.user?.userId || 'system';
            const result = await this.bankService.importStatement(accountId, fileContent, filename, userId);
            res.status(200).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error uploading bank statement:");
            next(error);
        }
    }
    async getReconciliationData(req, res, next) {
        try {
            const accountId = req.query.accountId;
            if (!accountId) {
                res.status(400).json({
                    status: 'error',
                    message: 'accountId query parameter is required'
                });
                return;
            }
            const data = await this.bankService.getReconciliationData(accountId);
            res.status(200).json({ status: 'success', data });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching reconciliation data:");
            next(error);
        }
    }
    async reconcileTransaction(req, res, next) {
        try {
            const { bankLineId, journalEntryId } = req.body;
            const result = await this.bankService.reconcileItems(bankLineId, journalEntryId);
            res.status(200).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error reconciling transaction:");
            next(error);
        }
    }
    // ============================================
    // General Ledger
    // ============================================
    async createManualJournalEntry(req, res, next) {
        try {
            const { date, description, journalId, lines } = req.body;
            // @ts-ignore
            const userId = req.user?.userId || 'system';
            const result = await gl_service_1.GeneralLedgerService.createManualEntry({
                date: new Date(date),
                description,
                journalId,
                lines,
                userId
            });
            res.status(201).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error creating journal entry:");
            next(error);
        }
    }
    async getJournals(_req, res, next) {
        try {
            const journals = await gl_service_1.GeneralLedgerService.getJournals();
            res.status(200).json({ status: 'success', data: journals });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching journals:");
            next(error);
        }
    }
    async getLedgerEntries(req, res, next) {
        try {
            const { accountId, journalId, startDate, endDate } = req.query;
            const entries = await gl_service_1.GeneralLedgerService.getLedgerEntries({
                accountId: accountId || undefined,
                journalId: journalId || undefined,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : undefined
            });
            res.status(200).json({ status: 'success', data: entries });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching ledger entries:");
            next(error);
        }
    }
    // ============================================
    // Accounts Receivable
    // ============================================
    async getReceivables(_req, res, next) {
        try {
            const receivables = await receivables_service_1.ReceivablesService.getAllReceivables();
            res.status(200).json({ status: 'success', data: receivables });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching receivables:");
            next(error);
        }
    }
    async recordARPayment(req, res, next) {
        try {
            const { receivableId, amount, paymentMethod, referenceNo } = req.body;
            // @ts-ignore
            const userId = req.user?.userId || 'system';
            const result = await receivables_service_1.ReceivablesService.recordPayment({
                receivableId,
                amount,
                paymentMethod,
                referenceNo,
                userId
            });
            res.status(200).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error recording AR payment:");
            next(error);
        }
    }
    async getARAgingReport(_req, res, next) {
        try {
            const report = await receivables_service_1.ReceivablesService.getAgingReport();
            res.status(200).json({ status: 'success', data: report });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching AR aging report:");
            next(error);
        }
    }
    // ============================================
    // Accounts Payable
    // ============================================
    async getPayables(_req, res, next) {
        try {
            const payables = await payables_service_1.PayablesService.getAllPayables();
            res.status(200).json({ status: 'success', data: payables });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching payables:");
            next(error);
        }
    }
    async recordAPPayment(req, res, next) {
        try {
            const { payableId, amount, paymentMethod, referenceNo } = req.body;
            // @ts-ignore
            const userId = req.user?.userId || 'system';
            const result = await payables_service_1.PayablesService.recordPayment({
                payableId,
                amount,
                paymentMethod,
                referenceNo,
                userId
            });
            res.status(200).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error recording AP payment:");
            next(error);
        }
    }
    // ============================================
    // Period Management
    // ============================================
    async initializeFiscalYear(req, res, next) {
        try {
            const { year } = req.body;
            const result = await period_service_1.PeriodService.initializeFiscalYear(parseInt(year));
            res.status(201).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error initializing fiscal year:");
            next(error);
        }
    }
    async lockFiscalPeriod(req, res, next) {
        try {
            const { id } = req.params;
            // @ts-ignore
            const userId = req.user?.userId;
            if (!userId) {
                res.status(401).json({ status: 'error', message: 'User not authenticated' });
                return;
            }
            const result = await period_service_1.PeriodService.lock(id, userId);
            res.status(200).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error locking fiscal period:");
            next(error);
        }
    }
    async unlockFiscalPeriod(req, res, next) {
        try {
            const { id } = req.params;
            const result = await period_service_1.PeriodService.unlock(id);
            res.status(200).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error unlocking fiscal period:");
            next(error);
        }
    }
    async getFiscalPeriods(req, res, next) {
        try {
            const year = req.query.year ? parseInt(req.query.year) : undefined;
            const result = await period_service_1.PeriodService.getFiscalPeriods(year);
            res.status(200).json({ status: 'success', data: result });
        }
        catch (error) {
            logger_1.logger.error(error, "Error fetching fiscal periods:");
            next(error);
        }
    }
}
exports.default = new FinanceController();
