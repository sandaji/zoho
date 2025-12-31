"use strict";
/**
 * Finance Module - Controller Layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinanceController = void 0;
const service_1 = require("../service");
const errors_1 = require("../../../lib/errors");
class FinanceController {
    constructor() {
        this.service = new service_1.FinanceService();
    }
    async createTransaction(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.type || !dto.reference_no || !dto.description || !dto.amount) {
                throw (0, errors_1.validationError)("Missing required fields: type, reference_no, description, amount");
            }
            const result = await this.service.createTransaction(dto);
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTransaction(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.getTransaction(id);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async listTransactions(req, res, next) {
        try {
            const query = req.query;
            const result = await this.service.listTransactions(query);
            res.json({
                success: true,
                data: result.data,
                pagination: {
                    total: result.total,
                    page: query.page || 1,
                    limit: query.limit || 20,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateTransaction(req, res, next) {
        try {
            const { id } = req.params;
            const dto = req.body;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.updateTransaction(id, dto);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getFinancialReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                throw (0, errors_1.validationError)("Missing required query parameters: startDate, endDate");
            }
            const result = await this.service.getFinancialReport(startDate, endDate);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getRevenueAnalytics(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                throw (0, errors_1.validationError)("Missing required query parameters: startDate, endDate");
            }
            const result = await this.service.getRevenueAnalytics(startDate, endDate);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMonthlyReport(req, res, next) {
        try {
            const { month, year } = req.query;
            if (!month || !year) {
                throw (0, errors_1.validationError)("Missing required query parameters: month, year");
            }
            const monthNum = parseInt(month);
            const yearNum = parseInt(year);
            if (isNaN(monthNum) || isNaN(yearNum)) {
                throw (0, errors_1.validationError)("month and year must be valid numbers");
            }
            const result = await this.service.getMonthlyReport({
                month: monthNum,
                year: yearNum,
                includeExpenses: true,
                includeRevenue: true,
            });
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.FinanceController = FinanceController;
