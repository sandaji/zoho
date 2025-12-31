import { Router } from 'express';
import financeController from './finance.controller';
import { authMiddleware } from '../../lib/auth';
import { requirePermission, hasAnyPermission } from '../../middleware/rbac.middleware';
import { validateFiscalPeriod } from '../../middleware/fiscal-period.middleware';

const router = Router();

router.use(authMiddleware);
// Removed global managerOrAdmin check - now using granular permissions

router.get('/summary', hasAnyPermission(['finance.gl.view', 'finance.report.aging']), (req, res, next) => financeController.getFinancialSummary(req, res, next));
router.get('/income-statement', requirePermission('finance.report.aging'), (req, res, next) => financeController.getIncomeStatement(req, res, next));
router.get('/revenue-expense-chart', requirePermission('finance.gl.view'), (req, res, next) => financeController.getRevenueExpenseChartData(req, res, next));
router.get('/top-products', requirePermission('sales.order.view_all'), (req, res, next) => financeController.getTopSellingProducts(req, res, next));
router.get('/sales-by-payment', requirePermission('finance.gl.view'), (req, res, next) => financeController.getSalesByPaymentMethod(req, res, next));
router.get('/kpis', hasAnyPermission(['finance.gl.view', 'finance.report.aging']), (req, res, next) => financeController.getFinancialKPIs(req, res, next));

// Core Financial Reports
router.get('/reports/balance-sheet', requirePermission('finance.gl.view'), (req, res, next) => financeController.getBalanceSheet(req, res, next));
router.get('/reports/profit-loss', requirePermission('finance.gl.view'), (req, res, next) => financeController.getProfitAndLoss(req, res, next));
router.get('/reports/cash-flow', requirePermission('finance.gl.view'), (req, res, next) => financeController.getCashFlowStatement(req, res, next));

// Bank Reconciliation
router.get('/bank/accounts', requirePermission('finance.gl.view'), (req, res, next) => financeController.getBankAccounts(req, res, next));
router.post('/bank/upload', requirePermission('finance.gl.create'), (req, res, next) => financeController.uploadBankStatement(req, res, next));
router.get('/bank/reconciliation/:accountId', requirePermission('finance.gl.view'), (req, res, next) => financeController.getReconciliationData(req, res, next));
router.post('/bank/reconcile', requirePermission('finance.gl.create'), (req, res, next) => financeController.reconcileTransaction(req, res, next));

// General Ledger
router.get('/gl/journals', requirePermission('finance.gl.view'), (req, res, next) => financeController.getJournals(req, res, next));
router.get('/gl/entries', requirePermission('finance.gl.view'), (req, res, next) => financeController.getLedgerEntries(req, res, next));
router.post('/gl/entries', requirePermission('finance.gl.create'), validateFiscalPeriod('date'), (req, res, next) => financeController.createManualJournalEntry(req, res, next));

// Accounts Receivable
router.get('/ar/list', requirePermission('finance.gl.view'), (req, res, next) => financeController.getReceivables(req, res, next));
router.post('/ar/payment', requirePermission('finance.payment.record'), validateFiscalPeriod(), (req, res, next) => financeController.recordARPayment(req, res, next));
router.get('/ar/aging', requirePermission('finance.report.aging'), (req, res, next) => financeController.getARAgingReport(req, res, next));

// Accounts Payable
router.get('/ap/list', requirePermission('finance.gl.view'), (req, res, next) => financeController.getPayables(req, res, next));
router.post('/ap/payment', requirePermission('finance.payment.record'), validateFiscalPeriod(), (req, res, next) => financeController.recordAPPayment(req, res, next));

// Period Management
router.get('/periods', requirePermission('finance.settings.periods'), (req, res, next) => financeController.getFiscalPeriods(req, res, next));
router.post('/periods/initialize', requirePermission('finance.settings.periods'), (req, res, next) => financeController.initializeFiscalYear(req, res, next));
router.post('/periods/:id/lock', requirePermission('finance.periods.lock'), (req, res, next) => financeController.lockFiscalPeriod(req, res, next));
router.post('/periods/:id/unlock', requirePermission('finance.periods.lock'), (req, res, next) => financeController.unlockFiscalPeriod(req, res, next));

export default router;
