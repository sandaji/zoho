/**
 * Warehouse Inventory Service
 * Business logic for stock transfers, adjustments, and movements
 */

import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { MovementType, TransferStatus } from "../../../generated";
import type {
  CreateTransferInput,
  AdjustStockInput,
  GetStockMovementsInput,
  GetTransfersInput,
  UpdateTransferStatusInput,
} from "../warehouse.schema";

export class WarehouseInventoryService {
  /**
   * Create a new stock transfer
   * Verifies stock availability at source warehouse
   */
  async createTransfer(
    data: CreateTransferInput,
    createdById: string
  ): Promise<any> {
    const { sourceId, targetId, items, notes } = data;

    // Verify both warehouses exist
    const [sourceWarehouse, targetWarehouse] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: sourceId } }),
      prisma.warehouse.findUnique({ where: { id: targetId } }),
    ]);

    if (!sourceWarehouse) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        "Source warehouse not found"
      );
    }

    if (!targetWarehouse) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        "Target warehouse not found"
      );
    }

    // Verify stock availability for all items
    for (const item of items) {
      const inventory = await prisma.inventory.findUnique({
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
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          `Product ${item.productId} not found in source warehouse`
        );
      }

      if (inventory.available < item.quantity) {
        throw new AppError(
          ErrorCode.INSUFFICIENT_INVENTORY,
          400,
          `Insufficient stock for product ${inventory.product.name} (SKU: ${inventory.product.sku}). Available: ${inventory.available}, Requested: ${item.quantity}`
        );
      }
    }

    // Generate unique transfer number
    const transferNo = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create transfer with items
    const transfer = await prisma.stockTransfer.create({
      data: {
        transferNo,
        sourceId,
        targetId,
        notes,
        createdById,
        status: TransferStatus.PENDING,
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
  async fulfillTransfer(transferId: string, userId: string): Promise<any> {
    return await prisma.$transaction(async (tx) => {
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
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
      }

      if (
        transfer.status !== TransferStatus.PENDING &&
        transfer.status !== TransferStatus.IN_TRANSIT
      ) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          `Cannot fulfill transfer with status: ${transfer.status}`
        );
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
          throw new AppError(
            ErrorCode.INSUFFICIENT_INVENTORY,
            400,
            `Insufficient stock for product ${item.product.name} in source warehouse`
          );
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
            type: MovementType.TRANSFER_OUT,
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
        } else {
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
            type: MovementType.TRANSFER_IN,
            quantity: item.quantity,
            productId: item.productId,
            warehouseId: transfer.targetId,
            transferId: transfer.id,
            reference: `Transfer from ${transfer.sourceWarehouse.name} - ${transfer.transferNo}`,
            createdById: userId,
          },
        });

        // (Removed outdated logic storing sum of quantity back to product model)
      }

      // Update transfer status
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.COMPLETED },
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
  async adjustStock(data: AdjustStockInput, userId: string): Promise<any> {
    const { warehouseId, productId, quantity, reason } = data;

    return await prisma.$transaction(async (tx) => {
      // Verify warehouse and product exist
      const [warehouse, product] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: warehouseId } }),
        tx.product.findUnique({ where: { id: productId } }),
      ]);

      if (!warehouse) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Warehouse not found");
      }

      if (!product) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Product not found");
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
          throw new AppError(
            ErrorCode.INSUFFICIENT_INVENTORY,
            400,
            `Insufficient stock for adjustment. Available: ${currentQuantity}, Requested: ${Math.abs(quantity)}`
          );
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
          type: MovementType.ADJUSTMENT,
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

      // (Removed outdated logic storing sum of quantity back to product model)

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
  async getStockMovements(params: GetStockMovementsInput): Promise<any> {
    const {
      warehouseId,
      productId,
      type,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = params;

    const where: any = {};

    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
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
      prisma.stockMovement.count({ where }),
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
  async getTransfers(params: GetTransfersInput): Promise<any> {
    const { status, sourceId, targetId, page = 1, limit = 50 } = params;

    const where: any = {};

    if (status) where.status = status;
    if (sourceId) where.sourceId = sourceId;
    if (targetId) where.targetId = targetId;

    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
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
      prisma.stockTransfer.count({ where }),
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
  async getTransferById(id: string): Promise<any> {
    const transfer = await prisma.stockTransfer.findUnique({
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
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
    }

    return transfer;
  }

  /**
   * Update transfer status (to IN_TRANSIT or CANCELLED)
   */
  async updateTransferStatus(
    transferId: string,
    data: UpdateTransferStatusInput,
    _userId: string
  ): Promise<any> {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Cannot update completed transfer"
      );
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Cannot update cancelled transfer"
      );
    }

    const updatedTransfer = await prisma.stockTransfer.update({
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
  async getWarehouseStats(warehouseId?: string): Promise<any> {
    const where = warehouseId ? { warehouseId } : {};

    const [totalValue, lowStockCount, outOfStockCount, totalProducts] =
      await Promise.all([
        prisma.inventory.aggregate({
          where,
          _sum: {
            quantity: true,
          },
        }),
        prisma.inventory.count({
          where: {
            ...where,
            status: "low_stock",
          },
        }),
        prisma.inventory.count({
          where: {
            ...where,
            status: "out_of_stock",
          },
        }),
        prisma.inventory.count({ where }),
      ]);

    return {
      totalValue: totalValue._sum.quantity || 0,
      lowStockCount,
      outOfStockCount,
      totalProducts,
    };
  }
}
