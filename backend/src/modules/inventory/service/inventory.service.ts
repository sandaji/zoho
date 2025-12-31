/**
 * Inventory Module - Service Layer
 * Handles inventory management with atomic transactions
 * - GET /inventory: Retrieve inventory with filtering and pagination
 * - POST /inventory/adjust: Adjust stock (increase/decrease)
 * - POST /inventory/transfer: Transfer stock between warehouses
 */

import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { notFoundError, AppError, ErrorCode } from "../../../lib/errors";
import {
  UpdateInventoryDTO,
  InventoryResponseDTO,
  InventoryListQueryDTO,
  StockAdjustmentDTO,
  AdjustInventoryDTO,
  AdjustmentResponseDTO,
  TransferInventoryDTO,
  GetInventoryQueryDTO,
  InventoryListResponseDTO,
  InventoryItemDTO,
  ConfirmTransferDTO,
} from "../dto";

export class InventoryService {
  private prisma = prisma;

  /**
   * GET /inventory
   * Retrieve all inventory with comprehensive filtering, sorting, and pagination
   */
  async getInventory(
    query: GetInventoryQueryDTO
  ): Promise<InventoryListResponseDTO> {
    try {
      const page = Math.max(1, query.page || 1);
      const limit = Math.min(100, Math.max(1, query.limit || 20));
      const skip = (page - 1) * limit;

      logger.debug({
        page,
        limit,
        status: query.status,
        warehouseId: query.warehouseId,
      },"Fetching inventory", );

      // Build dynamic where clause
      const where: any = {};

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
      const orderBy: any = {};
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
          case "price":
            orderBy.product = { unit_price: query.sortOrder || "desc" };
            break;
          case "createdAt":
            orderBy.createdAt = query.sortOrder || "desc";
            break;
          default:
            orderBy.updatedAt = "desc";
        }
      } else {
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
      const data = inventoryRecords.map((inv: any) =>
        this.formatInventoryItem(inv)
      );

      return {
        data,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(error as Error,"Failed to fetch inventory", );
      throw error;
    }
  }

  /**
   * POST /inventory/adjust
   * Adjust inventory stock (increase/decrease) with atomic transaction
   * Tracks before/after state and reason for audit trail
   */
  async adjustInventory(
    dto: AdjustInventoryDTO
  ): Promise<AdjustmentResponseDTO> {
    try {
      logger.debug({
        productId: dto.productId,
        adjustmentType: dto.adjustmentType,
        quantity: dto.quantity,
        reason: dto.reason,
      }, "Adjusting inventory", );

      // Use atomic transaction to ensure consistency
      const result = await this.prisma.$transaction(async (tx: any) => {
    
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
          throw notFoundError("Inventory record");
        }

        // Store before state for response
        const beforeQuantity = inventory.quantity;
        const beforeReserved = inventory.reserved;

        // Calculate new quantity based on adjustment type
        let newQuantity: number;
        if (dto.adjustmentType === "increase") {
          newQuantity = inventory.quantity + dto.quantity;
        } else {
          // decrease
          newQuantity = Math.max(0, inventory.quantity - dto.quantity);
          // Prevent removing reserved stock
          if (newQuantity + inventory.reserved < 0) {
            throw new Error(
              `Cannot decrease inventory: would result in negative available stock. Available: ${inventory.available}, Requested decrease: ${dto.quantity}`
            );
          }
        }

        // Calculate new available (quantity - reserved)
        const newAvailable = newQuantity - inventory.reserved;

        // Determine new status
        const reorderLevel = inventory.product.reorder_level || 10;
        let newStatus = "in_stock";
        if (newQuantity === 0) {
          newStatus = "out_of_stock";
        } else if (newQuantity < reorderLevel) {
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
              increment:
                dto.adjustmentType === "increase"
                  ? dto.quantity
                  : -dto.quantity,
            },
          },
        });

        logger.info({
          productId: dto.productId,
          beforeQuantity,
          afterQuantity: newQuantity,
          reason: dto.reason,
        }, "Inventory adjusted successfully", );

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

