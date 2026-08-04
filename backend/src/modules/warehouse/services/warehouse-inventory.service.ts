/**
 * Warehouse Inventory Service
 *
 * This previously reimplemented stock-transfer/adjustment logic against
 * field names that don't exist on the real schema (`transferNo`,
 * `sourceId`/`targetId`, a `quantity` field on TransferItem — the real
 * field is `requested_qty` — and TransferStatus values like "PENDING"
 * that were never valid enum members). Every one of these routes
 * (`/warehouse/transfer`, `/warehouse/adjust`, ...) would have thrown at
 * runtime on first use.
 *
 * Rather than maintain a second, independently-broken implementation of
 * stock transfers/adjustments, this now delegates entirely to the
 * canonical `InventoryService` (modules/inventory/service/inventory.service.ts).
 *
 * NOTE ON THE CREATE -> FULFILL CONTRACT: the routes here expose a
 * two-call shape (create a transfer, then fulfill it) that predates
 * InventoryService's four-stage request -> approve -> dispatch -> receive
 * workflow (which reserves stock at approval time and can dispatch/receive
 * partial quantities). To preserve the existing two-call contract without
 * reintroducing a second stock-moving code path, `fulfillTransfer` here
 * runs approve -> dispatch -> receive back-to-back for the full requested
 * quantity. If partial fulfillment or an approval gate is ever needed,
 * call InventoryService's four stages directly instead of this wrapper.
 */

import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";
import { InventoryService } from "../../inventory/service/inventory.service";
import type {
  CreateTransferInput,
  AdjustStockInput,
  GetStockMovementsInput,
  GetTransfersInput,
  UpdateTransferStatusInput,
  FulfillTransferInput,
} from "../warehouse.schema";

export class WarehouseInventoryService {
  private inventoryService = new InventoryService();

  /**
   * Create a new stock transfer (request stage only — no stock moves yet).
   */
  async createTransfer(data: CreateTransferInput, createdById: string): Promise<any> {
    return this.inventoryService.requestTransfer(createdById, {
      sourceWarehouseId: data.sourceId,
      destinationWarehouseId: data.targetId,
      items: data.items.map((item) => ({
        productId: item.productId,
        requested_qty: item.quantity,
      })),
      notes: data.notes,
    });
  }

