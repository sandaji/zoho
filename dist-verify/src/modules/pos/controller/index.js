"use strict";
/**
 * POS Module - Controller Layer
 * backend/src/modules/pos/controller/index.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PosController = void 0;
const service_1 = require("../service");
const errors_1 = require("../../../lib/errors");
class PosController {
    constructor() {
        this.service = new service_1.PosService();
    }
    /**
     * POST /pos/products/search
     * Search product by SKU or barcode
     */
    async searchProduct(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.search) {
                throw (0, errors_1.validationError)("Search term is required");
            }
            const result = await this.service.searchProduct(dto);
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
     * POST /pos/sales
     * Create new sales order
     */
    async createSales(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.branchId ||
                !dto.userId ||
                !dto.items ||
                dto.items.length === 0) {
                throw (0, errors_1.validationError)("Missing required fields: branchId, userId, items");
            }
            if (!dto.payment_method) {
                throw (0, errors_1.validationError)("Payment method is required");
            }
            const result = await this.service.createSales(dto);
            res.status(201).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /pos/sales/:id
     * Get sales by ID
     */
    async getSalesById(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.getSalesById(id);
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
     * GET /pos/sales
     * List sales with filtering
     */
    async listSales(req, res, next) {
        try {
            const query = req.query;
            const result = await this.service.listSales(query);
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
    /**
     * PATCH /pos/sales/:id
     * Update sales order
     */
    async updateSales(req, res, next) {
        try {
            const { id } = req.params;
            const dto = req.body;
            if (!id) {
                throw (0, errors_1.validationError)("ID is required");
            }
            const result = await this.service.updateSales(id, dto);
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
     * GET /pos/sales/daily-summary
     * Get daily summary for a branch
     */
    async getDailySummary(req, res, next) {
        try {
            const dto = {
                branchId: req.query.branch_id,
                date: req.query.date,
            };
            const result = await this.service.getDailySummary(dto);
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
     * GET /pos/sales/:id/receipt
     * Generate receipt for a sale
     */
    async getReceipt(req, res, next) {
        try {
            const { id } = req.params;
            if (!id) {
                throw (0, errors_1.validationError)("Sale ID is required");
            }
            const result = await this.service.generateReceipt(id);
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
     * POST /pos/discount/approve
     * Manager approval for discounts > 10%
     */
    async approveDiscount(req, res, next) {
        try {
            const dto = req.body;
            if (!dto.salesId || !dto.managerId || !dto.managerPassword) {
                throw (0, errors_1.validationError)("Missing required fields: salesId, managerId, managerPassword");
            }
            await this.service.approveDiscount(dto);
            res.json({
                success: true,
                message: "Discount approved successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PosController = PosController;
