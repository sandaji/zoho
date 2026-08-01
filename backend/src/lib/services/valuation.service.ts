import { Prisma } from '../../generated';
import { InventoryService, type FIFODepletionResult } from '../../modules/inventory/service/inventory.service';

/**
 * @deprecated FIFO valuation logic has been consolidated into
 * `InventoryService` (modules/inventory/service/inventory.service.ts),
 * which is now the single source of truth for stock receipt/depletion —
 * it also keeps the `Inventory` quantity ledger and StockMovement audit
 * trail in sync with StockBatch, which this class alone did not do.
 *
 * This file is kept only so existing imports (e.g.
 * `modules/sales/sales.service.ts`) keep compiling. New code should call
 * `InventoryService.receiveStock` / `InventoryService.depleteStockFIFO`
 * directly.
 */

export interface BatchCreateData {
  productId: string;
  warehouseId: string;
  grnItemId?: string;
  quantity: number;
  unitCost: number | Prisma.Decimal;
}

export type { FIFODepletionResult };

export class ValuationService {
  /**
   * @deprecated use InventoryService.receiveStock directly and pass a real
   * userId when you have one. This wrapper has no userId in its legacy
   * signature, so it relies on InventoryService.receiveStock's fallback to
   * the request-scoped userId (set by auth middleware); if neither is
   * available, the StockMovement audit row is skipped rather than written
   * with a fabricated user reference.
   */
  static async createBatch(tx: Prisma.TransactionClient, data: BatchCreateData): Promise<any> {
    return InventoryService.receiveStock(tx, {
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      unitCost: data.unitCost,
      grnItemId: data.grnItemId,
    });
  }

  /**
   * @deprecated use InventoryService.depleteStockFIFO (accepts userId for
   * a proper StockMovement audit row). This wrapper still gets you the
   * correctness fix — Inventory.quantity/available now gets decremented
   * alongside the StockBatch depletion, which the old implementation of
   * this method never did.
   */
  static async depleteStockFIFO(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    requestedQty: number,
  ): Promise<FIFODepletionResult> {
    return InventoryService.depleteStockFIFO(tx, { productId, warehouseId, quantity: requestedQty });
  }
}

export default ValuationService;
