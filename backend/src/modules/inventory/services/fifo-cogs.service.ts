/**
 * FIFO COGS Calculation Service
 * Calculates Cost of Goods Sold using First-In-First-Out method
 * Links inventory reduction to proper financial accounting
 */

import { prisma } from "../../../lib/db";
import { Decimal } from "@prisma/client/runtime/library";
import { Prisma } from "../../../generated";
import { logger } from "../../../lib/logger";

export interface COGSAllocation {
  batchId: string;
  quantity: number;
  unitCost: Decimal;
  totalCost: Decimal;
  receivedAt: Date;
}

export interface COGSCalculationResult {
  totalCOGS: Decimal;
  allocations: COGSAllocation[];
  remainingQuantity: number; // Should be 0 if fully allocated
}

export class FifoCOGSService {
  /**
   * Calculate COGS using FIFO method for a dispatch/sale
   */
  static async calculateCOGS(
    productId: string,
    warehouseId: string,
    quantity: number
  ): Promise<COGSCalculationResult> {
    // Get non-depleted stock batches ordered by FIFO (oldest first)
    const batches = await prisma.stockBatch.findMany({
      where: {
        productId,
        warehouseId,
        isDepleted: false,
      },
      orderBy: {
        receivedAt: "asc", // FIFO: First In, First Out
      },
    });

    if (batches.length === 0) {
      throw new Error(
        `No available stock batches for product ${productId} in warehouse ${warehouseId}`
      );
    }

    let remainingQuantity = quantity;
    let totalCOGS = new Decimal(0);
    const allocations: COGSAllocation[] = [];

    for (const batch of batches) {
      if (remainingQuantity <= 0) break;

      const quantityFromBatch = Math.min(
        remainingQuantity,
        batch.currentQuantity
      );

      const unitCost = new Decimal(batch.unitCost);
      const batchCOGS = unitCost.mul(new Decimal(quantityFromBatch));
      totalCOGS = totalCOGS.add(batchCOGS);

      allocations.push({
        batchId: batch.id,
        quantity: quantityFromBatch,
        unitCost,
        totalCost: batchCOGS,
        receivedAt: batch.receivedAt,
      });

      remainingQuantity -= quantityFromBatch;
    }

    if (remainingQuantity > 0) {
      const totalAvailable = batches.reduce(
        (sum, b) => sum + b.currentQuantity,
        0
      );
      throw new Error(
        `Insufficient stock for COGS calculation. Product: ${productId}, ` +
          `Required: ${quantity}, Available: ${totalAvailable}`
      );
    }

    return {
      totalCOGS,
      allocations,
      remainingQuantity,
    };
  }

  /**
   * Record COGS for a dispatch item and create journal entries
   */
  static async recordCOGS(
    tx: Prisma.TransactionClient,
    data: {
      dispatchItemId: string;
      productId: string;
      warehouseId: string;
      quantity: number;
      userId: string;
      branchId: string;
    }
  ): Promise<{
    totalCOGS: Decimal;
    journalHeaderId: string;
  }> {
    // Calculate COGS using FIFO
    const cogsResult = await this.calculateCOGS(
      data.productId,
      data.warehouseId,
      data.quantity
    );

    // Update stock batches (deduct quantities)
    for (const allocation of cogsResult.allocations) {
      const batch = await tx.stockBatch.findUnique({
        where: { id: allocation.batchId },
      });

      if (!batch) {
        throw new Error(`Stock batch ${allocation.batchId} not found`);
      }

      const newQuantity = batch.currentQuantity - allocation.quantity;

      await tx.stockBatch.update({
        where: { id: allocation.batchId },
        data: {
          currentQuantity: newQuantity,
          isDepleted: newQuantity <= 0,
        },
      });
    }

    // Update DispatchItem with COGS
    await tx.dispatchItem.update({
      where: { id: data.dispatchItemId },
      data: {
        totalCogs: cogsResult.totalCOGS,
      },
    });

    // Create Journal Entry for COGS
    const journalHeaderId = await this.createCOGSJournalEntry(tx, {
      dispatchItemId: data.dispatchItemId,
      productId: data.productId,
      cogsAmount: cogsResult.totalCOGS,
      warehouseId: data.warehouseId,
      userId: data.userId,
      branchId: data.branchId,
    });

    return {
      totalCOGS: cogsResult.totalCOGS,
      journalHeaderId,
    };
  }

