// backend/src/modules/pos/service/stock-validation.service.ts
import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { UserRole } from "../../../generated/enums";

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
   * Check if sufficient stock is available for a list of items
   * @param branchId - Branch ID to check stock in
   * @param items - Array of items with productId and quantity
   * @returns Validation result with details of insufficient items
   */
  static async validateStock(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>
  ): Promise<StockValidationResult> {
    // Get the warehouse for this branch
    const warehouse = await prisma.warehouse.findFirst({
      where: { branchId, isActive: true },
    });

    if (!warehouse) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `No active warehouse found for branch ${branchId}`
      );
    }

    const insufficientItems: StockCheckResult[] = [];

    // Check stock for each item
    for (const item of items) {
      const inventory = await prisma.inventory.findFirst({
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
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!user) return false;

    // Admin, Manager, or Branch Manager can override
    const canOverride = ([
      UserRole.admin,
      UserRole.manager,
      UserRole.branch_manager,
    ] as UserRole[]).includes(user.role);

    return canOverride;
  }

  /**
   * Validate stock with admin override option
   * Throws error if stock is insufficient and user cannot override
   */
  static async validateOrThrow(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>,
    userId: string,
    allowOverride: boolean = false
  ): Promise<void> {
    const validation = await this.validateStock(branchId, items);

    if (!validation.isValid) {
      // Check if user can override
      if (allowOverride) {
        const canOverride = await this.canOverrideStock(userId);
        if (canOverride) {
          // Log the override for audit trail
          console.log(`Stock override by user ${userId} for insufficient items:`, 
            validation.insufficientItems.map(item => ({
              product: item.productName,
              requested: item.requestedQuantity,
              available: item.availableQuantity
            }))
          );
          return; // Allow the operation
        }
      }

      // Build detailed error message
      const itemDetails = validation.insufficientItems
        .map(
          (item) =>
            `${item.productName}: requested ${item.requestedQuantity}, available ${item.availableQuantity}`
        )
        .join("; ");

      throw new AppError(
        ErrorCode.BAD_REQUEST,
        400,
        `Insufficient stock: ${itemDetails}`
      );
    }
  }

  /**
   * Get available stock for a specific product in a branch
   */
  static async getAvailableStock(
    productId: string,
    branchId: string
  ): Promise<number> {
    const warehouse = await prisma.warehouse.findFirst({
      where: { branchId, isActive: true },
    });

    if (!warehouse) return 0;

    const inventory = await prisma.inventory.findFirst({
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
  static async reserveStock(
    branchId: string,
    items: Array<{ productId: string; quantity: number }>
  ): Promise<void> {
    const warehouse = await prisma.warehouse.findFirst({
      where: { branchId, isActive: true },
    });

    if (!warehouse) {
      throw new AppError(
        ErrorCode.NOT_FOUND,
        404,
        `No active warehouse found for branch ${branchId}`
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
    items: Array<{ productId: string; quantity: number }>
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
