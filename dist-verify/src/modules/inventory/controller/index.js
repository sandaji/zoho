"use strict";
/**
 * Inventory Module - Controller Layer
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const service_1 = require("../service");
const errors_1 = require("../../../lib/errors");
class InventoryController {
    constructor() {
        this.service = new service_1.InventoryService();
    }
    async updateInventory(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.productId || !dto.warehouseId) {
                throw (0, errors_1.validationError)("Missing required fields: productId, warehouseId");
            }
            const result = await this.service.updateInventory(dto);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getInventory(req, res, next) {
        try {
            const { productId, warehouseId } = req.params;
            if (!productId || !warehouseId) {
                throw (0, errors_1.validationError)("Missing required parameters: productId, warehouseId");
            }
            const result = await this.service.getInventory(productId);
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async listInventory(req, res, next) {
        try {
            const query = req.query;
            const result = await this.service.listInventory(query);
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
    async adjustStock(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.productId || !dto.warehouseId || !dto.quantity) {
                throw (0, errors_1.validationError)("Missing required fields: productId, warehouseId, quantity");
            }
            const result = await this.service.adjustStock(dto);
            res.json({
                success: true,
                data: result,
                message: `Stock adjusted by ${dto.quantity} units`,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /inventory - Enhanced version
     * Retrieve all inventory with filtering, sorting, and pagination
     */
    async getInventoryList(req, res, next) {
        try {
            const query = req.query;
            const result = await this.service.getInventory(query);
            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /inventory/adjust - Enhanced version
     * Adjust inventory stock (increase or decrease)
     */
    async adjustInventory(req, res, next) {
        try {
            const dto = req.body;
            // Validation
            if (!dto.productId || !dto.warehouseId) {
                throw (0, errors_1.validationError)("Missing required fields: productId, warehouseId");
            }
            if (!dto.adjustmentType ||
                !["increase", "decrease"].includes(dto.adjustmentType)) {
                throw (0, errors_1.validationError)("adjustmentType must be 'increase' or 'decrease'");
            }
            if (!dto.quantity || dto.quantity <= 0) {
                throw (0, errors_1.validationError)("quantity must be a positive number");
            }
            if (!dto.reason) {
                throw (0, errors_1.validationError)("reason is required");
            }
            const result = await this.service.adjustInventory(dto);
            res.status(200).json({
                success: true,
                data: result,
                message: `Inventory ${dto.adjustmentType}d by ${dto.quantity} units`,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /inventory/transfer
     * Transfer inventory between warehouses
     */
    async transferInventory(req, res, next) {
        try {
            const dto = req.body;
            // Validation
            if (!dto.productId || !dto.fromWarehouseId || !dto.toWarehouseId) {
                throw (0, errors_1.validationError)("Missing required fields: productId, fromWarehouseId, toWarehouseId");
            }
            if (dto.fromWarehouseId === dto.toWarehouseId) {
                throw (0, errors_1.validationError)("Source and destination warehouses must be different");
            }
            if (!dto.quantity || dto.quantity <= 0) {
                throw (0, errors_1.validationError)("quantity must be a positive number");
            }
            const result = await this.service.transferInventory(dto);
            res.status(200).json({
                success: true,
                data: result,
                message: `Successfully transferred ${dto.quantity} units from warehouse ${dto.fromWarehouseId} to ${dto.toWarehouseId}`,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.InventoryController = InventoryController;
