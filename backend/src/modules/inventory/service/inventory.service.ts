/**
 * Inventory Module - Service Layer
 *
 * SINGLE SOURCE OF TRUTH for:
 *   - Warehouse stock levels (Inventory table)
 *   - FIFO cost valuation / COGS (StockBatch depletion)
 *   - Stock movement audit trail
 *
 * This replaces the previously-duplicated FIFO logic that lived in
 * `lib/services/valuation.service.ts` and
 * `modules/inventory/services/fifo-cogs.service.ts`. Both of those files
 * now delegate to `InventoryService.receiveStock` / `depleteStockFIFO`
 * below rather than depleting StockBatch independently — see the
 * deprecation notices in those files for why they still exist.
 *
 * Every module that needs to move stock (POS sales, Sales Order dispatch,
 * PO/GRN receiving, stock adjustments) should call the static methods here
 * instead of touching `prisma.inventory` / `prisma.stockBatch` directly.
 */

import { prisma } from "../../../lib/db";
import { Prisma } from "../../../generated";
import { logger } from "../../../lib/logger";
import { notFoundError, AppError, ErrorCode } from "../../../lib/errors";
import { synchronizeBranchInventoryForWarehouse } from "../../../lib/inventory-sync";
import {
  AdjustInventoryDTO,
  AdjustmentResponseDTO,
  TransferInventoryDTO,
  TransferResponseDTO,
  GetInventoryQueryDTO,
  InventoryListResponseDTO,
  InventoryItemDTO,
  RequestTransferDTO,
  ApproveTransferDTO,
  DispatchTransferDTO,
  ReceiveTransferDTO,
} from "../dto";
import { SequenceService } from "../../sequences/sequence.service";

export interface FIFOBatchUsed {
  batchId: string;
  quantityTaken: number;
  unitCost: Prisma.Decimal;
  cost: Prisma.Decimal;
}

export interface FIFODepletionResult {
  totalCost: Prisma.Decimal;
  totalQuantity: number;
  batchesUsed: FIFOBatchUsed[];
}

export class InventoryService {
  private prisma = prisma;

  // =================================================================
  // CANONICAL FIFO VALUATION
  // =================================================================

