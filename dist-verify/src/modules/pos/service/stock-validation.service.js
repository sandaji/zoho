"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockValidationService = void 0;
// backend/src/modules/pos/service/stock-validation.service.ts
const db_1 = require("../../../lib/db");
const errors_1 = require("../../../lib/errors");
const enums_1 = require("../../../generated/enums");
class StockValidationService {
    /**
     * Check if sufficient stock is available for a list of items
     * @param branchId - Branch ID to check stock in
     * @param items - Array of items with productId and quantity
     * @returns Validation result with details of insufficient items
     */
    static async validateStock(branchId, items) {
        // Get the warehouse for this branch
        const warehouse = await db_1.prisma.warehouse.findFirst({
            where: { branchId, isActive: true },
        });
        if (!warehouse) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, `No active warehouse found for branch ${branchId}`);
        }
        const insufficientItems = [];
        // Check stock for each item
        for (const item of items) {
            const inventory = await db_1.prisma.inventory.findFirst({
                where: {
                    productId: item.productId,
                    warehouseId: warehouse.id,
                },
                include: {
                    product: {
                        select: {
                            name: true,
                            sku: true,
                        },
                    },
                },
            });
            if (!inventory || inventory.available < item.quantity) {
                insufficientItems.push({
                    isAvailable: false,
                    productId: item.productId,
                    productName: inventory?.product.name || "Unknown Product",
                    requestedQuantity: item.quantity,
                    availableQuantity: inventory?.available || 0,
                    warehouseId: warehouse.id,
                });
            }
        }
        return {
            isValid: insufficientItems.length === 0,
            insufficientItems,
            message: insufficientItems.length > 0
                ? `Insufficient stock for ${insufficientItems.length} item(s)`
                : "All items have sufficient stock",
        };
    }
    /**
     * Check if user has admin privileges to override stock validation
     */
    static async canOverrideStock(userId) {
        const user = await db_1.prisma.user.findUnique({
            where: { id: userId },
            select: { role: true },
        });
        if (!user)
            return false;
        // Admin, Manager, or Branch Manager can override
        const canOverride = [
            enums_1.UserRole.admin,
            enums_1.UserRole.manager,
            enums_1.UserRole.branch_manager,
        ].includes(user.role);
        return canOverride;
    }
    /**
     * Validate stock with admin override option
     * Throws error if stock is insufficient and user cannot override
     */
    static async validateOrThrow(branchId, items, userId, allowOverride = false) {
        const validation = await this.validateStock(branchId, items);
        if (!validation.isValid) {
            // Check if user can override
            if (allowOverride) {
                const canOverride = await this.canOverrideStock(userId);
                if (canOverride) {
                    // Log the override for audit trail
                    console.log(`Stock override by user ${userId} for insufficient items:`, validation.insufficientItems.map(item => ({
                        product: item.productName,
                        requested: item.requestedQuantity,
                        available: item.availableQuantity
                    })));
                    return; // Allow the operation
                }
            }
            // Build detailed error message
            const itemDetails = validation.insufficientItems
                .map((item) => `${item.productName}: requested ${item.requestedQuantity}, available ${item.availableQuantity}`)
                .join("; ");
            throw new errors_1.AppError(errors_1.ErrorCode.BAD_REQUEST, 400, `Insufficient stock: ${itemDetails}`);
        }
    }
    /**
     * Get available stock for a specific product in a branch
     */
    static async getAvailableStock(productId, branchId) {
        const warehouse = await db_1.prisma.warehouse.findFirst({
            where: { branchId, isActive: true },
        });
        if (!warehouse)
            return 0;
        const inventory = await db_1.prisma.inventory.findFirst({
            where: {
                productId,
                warehouseId: warehouse.id,
            },
        });
        return inventory?.available || 0;
    }
    /**
     * Reserve stock for a draft/quote (optional feature)
     * This can be used to prevent overselling while draft is being processed
     */
    static async reserveStock(branchId, items) {
        const warehouse = await db_1.prisma.warehouse.findFirst({
            where: { branchId, isActive: true },
        });
        if (!warehouse) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, `No active warehouse found for branch ${branchId}`);
        }
        await db_1.prisma.$transaction(async (tx) => {
            for (const item of items) {
                await tx.inventory.updateMany({
                    where: {
                        productId: item.productId,
                        warehouseId: warehouse.id,
                    },
                    data: {
                        reserved: {
                            increment: item.quantity,
                        },
                        available: {
                            decrement: item.quantity,
                        },
                    },
                });
            }
        });
    }
    /**
     * Release reserved stock (when draft is deleted or converted)
     */
    static async releaseStock(branchId, items) {
        const warehouse = await db_1.prisma.warehouse.findFirst({
            where: { branchId, isActive: true },
        });
        if (!warehouse)
            return;
        await db_1.prisma.$transaction(async (tx) => {
            for (const item of items) {
                await tx.inventory.updateMany({
                    where: {
                        productId: item.productId,
                        warehouseId: warehouse.id,
                    },
                    data: {
                        reserved: {
                            decrement: item.quantity,
                        },
                        available: {
                            increment: item.quantity,
                        },
                    },
                });
            }
        });
    }
}
exports.StockValidationService = StockValidationService;
