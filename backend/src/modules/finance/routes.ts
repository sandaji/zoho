import { Router } from 'express';
import financeController from './finance.controller';
import { authMiddleware, managerOrAdmin } from '../../lib/auth';

const router = Router();

router.use(authMiddleware);
router.use(managerOrAdmin);

router.get('/summary', (req, res, next) => financeController.getFinancialSummary(req, res, next));
router.get('/income-statement', (req, res, next) => financeController.getIncomeStatement(req, res, next));
router.get('/revenue-expense-chart', (req, res, next) => financeController.getRevenueExpenseChartData(req, res, next));
router.get('/top-products', (req, res, next) => financeController.getTopSellingProducts(req, res, next));
router.get('/sales-by-payment', (req, res, next) => financeController.getSalesByPaymentMethod(req, res, next));
router.get('/kpis', (req, res, next) => financeController.getFinancialKPIs(req, res, next));

export default router;