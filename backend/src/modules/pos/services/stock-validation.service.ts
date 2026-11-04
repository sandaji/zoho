// backend/src/modules/pos/service/stock-validation.service.ts
import { prisma } from "@core/database/db";
import { AppError, ErrorCode } from "@core/errors/errors";
import { PermissionService } from "../../auth/services/permission.service";

interface StockCheckResult {
  isAvailable: boolean;
  productId: string;
  productName: string;
  requestedQuantity: number;
  availableQuantity: number;
  warehouseId: string;
}

interface StockValidationResult {
  isValid: boolean;
  insufficientItems: StockCheckResult[];
  message?: string;
}

export class StockValidationService {
  /**
   * Return active branch warehouses in the same order POS uses when allocating
   * stock. Search, validation, and FIFO depletion all use this set.
   */
  static async getActiveWarehouses(branchId: string) {
    return prisma.warehouse.findMany({
      where: { branchId, isActive: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
      select: { id: true, name: true, branchId: true },
    });
  }

  static async getDefaultWarehouse(branchId: string) {
    return (await this.getActiveWarehouses(branchId))[0] ?? null;
  }

  /**
   * Check if sufficient stock is available for a list of items
   * @param branchId - Branch ID to check stock in
   * @param items - Array of items with productId and quantity
   * @returns Validation result with details of insufficient items
   */
  static async validateStock(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
    warehouseId?: string,
  ): Promise<StockValidationResult> {
    // POS can fulfill a line from more than one active warehouse in the same
    // branch. An explicit warehouseId keeps single-location callers scoped.
    let warehouses: Array<{ id: string }>;
    if (warehouseId) {
      const warehouse = await prisma.warehouse.findFirst({
        where: { id: warehouseId, branchId, isActive: true },
        select: { id: true },
      });
      warehouses = warehouse ? [warehouse] : [];
    } else {
      warehouses = await this.getActiveWarehouses(branchId);
    }

    if (warehouses.length === 0) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `No active warehouse found for branch ${branchId}`,
      );
    }

    const insufficientItems: StockCheckResult[] = [];

    const warehouseIds = warehouses.map((warehouse) => warehouse.id);

    // Check total requested quantity per product across the active warehouses
    // that POS can actually draw from. Drafts can contain repeated lines.
    const requestedByProduct = new Map<string, number>();
    for (const item of items) {
      requestedByProduct.set(
        item.productId,
        (requestedByProduct.get(item.productId) ?? 0) + item.quantity,
      );
    }

    for (const [productId, requestedQuantity] of requestedByProduct) {
      const inventories = await prisma.inventory.findMany({
        where: {
          productId,
          warehouseId: { in: warehouseIds },
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

      const availableQuantity = inventories.reduce(
        (sum, inventory) => sum + (inventory.available || 0),
        0,
      );
      if (availableQuantity < requestedQuantity) {
        insufficientItems.push({
          isAvailable: false,
          productId,
          productName: inventories[0]?.product.name || "Unknown Product",
          requestedQuantity,
          availableQuantity,
          warehouseId: warehouseIds.join(","),
        });
      }
    }

    return {
      isValid: insufficientItems.length === 0,
      insufficientItems,
      message:
        insufficientItems.length > 0
          ? `Insufficient stock for ${insufficientItems.length} item(s)`
          : "All items have sufficient stock",
    };
  }

  /**
   * Check if user has admin privileges to override stock validation
   */
  static async canOverrideStock(userId: string): Promise<boolean> {
    // Check if user has permission to adjust stock (which managers/admins should have)
    return await PermissionService.hasPermission(
      userId,
      "inventory.stock.adjust",
    );
  }

  /**
   * Validate stock with admin override option
   * Throws error if stock is insufficient and user cannot override
   */
  static async validateOrThrow(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
    userId: string,
    allowOverride: boolean = false,
    warehouseId?: string,
  ): Promise<void> {
    const validation = await this.validateStock(branchId, items, warehouseId);

    if (!validation.isValid) {
      // Check if user can override
      if (allowOverride) {
        const canOverride = await this.canOverrideStock(userId);
        if (canOverride) {
          // Log the override for audit trail
          console.log(
            `Stock override by user ${userId} for insufficient items:`,
            validation.insufficientItems.map((item) => ({
              product: item.productName,
              requested: item.requestedQuantity,
              available: item.availableQuantity,
            })),
          );
          return; // Allow the operation
        }
      }

      // Build detailed error message
      const itemDetails = validation.insufficientItems
        .map(
          (item) =>
            `${item.productName}: requested ${item.requestedQuantity}, available ${item.availableQuantity}`,
        )
        .join("; ");

      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        `Insufficient stock: ${itemDetails}`,
      );
    }
  }

  /**
   * Get available stock for a specific product in a branch
   */
  static async getAvailableStock(
    productId: string,
    branchId: string,
  ): Promise<number> {
    const warehouses = await this.getActiveWarehouses(branchId);
    if (warehouses.length === 0) return 0;

    const inventory = await prisma.inventory.findMany({
      where: {
        productId,
        warehouseId: { in: warehouses.map((warehouse) => warehouse.id) },
      },
    });

    return inventory.reduce((sum, row) => sum + (row.available || 0), 0);
  }

  /**
   * Reserve stock for a draft/quote (optional feature)
   * This can be used to prevent overselling while draft is being processed
   */
  static async reserveStock(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    const warehouse = await prisma.warehouse.findFirst({
      where: { branchId, isActive: true },
    });

    if (!warehouse) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `No active warehouse found for branch ${branchId}`,
      );
    }

    await prisma.$transaction(async (tx) => {
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
  static async releaseStock(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
  ): Promise<void> {
    const warehouse = await prisma.warehouse.findFirst({
      where: { branchId, isActive: true },
    });

    if (!warehouse) return;

    await prisma.$transaction(async (tx) => {
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
