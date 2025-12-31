"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const finance_controller_1 = __importDefault(require("./finance.controller"));
const auth_1 = require("../../lib/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
router.use(auth_1.managerOrAdmin);
router.get('/summary', (req, res, next) => finance_controller_1.default.getFinancialSummary(req, res, next));
router.get('/income-statement', (req, res, next) => finance_controller_1.default.getIncomeStatement(req, res, next));
router.get('/revenue-expense-chart', (req, res, next) => finance_controller_1.default.getRevenueExpenseChartData(req, res, next));
router.get('/top-products', (req, res, next) => finance_controller_1.default.getTopSellingProducts(req, res, next));
router.get('/sales-by-payment', (req, res, next) => finance_controller_1.default.getSalesByPaymentMethod(req, res, next));
router.get('/kpis', (req, res, next) => finance_controller_1.default.getFinancialKPIs(req, res, next));
exports.default = router;