      return result as AdjustmentResponseDTO;
    } catch (error) {
      logger.error(error as Error, "Failed to adjust inventory");
      throw error;
    }
  }

  /**
   * Initiate Stock Transfer (Step 1)
   * Creates a transfer in PENDING_RECEIPT status
   * Reserves stock in source warehouse
   */
  async initiateTransfer(
    userId: string,
    dto: TransferInventoryDTO
  ) {
    try {
      if (dto.fromWarehouseId === dto.toWarehouseId) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Source and destination warehouses must be different");
      }

      return await this.prisma.$transaction(async (tx) => {
        // 1. Check source inventory
        const inventory = await tx.inventory.findUnique({
          where: {
            productId_warehouseId: {
              productId: dto.productId,
              warehouseId: dto.fromWarehouseId,
            },
          },
        });

        if (!inventory || inventory.available < dto.quantity) {
          throw new AppError(ErrorCode.INSUFFICIENT_INVENTORY, 400, "Insufficient available stock in source warehouse");
        }

        // 2. Generate Transfer Number
        const count = await tx.stockTransfer.count();
        const transferNo = `TR-${new Date().getFullYear()}-${(count + 1).toString().padStart(5, "0")}`;

        // 3. Create Transfer Record (PENDING_RECEIPT)
        const transfer = await tx.stockTransfer.create({
          data: {
            transferNo,
            sourceId: dto.fromWarehouseId,
            targetId: dto.toWarehouseId,
            status: "PENDING_RECEIPT",
            truckRegNo: dto.truckRegNo,
            driverName: dto.driverName,
            attendantName: dto.attendantName,
            notes: dto.notes,
            createdById: userId,
            items: {
              create: {
                productId: dto.productId,
                quantity: dto.quantity,
              },
            },
          },
        });

        // 4. Reserve stock in source (Move from available to reserved)
        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            available: { decrement: dto.quantity },
            reserved: { increment: dto.quantity },
          },
        });

        // 5. Create Movement Record
        await tx.stockMovement.create({
          data: {
            type: "TRANSFER_OUT",
            quantity: dto.quantity,
            productId: dto.productId,
            warehouseId: dto.fromWarehouseId,
            transferId: transfer.id,
            createdById: userId,
            reference: `Transfer Initiated: ${transferNo}`,
          },
        });

        return transfer;
      });
    } catch (error) {
      logger.error(error as Error, "Failed to initiate transfer");
      throw error;
    }
  }

  /**
   * Confirm Stock Transfer Receipt (Step 2)
   * Finalizes the transfer, adjusts physical stock at both ends
   */
  async confirmTransfer(
    userId: string,
    dto: ConfirmTransferDTO
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const transfer = await tx.stockTransfer.findUnique({
          where: { id: dto.transferId },
          include: { items: true },
        });

        if (!transfer) throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
        if (transfer.status !== "PENDING_RECEIPT") {
          throw new AppError(ErrorCode.INVALID_STATUS, 400, "Transfer must be in PENDING_RECEIPT status to confirm");
        }

        let overallStatus: "COMPLETED" | "DISCREPANCY" = "COMPLETED";

        for (const item of dto.items) {
          const originalItem = transfer.items.find(i => i.productId === item.productId);
          if (!originalItem) continue;

          if (item.receivedQuantity !== originalItem.quantity) {
            overallStatus = "DISCREPANCY";
          }

          // 1. Update Source Inventory (Decrease physical quantity and reserved)
          await tx.inventory.update({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: transfer.sourceId,
              },
            },
            data: {
              quantity: { decrement: originalItem.quantity },
              reserved: { decrement: originalItem.quantity },
            },
          });

          // 2. Update Destination Inventory (Increase physical quantity and available)
          await tx.inventory.upsert({
            where: {
              productId_warehouseId: {
                productId: item.productId,
                warehouseId: transfer.targetId,
              },
            },
            update: {
              quantity: { increment: item.receivedQuantity },
              available: { increment: item.receivedQuantity },
            },
            create: {
              productId: item.productId,
              warehouseId: transfer.targetId,
              quantity: item.receivedQuantity,
              available: item.receivedQuantity,
              reserved: 0,
              status: "in_stock",
            },
          });

          // 3. Create Inbound Movement
          await tx.stockMovement.create({
            data: {
              type: "TRANSFER_IN",
              quantity: item.receivedQuantity,
              productId: item.productId,
              warehouseId: transfer.targetId,
              transferId: transfer.id,
              createdById: userId,
              reference: `Transfer Received: ${transfer.transferNo}`,
            },
          });
        }

        // 4. Finalize Transfer Record
        return await tx.stockTransfer.update({
          where: { id: transfer.id },
          data: {
            status: overallStatus,
            receivedAt: new Date(),
            receivedById: userId,
          },
        });
      });
    } catch (error) {
      logger.error(error as Error, "Failed to confirm transfer");
      throw error;
    }
  }

  /**
   * Legacy method redirected to initiateTransfer for compatibility
   */
  async transferInventory(
    dto: TransferInventoryDTO
  ): Promise<any> {
    // In a real SAP system, we'd provide a fake user or require it. 
    // Here we'll just use a system placeholder if not available.
    return this.initiateTransfer("system", dto);
  }

  /**
   * Legacy methods for backwards compatibility
   */
  async updateInventory(
    dto: UpdateInventoryDTO
  ): Promise<InventoryResponseDTO> {
    try {
      logger.debug({
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
        throw notFoundError("Inventory");
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
          available:
            (dto.quantity ?? inventory.quantity) -
            (dto.reserved ?? inventory.reserved),
          status: dto.status as any,
        },
      });

      logger.info({
        productId: dto.productId,
        quantity: updated.quantity,
      }, "Inventory updated");

      return this.formatResponse(updated);
    } catch (error) {
      logger.error(error as Error, "Failed to update inventory");
      throw error;
    }
  }

  async getInventorySingle(
    productId: string,
    warehouseId: string
  ): Promise<InventoryResponseDTO> {
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
        throw notFoundError("Inventory");
      }

      return this.formatResponse(inventory);
    } catch (error) {
      logger.error(error as Error, "Failed to fetch inventory");
      throw error;
    }
  }

  async listInventory(
    query: InventoryListQueryDTO
  ): Promise<{ data: InventoryResponseDTO[]; total: number }> {
    try {
      const page = query.page || 1;
      const limit = query.limit || 20;
      const skip = (page - 1) * limit;

      const where: any = {};

      if (query.status) where.status = query.status;
      if (query.warehouseId) where.warehouseId = query.warehouseId;
      if (query.productId) where.productId = query.productId;
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
        data: data.map((inv: any) => this.formatResponse(inv)),
        total,
      };
    } catch (error) {
      logger.error(error as Error, "Failed to list inventory");
      throw error;
    }
  }

  async adjustStock(dto: StockAdjustmentDTO): Promise<InventoryResponseDTO> {
    try {
      logger.debug({
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
        throw notFoundError("Inventory");
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

      logger.info({
        productId: dto.productId,
        newQuantity,
        reason: dto.reason,
      }, "Stock adjusted"); 

      return this.formatResponse(updated);
    } catch (error) {
      logger.error(error as Error, "Failed to adjust stock");
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private formatInventoryItem(inventory: any): InventoryItemDTO {
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

  private formatResponse(inventory: any): InventoryResponseDTO {
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
