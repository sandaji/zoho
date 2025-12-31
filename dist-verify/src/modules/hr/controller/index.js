"use strict";
/**
 * HR Module - Controller Layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrController = void 0;
const service_1 = require("../service");
const errors_1 = require("../../../lib/errors");
class HrController {
    constructor() {
        this.service = new service_1.HrService();
    }
    // DASHBOARD ENDPOINTS
    async getHRStats(_req, res, next) {
        try {
            const result = await this.service.getHRStats();
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // USER ENDPOINTS
    async createUser(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.email || !dto.password || !dto.name || !dto.role) {
                throw (0, errors_1.validationError)("Missing required fields: email, password, name, role");
            }
            const result = await this.service.createUser(dto);
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUser(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.getUser(id);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateUser(req, res, next) {
        try {
            const { id } = req.params;
            const dto = req.body;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.updateUser(id, dto);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // PAYROLL ENDPOINTS
    async createPayroll(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.userId ||
                !dto.base_salary ||
                !dto.period_start ||
                !dto.period_end) {
                throw (0, errors_1.validationError)("Missing required fields: userId, base_salary, period_start, period_end");
            }
            const result = await this.service.createPayroll(dto);
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
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
    async listPayroll(req, res, next) {
        try {
            const query = req.query;
            const result = await this.service.listPayroll(query);
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
    async updatePayroll(req, res, next) {
        try {
            const { id } = req.params;
            const dto = req.body;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.updatePayroll(id, dto);
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
exports.HrController = HrController;
