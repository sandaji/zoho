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
import { getRequestContext } from "../../../lib/async-context";
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
  StartPickingDTO,
  CompletePickingDTO,
  VerifyTransferDTO,
  DispatchTransferDTO,
  ReceiveTransferDTO,
  RaiseTransferIssueDTO,
  ResolveTransferIssueDTO,
} from "../dto";
import { SequenceService } from "../../sequences/sequence.service";
import notificationService from "../../notifications/notification.service";

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

  static async logTransferAudit(
    tx: Prisma.TransactionClient,
    transferId: string,
    action: "CREATE" | "UPDATE" | "DELETE",
    userId: string | null | undefined,
    changes: Record<string, any>,
  ) {
    try {
      await tx.auditLog.create({
        data: {
          entityType: "StockTransfer",
          entityId: transferId,
          action,
          userId: userId || null,
          changes,
        },
      });
    } catch (err) {
      logger.error({ err, transferId, action }, "Failed to write transfer audit log entry");
    }
  }

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
      userId?: string;
      reference?: string;
    },
  ): Promise<any> {
    const { productId, warehouseId, grnItemId, quantity, reference } = data;
    // Fall back to the request-scoped userId (set by auth middleware) so
    // callers that can't easily thread a userId through still get a real
    // audit trail instead of a fabricated/foreign-key-violating value.
    const userId = data.userId || getRequestContext().userId;

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

    if (userId) {
      await tx.stockMovement.create({
        data: {
          type: "INBOUND",
          quantity,
          productId,
          warehouseId,
          reference:
            reference ||
            (grnItemId ? `GRN item ${grnItemId}` : "Stock receipt"),
          createdById: userId,
        },
      });
    } else {
      logger.warn(
        { productId, warehouseId, quantity },
        "receiveStock called without a resolvable userId — skipping StockMovement audit row",
      );
    }

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
  /**
   * Core FIFO batch-relief logic, shared by depleteStockFIFO (sales/SO
   * dispatch — which also moves the Inventory ledger) and dispatchTransfer
   * (warehouse transfers — which moves `reserved`→`quantity` instead of
   * `available`→`quantity`, so it needs the batch relief without
   * depleteStockFIFO's own Inventory update).
   */
  private static async depleteBatchesOnly(
    tx: Prisma.TransactionClient,
    productId: string,
    warehouseId: string,
    requestedQty: number,
  ): Promise<{ totalCost: Prisma.Decimal; batchesUsed: FIFOBatchUsed[] }> {
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

    return { totalCost, batchesUsed };
  }

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
      reference,
      salesId,
    } = data;
    const userId = data.userId || getRequestContext().userId;

    if (!Number.isInteger(requestedQty) || requestedQty <= 0) {
      throw new AppError(
        ErrorCode.INVALID_INPUT,
        400,
        "Requested quantity must be a positive integer",
      );
    }

    const { totalCost, batchesUsed } = await InventoryService.depleteBatchesOnly(
      tx,
      productId,
      warehouseId,
      requestedQty,
    );

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
    }, { timeout: 15000 });
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
    }, { timeout: 15000 });
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
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        pickedBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true, email: true } },
        driver: { select: { id: true, name: true, phone: true } },
        truck: true,
        receivedBy: { select: { id: true, name: true, email: true } },
        issues: {
          include: {
            raisedBy: { select: { id: true, name: true, email: true } },
            resolvedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get a single transfer with full line-item detail. Previously referenced
   * by InventoryController's GET /inventory/transfers/:id route but never
   * implemented — that route was throwing at runtime.
   */
  async getTransferById(id: string): Promise<any> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        sourceWarehouse: { include: { branch: { select: { id: true, name: true, code: true } } } },
        destinationWarehouse: { include: { branch: { select: { id: true, name: true, code: true } } } },
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
        pickedBy: { select: { id: true, name: true, email: true } },
        verifiedBy: { select: { id: true, name: true, email: true } },
        driver: { select: { id: true, name: true, phone: true } },
        truck: true,
        receivedBy: { select: { id: true, name: true, email: true } },
        issues: {
          include: {
            raisedBy: { select: { id: true, name: true, email: true } },
            resolvedBy: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!transfer) throw notFoundError("Stock transfer", id);

    return transfer;
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
      // Resolve the real branch behind the source warehouse — previously this
      // passed the literal placeholder string "HQ" as branchId, which isn't
      // a real Branch.id, so document_sequences (FK-linked to branches)
      // failed with a foreign key violation on every transfer request.
      const sourceWarehouseForSeq = await tx.warehouse.findUnique({
        where: { id: dto.sourceWarehouseId },
        select: { branchId: true },
      });
      if (!sourceWarehouseForSeq) {
        throw notFoundError("Warehouse", dto.sourceWarehouseId);
      }

      const documentId = await SequenceService.getNextNumber(
        "TRANSFER",
        sourceWarehouseForSeq.branchId,
      );

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

      await InventoryService.logTransferAudit(tx, transfer.id, "CREATE", userId, {
        event: "TRANSFER_REQUESTED",
        documentId: transfer.documentId,
        sourceWarehouseId: dto.sourceWarehouseId,
        destinationWarehouseId: dto.destinationWarehouseId,
        itemCount: dto.items.length,
        notes: dto.notes,
      });

      notificationService.notifyRoleOrPermission({
        roleCode: "branch_manager",
        title: "New Transfer Request",
        message: `Stock Transfer ${documentId} requested and requires approval.`,
        type: "TRANSFER_APPROVAL_REQUIRED",
        link: "/dashboard/warehouse/transfers",
      }).catch(() => {});

      return transfer;
    }, { timeout: 15000 });
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

      // Re-sync BranchInventory for every product on the transfer —
      // previously this only synced transfer.items[0], leaving every other
      // product's branch-level reserved/available figures stale after
      // approving a multi-item transfer.
      for (const productId of new Set(transfer.items.map((i) => i.productId))) {
        await synchronizeBranchInventoryForWarehouse(
          tx,
          productId,
          transfer.sourceWarehouseId,
        );
      }

      const updatedTransfer = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          status: "APPROVED",
          notes: dto.notes,
          approvedById: userId,
          approvedAt: new Date(),
        },
      });

      logger.info(
        { transferId: updatedTransfer.id },
        "Stock transfer approved and stock reserved",
      );

      await InventoryService.logTransferAudit(tx, transferId, "UPDATE", userId, {
        event: "TRANSFER_APPROVED",
        previousStatus: transfer.status,
        newStatus: "APPROVED",
        notes: dto.notes,
      });

      // Soft segregation-of-duties check: the same person requesting and
      // approving a transfer isn't blocked (some teams are too small for
      // strict separation), but it's surfaced as a warning so whoever's
      // looking at the response/UI knows to double-check.
      const warning =
        transfer.createdById === userId
          ? "This transfer was approved by the same person who requested it."
          : undefined;

      return { ...updatedTransfer, warning };
    }, { timeout: 15000 });
  }

  /**
   * Stage: Start Picking (APPROVED -> PICKING). Claims the pick task.
   */
  async startPicking(
    userId: string,
    transferId: string,
    dto: StartPickingDTO,
  ): Promise<any> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) throw notFoundError("Stock transfer", transferId);
    if (transfer.status !== "APPROVED") {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        "Transfer must be in APPROVED status to start picking",
      );
    }

    const updated = await this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: "PICKING",
        pickedById: userId,
        pickedAt: new Date(),
        notes: dto.notes ?? transfer.notes,
      },
    });

    logger.info({ transferId: updated.id, userId }, "Stock transfer picking started");

    await this.prisma.auditLog.create({
      data: {
        entityType: "StockTransfer",
        entityId: transferId,
        action: "UPDATE",
        userId,
        changes: {
          event: "PICKING_STARTED",
          previousStatus: transfer.status,
          newStatus: "PICKING",
          notes: dto.notes,
        },
      },
    }).catch(() => {});

    return updated;
  }

  /**
   * Stage: Complete Picking (stays in PICKING, sets pickingCompletedAt).
   * Does not move stock — picking is a staging/labor step; nothing
   * physically leaves the warehouse until dispatch. Records picked_qty per
   * item purely as a data point for the verifier to check against
   * requested_qty.
   */
  async completePicking(
    userId: string,
    transferId: string,
    dto: CompletePickingDTO,
  ): Promise<any> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) throw notFoundError("Stock transfer", transferId);
    if (transfer.status !== "PICKING") {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        "Transfer must be in PICKING status to record picked quantities",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      for (const item of dto.items) {
        const originalItem = transfer.items.find((i) => i.productId === item.productId);
        if (!originalItem) continue;
        if (item.picked_qty < 0 || item.picked_qty > originalItem.requested_qty) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            400,
            `picked_qty for product ${item.productId} must be between 0 and the requested quantity (${originalItem.requested_qty})`,
          );
        }
        await tx.transferItem.update({
          where: { id: originalItem.id },
          data: { picked_qty: item.picked_qty },
        });
      }

      const updated = await tx.stockTransfer.update({
        where: { id: transferId },
        data: {
          pickingCompletedAt: new Date(),
          notes: dto.notes ?? transfer.notes,
        },
      });

      logger.info({ transferId: updated.id, userId }, "Stock transfer picking completed, awaiting verification");

      await InventoryService.logTransferAudit(tx, transferId, "UPDATE", userId, {
        event: "PICKING_COMPLETED",
        previousStatus: transfer.status,
        newStatus: "PICKING",
        pickingCompletedAt: updated.pickingCompletedAt,
        pickedItems: dto.items,
        notes: dto.notes,
      });

      return updated;
    }, { timeout: 15000 });
  }

  /**
   * Stage: Verify (PICKING -> VERIFIED). Requires pickingCompletedAt to
   * already be set. Deliberately gated on a different permission from
   * picking (inventory.transfer.verify vs .pick) so the same person
   * doesn't have to fill both roles — that's enforced by RBAC, not here,
   * but this method still requires the picking step to have actually run.
   */
  async verifyTransfer(
    userId: string,
    transferId: string,
    dto: VerifyTransferDTO,
  ): Promise<any> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) throw notFoundError("Stock transfer", transferId);
    if (transfer.status !== "PICKING") {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        "Transfer must be in PICKING status to verify",
      );
    }
    if (!transfer.pickingCompletedAt) {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        "Picking must be completed (picked quantities recorded) before this transfer can be verified",
      );
    }

    const updated = await this.prisma.stockTransfer.update({
      where: { id: transferId },
      data: {
        status: "VERIFIED",
        verifiedById: userId,
        verifiedAt: new Date(),
        notes: dto.notes ?? transfer.notes,
      },
    });

    logger.info({ transferId: updated.id, userId }, "Stock transfer verified");

    await this.prisma.auditLog.create({
      data: {
        entityType: "StockTransfer",
        entityId: transferId,
        action: "UPDATE",
        userId,
        changes: {
          event: "PICKING_VERIFIED",
          previousStatus: transfer.status,
          newStatus: "VERIFIED",
          verifiedAt: updated.verifiedAt,
          notes: dto.notes,
        },
      },
    }).catch(() => {});

    // Same soft segregation-of-duties check as approveTransfer, but for
    // picker vs. verifier — allowed, but flagged.
    const warning =
      transfer.pickedById === userId
        ? "This transfer was verified by the same person who picked it."
        : undefined;

    return { ...updated, warning };
  }

  /**
   * Dispatches reserved stock from the source warehouse. Prices the
   * dispatched units at the real weighted FIFO cost (via
   * depleteBatchesOnly) rather than the flat product.cost_price reference
   * price this used to fall back to, and stores that cost on the
   * TransferItem so receiveTransfer can create a destination StockBatch
   * carrying the correct cost basis.
   *
   * Also records dispatch mode (RIDER or TRUCK), the driver, and a vehicle
   * registration — required so every transfer has an accountable trail of
   * who moved it and how.
   */
  async dispatchTransfer(
    userId: string,
    transferId: string,
    dto: DispatchTransferDTO,
  ): Promise<any> {
    if (!dto.dispatchMode || !["RIDER", "TRUCK"].includes(dto.dispatchMode)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "dispatchMode must be 'RIDER' or 'TRUCK'",
      );
    }
    if (!dto.driverId) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "driverId is required to dispatch a transfer",
      );
    }
    if (dto.dispatchMode === "RIDER" && !dto.truckId && !dto.vehicleRegistration) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "vehicleRegistration is required for rider dispatch (e.g. a motorbike plate number)",
      );
    }
    if (dto.dispatchMode === "TRUCK" && !dto.truckId && !dto.vehicleRegistration) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "Either truckId (fleet-tracked truck) or vehicleRegistration is required for truck dispatch",
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const transfer = await tx.stockTransfer.findUnique({
        where: { id: transferId },
        include: { items: true },
      });

      if (!transfer) throw notFoundError("Stock transfer");
      if (transfer.status !== "VERIFIED") {
        throw new AppError(
          ErrorCode.INVALID_STATUS,
          400,
          "Transfer must be in VERIFIED status to dispatch",
        );
      }

      const driver = await tx.user.findUnique({
        where: { id: dto.driverId },
        select: { id: true },
      });
      if (!driver) throw notFoundError("User (driver)", dto.driverId);

      // Resolve the vehicle registration to store: prefer an explicit value,
      // otherwise fall back to the linked Truck's registration so every
      // dispatch has a human-readable plate/reg number even when only
      // truckId was supplied.
      let vehicleRegistration = dto.vehicleRegistration;
      if (dto.truckId) {
        const truck = await tx.truck.findUnique({
          where: { id: dto.truckId },
          select: { id: true, registration: true, isActive: true },
        });
        if (!truck) throw notFoundError("Truck", dto.truckId);
        if (!truck.isActive) {
          throw new AppError(
            ErrorCode.VALIDATION_ERROR,
            400,
            "Selected truck is not active",
          );
        }
        vehicleRegistration = vehicleRegistration || truck.registration;
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

        // Relieve real FIFO cost lots at the source to get the true
        // weighted unit cost for what's being dispatched — replaces the
        // flat product.cost_price reference price this used to fall back
        // to. This does NOT touch the Inventory ledger (unlike
        // depleteStockFIFO) because dispatch here moves `reserved`→physical
        // exit, not `available`→physical exit; the ledger update below
        // handles that explicitly.
        const { totalCost } = await InventoryService.depleteBatchesOnly(
          tx,
          item.productId,
          transfer.sourceWarehouseId,
          item.dispatched_qty,
        );
        const unitCost =
          item.dispatched_qty > 0
            ? totalCost.div(item.dispatched_qty)
            : new Prisma.Decimal(0);

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
          dispatchMode: dto.dispatchMode,
          vehicleRegistration,
          dispatchedAt: new Date(),
        },
      });

      logger.info(
        { transferId: updatedTransfer.id },
        "Stock transfer dispatched",
      );

      await InventoryService.logTransferAudit(tx, transferId, "UPDATE", userId, {
        event: "TRANSFER_DISPATCHED",
        previousStatus: transfer.status,
        newStatus: "DISPATCHED",
        dispatchedAt: updatedTransfer.dispatchedAt,
        dispatchMode: dto.dispatchMode,
        driverId: dto.driverId,
        truckId: dto.truckId,
        vehicleRegistration,
        dispatchedItems: dto.items,
      });

      notificationService.notifyRoleOrPermission({
        title: "Stock Transfer Dispatched",
        message: `Stock Transfer ${updatedTransfer.documentId} has been dispatched via ${dto.dispatchMode}.`,
        type: "TRANSFER_DISPATCHED",
        link: "/dashboard/warehouse/transfers",
      }).catch(() => {});

      return updatedTransfer;
    }, { timeout: 20000 });
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

        // Release the in-transit `reserved` hold that dispatchTransfer put
        // on the destination warehouse (previously this was never released
        // — every completed transfer left `reserved` permanently inflated
        // at the destination by the dispatched quantity).
        await tx.inventory.update({
          where: {
            productId_warehouseId: {
              productId: item.productId,
              warehouseId: transfer.destinationWarehouseId,
            },
          },
          data: { reserved: { decrement: originalItem.dispatched_qty } },
        });

        if (item.received_qty > 0) {
          // Create a real StockBatch at the destination carrying the FIFO
          // cost captured at dispatch time (previously this was a raw
          // Inventory upsert with no cost basis at all).
          await InventoryService.receiveStock(tx, {
            productId: item.productId,
            warehouseId: transfer.destinationWarehouseId,
            quantity: item.received_qty,
            unitCost: originalItem.unitCost ?? 0,
            userId,
            reference: `Receipt for Transfer ${transfer.documentId}`,
          });
        }

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
      }

      if (hasDiscrepancy) {
        for (const item of dto.items) {
          const originalItem = transfer.items.find(
            (i) => i.productId === item.productId,
          );
          if (!originalItem || originalItem.dispatched_qty === null) continue;

          const variance =
            originalItem.dispatched_qty - (item.received_qty + item.damaged_qty);

          if (item.damaged_qty > 0) {
            await tx.transferIssue.create({
              data: {
                transferId,
                category: "damage",
                description: `Received ${item.damaged_qty} damaged unit(s) for product ${item.productId}.`,
                status: "OPEN",
                raisedById: userId,
              },
            });
          }
          if (variance > 0) {
            await tx.transferIssue.create({
              data: {
                transferId,
                category: "quantity_variance",
                description: `Quantity variance: expected ${originalItem.dispatched_qty}, received ${item.received_qty} (${variance} unit(s) missing).`,
                status: "OPEN",
                raisedById: userId,
              },
            });
          }
        }
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

      await InventoryService.logTransferAudit(tx, transferId, "UPDATE", userId, {
        event: "TRANSFER_RECEIVED",
        previousStatus: transfer.status,
        newStatus: finalStatus,
        receivedAt: updatedTransfer.receivedAt,
        hasDiscrepancy,
        receivedItems: dto.items,
        notes: dto.notes,
      });

      if (hasDiscrepancy) {
        notificationService.notifyRoleOrPermission({
          roleCode: "branch_manager",
          title: "Transfer Discrepancy Flagged",
          message: `Stock Transfer ${updatedTransfer.documentId} was received with inventory discrepancies.`,
          type: "TRANSFER_DISCREPANCY",
          link: "/dashboard/warehouse/transfers",
        }).catch(() => {});
      }

      return updatedTransfer;
    }, { timeout: 20000 });
  }

  /**
   * Raise a dispute/discrepancy against a stock transfer.
   */
  async raiseTransferIssue(
    userId: string,
    transferId: string,
    dto: RaiseTransferIssueDTO,
  ): Promise<any> {
    const transfer = await this.prisma.stockTransfer.findUnique({
      where: { id: transferId },
    });
    if (!transfer) throw notFoundError("Stock transfer", transferId);

    // Guard against raising an issue on a transfer that's still mid-flow
    // (e.g. APPROVED or PICKING) — doing so would force it into
    // DISCREPANCY, which only has raise_issue/resolve_issue actions
    // available, effectively bricking an in-progress transfer with no way
    // back into the normal approve→pick→verify→dispatch→receive flow.
    if (
      !["DISCREPANCY", "PARTIALLY_RECEIVED", "RECEIVED"].includes(
        transfer.status,
      )
    ) {
      throw new AppError(
        ErrorCode.INVALID_STATUS,
        400,
        `Cannot raise an issue on a transfer in ${transfer.status} status — only on DISCREPANCY, PARTIALLY_RECEIVED, or RECEIVED transfers.`,
      );
    }
    if (!dto.category || !dto.description?.trim()) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        "category and description are required",
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      const issue = await tx.transferIssue.create({
        data: {
          transferId,
          category: dto.category,
          description: dto.description,
          status: "OPEN",
          raisedById: userId,
        },
        include: {
          raisedBy: { select: { id: true, name: true, email: true } },
        },
      });

      if (transfer.status !== "DISCREPANCY") {
        await tx.stockTransfer.update({
          where: { id: transferId },
          data: { status: "DISCREPANCY" },
        });
      }

      logger.info(
        { issueId: issue.id, transferId, category: dto.category },
        "Transfer issue raised",
      );

      await InventoryService.logTransferAudit(tx, transferId, "UPDATE", userId, {
        event: "ISSUE_RAISED",
        issueId: issue.id,
        category: dto.category,
        description: dto.description,
      });

      notificationService.notifyRoleOrPermission({
        roleCode: "branch_manager",
        title: "Transfer Issue Raised",
        message: `A dispute (${dto.category.replace("_", " ")}) was filed against transfer ${transfer.documentId}.`,
        type: "ISSUE_RAISED",
        link: "/dashboard/warehouse/transfers",
      }).catch(() => {});

      return issue;
    }, { timeout: 15000 });
  }

  /**
   * Resolve or dismiss a transfer issue.
   * Restores transfer status to RECEIVED if all active issues are resolved/dismissed.
   */
  async resolveTransferIssue(
    userId: string,
    issueId: string,
    dto: ResolveTransferIssueDTO,
  ): Promise<any> {
    const issue = await this.prisma.transferIssue.findUnique({
      where: { id: issueId },
    });
    if (!issue) throw notFoundError("Transfer issue", issueId);

    return await this.prisma.$transaction(async (tx) => {
      const updatedIssue = await tx.transferIssue.update({
        where: { id: issueId },
        data: {
          status: dto.status,
          resolution: dto.resolution,
          resolvedById: userId,
          resolvedAt: new Date(),
        },
        include: {
          raisedBy: { select: { id: true, name: true, email: true } },
          resolvedBy: { select: { id: true, name: true, email: true } },
        },
      });

      const remainingOpenIssues = await tx.transferIssue.count({
        where: {
          transferId: issue.transferId,
          status: { in: ["OPEN", "INVESTIGATING"] },
        },
      });

      if (remainingOpenIssues === 0) {
        // Restore the status the transfer would actually be in based on
        // its item quantities, rather than hardcoding RECEIVED —
        // otherwise resolving an issue on a transfer that was only
        // PARTIALLY_RECEIVED would silently promote it to fully RECEIVED,
        // implying the missing quantity showed up when it didn't.
        const transferWithItems = await tx.stockTransfer.findUnique({
          where: { id: issue.transferId },
          include: { items: true },
        });
        const isPartial = (transferWithItems?.items || []).some(
          (i) =>
            i.dispatched_qty !== null &&
            (i.received_qty ?? 0) < i.dispatched_qty,
        );
        const restoredStatus = isPartial ? "PARTIALLY_RECEIVED" : "RECEIVED";

        await tx.stockTransfer.update({
          where: { id: issue.transferId },
          data: { status: restoredStatus },
        });
        logger.info(
          { transferId: issue.transferId, restoredStatus },
          "All transfer issues resolved; transfer status restored",
        );
      }

      await InventoryService.logTransferAudit(tx, issue.transferId, "UPDATE", userId, {
        event: "ISSUE_RESOLVED",
        issueId: updatedIssue.id,
        status: dto.status,
        resolution: dto.resolution,
      });

      notificationService.createNotification({
        userId: issue.raisedById,
        title: "Transfer Issue Resolved",
        message: `The issue raised on transfer ${issue.transferId} was marked as ${dto.status.toLowerCase()}.`,
        type: "ISSUE_RESOLVED",
        link: "/dashboard/warehouse/transfers",
      }).catch(() => {});

      return updatedIssue;
    }, { timeout: 15000 });
  }

  /**
   * Get all issues for a stock transfer.
   */
  async getTransferIssues(transferId: string): Promise<any> {
    return this.prisma.transferIssue.findMany({
      where: { transferId },
      include: {
        raisedBy: { select: { id: true, name: true, email: true } },
        resolvedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get audit logs for a stock transfer.
   */
  async getTransferAuditLogs(transferId: string): Promise<any> {
    return this.prisma.auditLog.findMany({
      where: {
        entityType: "StockTransfer",
        entityId: transferId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { timestamp: "desc" },
    });
  }

  /**
   * Get inventory record by product and warehouse IDs (legacy helper)
   */
  async getInventoryByProductAndWarehouse(
    productId: string,
    warehouseId: string,
  ): Promise<any> {
    const inv = await this.prisma.inventory.findUnique({
      where: {
        productId_warehouseId: { productId, warehouseId },
      },
      include: {
        product: true,
        warehouse: true,
      },
    });
    if (!inv) throw notFoundError("Inventory", `${productId}/${warehouseId}`);
    return inv;
  }

  /**
   * Calculate Transfer Analytics & KPI metrics
   */
  async getTransferAnalytics(): Promise<any> {
    const transfers = await this.prisma.stockTransfer.findMany({
      include: {
        sourceWarehouse: { select: { name: true } },
        destinationWarehouse: { select: { name: true } },
        createdBy: { select: { name: true } },
        issues: { select: { id: true, status: true } },
      },
    });

    const totalTransfers = transfers.length;

    const completedTransfers = transfers.filter((t) => t.receivedAt && t.createdAt);

    let totalCycleTimeMs = 0;
    for (const t of completedTransfers) {
      if (t.receivedAt && t.createdAt) {
        totalCycleTimeMs += new Date(t.receivedAt).getTime() - new Date(t.createdAt).getTime();
      }
    }

    const avgCycleTimeHours = completedTransfers.length > 0
      ? Number((totalCycleTimeMs / (completedTransfers.length * 1000 * 60 * 60)).toFixed(1))
      : 0;

    const discrepancyTransfersCount = transfers.filter(
      (t) => t.status === "DISCREPANCY" || (t.issues && t.issues.length > 0),
    ).length;

    const discrepancyRatePercent = totalTransfers > 0
      ? Number(((discrepancyTransfersCount / totalTransfers) * 100).toFixed(1))
      : 0;

    const truckCount = transfers.filter((t) => t.dispatchMode === "TRUCK").length;
    const riderCount = transfers.filter((t) => t.dispatchMode === "RIDER").length;
    const unassignedDispatchCount = transfers.filter(
      (t) => t.dispatchedAt && !t.dispatchMode,
    ).length;

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const pendingApprovals = transfers.filter((t) => t.status === "PENDING_APPROVAL");
    const agingPendingCount = pendingApprovals.filter(
      (t) => new Date(t.createdAt) < twentyFourHoursAgo,
    ).length;

    const oldestPendingApprovals = pendingApprovals
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .slice(0, 5)
      .map((t) => ({
        id: t.id,
        documentId: t.documentId,
        sourceWarehouse: t.sourceWarehouse?.name,
        destinationWarehouse: t.destinationWarehouse?.name,
        createdBy: t.createdBy?.name,
        createdAt: t.createdAt,
        ageHours: Number(((now.getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60)).toFixed(1)),
      }));

    return {
      totalTransfers,
      avgCycleTimeHours,
      discrepancyRatePercent,
      discrepancyTransfersCount,
      dispatchModeSplit: {
        truck: truckCount,
        rider: riderCount,
        unassigned: unassignedDispatchCount,
      },
      pendingApprovals: {
        total: pendingApprovals.length,
        agingCount: agingPendingCount,
        oldest: oldestPendingApprovals,
      },
    };
  }
}

export default InventoryService;
