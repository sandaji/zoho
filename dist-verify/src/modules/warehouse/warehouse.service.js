"use strict";
/**
 * Warehouse Service
 * Business logic for stock transfers, adjustments, and movements
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarehouseService = void 0;
const db_1 = require("../../lib/db");
const errors_1 = require("../../lib/errors");
const client_1 = require("../../generated/client");
class WarehouseService {
    /**
     * Create a new stock transfer
     * Verifies stock availability at source warehouse
     */
    async createTransfer(data, createdById) {
        const { sourceId, targetId, items, notes, driverId } = data;
        // Verify both warehouses exist
        const [sourceWarehouse, targetWarehouse] = await Promise.all([
            db_1.prisma.warehouse.findUnique({ where: { id: sourceId } }),
            db_1.prisma.warehouse.findUnique({ where: { id: targetId } }),
        ]);
        if (!sourceWarehouse) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Source warehouse not found");
        }
        if (!targetWarehouse) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Target warehouse not found");
        }
        // Verify stock availability for all items
        for (const item of items) {
            const inventory = await db_1.prisma.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: sourceId,
                    },
                },
                include: {
                    product: {
                        select: { name: true, sku: true },
                    },
                },
            });
            if (!inventory) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, `Product ${item.productId} not found in source warehouse`);
            }
            if (inventory.available < item.quantity) {
                throw new errors_1.AppError(errors_1.ErrorCode.INSUFFICIENT_INVENTORY, 400, `Insufficient stock for product ${inventory.product.name} (SKU: ${inventory.product.sku}). Available: ${inventory.available}, Requested: ${item.quantity}`);
            }
        }
        // Generate unique transfer number
        const transferNo = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
        // Create transfer with items
        const transfer = await db_1.prisma.stockTransfer.create({
            data: {
                transferNo,
                sourceId,
                targetId,
                notes,
                driverId,
                createdById,
                status: client_1.TransferStatus.PENDING,
                items: {
                    create: items.map((item) => ({
                        productId: item.productId,
                        quantity: item.quantity,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                unit_price: true,
                            },
                        },
                    },
                },
                sourceWarehouse: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        branch: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
                targetWarehouse: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        branch: {
                            select: {
                                name: true,
                            },
                        },
                    },
                },
            },
        });
        return transfer;
    }
    /**
     * Fulfill/receive a stock transfer
     * Uses transaction to ensure atomicity
     */
    async fulfillTransfer(transferId, userId) {
        return await db_1.prisma.$transaction(async (tx) => {
            // Get transfer with items
            const transfer = await tx.stockTransfer.findUnique({
                where: { id: transferId },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    sourceWarehouse: true,
                    targetWarehouse: true,
                },
            });
            if (!transfer) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Transfer not found");
            }
            if (transfer.status !== client_1.TransferStatus.PENDING &&
                transfer.status !== client_1.TransferStatus.IN_TRANSIT) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, `Cannot fulfill transfer with status: ${transfer.status}`);
            }
            // Process each item
            for (const item of transfer.items) {
                // Deduct from source warehouse
                const sourceInventory = await tx.inventory.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: transfer.sourceId,
                        },
                    },
                });
                if (!sourceInventory || sourceInventory.available < item.quantity) {
                    throw new errors_1.AppError(errors_1.ErrorCode.INSUFFICIENT_INVENTORY, 400, `Insufficient stock for product ${item.product.name} in source warehouse`);
                }
                // Update source inventory
                await tx.inventory.update({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: transfer.sourceId,
                        },
                    },
                    data: {
                        quantity: { decrement: item.quantity },
                        available: { decrement: item.quantity },
                    },
                });
                // Create TRANSFER_OUT movement log
                await tx.stockMovement.create({
                    data: {
                        type: client_1.MovementType.TRANSFER_OUT,
                        quantity: item.quantity,
                        productId: item.productId,
                        warehouseId: transfer.sourceId,
                        transferId: transfer.id,
                        reference: `Transfer to ${transfer.targetWarehouse.name} - ${transfer.transferNo}`,
                        createdById: userId,
                    },
                });
                // Add to target warehouse (create if doesn't exist)
                const targetInventory = await tx.inventory.findUnique({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId: transfer.targetId,
                        },
                    },
                });
                if (targetInventory) {
                    await tx.inventory.update({
                        where: {
                            productId_warehouseId: {
                                productId: item.productId,
                                warehouseId: transfer.targetId,
                            },
                        },
                        data: {
                            quantity: { increment: item.quantity },
                            available: { increment: item.quantity },
                        },
                    });
                }
                else {
                    await tx.inventory.create({
                        data: {
                            productId: item.productId,
                            warehouseId: transfer.targetId,
                            quantity: item.quantity,
                            available: item.quantity,
                            reserved: 0,
                        },
                    });
                }
                // Create TRANSFER_IN movement log
                await tx.stockMovement.create({
                    data: {
                        type: client_1.MovementType.TRANSFER_IN,
                        quantity: item.quantity,
                        productId: item.productId,
                        warehouseId: transfer.targetId,
                        transferId: transfer.id,
                        reference: `Transfer from ${transfer.sourceWarehouse.name} - ${transfer.transferNo}`,
                        createdById: userId,
                    },
                });
                // Update product total quantity (should remain the same, but recalculate for consistency)
                const totalQuantity = await tx.inventory.aggregate({
                    where: { productId: item.productId },
                    _sum: { quantity: true },
                });
                await tx.product.update({
                    where: { id: item.productId },
                    data: { quantity: totalQuantity._sum.quantity || 0 },
                });
            }
            // Update transfer status
            const updatedTransfer = await tx.stockTransfer.update({
                where: { id: transferId },
                data: { status: client_1.TransferStatus.COMPLETED },
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    unit_price: true,
                                },
                            },
                        },
                    },
                    sourceWarehouse: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            branch: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    targetWarehouse: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            branch: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
            });
            return updatedTransfer;
        });
    }
    /**
     * Adjust stock (add or remove inventory)
     * Positive quantity = add stock, Negative = remove stock
     */
    async adjustStock(data, userId) {
        const { warehouseId, productId, quantity, reason } = data;
        return await db_1.prisma.$transaction(async (tx) => {
            // Verify warehouse and product exist
            const [warehouse, product] = await Promise.all([
                tx.warehouse.findUnique({ where: { id: warehouseId } }),
                tx.product.findUnique({ where: { id: productId } }),
            ]);
            if (!warehouse) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Warehouse not found");
            }
            if (!product) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Product not found");
            }
            // Get current inventory
            const inventory = await tx.inventory.findUnique({
                where: {
                    productId_warehouseId: {
                        productId,
                        warehouseId,
                    },
                },
            });
            // For negative adjustments, verify sufficient stock
            if (quantity < 0) {
                const currentQuantity = inventory?.available || 0;
                if (currentQuantity < Math.abs(quantity)) {
                    throw new errors_1.AppError(errors_1.ErrorCode.INSUFFICIENT_INVENTORY, 400, `Insufficient stock for adjustment. Available: ${currentQuantity}, Requested: ${Math.abs(quantity)}`);
                }
            }
            // Update or create inventory
            const updatedInventory = await tx.inventory.upsert({
                where: {
                    productId_warehouseId: {
                        productId,
                        warehouseId,
                    },
                },
                create: {
                    productId,
                    warehouseId,
                    quantity: Math.max(0, quantity),
                    available: Math.max(0, quantity),
                    reserved: 0,
                },
                update: {
                    quantity: { increment: quantity },
                    available: { increment: quantity },
                },
            });
            // Create stock movement log
            const movement = await tx.stockMovement.create({
                data: {
                    type: client_1.MovementType.ADJUSTMENT,
                    quantity: Math.abs(quantity),
                    productId,
                    warehouseId,
                    reference: reason,
                    createdById: userId,
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                        },
                    },
                    warehouse: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
            });
            // Update product total quantity
            const totalQuantity = await tx.inventory.aggregate({
                where: { productId },
                _sum: { quantity: true },
            });
            await tx.product.update({
                where: { id: productId },
                data: { quantity: totalQuantity._sum.quantity || 0 },
            });
            return {
                movement,
                inventory: updatedInventory,
                adjustmentType: quantity > 0 ? "increase" : "decrease",
            };
        });
    }
    /**
     * Get stock movements with filtering
     */
    async getStockMovements(params) {
        const { warehouseId, productId, type, startDate, endDate, page = 1, limit = 50, } = params;
        const where = {};
        if (warehouseId)
            where.warehouseId = warehouseId;
        if (productId)
            where.productId = productId;
        if (type)
            where.type = type;
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate)
                where.createdAt.gte = new Date(startDate);
            if (endDate)
                where.createdAt.lte = new Date(endDate);
        }
        const [movements, total] = await Promise.all([
            db_1.prisma.stockMovement.findMany({
                where,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                        },
                    },
                    warehouse: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db_1.prisma.stockMovement.count({ where }),
        ]);
        return {
            movements,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get stock transfers with filtering
     */
    async getTransfers(params) {
        const { status, sourceId, targetId, page = 1, limit = 50 } = params;
        const where = {};
        if (status)
            where.status = status;
        if (sourceId)
            where.sourceId = sourceId;
        if (targetId)
            where.targetId = targetId;
        const [transfers, total] = await Promise.all([
            db_1.prisma.stockTransfer.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: {
                                select: {
                                    id: true,
                                    name: true,
                                    sku: true,
                                    unit_price: true,
                                },
                            },
                        },
                    },
                    sourceWarehouse: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            branch: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                    targetWarehouse: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            branch: {
                                select: {
                                    name: true,
                                },
                            },
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            db_1.prisma.stockTransfer.count({ where }),
        ]);
        return {
            transfers,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
    /**
     * Get a single transfer by ID
     */
    async getTransferById(id) {
        const transfer = await db_1.prisma.stockTransfer.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                unit_price: true,
                                image_url: true,
                            },
                        },
                    },
                },
                sourceWarehouse: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        location: true,
                        branch: {
                            select: {
                                name: true,
                                city: true,
                            },
                        },
                    },
                },
                targetWarehouse: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        location: true,
                        branch: {
                            select: {
                                name: true,
                                city: true,
                            },
                        },
                    },
                },
            },
        });
        if (!transfer) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Transfer not found");
        }
        return transfer;
    }
    /**
     * Update transfer status (to IN_TRANSIT or CANCELLED)
     */
    async updateTransferStatus(transferId, data, _userId) {
        const transfer = await db_1.prisma.stockTransfer.findUnique({
            where: { id: transferId },
        });
        if (!transfer) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Transfer not found");
        }
        if (transfer.status === client_1.TransferStatus.COMPLETED) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Cannot update completed transfer");
        }
        if (transfer.status === client_1.TransferStatus.CANCELLED) {
            throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Cannot update cancelled transfer");
        }
        const updatedTransfer = await db_1.prisma.stockTransfer.update({
            where: { id: transferId },
            data: {
                status: data.status,
                notes: data.notes || transfer.notes,
            },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
                sourceWarehouse: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
                targetWarehouse: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        });
        return updatedTransfer;
    }
    /**
     * Get warehouse statistics
     */
    async getWarehouseStats(warehouseId) {
        const where = warehouseId ? { warehouseId } : {};
        const [totalValue, lowStockCount, outOfStockCount, totalProducts] = await Promise.all([
            db_1.prisma.inventory.aggregate({
                where,
                _sum: {
                    quantity: true,
                },
            }),
            db_1.prisma.inventory.count({
                where: {
                    ...where,
                    status: "low_stock",
                },
            }),
            db_1.prisma.inventory.count({
                where: {
                    ...where,
                    status: "out_of_stock",
                },
            }),
            db_1.prisma.inventory.count({ where }),
        ]);
        return {
            totalValue: totalValue._sum.quantity || 0,
            lowStockCount,
            outOfStockCount,
            totalProducts,
        };
    }
}
exports.WarehouseService = WarehouseService;
