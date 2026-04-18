/**
 * Inventory Alerts Service
 * Monitors inventory levels and triggers alerts for low stock
 */

import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";

export interface LowStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  minStockLevel: number;
  reorderQuantity: number;
  branchId: string;
  branchName: string;
  status: "critical" | "warning" | "normal";
}

export class InventoryAlertService {
  /**
   * Get low stock alerts across all branches
   */
  static async getLowStockAlerts(): Promise<LowStockAlert[]> {
    try {
      const alerts: LowStockAlert[] = [];

      // Get all branch inventory with low stock
      const branchInventories = await prisma.branchInventory.findMany({
        where: {
          quantity: {
            gt: 0, // Only items with stock
          },
        },
        include: {
          product: true,
          branch: true,
        },
      });

      for (const inv of branchInventories) {
        // Check if below reorder level
        if (inv.quantity <= inv.reorder_level) {
          const criticalThreshold = (inv.reorder_level || 10) * 0.5;
          const status =
            inv.quantity <= criticalThreshold
              ? ("critical" as const)
              : ("warning" as const);

          alerts.push({
            productId: inv.productId,
            productName: inv.product.name,
            currentStock: inv.quantity,
            minStockLevel: inv.reorder_level || 10,
            reorderQuantity: inv.reorder_quantity || 20,
            branchId: inv.branchId,
            branchName: inv.branch.name,
            status,
          });
        }
      }

      logger.info({ count: alerts.length }, "Low stock alerts retrieved");
      return alerts;
    } catch (error) {
      logger.error(error, "Error fetching low stock alerts");
      throw error;
    }
  }

  /**
   * Get alerts for a specific branch
   */
  static async getBranchAlerts(branchId: string): Promise<LowStockAlert[]> {
    const allAlerts = await this.getLowStockAlerts();
    return allAlerts.filter((alert) => alert.branchId === branchId);
  }

  /**
   * Get critical alerts only
   */
  static async getCriticalAlerts(): Promise<LowStockAlert[]> {
    const allAlerts = await this.getLowStockAlerts();
    return allAlerts.filter((alert) => alert.status === "critical");
  }

  /**
   * Check if product needs reordering
   */
  static async needsReorder(
    productId: string,
    branchId: string,
  ): Promise<boolean> {
    try {
      const inventory = await prisma.branchInventory.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId,
          },
        },
        include: {
          product: true,
        },
      });

      if (!inventory) return false;

      return inventory.quantity <= inventory.reorder_level;
    } catch (error) {
      logger.error(error, "Error checking reorder status");
      return false;
    }
  }

  /**
   * Get suggested reorder quantity for a product
   */
  static async getSuggestedReorderQty(
    productId: string,
    branchId: string,
  ): Promise<{ current: number; suggested: number; minLevel: number }> {
    try {
      const inventory = await prisma.branchInventory.findUnique({
        where: {
          productId_branchId: {
            productId,
            branchId,
          },
        },
      });

      if (!inventory) {
        throw new Error("Inventory record not found");
      }

      return {
        current: inventory.quantity,
        suggested: inventory.reorder_quantity,
        minLevel: inventory.reorder_level,
      };
    } catch (error) {
      logger.error(error, "Error getting suggested reorder quantity");
      throw error;
    }
  }
}