  /**
   * Fulfill/receive a stock transfer in one call — runs approve, dispatch,
   * and receive for the full requested quantity of every line item. See
   * the module-level note above for why this collapses three stages into
   * one instead of exposing them individually here.
   */
  async fulfillTransfer(
    transferId: string,
    userId: string,
    dispatchInfo: FulfillTransferInput,
  ): Promise<any> {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: transferId },
      include: { items: true },
    });
    if (!transfer) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
    }
    if (transfer.status !== "PENDING_APPROVAL") {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `Cannot fulfill transfer with status: ${transfer.status}. Only PENDING_APPROVAL transfers can be fulfilled.`,
      );
    }

    await this.inventoryService.approveTransfer(userId, transferId, {});
    await this.inventoryService.dispatchTransfer(userId, transferId, {
      items: transfer.items.map((item) => ({
        productId: item.productId,
        dispatched_qty: item.requested_qty,
      })),
      dispatchMode: dispatchInfo.dispatchMode,
      driverId: dispatchInfo.driverId,
      truckId: dispatchInfo.truckId,
      vehicleRegistration: dispatchInfo.vehicleRegistration,
    });
    return this.inventoryService.receiveTransfer(userId, transferId, {
      items: transfer.items.map((item) => ({
        productId: item.productId,
        received_qty: item.requested_qty,
        damaged_qty: 0,
      })),
    });
  }

  /**
   * Adjust stock (add or remove inventory). Delegates to
   * InventoryService.adjustInventory — the canonical ledger + audit-trail
   * path — instead of upserting `inventory` directly.
   * @deprecated This method will be removed in a future version. Use `InventoryService.adjustInventory` directly.
   */
  async adjustStock(data: AdjustStockInput, userId: string): Promise<any> {
    return this.inventoryService.adjustInventory(
      {
        productId: data.productId,
        warehouseId: data.warehouseId,
        adjustmentType: data.quantity > 0 ? "increase" : "decrease",
        quantity: Math.abs(data.quantity),
        reason: "other",
        reference: data.reason,
      },
      userId,
    );
  }

  /**
   * Get stock movements with filtering. Reads `stockMovement` directly —
   * this table's fields were already correct in the old implementation.
   */
  async getStockMovements(params: GetStockMovementsInput): Promise<any> {
    const { warehouseId, productId, type, startDate, endDate, page = 1, limit = 50 } = params;

    const where: any = {};
    if (warehouseId) where.warehouseId = warehouseId;
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [movements, total] = await Promise.all([
      prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { id: true, name: true, sku: true } },
          warehouse: { select: { id: true, name: true, code: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    return {
      movements,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get stock transfers with filtering.
   */
  async getTransfers(params: GetTransfersInput): Promise<any> {
    const { status, sourceId, targetId, page = 1, limit = 50 } = params;

    const where: any = {};
    if (status) where.status = status;
    if (sourceId) where.sourceWarehouseId = sourceId;
    if (targetId) where.destinationWarehouseId = targetId;

    const [transfers, total] = await Promise.all([
      prisma.stockTransfer.findMany({
        where,
        include: {
          items: { include: { product: { select: { id: true, name: true, sku: true, unit_price: true } } } },
          sourceWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
          destinationWarehouse: { select: { id: true, name: true, code: true, branch: { select: { name: true } } } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockTransfer.count({ where }),
    ]);

    return {
      transfers,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get a single transfer by ID.
   */
  async getTransferById(id: string): Promise<any> {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, sku: true, unit_price: true, image_url: true } },
          },
        },
        sourceWarehouse: {
          select: { id: true, name: true, code: true, location: true, branch: { select: { name: true, city: true } } },
        },
        destinationWarehouse: {
          select: { id: true, name: true, code: true, location: true, branch: { select: { name: true, city: true } } },
        },
      },
    });

    if (!transfer) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
    }

    return transfer;
  }

  /**
   * Update transfer status. The only status this can validly set directly
   * (outside the approve/dispatch/receive workflow) is CANCELLED — every
   * other status transition happens as a side effect of
   * InventoryService.approveTransfer/dispatchTransfer/receiveTransfer.
   */
  async updateTransferStatus(
    transferId: string,
    data: UpdateTransferStatusInput,
    _userId: string,
  ): Promise<any> {
    const transfer = await prisma.stockTransfer.findUnique({ where: { id: transferId } });
    if (!transfer) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Transfer not found");
    }
    if (["RECEIVED", "PARTIALLY_RECEIVED", "CANCELLED"].includes(transfer.status)) {
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        400,
        `Cannot update transfer with status: ${transfer.status}`,
      );
    }

    return prisma.stockTransfer.update({
      where: { id: transferId },
      data: { status: data.status, notes: data.notes ?? transfer.notes },
      include: {
        items: { include: { product: { select: { id: true, name: true, sku: true } } } },
        sourceWarehouse: { select: { id: true, name: true, code: true } },
        destinationWarehouse: { select: { id: true, name: true, code: true } },
      },
    });
  }

  /**
   * Get warehouse statistics.
   */
  async getWarehouseStats(warehouseId?: string): Promise<any> {
    const where = warehouseId ? { warehouseId } : {};

    const [totalValue, lowStockCount, outOfStockCount, totalProducts] = await Promise.all([
      prisma.inventory.aggregate({ where, _sum: { quantity: true } }),
      prisma.inventory.count({ where: { ...where, status: "low_stock" } }),
      prisma.inventory.count({ where: { ...where, status: "out_of_stock" } }),
      prisma.inventory.count({ where }),
    ]);

    return {
      totalValue: totalValue._sum.quantity || 0,
      lowStockCount,
      outOfStockCount,
      totalProducts,
    };
  }
}
