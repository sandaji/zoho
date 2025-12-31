"use strict";
/**
 * Inventory Module - Service Layer
 * Handles inventory management with atomic transactions
 * - GET /inventory: Retrieve inventory with filtering and pagination
 * - POST /inventory/adjust: Adjust stock (increase/decrease)
 * - POST /inventory/transfer: Transfer stock between warehouses
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const db_1 = require("../../../lib/db");
const logger_1 = require("../../../lib/logger");
const errors_1 = require("../../../lib/errors");
class InventoryService {
    constructor() {
        this.prisma = db_1.prisma;
    }
    /**
     * GET /inventory
     * Retrieve all inventory with comprehensive filtering, sorting, and pagination
     */
    async getInventory(query) {
        try {
            const page = Math.max(1, query.page || 1);
            const limit = Math.min(100, Math.max(1, query.limit || 20));
            const skip = (page - 1) * limit;
            logger_1.logger.debug({
                page,
                limit,
                status: query.status,
                warehouseId: query.warehouseId,
            }, "Fetching inventory");
            // Build dynamic where clause
            const where = {};
            if (query.status) {
                where.status = query.status;
            }
            if (query.warehouseId) {
                where.warehouseId = query.warehouseId;
            }
            if (query.productId) {
                where.productId = query.productId;
            }
            if (query.lowStockOnly) {
                where.product = {
                    quantity: { lt: where.product?.reorder_level || 10 },
                };
            }
            // Build sort order
            const orderBy = {};
            if (query.sortBy) {
                switch (query.sortBy) {
                    case "quantity":
                        orderBy.quantity = query.sortOrder || "desc";
                        break;
                    case "available":
                        orderBy.available = query.sortOrder || "desc";
                        break;
                    case "reserved":
                        orderBy.reserved = query.sortOrder || "desc";
                        break;
                    case "product_name":
                        orderBy.product = { name: query.sortOrder || "asc" };
                        break;
                    case "warehouse_name":
                        orderBy.warehouse = { name: query.sortOrder || "asc" };
                        break;
                    case "status":
                        orderBy.status = query.sortOrder || "asc";
                        break;
                    default:
                        orderBy.updatedAt = "desc";
                }
            }
            else {
                orderBy.updatedAt = "desc";
            }
            // Execute parallel queries
            const [inventoryRecords, total] = await Promise.all([
                this.prisma.inventory.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy,
                    include: {
                        product: true,
                        warehouse: true,
                    },
                }),
                this.prisma.inventory.count({ where }),
            ]);
            // Format response
            const data = inventoryRecords.map((inv) => this.formatInventoryItem(inv));
            return {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to fetch inventory");
            throw error;
        }
    }
    /**
     * POST /inventory/adjust
     * Adjust inventory stock (increase/decrease) with atomic transaction
     * Tracks before/after state and reason for audit trail
     */
    async adjustInventory(dto) {
        try {
            logger_1.logger.debug({
                productId: dto.productId,
                adjustmentType: dto.adjustmentType,
                quantity: dto.quantity,
                reason: dto.reason,
            }, "Adjusting inventory");
            // Use atomic transaction to ensure consistency
            const result = await this.prisma.$transaction(async (tx) => {
                // Get current inventory state
                const inventory = await tx.inventory.findFirst({
                    where: {
                        productId: dto.productId,
                        warehouseId: dto.warehouseId,
                    },
                    include: {
                        product: true,
                        warehouse: true,
                    },
                });
                if (!inventory) {
                    throw (0, errors_1.notFoundError)("Inventory record");
                }
                // Store before state for response
                const beforeQuantity = inventory.quantity;
                const beforeReserved = inventory.reserved;
                // Calculate new quantity based on adjustment type
                let newQuantity;
                if (dto.adjustmentType === "increase") {
                    newQuantity = inventory.quantity + dto.quantity;
                }
                else {
                    // decrease
                    newQuantity = Math.max(0, inventory.quantity - dto.quantity);
                    // Prevent removing reserved stock
                    if (newQuantity + inventory.reserved < 0) {
                        throw new Error(`Cannot decrease inventory: would result in negative available stock. Available: ${inventory.available}, Requested decrease: ${dto.quantity}`);
                    }
                }
                // Calculate new available (quantity - reserved)
                const newAvailable = newQuantity - inventory.reserved;
                // Determine new status
                const reorderLevel = inventory.product.reorder_level || 10;
                let newStatus = "in_stock";
                if (newQuantity === 0) {
                    newStatus = "out_of_stock";
                }
                else if (newQuantity < reorderLevel) {
                    newStatus = "low_stock";
                }
                // Update inventory
                const updated = await tx.inventory.update({
                    where: {
                        productId_warehouseId: {
                            productId: dto.productId,
                            warehouseId: dto.warehouseId,
                        },
                    },
                    data: {
                        quantity: newQuantity,
                        available: newAvailable,
                        status: newStatus,
                        last_counted: new Date(),
                    },
                });
                // Update product total quantity
                await tx.product.update({
                    where: { id: dto.productId },
                    data: {
                        quantity: {
                            increment: dto.adjustmentType === "increase"
                                ? dto.quantity
                                : -dto.quantity,
                        },
                    },
                });
                logger_1.logger.info({
                    productId: dto.productId,
                    beforeQuantity,
                    afterQuantity: newQuantity,
                    reason: dto.reason,
                }, "Inventory adjusted successfully");
                return {
                    id: updated.id,
                    productId: updated.productId,
                    warehouseId: updated.warehouseId,
                    adjustmentType: dto.adjustmentType,
                    quantity: dto.quantity,
                    reason: dto.reason,
                    reference: dto.reference,
                    notes: dto.notes,
                    beforeQuantity,
                    afterQuantity: newQuantity,
                    beforeReserved,
                    afterReserved: updated.reserved,
                    timestamp: new Date().toISOString(),
                };
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to adjust inventory");
            throw error;
        }
    }
    /**
     * POST /inventory/transfer
     * Transfer inventory between warehouses (atomic transaction)
     * Decrements from source, increments to destination
     * Both operations must succeed or entire transaction rolls back
     */
    async transferInventory(dto) {
        try {
            logger_1.logger.debug({
                productId: dto.productId,
                fromWarehouse: dto.fromWarehouseId,
                toWarehouse: dto.toWarehouseId,
                quantity: dto.quantity,
            }, "Transferring inventory");
            // Validate from and to warehouses are different
            if (dto.fromWarehouseId === dto.toWarehouseId) {
                throw new Error("Source and destination warehouses must be different");
            }
            // Use atomic transaction
            const result = await this.prisma.$transaction(async (tx) => {
                // Get source inventory
                const sourceInventory = await tx.inventory.findFirst({
                    where: {
                        productId: dto.productId,
                        warehouseId: dto.fromWarehouseId,
                    },
                    include: {
                        product: true,
                        warehouse: true,
                    },
                });
                if (!sourceInventory) {
                    throw (0, errors_1.notFoundError)("Source inventory");
                }
                // Check if sufficient stock available
                if (sourceInventory.available < dto.quantity) {
                    throw new Error(`Insufficient inventory in source warehouse. Available: ${sourceInventory.available}, Requested: ${dto.quantity}`);
                }
                // Store before states
                const fromWarehouseBefore = {
                    quantity: sourceInventory.quantity,
                    available: sourceInventory.available,
                };
                // Get destination inventory or create if doesn't exist
                let destInventory = await tx.inventory.findFirst({
                    where: {
                        productId: dto.productId,
                        warehouseId: dto.toWarehouseId,
                    },
                    include: {
                        product: true,
                        warehouse: true,
                    },
                });
                if (!destInventory) {
                    destInventory = await tx.inventory.create({
                        data: {
                            productId: dto.productId,
                            warehouseId: dto.toWarehouseId,
                            quantity: 0,
                            reserved: 0,
                            available: 0,
                            status: "in_stock",
                        },
                        include: {
                            product: true,
                            warehouse: true,
                        },
                    });
                }
                const toWarehouseBefore = {
                    quantity: destInventory.quantity,
                    available: destInventory.available,
                };
                // Decrement source warehouse
                const reorderLevel = sourceInventory.product.reorder_level || 10;
                const sourceNewQuantity = sourceInventory.quantity - dto.quantity;
                const sourceNewAvailable = sourceNewQuantity - sourceInventory.reserved;
                let sourceNewStatus = "in_stock";
                if (sourceNewQuantity === 0) {
                    sourceNewStatus = "out_of_stock";
                }
                else if (sourceNewQuantity < reorderLevel) {
                    sourceNewStatus = "low_stock";
                }
                const updatedSource = await tx.inventory.update({
                    where: {
                        productId_warehouseId: {
                            productId: dto.productId,
                            warehouseId: dto.fromWarehouseId,
                        },
                    },
                    data: {
                        quantity: sourceNewQuantity,
                        available: sourceNewAvailable,
                        status: sourceNewStatus,
                    },
                });
                // Increment destination warehouse
                const destNewQuantity = destInventory.quantity + dto.quantity;
                const destNewAvailable = destNewQuantity - destInventory.reserved;
                let destNewStatus = destNewQuantity === 0 ? "out_of_stock" : "in_stock";
                if (destNewQuantity > 0 && destNewQuantity < reorderLevel) {
                    destNewStatus = "low_stock";
                }
                const updatedDest = await tx.inventory.update({
                    where: {
                        productId_warehouseId: {
                            productId: dto.productId,
                            warehouseId: dto.toWarehouseId,
                        },
                    },
                    data: {
                        quantity: destNewQuantity,
                        available: destNewAvailable,
                        status: destNewStatus,
                    },
                });
                logger_1.logger.info({
                    productId: dto.productId,
                    fromWarehouse: dto.fromWarehouseId,
                    toWarehouse: dto.toWarehouseId,
                    quantity: dto.quantity,
                    sourceNewQuantity,
                    destNewQuantity,
                }, "Inventory transferred successfully");
                return {
                    productId: dto.productId,
                    fromWarehouseId: dto.fromWarehouseId,
                    toWarehouseId: dto.toWarehouseId,
                    quantity: dto.quantity,
                    reason: dto.reason,
                    reference: dto.reference,
                    notes: dto.notes,
                    fromWarehouseBefore,
                    fromWarehouseAfter: {
                        quantity: updatedSource.quantity,
                        available: updatedSource.available,
                    },
                    toWarehouseBefore,
                    toWarehouseAfter: {
                        quantity: updatedDest.quantity,
                        available: updatedDest.available,
                    },
                    timestamp: new Date().toISOString(),
                };
            });
            return result;
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to transfer inventory");
            throw error;
        }
    }
    /**
     * Legacy methods for backwards compatibility
     */
    async updateInventory(dto) {
        try {
            logger_1.logger.debug({
                productId: dto.productId,
                warehouseId: dto.warehouseId,
            }, "Updating inventory");
            const inventory = await this.prisma.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: dto.productId,
                        warehouseId: dto.warehouseId,
                    },
                },
                include: {
                    product: true,
                    warehouse: true,
                },
            });
            if (!inventory) {
                throw (0, errors_1.notFoundError)("Inventory");
            }
            const updated = await this.prisma.inventory.update({
                where: {
                    productId_warehouseId: {
                        productId: dto.productId,
                        warehouseId: dto.warehouseId,
                    },
                },
                data: {
                    quantity: dto.quantity ?? inventory.quantity,
                    reserved: dto.reserved ?? inventory.reserved,
                    available: (dto.quantity ?? inventory.quantity) -
                        (dto.reserved ?? inventory.reserved),
                    status: dto.status,
                },
            });
            logger_1.logger.info({
                productId: dto.productId,
                quantity: updated.quantity,
            }, "Inventory updated");
            return this.formatResponse(updated);
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to update inventory");
            throw error;
        }
    }
    async getInventorySingle(productId, warehouseId) {
        try {
            const inventory = await this.prisma.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId,
                        warehouseId,
                    },
                },
            });
            if (!inventory) {
                throw (0, errors_1.notFoundError)("Inventory");
            }
            return this.formatResponse(inventory);
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to fetch inventory");
            throw error;
        }
    }
    async listInventory(query) {
        try {
            const page = query.page || 1;
            const limit = query.limit || 20;
            const skip = (page - 1) * limit;
            const where = {};
            if (query.status)
                where.status = query.status;
            if (query.warehouseId)
                where.warehouseId = query.warehouseId;
            if (query.productId)
                where.productId = query.productId;
            if (query.lowStockOnly) {
                where.status = "low_stock";
            }
            const [data, total] = await Promise.all([
                this.prisma.inventory.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { updatedAt: "desc" },
                }),
                this.prisma.inventory.count({ where }),
            ]);
            return {
                data: data.map((inv) => this.formatResponse(inv)),
                total,
            };
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to list inventory");
            throw error;
        }
    }
    async adjustStock(dto) {
        try {
            logger_1.logger.debug({
                productId: dto.productId,
                quantity: dto.quantity,
            }, "Adjusting stock");
            const inventory = await this.prisma.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: dto.productId,
                        warehouseId: dto.warehouseId,
                    },
                },
            });
            if (!inventory) {
                throw (0, errors_1.notFoundError)("Inventory");
            }
            const newQuantity = inventory.quantity + dto.quantity;
            const newAvailable = newQuantity - inventory.reserved;
            const updated = await this.prisma.inventory.update({
                where: {
                    productId_warehouseId: {
                        productId: dto.productId,
                        warehouseId: dto.warehouseId,
                    },
                },
                data: {
                    quantity: newQuantity,
                    available: newAvailable,
                },
            });
            logger_1.logger.info({
                productId: dto.productId,
                newQuantity,
                reason: dto.reason,
            }, "Stock adjusted");
            return this.formatResponse(updated);
        }
        catch (error) {
            logger_1.logger.error(error, "Failed to adjust stock");
            throw error;
        }
    }
    /**
     * Helper methods
     */
    formatInventoryItem(inventory) {
        return {
            id: inventory.id,
            productId: inventory.productId,
            productSku: inventory.product?.sku || "",
            productName: inventory.product?.name || "",
            warehouseId: inventory.warehouseId,
            warehouseCode: inventory.warehouse?.code || "",
            warehouseName: inventory.warehouse?.name || "",
            quantity: inventory.quantity,
            reserved: inventory.reserved,
            available: inventory.available,
            status: inventory.status,
            reorderLevel: inventory.product?.reorder_level || 10,
            lastCounted: inventory.last_counted?.toISOString(),
            createdAt: inventory.createdAt?.toISOString() || "",
            updatedAt: inventory.updatedAt?.toISOString() || "",
        };
    }
    formatResponse(inventory) {
        return {
            id: inventory.id,
            productId: inventory.productId,
            warehouseId: inventory.warehouseId,
            quantity: inventory.quantity,
            reserved: inventory.reserved,
            available: inventory.available,
            status: inventory.status,
            last_counted: inventory.last_counted?.toISOString(),
        };
    }
}
exports.InventoryService = InventoryService;
