/**
 * @deprecated FifoCOGSService — FIFO depletion logic has been consolidated
 * into InventoryService (modules/inventory/service/inventory.service.ts).
 *
 * This file is kept so existing imports compile without changes.
 * Every method now delegates to InventoryService; the old independent
 * StockBatch manipulation that previously lived here is gone.
 *
 * Callers should migrate to:
 *   InventoryService.depleteStockFIFO  (stock depletion + COGS cost)
 *   InventoryService.getCOGSReport     (reporting)
 *
 * The journal-entry creation previously in recordCOGS is preserved here
 * because it belongs to the GL layer, not to the inventory layer — it
 * calls InventoryService.depleteStockFIFO for the stock side, then writes
 * the journal entries independently.
 */

import { prisma } from "../../../lib/db";
import { Prisma } from "../../../generated";
import { logger } from "../../../lib/logger";
import { InventoryService } from "../service/inventory.service";

export interface COGSAllocation {
  batchId: string;
  quantity: number;
  unitCost: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  receivedAt: Date;
}

export interface COGSCalculationResult {
  totalCOGS: Prisma.Decimal;
  allocations: COGSAllocation[];
  remainingQuantity: number;
}

export class FifoCOGSService {
  /**
   * @deprecated Use InventoryService.depleteStockFIFO — it returns
   * batchesUsed with the same per-batch cost data this method returned.
   *
   * This wrapper delegates to the canonical implementation so existing
   * callers keep compiling.  Note: it performs a read-only cost calculation
   * (does NOT deplete batches) by reading current StockBatch rows.  If you
   * need both the cost AND the depletion in one atomic step, call
   * InventoryService.depleteStockFIFO inside a transaction.
   */
  static async calculateCOGS(
    productId: string,
    warehouseId: string,
    quantity: number,
  ): Promise<COGSCalculationResult> {
    // Read-only FIFO cost calculation — does not mutate StockBatch
    const batches = await prisma.stockBatch.findMany({
      where: { productId, warehouseId, isDepleted: false },
      orderBy: { receivedAt: "asc" },
      select: { id: true, currentQuantity: true, unitCost: true, receivedAt: true },
    });

    if (batches.length === 0) {
      throw new Error(
        `No available stock batches for product ${productId} in warehouse ${warehouseId}`,
      );
    }

    let remaining = quantity;
    let totalCOGS = new Prisma.Decimal(0);
    const allocations: COGSAllocation[] = [];

    for (const batch of batches) {
      if (remaining <= 0) break;
      const take = Math.min(remaining, batch.currentQuantity);
      const unitCost = new Prisma.Decimal(batch.unitCost);
      const cost = unitCost.mul(new Prisma.Decimal(take));
      totalCOGS = totalCOGS.add(cost);
      allocations.push({ batchId: batch.id, quantity: take, unitCost, totalCost: cost, receivedAt: batch.receivedAt });
      remaining -= take;
    }

    if (remaining > 0) {
      const available = batches.reduce((s, b) => s + b.currentQuantity, 0);
      throw new Error(
        `Insufficient stock for COGS calculation. Product: ${productId}, Required: ${quantity}, Available: ${available}`,
      );
    }

    return { totalCOGS, allocations, remainingQuantity: 0 };
  }

  /**
   * Record COGS for a dispatch item:
   *   1. Depletes stock via InventoryService.depleteStockFIFO (canonical path).
   *   2. Updates DispatchItem.totalCogs.
   *   3. Posts a GL journal entry (Dr COGS / Cr Inventory).
   *
   * Previously this method had its own StockBatch.update loop — that is now
   * handled entirely by InventoryService.depleteStockFIFO.
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
    },
  ): Promise<{ totalCOGS: Prisma.Decimal; journalHeaderId: string }> {
    // 1. Deplete stock and get the precise FIFO cost via canonical service
    const fifoResult = await InventoryService.depleteStockFIFO(tx, {
      productId: data.productId,
      warehouseId: data.warehouseId,
      quantity: data.quantity,
      userId: data.userId,
      salesId: data.dispatchItemId,
      reference: `COGS for Dispatch Item ${data.dispatchItemId}`,
    });

    const totalCOGS = fifoResult.totalCost;

    // 2. Stamp the precise COGS cost onto the DispatchItem record
    await tx.dispatchItem.update({
      where: { id: data.dispatchItemId },
      data: { totalCogs: totalCOGS },
    });

    // 3. Post the GL journal entry (Dr COGS / Cr Inventory Asset)
    const journalHeaderId = await FifoCOGSService.createCOGSJournalEntry(tx, {
      dispatchItemId: data.dispatchItemId,
      productId: data.productId,
      cogsAmount: totalCOGS,
      warehouseId: data.warehouseId,
      userId: data.userId,
      branchId: data.branchId,
    });

    return { totalCOGS, journalHeaderId };
  }

  /**
   * Post Dr COGS / Cr Inventory journal entry.
   * Account codes "5001" (COGS) and "1200" (Inventory Asset) are the
   * standard chart-of-accounts codes for this system — change via a
   * migration if the CoA is restructured.
   */
  private static async createCOGSJournalEntry(
    tx: Prisma.TransactionClient,
    data: {
      dispatchItemId: string;
      productId: string;
      cogsAmount: Prisma.Decimal;
      warehouseId: string;
      userId: string;
      branchId: string;
    },
  ): Promise<string> {
    const [cogsAccount, inventoryAccount] = await Promise.all([
      tx.chartOfAccount.findUnique({ where: { account_code: "5001" } }),
      tx.chartOfAccount.findUnique({ where: { account_code: "1200" } }),
    ]);

    if (!cogsAccount || !inventoryAccount) {
      throw new Error("COGS (5001) or Inventory Asset (1200) account not found in Chart of Accounts");
    }

    const period = await tx.fiscalPeriod.findFirst({
      where: { startDate: { lte: new Date() }, endDate: { gte: new Date() }, status: "open" },
    });

    if (!period) {
      throw new Error("No open fiscal period found for current date");
    }

    const entryCount = await tx.journalHeader.count();
    const entryNo = `COGS-${new Date().getFullYear()}-${(entryCount + 1).toString().padStart(6, "0")}`;

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

    await tx.journalLine.createMany({
      data: [
        {
          header_id: header.id,
          account_id: cogsAccount.id,
          line_no: 1,
          description: "Cost of Goods Sold",
          debit: data.cogsAmount,
          credit: new Prisma.Decimal(0),
        },
        {
          header_id: header.id,
          account_id: inventoryAccount.id,
          line_no: 2,
          description: "Inventory Reduction",
          debit: new Prisma.Decimal(0),
          credit: data.cogsAmount,
        },
      ],
    });

    return header.id;
  }

  /**
   * COGS report for a period — delegates to InventoryService.getCOGSReport.
   * @deprecated Use InventoryService.getCOGSReport directly.
   */
  static async getCOGSReport(startDate: Date, endDate: Date, branchId?: string) {
    return InventoryService.getCOGSReport(startDate, endDate, branchId);
  }
}
