"use strict";
/**
 * Warehouse Controller
 * Handles HTTP requests for warehouse operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseController = void 0;
const warehouse_service_1 = require("./warehouse.service");
const warehouse_schema_1 = require("./warehouse.schema");
const errors_1 = require("../../lib/errors");
class WarehouseController {
    constructor() {
        this.warehouseService = new warehouse_service_1.WarehouseService();
    }
    /**
     * Create a new stock transfer
     * POST /warehouse/transfer
     */
    async createTransfer(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "User not authenticated");
            }
            const validated = warehouse_schema_1.createTransferSchema.parse(req.body);
            const transfer = await this.warehouseService.createTransfer(validated, userId);
            res.status(201).json({
                success: true,
                data: transfer,
                message: "Transfer created successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Fulfill/receive a stock transfer
     * POST /warehouse/transfer/:id/receive
     */
    async fulfillTransfer(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "User not authenticated");
            }
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 400, "Transfer ID is required");
            }
            const transfer = await this.warehouseService.fulfillTransfer(id, userId);
            res.json({
                success: true,
                data: transfer,
                message: "Transfer completed successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Adjust stock (increase or decrease)
     * POST /warehouse/adjust
     */
    async adjustStock(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "User not authenticated");
            }
            const validated = warehouse_schema_1.adjustStockSchema.parse(req.body);
            const result = await this.warehouseService.adjustStock(validated, userId);
            res.json({
                success: true,
                data: result,
                message: "Stock adjusted successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get stock movements
     * GET /warehouse/movements
     */
    async getStockMovements(req, res, next) {
        try {
            const params = {
                warehouseId: req.query.warehouseId,
                productId: req.query.productId,
                type: req.query.type,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 50,
            };
            const validated = warehouse_schema_1.getStockMovementsSchema.parse(params);
            const result = await this.warehouseService.getStockMovements(validated);
            res.json({
                success: true,
                data: result.movements,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get stock transfers
     * GET /warehouse/transfers
     */
    async getTransfers(req, res, next) {
        try {
            const params = {
                status: req.query.status,
                sourceId: req.query.sourceId,
                targetId: req.query.targetId,
                page: req.query.page ? parseInt(req.query.page) : 1,
                limit: req.query.limit ? parseInt(req.query.limit) : 50,
            };
            const validated = warehouse_schema_1.getTransfersSchema.parse(params);
            const result = await this.warehouseService.getTransfers(validated);
            res.json({
                success: true,
                data: result.transfers,
                pagination: result.pagination,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get a single transfer by ID
     * GET /warehouse/transfers/:id
     */
    async getTransferById(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 400, "Transfer ID is required");
            }
            const transfer = await this.warehouseService.getTransferById(id);
            res.json({
                success: true,
                data: transfer,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update transfer status
     * PATCH /warehouse/transfers/:id/status
     */
    async updateTransferStatus(req, res, next) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, "User not authenticated");
            }
            const { id } = req.params;
            if (!id) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 400, "Transfer ID is required");
            }
            const validated = warehouse_schema_1.updateTransferStatusSchema.parse(req.body);
            const transfer = await this.warehouseService.updateTransferStatus(id, validated, userId);
            res.json({
                success: true,
                data: transfer,
                message: "Transfer status updated successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get warehouse statistics
     * GET /warehouse/stats
     */
    async getWarehouseStats(req, res, next) {
        try {
            const warehouseId = req.query.warehouseId;
            const stats = await this.warehouseService.getWarehouseStats(warehouseId);
            res.json({
                success: true,
                data: stats,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.WarehouseController = WarehouseController;
