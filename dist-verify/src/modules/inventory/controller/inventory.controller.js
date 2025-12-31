"use strict";
/**
 * Inventory Module - Controller Layer
 * Endpoints:
 * - GET /inventory - Get all inventory with filtering and pagination
 * - POST /inventory/adjust - Adjust inventory stock
 * - POST /inventory/transfer - Transfer inventory between warehouses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryController = void 0;
const inventory_service_1 = require("../service/inventory.service");
const errors_1 = require("../../../lib/errors");
const logger_1 = require("../../../lib/logger");
class InventoryController {
    constructor() {
        this.service = new inventory_service_1.InventoryService();
    }
    /**
     * GET /inventory
     * Retrieve all inventory with filtering, sorting, and pagination
     * Query params:
     *   - page: number (default 1)
     *   - limit: number (default 20, max 100)
     *   - status: in_stock | low_stock | out_of_stock | discontinued
     *   - warehouseId: string
     *   - productId: string
     *   - productSku: string
     *   - lowStockOnly: boolean
     *   - search: string
     *   - sortBy: quantity | available | reserved | product_name | warehouse_name | status
     *   - sortOrder: asc | desc
     */
    async getInventory(req, res, next) {
        try {
            const query = req.query;
            logger_1.logger.debug({ query }, "GET /inventory");
            const result = await this.service.getInventory(query);
            res.json({
                success: true,
                data: result.data,
                pagination: result.pagination,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error in getInventory");
            next(error);
        }
    }
    /**
     * POST /inventory/adjust
     * Adjust inventory stock (increase or decrease)
     * Body:
     *   - productId: string (required)
     *   - warehouseId: string (required)
     *   - adjustmentType: "increase" | "decrease" (required)
     *   - quantity: number (required, must be positive)
     *   - reason: "receipt" | "damage" | "theft" | "count_variance" | "expiry" | "return" | "promotion" | "other" (required)
     *   - reference: string (optional) - PO number, RMA number, etc.
     *   - notes: string (optional)
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
            logger_1.logger.debug({
                productId: dto.productId,
                adjustmentType: dto.adjustmentType,
                quantity: dto.quantity,
            }, "POST /inventory/adjust");
            const result = await this.service.adjustInventory(dto);
            res.status(200).json({
                success: true,
                data: result,
                message: `Inventory ${dto.adjustmentType}d by ${dto.quantity} units`,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error in adjustInventory");
            next(error);
        }
    }
    /**
     * POST /inventory/transfer
     * Transfer inventory between warehouses
     * Body:
     *   - productId: string (required)
     *   - fromWarehouseId: string (required)
     *   - toWarehouseId: string (required, must be different from fromWarehouseId)
     *   - quantity: number (required, must be positive)
     *   - reason: string (optional) - Balancing, reorganization, branch movement, etc.
     *   - reference: string (optional) - Transfer order number, etc.
     *   - notes: string (optional)
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
            logger_1.logger.debug({
                productId: dto.productId,
                fromWarehouse: dto.fromWarehouseId,
                toWarehouse: dto.toWarehouseId,
                quantity: dto.quantity,
            }, "POST /inventory/transfer");
            const result = await this.service.transferInventory(dto);
            res.status(200).json({
                success: true,
                data: result,
                message: `Successfully transferred ${dto.quantity} units from warehouse ${dto.fromWarehouseId} to ${dto.toWarehouseId}`,
            });
        }
        catch (error) {
            logger_1.logger.error(error, "Error in transferInventory");
            next(error);
        }
    }
}
exports.InventoryController = InventoryController;