  /**
   * Create Journal Entry for COGS
   */
  private static async createCOGSJournalEntry(
    tx: Prisma.TransactionClient,
    data: {
      dispatchItemId: string;
      productId: string;
      cogsAmount: Decimal;
      warehouseId: string;
      userId: string;
      branchId: string;
    }
  ): Promise<string> {
    // Get default accounts
    const cogsAccount = await tx.chartOfAccount.findUnique({
      where: { account_code: "5001" }, // COST_OF_GOODS
    });

    const inventoryAccount = await tx.chartOfAccount.findUnique({
      where: { account_code: "1200" }, // INVENTORY_ASSET
    });

    if (!cogsAccount || !inventoryAccount) {
      throw new Error(
        "COGS or Inventory account not found in Chart of Accounts"
      );
    }

    // Get current period
    const period = await tx.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
        status: "open",
      },
    });

    if (!period) {
      throw new Error("No open fiscal period found for current date");
    }

    // Generate entry number
    const entryCount = await tx.journalHeader.count();
    const entryNo = `COGS-${new Date().getFullYear()}-${(entryCount + 1)
      .toString()
      .padStart(6, "0")}`;

    // Create Journal Header
    const header = await tx.journalHeader.create({
      data: {
        entry_no: entryNo,
        entry_date: new Date(),
        period_id: period.id,
        branch_id: data.branchId,
        description: `COGS for Dispatch Item ${data.dispatchItemId}`,
        source_type: "DISPATCH",
        source_id: data.dispatchItemId,
        total_debit: data.cogsAmount,
        total_credit: data.cogsAmount,
        created_by: data.userId,
      },
    });

    // Create Journal Lines
    await tx.journalLine.createMany({
      data: [
        {
          header_id: header.id,
          account_id: cogsAccount.id,
          line_no: 1,
          description: "Cost of Goods Sold",
          debit: data.cogsAmount,
          credit: new Decimal(0),
        },
        {
          header_id: header.id,
          account_id: inventoryAccount.id,
          line_no: 2,
          description: "Inventory Reduction",
          debit: new Decimal(0),
          credit: data.cogsAmount,
        },
      ],
    });

    return header.id;
  }

  /**
   * Get COGS report for a period
   */
  static async getCOGSReport(
    startDate: Date,
    endDate: Date,
    branchId?: string
  ) {
    const where: Prisma.DispatchItemWhereInput = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
      totalCogs: {
        gt: new Decimal(0),
      },
    };

    if (branchId) {
      // Need to join through dispatch note -> sales order -> branch
      // For now, return without branch filter or implement with raw query
    }

    const report = await prisma.dispatchItem.groupBy({
      by: ["productId"],
      where,
      _sum: {
        qtyDispatched: true,
        totalCogs: true,
      },
      _count: true,
    });

    // Get product details
    const productIds = report.map((r) => r.productId);
    const products = await prisma.product.findMany({
      where: {
        id: {
          in: productIds,
        },
      },
      select: {
        id: true,
        sku: true,
        name: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    return report.map((r) => ({
      product: productMap.get(r.productId),
      quantityDispatched: r._sum.qtyDispatched,
      totalCOGS: r._sum.totalCogs,
      transactionCount: r._count,
      averageUnitCost:
        r._sum.qtyDispatched && r._sum.qtyDispatched > 0
          ? (r._sum.totalCogs as Decimal)
              .div(new Decimal(r._sum.qtyDispatched))
              .toNumber()
          : 0,
    }));
  }
}
