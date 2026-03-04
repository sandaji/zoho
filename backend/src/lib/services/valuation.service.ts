import { Prisma } from '@prisma/client';
import { AppError, ErrorCode } from '../error.js';

/**
 * Interface for batch creation data
 */
export interface BatchCreateData {
  productId: string;
  warehouseId: string;
  grnItemId?: string;
  quantity: number;
  unitCost: number | Prisma.Decimal;
}

/**
 * Interface for FIFO depletion result
 */
export interface FIFODepletionResult {
  totalCost: Prisma.Decimal;
  totalQuantity: number;
  batchesUsed: Array<{
    batchId: string;
    quantityTaken: number;
    cost: Prisma.Decimal;
  }>;
}

/**
 * ValuationService - FIFO inventory valuation
 *
 * Handles creation and depletion of StockBatch records for precise
 * cost-of-goods-sold (COGS) calculation using First-In-First-Out method.
 *
 * All methods are designed to work within Prisma transactions ($transaction).
 * Pass the transaction client (tx) as the first argument.
 *
 * Example usage:
 * ```typescript
 * const result = await prisma.$transaction(async (tx) => {
 *   // Create batch when goods are received
 *   await ValuationService.createBatch(tx, {
 *     productId: 'prod_123',
 *     warehouseId: 'wh_456',
 *     grnItemId: 'grn_item_789',
 *     quantity: 100,
 *     unitCost: 50.00,
 *   });
 *
 *   // Deplete using FIFO when goods are sold
 *   const { totalCost } = await ValuationService.depleteStockFIFO(
 *     tx,
 *     'prod_123',
 *     'wh_456',
 *     75
 *   );
 * });
 * ```
 */
export class ValuationService {
  /**
   * Create a new StockBatch
   *
   * Called during the GRN (Goods Receipt Note) receiving process to record
   * incoming inventory with its exact unit cost. Each batch represents a discrete
   * delivery that can be tracked through the inventory lifecycle.
   *
   * @param tx - Prisma transaction client
   * @param data - Batch creation parameters
   * @returns Promise<StockBatch> - Created batch record
   *
   * @throws AppError if product or warehouse doesn't exist
   *
   * Example:
   * ```typescript
   * const batch = await ValuationService.createBatch(tx, {
   *   productId: 'prod_123',
   *   warehouseId: 'wh_456',
   *   grnItemId: 'grn_item_789',
   *   quantity: 50,
   *   unitCost: 100.50,
   * });
   * ```
   */
  static async createBatch(
    tx: Prisma.TransactionClient,
    data: BatchCreateData
  ): Promise<any> {
    const { productId, warehouseId, grnItemId, quantity, unitCost } = data;

    // Validate quantity is positive
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        'Batch quantity must be a positive integer',
        ErrorCode.INVALID_INPUT
      );
    }

    // Validate unitCost is positive
    const costAsDecimal = typeof unitCost === 'string'
      ? parseFloat(unitCost)
      : unitCost instanceof Prisma.Decimal
      ? unitCost.toNumber()
      : unitCost;

    if (costAsDecimal < 0) {
      throw new AppError(
        'Unit cost cannot be negative',
        ErrorCode.INVALID_INPUT
      );
    }

    // Verify product exists (fail fast)
    const productExists = await tx.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!productExists) {
      throw new AppError(
        `Product with ID ${productId} not found`,
        ErrorCode.NOT_FOUND
      );
    }

    // Verify warehouse exists (fail fast)
    const warehouseExists = await tx.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true },
    });
    if (!warehouseExists) {
      throw new AppError(
        `Warehouse with ID ${warehouseId} not found`,
        ErrorCode.NOT_FOUND
      );
    }

    // Create the batch
    const batch = await tx.stockBatch.create({
      data: {
        productId,
        warehouseId,
        grnItemId,
        initialQuantity: quantity,
        currentQuantity: quantity,
        unitCost: new Prisma.Decimal(costAsDecimal.toString()),
        receivedAt: new Date(),
        isDepleted: false,
      },
    });

    return batch;
  }

  /**
   * Deplete stock using FIFO (First-In-First-Out) method
   *
   * Called during sales order fulfillment. Retrieves stock in the order it was
   * received (oldest first) and deducts the requested quantity. Updates batch
   * records to mark them as depleted when exhausted.
   *
   * Returns the total cost of the depleted stock, which represents the
   * Cost of Goods Sold (COGS) for this transaction.
   *
   * @param tx - Prisma transaction client
   * @param productId - Product to deplete stock for
   * @param warehouseId - Warehouse to deplete from
   * @param requestedQty - Quantity needed
   * @returns Promise<FIFODepletionResult> - Depletion summary with total cost
   *
   * @throws AppError if insufficient stock available or invalid parameters
   *
   * Example:
   * ```typescript
   * const { totalCost, batchesUsed } = await ValuationService.depleteStockFIFO(
   *   tx,
   *   'prod_123',
   *   'wh_456',
   *   25
   * );
   * console.log(`COGS: ${totalCost}`); // Cost of goods sold
   * ```
   */
  static async depleteStockFIFO(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    requestedQty: number
  ): Promise<FIFODepletionResult> {
    // Validate inputs
    if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
      throw new AppError(
        'Requested quantity must be a positive integer',
        ErrorCode.INVALID_INPUT
      );
    }

    // Fetch all non-depleted batches ordered by receivedAt ASC (FIFO)
    // Select only non-depleted batches to minimize data transfer
    const availableBatches = await tx.stockBatch.findMany({
      where: {
        productId,
        warehouseId,
        isDepleted: false,
      },
      orderBy: {
        receivedAt: 'asc', // Oldest first (FIFO)
      },
      select: {
        id: true,
        currentQuantity: true,
        unitCost: true,
      },
    });

    // Check if sufficient stock is available
    const totalAvailable = availableBatches.reduce(
      (sum, batch) => sum + batch.currentQuantity,
      0
    );

    if (totalAvailable < requestedQty) {
      throw new AppError(
        `Insufficient stock: requested ${requestedQty}, available ${totalAvailable}`,
        ErrorCode.INVALID_OPERATION
      );
    }

    let remainingQty = requestedQty;
    let totalCost = new Prisma.Decimal(0);
    const batchesUsed = [];

    // Iterate through batches in FIFO order
    for (const batch of availableBatches) {
      if (remainingQty <= 0) break;

      // How much can we take from this batch?
      const quantityToTake = Math.min(remainingQty, batch.currentQuantity);

      // Calculate cost for this portion
      const batchCost = new Prisma.Decimal(quantityToTake.toString()).mul(
        batch.unitCost
      );

      // Track what we took from this batch
      batchesUsed.push({
        batchId: batch.id,
        quantityTaken: quantityToTake,
        cost: batchCost,
      });

      // Add to total cost
      totalCost = totalCost.add(batchCost);

      // Update the batch
      const newCurrentQuantity = batch.currentQuantity - quantityToTake;
      const isNowDepleted = newCurrentQuantity === 0;

      await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: newCurrentQuantity,
          isDepleted: isNowDepleted,
        },
      });

      remainingQty -= quantityToTake;
    }

    return {
      totalCost,
      totalQuantity: requestedQty,
      batchesUsed,
    };
  }
}

export default ValuationService;
