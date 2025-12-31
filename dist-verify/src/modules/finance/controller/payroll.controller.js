"use strict";
/**
 * Payroll Module - Controller Layer
 * Handles HTTP requests for payroll processing and management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PayrollController = void 0;
const payroll_service_1 = require("../service/payroll.service");
const errors_1 = require("../../../lib/errors");
class PayrollController {
    constructor() {
        this.service = new payroll_service_1.PayrollService();
    }
    /**
     * Run payroll for employees in a given period
     */
    async runPayroll(req, res, next) {
        try {
            const dto = req.body;
            // Validate required fields
            if (!dto.period_start || !dto.period_end || !dto.month || !dto.year) {
                throw (0, errors_1.validationError)("Missing required fields: period_start, period_end, month, year");
            }
            // Validate month
            if (dto.month < 1 || dto.month > 12) {
                throw (0, errors_1.validationError)("month must be between 1 and 12");
            }
            // Validate dates
            const startDate = new Date(dto.period_start);
            const endDate = new Date(dto.period_end);
            if (startDate >= endDate) {
                throw (0, errors_1.validationError)("period_start must be before period_end");
            }
            const result = await this.service.runPayroll(dto);
            res.status(201).json({
                success: true,
                data: result,
                message: `Payroll run completed for ${result.payroll_count} employees`,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get payroll report for a period
     */
    async getPayrollReport(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                throw (0, errors_1.validationError)("Missing required query parameters: startDate, endDate");
            }
            const result = await this.service.getPayrollReport(startDate, endDate);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get payroll analytics with trends
     */
    async getPayrollAnalytics(req, res, next) {
        try {
            const { startDate, endDate } = req.query;
            if (!startDate || !endDate) {
                throw (0, errors_1.validationError)("Missing required query parameters: startDate, endDate");
            }
            const result = await this.service.getPayrollAnalytics(startDate, endDate);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get single payroll by ID
     */
    async getPayroll(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.getPayroll(id);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update payroll status
     */
    async updatePayrollStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, paid_date } = req.body;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            if (!status) {
                throw (0, errors_1.validationError)("status is required");
            }
            const result = await this.service.updatePayrollStatus(id, status, paid_date);
            res.json({
                success: true,
                data: result,
                message: `Payroll status updated to ${status}`,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PayrollController = PayrollController;
