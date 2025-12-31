"use strict";
/**
 * Warehouse Module - Controller Layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseController = void 0;
const service_1 = require("../service");
const errors_1 = require("../../../lib/errors");
class WarehouseController {
    constructor() {
        this.service = new service_1.WarehouseService();
    }
    async createWarehouse(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.code ||
                !dto.name ||
                !dto.location ||
                !dto.capacity ||
                !dto.branchId) {
                throw (0, errors_1.validationError)("Missing required fields: code, name, location, capacity, branchId");
            }
            const result = await this.service.createWarehouse(dto);
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getWarehouse(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.getWarehouse(id);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async listWarehouses(req, res, next) {
        try {
            const query = req.query;
            const result = await this.service.listWarehouses(query);
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
    async updateWarehouse(req, res, next) {
        try {
            const { id } = req.params;
            const dto = req.body;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.updateWarehouse(id, dto);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getWarehouseStock(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.getWarehouseStock(id);
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
exports.WarehouseController = WarehouseController;