  /**
   * Receive stock into a warehouse: creates a StockBatch cost lot and
   * increments Inventory.quantity/available. This is THE place stock
   * enters the system with a cost basis — GRN receiving, direct stock-in,
   * positive adjustments with a real cost, etc. should all call this
   * instead of upserting `inventory` directly, or FIFO depletion will
   * later fail to find any batches to deplete from.
   */
  static async receiveStock(
    tx: Prisma.TransactionClient,
    data: {
      productId: string;
      warehouseId: string;
      quantity: number;
      unitCost: number | Prisma.Decimal;
      grnItemId?: string;
      userId: string;
      reference?: string;
    },
  ): Promise<any> {
    const { productId, warehouseId, grnItemId, quantity, userId, reference } =
      data;

    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        "Batch quantity must be a positive integer",
      );
    }

    const unitCost =
      data.unitCost instanceof Prisma.Decimal
        ? data.unitCost
        : new Prisma.Decimal(data.unitCost);
    if (unitCost.lt(0)) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        "Unit cost cannot be negative",
      );
    }

    const [productExists, warehouseExists] = await Promise.all([
      tx.product.findUnique({ where: { id: productId }, select: { id: true } }),
      tx.warehouse.findUnique({
        where: { id: warehouseId },
        select: { id: true },
      }),
    ]);
    if (!productExists) throw notFoundError("Product", productId);
    if (!warehouseExists) throw notFoundError("Warehouse", warehouseId);

    const batch = await tx.stockBatch.create({
      data: {
        productId,
        warehouseId,
        grnItemId,
        initialQuantity: quantity,
        currentQuantity: quantity,
        unitCost,
        receivedAt: new Date(),
        isDepleted: false,
      },
    });

    await tx.inventory.upsert({
      where: { productId_warehouseId: { productId, warehouseId } },
      create: {
        productId,
        warehouseId,
        quantity,
        available: quantity,
        reserved: 0,
      },
      update: {
        quantity: { increment: quantity },
        available: { increment: quantity },
      },
    });

    await tx.stockMovement.create({
      data: {
        type: "INBOUND",
        quantity,
        productId,
        warehouseId,
        reference:
          reference || (grnItemId ? `GRN item ${grnItemId}` : "Stock receipt"),
        createdById: userId,
      },
    });

    await synchronizeBranchInventoryForWarehouse(tx, productId, warehouseId);

    return batch;
  }

  /**
   * Deplete stock using FIFO (oldest cost lot first). This is THE place
   * stock leaves the system for a sale or dispatch. In one atomic step it:
   *   1. Walks StockBatch rows oldest-first and consumes `quantity`, giving
   *      a precise COGS figure.
   *   2. Decrements Inventory.quantity/available on the *same* warehouse
   *      (previously several callers only did one of these two things,
   *      which is how POS stock counts and FIFO cost lots drifted apart).
   *   3. Writes a StockMovement audit row (when `userId` is supplied).
   *   4. Re-syncs the branch-level BranchInventory read model.
   *
   * @param userId - required to write a StockMovement audit row. Optional
   *   only for backward-compatible callers going through the deprecated
   *   `ValuationService` wrapper that predates this audit trail; new code
   *   should always pass it.
   */
  static async depleteStockFIFO(
    tx: Prisma.TransactionClient,
    data: {
      productId: string;
      warehouseId: string;
      quantity: number;
      userId?: string;
      reference?: string;
      salesId?: string;
    },
  ): Promise<FIFODepletionResult> {
    const {
      productId,
      warehouseId,
      quantity: requestedQty,
      userId,
      reference,
      salesId,
    } = data;

    if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        "Requested quantity must be a positive integer",
      );
    }

    const availableBatches = await tx.stockBatch.findMany({
      where: { productId, warehouseId, isDepleted: false },
      orderBy: { receivedAt: "asc" }, // FIFO: oldest first
      select: { id: true, currentQuantity: true, unitCost: true },
    });

    const totalAvailable = availableBatches.reduce(
      (sum, b) => sum + b.currentQuantity,
      0,
    );
    if (totalAvailable < requestedQty) {
      throw new AppError(
        ErrorCode.INVALID_OPERATION,
        422,
        `Insufficient stock: requested ${requestedQty}, available ${totalAvailable}`,
      );
    }

    let remainingQty = requestedQty;
    let totalCost = new Prisma.Decimal(0);
    const batchesUsed: FIFOBatchUsed[] = [];

    for (const batch of availableBatches) {
      if (remainingQty <= 0) break;

      const quantityToTake = Math.min(remainingQty, batch.currentQuantity);
      const batchCost = new Prisma.Decimal(quantityToTake).mul(batch.unitCost);

      batchesUsed.push({
        batchId: batch.id,
        quantityTaken: quantityToTake,
        unitCost: batch.unitCost as Prisma.Decimal,
        cost: batchCost,
      });
      totalCost = totalCost.add(batchCost);

      const newCurrentQuantity = batch.currentQuantity - quantityToTake;
      await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: newCurrentQuantity,
          isDepleted: newCurrentQuantity === 0,
        },
      });

      remainingQty -= quantityToTake;
    }

    const inventoryUpdate = await tx.inventory.updateMany({
      where: { productId, warehouseId, available: { gte: requestedQty } },
      data: {
        quantity: { decrement: requestedQty },
        available: { decrement: requestedQty },
      },
    });

    if (inventoryUpdate.count !== 1) {
      // StockBatch said cost lots were available but the Inventory ledger
      // disagreed (e.g. stock reserved elsewhere) — fail loudly rather
      // than leave batches depleted with no matching ledger movement.
      throw new AppError(
        ErrorCode.INSUFFICIENT_INVENTORY,
        400,
        `Inventory ledger for product ${productId} in warehouse ${warehouseId} could not absorb a decrement of ${requestedQty} (may be reserved or out of sync with stock batches).`,
      );
    }

    if (userId) {
      await tx.stockMovement.create({
        data: {
          type: "OUTBOUND",
          quantity: requestedQty,
          productId,
          warehouseId,
          salesId,
          reference: reference || "Stock depletion (FIFO)",
          createdById: userId,
        },
      });
    } else {
      logger.warn(
        { productId, warehouseId, requestedQty },
        "depleteStockFIFO called without userId — skipping StockMovement audit row",
      );
    }

    await synchronizeBranchInventoryForWarehouse(tx, productId, warehouseId);

    return { totalCost, totalQuantity: requestedQty, batchesUsed };
  }

  /**
   * COGS report for a period, grouped by product. Ported unchanged from
   * the old FifoCOGSService — already pure Prisma (groupBy), no raw SQL.
   */
  static async getCOGSReport(
    startDate: Date,
    endDate: Date,
    _branchId?: string,
  ) {
    const where: Prisma.DispatchItemWhereInput = {
      createdAt: { gte: startDate, lte: endDate },
      totalCogs: { gt: new Prisma.Decimal(0) },
    };

    const report = await prisma.dispatchItem.groupBy({
      by: ["productId"],
      where,
      _sum: { qtyDispatched: true, totalCogs: true },
      _count: true,
    });

    const productIds = report.map((r) => r.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, sku: true, name: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    return report.map((r) => ({
      product: productMap.get(r.productId),
      quantityDispatched: r._sum.qtyDispatched,
      totalCOGS: r._sum.totalCogs,
      transactionCount: r._count,
      averageUnitCost:
        r._sum.qtyDispatched && r._sum.qtyDispatched > 0
          ? (r._sum.totalCogs as Prisma.Decimal)
              .div(new Prisma.Decimal(r._sum.qtyDispatched))
              .toNumber()
          : 0,
    }));
  }

  // =================================================================
  // Inventory Queries & Adjustments
  // (previously referenced by InventoryController but not implemented —
  //  those routes were throwing at runtime)
  // =================================================================

  /**
   * List warehouse-level inventory with filtering, sorting and pagination.
   */
  async getInventory(
    query: GetInventoryQueryDTO,
  ): Promise<InventoryListResponseDTO> {
    const {
      status,
      warehouseId,
      productId,
      productSku,
      search,
      lowStockOnly,
      sortBy,
      sortOrder = "asc",
    } = query;

    const page = Math.max(1, Number(query.page) || 1);
    const take = Math.min(Math.max(1, Number(query.limit) || 20), 100);
    const skip = (page - 1) * take;

    const where: any = {};
    if (status) where.status = status;
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (productSku)
      where.product = { sku: { contains: productSku, mode: "insensitive" } };
    if (search) {
      where.product = {
        ...where.product,
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    const [rows, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: {
            select: { id: true, name: true, code: true, branchId: true },
          },
        },
        orderBy: this.buildInventoryOrderBy(sortBy, sortOrder),
        skip,
        take,
      }),
      this.prisma.inventory.count({ where }),
    ]);

    // Reorder level / reorder quantity live on BranchInventory (branch-level
    // settings), not on Inventory (warehouse-level physical stock) — join
    // them in-memory rather than guessing a default per row.
    const branchIds = [...new Set(rows.map((r) => r.warehouse.branchId))];
    const productIds = [...new Set(rows.map((r) => r.productId))];
    const branchInventories = branchIds.length
      ? await this.prisma.branchInventory.findMany({
          where: { branchId: { in: branchIds }, productId: { in: productIds } },
          select: {
            productId: true,
            branchId: true,
            reorder_level: true,
            last_counted: true,
          },
        })
      : [];
    const reorderMap = new Map(
      branchInventories.map((bi) => [`${bi.productId}:${bi.branchId}`, bi]),
    );

    let data: InventoryItemDTO[] = rows.map((r) => {
      const bi = reorderMap.get(`${r.productId}:${r.warehouse.branchId}`);
      return {
        id: r.id,
        productId: r.productId,
        productSku: r.product.sku,
        productName: r.product.name,
        warehouseId: r.warehouseId,
        warehouseCode: r.warehouse.code,
        warehouseName: r.warehouse.name,
        quantity: r.quantity,
        reserved: r.reserved,
        available: r.available,
        status: r.status,
        reorderLevel: bi?.reorder_level ?? 10,
        lastCounted: (bi?.last_counted ?? r.last_counted)?.toISOString(),
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });

    if (lowStockOnly) {
      data = data.filter((d) => d.quantity < d.reorderLevel);
    }

    return {
      data,
      pagination: {
        page,
        limit: take,
        total,
        totalPages: Math.ceil(total / take) || 1,
      },
    };
  }

  private buildInventoryOrderBy(
    sortBy: GetInventoryQueryDTO["sortBy"],
    sortOrder: "asc" | "desc",
  ): any {
    switch (sortBy) {
      case "quantity":
        return { quantity: sortOrder };
      case "available":
        return { available: sortOrder };
      case "reserved":
        return { reserved: sortOrder };
      case "status":
        return { status: sortOrder };
      case "createdAt":
        return { createdAt: sortOrder };
      case "warehouse_name":
        return { warehouse: { name: sortOrder } };
      case "product_name":
      default:
        return { product: { name: sortOrder } };
    }
  }

  /**
   * Adjust warehouse stock up or down for reasons like damage, theft,
   * count variance, returns, or manual receipt outside the PO flow.
   *
   * NOTE: this adjusts the Inventory ledger and writes a StockMovement,
   * but — unlike `receiveStock`/`depleteStockFIFO` — it does not touch
   * StockBatch/FIFO cost lots. For adjustments that should carry a real
   * cost basis (e.g. "receipt" outside a PO), prefer calling
   * `InventoryService.receiveStock` directly so FIFO valuation stays
   * accurate; this method is for the plain quantity ledger only.
   */
  async adjustInventory(
    dto: AdjustInventoryDTO,
    userId: string,
  ): Promise<AdjustmentResponseDTO> {
    const {
      productId,
      warehouseId,
      adjustmentType,
      quantity,
      reason,
      reference,
      notes,
    } = dto;
    const signedQty = adjustmentType === "increase" ? quantity : -quantity;

    return this.prisma.$transaction(async (tx) => {
      const [product, warehouse] = await Promise.all([
        tx.product.findUnique({
          where: { id: productId },
          select: { id: true },
        }),
        tx.warehouse.findUnique({
          where: { id: warehouseId },
          select: { id: true },
        }),
      ]);
      if (!product) throw notFoundError("Product", productId);
      if (!warehouse) throw notFoundError("Warehouse", warehouseId);

      const before = await tx.inventory.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } },
      });
      const beforeQuantity = before?.quantity ?? 0;
      const beforeReserved = before?.reserved ?? 0;

      if (adjustmentType === "decrease") {
        const currentAvailable = before?.available ?? 0;
        if (currentAvailable < quantity) {
          throw new AppError(
            ErrorCode.INSUFFICIENT_INVENTORY,
            400,
            `Cannot decrease by ${quantity}. Only ${currentAvailable} available in this warehouse.`,
          );
        }
      }

      const after = await tx.inventory.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        create: {
          productId,
          warehouseId,
          quantity: Math.max(0, signedQty),
          available: Math.max(0, signedQty),
          reserved: 0,
        },
        update: {
          quantity: { increment: signedQty },
          available: { increment: signedQty },
        },
      });

      await tx.stockMovement.create({
        data: {
          type: "ADJUSTMENT",
          quantity: Math.abs(quantity),
          productId,
          warehouseId,
          reference: reference || `${reason}${notes ? `: ${notes}` : ""}`,
          createdById: userId,
        },
      });

      await synchronizeBranchInventoryForWarehouse(tx, productId, warehouseId);

      return {
        productId,
        warehouseId,
        adjustmentType,
        quantity,
        reason,
        reference,
        notes,
        beforeQuantity,
        afterQuantity: after.quantity,
        beforeReserved,
        afterReserved: after.reserved,
        timestamp: new Date().toISOString(),
      };
    });
  }

  /**
   * Immediate warehouse-to-warehouse transfer (no approval workflow).
   * For the multi-stage request → approve → dispatch → receive workflow
   * (with reservation at approval time), use requestTransfer/
   * approveTransfer/dispatchTransfer/receiveTransfer below instead.
   */
  async transferInventory(
    dto: TransferInventoryDTO,
    userId: string,
  ): Promise<TransferResponseDTO> {
    const {
      productId,
      fromWarehouseId,
      toWarehouseId,
      quantity,
      reason,
      reference,
    } = dto;

    if (fromWarehouseId === toWarehouseId) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Source and destination warehouses must be different",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const [sourceWarehouse, destWarehouse] = await Promise.all([
        tx.warehouse.findUnique({ where: { id: fromWarehouseId } }),
        tx.warehouse.findUnique({ where: { id: toWarehouseId } }),
      ]);
      if (!sourceWarehouse) throw notFoundError("Warehouse", fromWarehouseId);
      if (!destWarehouse) throw notFoundError("Warehouse", toWarehouseId);

      const sourceBefore = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId: fromWarehouseId },
        },
      });
      if (!sourceBefore || sourceBefore.available < quantity) {
        throw new AppError(
          ErrorCode.INSUFFICIENT_INVENTORY,
          400,
          `Insufficient available stock in source warehouse. Available: ${sourceBefore?.available ?? 0}, requested: ${quantity}`,
        );
      }
      const destBefore = await tx.inventory.findUnique({
        where: {
          productId_warehouseId: { productId, warehouseId: toWarehouseId },
        },
      });

      const sourceAfter = await tx.inventory.update({
        where: {
          productId_warehouseId: { productId, warehouseId: fromWarehouseId },
        },
        data: {
          quantity: { decrement: quantity },
          available: { decrement: quantity },
        },
      });

      const destAfter = await tx.inventory.upsert({
        where: {
          productId_warehouseId: { productId, warehouseId: toWarehouseId },
        },
        create: {
          productId,
          warehouseId: toWarehouseId,
          quantity,
          available: quantity,
          reserved: 0,
        },
        update: {
          quantity: { increment: quantity },
          available: { increment: quantity },
        },
      });

      await tx.stockMovement.create({
        data: {
          type: "TRANSFER_OUT",
          quantity,
          productId,
          warehouseId: fromWarehouseId,
          reference:
            reference ||
            `Direct transfer to ${destWarehouse.name}${reason ? ` (${reason})` : ""}`,
          createdById: userId,
        },
      });
      await tx.stockMovement.create({
        data: {
          type: "TRANSFER_IN",
          quantity,
          productId,
          warehouseId: toWarehouseId,
          reference:
            reference ||
            `Direct transfer from ${sourceWarehouse.name}${reason ? ` (${reason})` : ""}`,
          createdById: userId,
        },
      });

      await synchronizeBranchInventoryForWarehouse(
        tx,
        productId,
        fromWarehouseId,
      );
      await synchronizeBranchInventoryForWarehouse(
        tx,
        productId,
        toWarehouseId,
      );

      return {
        productId,
        fromWarehouseId,
        toWarehouseId,
        quantity,
        reason,
        reference,
        notes: dto.notes,
        fromWarehouseBefore: {
          quantity: sourceBefore.quantity,
          available: sourceBefore.available,
        },
        fromWarehouseAfter: {
          quantity: sourceAfter.quantity,
          available: sourceAfter.available,
        },
        toWarehouseBefore: {
          quantity: destBefore?.quantity ?? 0,
          available: destBefore?.available ?? 0,
        },
        toWarehouseAfter: {
          quantity: destAfter.quantity,
          available: destAfter.available,
        },
        timestamp: new Date().toISOString(),
      };
    });
  }

  // =================================================================
  // Multi-stage Stock Transfer workflow (request -> approve -> dispatch -> receive)
  // =================================================================

  async listTransfers(args: {
    status?: string;
    warehouseId?: string;
  }): Promise<any> {
    const { status, warehouseId } = args;
    const where: any = {};
    if (status) {
      where.status = status;
    }
    if (warehouseId) {
      where.OR = [
        { sourceWarehouseId: warehouseId },
        { destinationWarehouseId: warehouseId },
      ];
    }
    return this.prisma.stockTransfer.findMany({
      where,
      include: {
        sourceWarehouse: true,
        destinationWarehouse: true,
        items: { include: { product: true } },
        createdBy: true,
        receivedBy: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async requestTransfer(userId: string, dto: RequestTransferDTO): Promise<any> {
    if (dto.sourceWarehouseId === dto.destinationWarehouseId) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Source and destination warehouses must be different",
      );
    }

    if (dto.items.some((item) => item.requested_qty <= 0)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Requested quantity must be greater than zero",
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const documentId = await SequenceService.getNextNumber("TRANSFER", "HQ"); // Assuming a default branch for transfers

      const transfer = await tx.stockTransfer.create({
        data: {
          documentId,
          sourceWarehouseId: dto.sourceWarehouseId,
          destinationWarehouseId: dto.destinationWarehouseId,
          status: "PENDING_APPROVAL",
          notes: dto.notes,
          createdById: userId,
          items: {
            create: dto.items.map((item) => ({
              productId: item.productId,
              requested_qty: item.requested_qty,
            })),
          },
        },
        include: { items: true },
      });

      logger.info(
        { transferId: transfer.id, documentId },
        "Stock transfer request created",
      );
      return transfer;
    });
  }

  async approveTransfer(
    userId: string,
    transferId: string,
    dto: ApproveTransferDTO,
  ): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw notFoundError("Stock transfer");
      if (transfer.status !== "PENDING_APPROVAL") {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          "Transfer must be in PENDING_APPROVAL status to approve",
        );
      }

      for (const item of transfer.items) {
        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
          },
        });

        if (!inventory || inventory.available < item.requested_qty) {
          throw new AppError(
            ErrorCode.INSUFFICIENT_INVENTORY,
            400,
            `Insufficient available stock for product ${item.productId}`,
          );
        }

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            available: { decrement: item.requested_qty },
            reserved: { increment: item.requested_qty },
          },
        });

        await tx.stockMovement.create({
          data: {
            type: "TRANSFER_OUT",
            quantity: item.requested_qty,
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            transferId: transfer.id,
            createdById: userId,
            reference: `Approval reserve for Transfer ${transfer.documentId}`,
          },
        });
      }

      await synchronizeBranchInventoryForWarehouse(
        tx,
        transfer.items[0]?.productId ?? "",
        transfer.sourceWarehouseId,
      );

      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transferId },
        data: { status: "APPROVED", notes: dto.notes },
      });

      logger.info(
        { transferId: updatedTransfer.id },
        "Stock transfer approved and stock reserved",
      );
      return updatedTransfer;
    });
  }

  /**
   * NOTE ON COSTING: this dispatch step currently prices dispatched units
   * at flat `product.cost_price` (a master-data reference price) rather
   * than depleting real FIFO cost lots the way POS/SO-dispatch now do via
   * `InventoryService.depleteStockFIFO`. Carrying true FIFO cost across a
   * warehouse transfer means relieving batches at the source AND creating
   * a new batch at the destination once goods are received — a bigger
   * design change than this pass covers, so it's called out here rather
   * than silently left inconsistent. Flagging for a follow-up pass.
   */
  async dispatchTransfer(
    userId: string,
    transferId: string,
    dto: DispatchTransferDTO,
  ): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw notFoundError("Stock transfer");
      if (transfer.status !== "APPROVED") {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          "Transfer must be in APPROVED status to dispatch",
        );
      }

      for (const item of dto.items) {
        const originalItem = transfer.items.find(
          (i) => i.productId === item.productId,
        );
        if (!originalItem) continue;

        const inventory = await tx.inventory.findFirst({
          where: {
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
          },
        });

        if (!inventory || inventory.reserved < item.dispatched_qty) {
          throw new AppError(
            ErrorCode.INSUFFICIENT_INVENTORY,
            400,
            `Insufficient reserved stock for product ${item.productId}`,
          );
        }

        // TODO(follow-up): see method-level note — replace with FIFO batch cost.
        const unitCost =
          (await tx.product.findUnique({ where: { id: item.productId } }))
            ?.cost_price || 0;

        await tx.inventory.update({
          where: { id: inventory.id },
          data: {
            quantity: { decrement: item.dispatched_qty },
            reserved: { decrement: item.dispatched_qty },
          },
        });

        await tx.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: transfer.destinationWarehouseId,
            },
          },
          create: {
            productId: item.productId,
            warehouseId: transfer.destinationWarehouseId,
            quantity: 0,
            available: 0,
            reserved: item.dispatched_qty,
          },
          update: {
            reserved: { increment: item.dispatched_qty },
          },
        });

        await tx.transferItem.update({
          where: { id: originalItem.id },
          data: { dispatched_qty: item.dispatched_qty, unitCost },
        });

        await tx.stockMovement.create({
          data: {
            type: "TRANSFER_OUT",
            quantity: item.dispatched_qty,
            productId: item.productId,
            warehouseId: transfer.sourceWarehouseId,
            transferId: transfer.id,
            createdById: userId,
            reference: `Dispatch for Transfer ${transfer.documentId}`,
          },
        });

        await synchronizeBranchInventoryForWarehouse(
          tx,
          item.productId,
          transfer.sourceWarehouseId,
        );
        await synchronizeBranchInventoryForWarehouse(
          tx,
          item.productId,
          transfer.destinationWarehouseId,
        );
      }

      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: "DISPATCHED",
          driverId: dto.driverId,
          truckId: dto.truckId,
          dispatchedAt: new Date(),
        },
      });

      logger.info(
        { transferId: updatedTransfer.id },
        "Stock transfer dispatched",
      );
      return updatedTransfer;
    });
  }

  async receiveTransfer(
    userId: string,
    transferId: string,
    dto: ReceiveTransferDTO,
  ): Promise<any> {
    return await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw notFoundError("Stock transfer");
      if (transfer.status !== "DISPATCHED") {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          "Transfer must be in DISPATCHED status to receive",
        );
      }

      let isPartial = false;
      let hasDiscrepancy = false;

      for (const item of dto.items) {
        const originalItem = transfer.items.find(
          (i) => i.productId === item.productId,
        );
        if (!originalItem || originalItem.dispatched_qty === null) continue;

        const variance =
          originalItem.dispatched_qty - (item.received_qty + item.damaged_qty);
        if (variance !== 0) hasDiscrepancy = true;
        if (item.received_qty < originalItem.dispatched_qty) isPartial = true;

        await tx.inventory.upsert({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: transfer.destinationWarehouseId,
            },
          },
          update: {
            quantity: { increment: item.received_qty },
            available: { increment: item.received_qty },
          },
          create: {
            productId: item.productId,
            warehouseId: transfer.destinationWarehouseId,
            quantity: item.received_qty,
            available: item.received_qty,
            reserved: 0,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: "TRANSFER_IN",
            quantity: item.received_qty,
            productId: item.productId,
            warehouseId: transfer.destinationWarehouseId,
            transferId: transfer.id,
            createdById: userId,
            reference: `Receipt for Transfer ${transfer.documentId}`,
          },
        });

        if (item.damaged_qty > 0) {
          logger.warn(
            {
              transferId,
              productId: item.productId,
              quantity: item.damaged_qty,
            },
            "Damaged stock received",
          );
        }
        if (variance > 0) {
          logger.warn(
            { transferId, productId: item.productId, quantity: variance },
            "Stock variance (loss) detected",
          );
        }

        await synchronizeBranchInventoryForWarehouse(
          tx,
          item.productId,
          transfer.destinationWarehouseId,
        );
        await synchronizeBranchInventoryForWarehouse(
          tx,
          item.productId,
          transfer.sourceWarehouseId,
        );
      }

      const finalStatus = hasDiscrepancy
        ? "DISCREPANCY"
        : isPartial
          ? "PARTIALLY_RECEIVED"
          : "RECEIVED";

      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: finalStatus,
          receivedAt: new Date(),
          receivedById: userId,
          notes: dto.notes,
        },
      });

      logger.info(
        { transferId: updatedTransfer.id, status: finalStatus },
        "Stock transfer received",
      );
      return updatedTransfer;
    });
  }
}

export default InventoryService;
