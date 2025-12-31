"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finance_controller_1 = __importDefault(require("./finance.controller"));
const auth_1 = require("../../lib/auth");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const fiscal_period_middleware_1 = require("../../middleware/fiscal-period.middleware");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
// Removed global managerOrAdmin check - now using granular permissions
router.get('/summary', (0, rbac_middleware_1.hasAnyPermission)(['finance.gl.view', 'finance.report.aging']), (req, res, next) => finance_controller_1.default.getFinancialSummary(req, res, next));
router.get('/income-statement', (0, rbac_middleware_1.requirePermission)('finance.report.aging'), (req, res, next) => finance_controller_1.default.getIncomeStatement(req, res, next));
router.get('/revenue-expense-chart', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getRevenueExpenseChartData(req, res, next));
router.get('/top-products', (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), (req, res, next) => finance_controller_1.default.getTopSellingProducts(req, res, next));
router.get('/sales-by-payment', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getSalesByPaymentMethod(req, res, next));
router.get('/kpis', (0, rbac_middleware_1.hasAnyPermission)(['finance.gl.view', 'finance.report.aging']), (req, res, next) => finance_controller_1.default.getFinancialKPIs(req, res, next));
// Core Financial Reports
router.get('/reports/balance-sheet', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getBalanceSheet(req, res, next));
router.get('/reports/profit-loss', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getProfitAndLoss(req, res, next));
router.get('/reports/cash-flow', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getCashFlowStatement(req, res, next));
// Bank Reconciliation
router.get('/bank/accounts', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getBankAccounts(req, res, next));
router.post('/bank/upload', (0, rbac_middleware_1.requirePermission)('finance.gl.create'), (req, res, next) => finance_controller_1.default.uploadBankStatement(req, res, next));
router.get('/bank/reconciliation/:accountId', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getReconciliationData(req, res, next));
router.post('/bank/reconcile', (0, rbac_middleware_1.requirePermission)('finance.gl.create'), (req, res, next) => finance_controller_1.default.reconcileTransaction(req, res, next));
// General Ledger
router.get('/gl/journals', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getJournals(req, res, next));
router.get('/gl/entries', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getLedgerEntries(req, res, next));
router.post('/gl/entries', (0, rbac_middleware_1.requirePermission)('finance.gl.create'), (0, fiscal_period_middleware_1.validateFiscalPeriod)('date'), (req, res, next) => finance_controller_1.default.createManualJournalEntry(req, res, next));
// Accounts Receivable
router.get('/ar/list', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getReceivables(req, res, next));
router.post('/ar/payment', (0, rbac_middleware_1.requirePermission)('finance.payment.record'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), (req, res, next) => finance_controller_1.default.recordARPayment(req, res, next));
router.get('/ar/aging', (0, rbac_middleware_1.requirePermission)('finance.report.aging'), (req, res, next) => finance_controller_1.default.getARAgingReport(req, res, next));
// Accounts Payable
router.get('/ap/list', (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => finance_controller_1.default.getPayables(req, res, next));
router.post('/ap/payment', (0, rbac_middleware_1.requirePermission)('finance.payment.record'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), (req, res, next) => finance_controller_1.default.recordAPPayment(req, res, next));
// Period Management
router.get('/periods', (0, rbac_middleware_1.requirePermission)('finance.settings.periods'), (req, res, next) => finance_controller_1.default.getFiscalPeriods(req, res, next));
router.post('/periods/initialize', (0, rbac_middleware_1.requirePermission)('finance.settings.periods'), (req, res, next) => finance_controller_1.default.initializeFiscalYear(req, res, next));
router.post('/periods/:id/lock', (0, rbac_middleware_1.requirePermission)('finance.periods.lock'), (req, res, next) => finance_controller_1.default.lockFiscalPeriod(req, res, next));
router.post('/periods/:id/unlock', (0, rbac_middleware_1.requirePermission)('finance.periods.lock'), (req, res, next) => finance_controller_1.default.unlockFiscalPeriod(req, res, next));
exports.default = router;
