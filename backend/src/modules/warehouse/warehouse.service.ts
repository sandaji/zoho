/**
 * Warehouse Service
 * Business logic for stock transfers, adjustments, and movements.
 *
 * Uses InventoryService.depleteStockFIFO / receiveStock for transfer
 * fulfillment so FIFO cost lots, audit trail and BranchInventory are
 * all kept in sync rather than bypassing them with raw inventory.update.
 *
 * Field names match the actual schema: sourceWarehouseId, destinationWarehouseId,
 * documentId, TransferStatus.PENDING_APPROVAL / RECEIVED / CANCELLED.
 */

import { prisma } from "../../lib/db";
import { AppError, ErrorCode } from "../../lib/errors";
import { MovementType, TransferStatus } from "../../generated";
import { synchronizeBranchInventoryForWarehouse } from "../../lib/inventory-sync";
import { InventoryService } from "../inventory/service/inventory.service";
import type {
  CreateTransferInput,
  AdjustStockInput,
  GetStockMovementsInput,
  GetTransfersInput,
  UpdateTransferStatusInput,
} from "./warehouse.schema";

export class WarehouseService {
  /**
   * Create a new stock transfer — verifies availability at source warehouse
   */
  async createTransfer(data: CreateTransferInput, createdById: string): Promise<any> {
    const { sourceId, targetId, items, notes } = data;

    const [sourceWarehouse, targetWarehouse] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: sourceId } }),
      prisma.warehouse.findUnique({ where: { id: targetId } }),
    ]);

    if (!sourceWarehouse) throw new AppError(ErrorCode.NOT_FOUND, 404, "Source warehouse not found");
    if (!targetWarehouse) throw new AppError(ErrorCode.NOT_FOUND, 404, "Target warehouse not found");

    for (const item of items) {
      const inventory = await prisma.inventory.findUnique({
        where: { productId_warehouseId: { productId: item.productId, warehouseId: sourceId } },
        include: { product: { select: { name: true, sku: true } } },
      });

      if (!inventory) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 400, `Product ${item.productId} not found in source warehouse`);
      }
      if (inventory.available < item.quantity) {
        throw new AppError(
          ErrorCode.INSUFFICIENT_INVENTORY,
          400,
          `Insufficient stock for product ${inventory.product.name} (SKU: ${inventory.product.sku}). Available: ${inventory.available}, Requested: ${item.quantity}`
        );
      }
    }

    const documentId = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return prisma.stockTransfer.create({
      data: {
        documentId,
        sourceWarehouseId: sourceId,
        destinationWarehouseId: targetId,
        notes,
        createdById,
        status: TransferStatus.PENDING_APPROVAL,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            requested_qty: item.quantity,
          })),
        },
      },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        sourceWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
        destinationWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
      },
    });
  }

  /**
   * Fulfill/receive a stock transfer.
   * Uses InventoryService.depleteStockFIFO (source) and receiveStock (destination)
   * so cost lots, Inventory ledger, StockMovement audit trail, and BranchInventory
   * are all updated atomically and correctly.
   */
  async fulfillTransfer(transferId: string, userId: string): Promise<any> {
    return await prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: {
          items: { include: { product: true } },
          sourceWarehouse: true,
          destinationWarehouse: true,
        },
      });

      if (!transfer) throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
      if (
        transfer.status !== TransferStatus.APPROVED &&
        transfer.status !== TransferStatus.DISPATCHED
      ) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          `Cannot fulfill transfer with status: ${transfer.status}`
        );
      }

      for (const item of transfer.items) {
        const qty = item.dispatched_qty ?? item.requested_qty;

        // Deplete source using canonical FIFO cost lots
        const fifoResult = await InventoryService.depleteStockFIFO(tx, {
          productId: item.productId,
          warehouseId: transfer.sourceWarehouseId,
          quantity: qty,
          userId,
          reference: `Transfer to ${transfer.destinationWarehouse.name} - ${transfer.documentId}`,
        });

        // Receive at destination with weighted FIFO cost from source
        const weightedCost = fifoResult.totalCost.div(fifoResult.totalQuantity);
        await InventoryService.receiveStock(tx, {
          productId: item.productId,
          warehouseId: transfer.destinationWarehouseId,
          quantity: qty,
          unitCost: weightedCost,
          userId,
          reference: `Transfer from ${transfer.sourceWarehouse.name} - ${transfer.documentId}`,
        });
      }

      return await tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: TransferStatus.RECEIVED },
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          sourceWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
          destinationWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
        },
      });
    });
  }

  /**
   * Adjust stock (positive = add, negative = remove)
   */
  async adjustStock(data: AdjustStockInput, userId: string): Promise<any> {
    const { warehouseId, productId, quantity, reason } = data;

    return await prisma.$transaction(async (tx) => {
      const [warehouse, product] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: warehouseId } }),
        tx.product.findUnique({ where: { id: productId } }),
      ]);

      if (!warehouse) throw new AppError(ErrorCode.NOT_FOUND, 404, "Warehouse not found");
      if (!product) throw new AppError(ErrorCode.NOT_FOUND, 404, "Product not found");

      const inventory = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });

      if (quantity < 0 && (inventory?.available ?? 0) < Math.abs(quantity)) {
        throw new AppError(
          ErrorCode.INSUFFICIENT_INVENTORY,
          400,
          `Insufficient stock for adjustment. Available: ${inventory?.available ?? 0}, Requested: ${Math.abs(quantity)}`
        );
      }

      const updatedInventory = await tx.inventory.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        create: {
          productId, warehouseId,
          quantity: Math.max(0, quantity), available: Math.max(0, quantity), reserved: 0,
        },
        update: { quantity: { increment: quantity }, available: { increment: quantity } },
      });

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
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
      });

      await synchronizeBranchInventoryForWarehouse(tx, productId, warehouseId);

      return { movement, inventory: updatedInventory, adjustmentType: quantity > 0 ? "increase" : "decrease" };
    });
  }

  /**
   * Get stock movements with filtering
   */
  async getStockMovements(params: GetStockMovementsInput): Promise<any> {
    const { warehouseId, productId, type, startDate, endDate, page = 1, limit = 50 } = params;

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
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return { movements, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Get stock transfers with filtering
   */
  async getTransfers(params: GetTransfersInput): Promise<any> {
    const { status, sourceId, targetId, page = 1, limit = 50 } = params;

    const where: any = {};
    if (status) where.status = status;
    if (sourceId) where.sourceWarehouseId = sourceId;
    if (targetId) where.destinationWarehouseId = targetId;

    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true } } } },
          sourceWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
          destinationWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return { transfers, pagination: { total, page, limit, totalPages: Math.ceil(total / limit) } };
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
            product: { select: { id: true, name: true, sku: true } },
          },
        },
        sourceWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
        destinationWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
      },
    });

    if (!transfer) throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
    return transfer;
  }

  /**
   * Update transfer status
   */
  async updateTransferStatus(
    transferId: string,
    data: UpdateTransferStatusInput,
    _userId: string
  ): Promise<any> {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");

    if (transfer.status === TransferStatus.RECEIVED || transfer.status === TransferStatus.CANCELLED) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 400, `Cannot update transfer with status: ${transfer.status}`);
    }

    return prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: data.status as TransferStatus, notes: data.notes || transfer.notes },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        sourceWarehouse: { select: { id: true, name: true, code: true } },
        destinationWarehouse: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Get warehouse statistics
   */
  async getWarehouseStats(warehouseId?: string): Promise<any> {
    const where = warehouseId ? { warehouseId } : {};

    const [totalValue, lowStockCount, outOfStockCount, totalProducts] = await Promise.all([
      prisma.inventory.aggregate({ where, _sum: { quantity: true } }),
      prisma.inventory.count({ where: { ...where, status: "low_stock" } }),
      prisma.inventory.count({ where: { ...where, status: "out_of_stock" } }),
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
