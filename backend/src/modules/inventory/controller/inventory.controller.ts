/**
 * Inventory Module - Controller Layer
 * Endpoints:
 * - GET /inventory - Get all inventory with filtering and pagination
 * - POST /inventory/adjust - Adjust inventory stock
 * - POST /inventory/transfer - Transfer inventory between warehouses
 */

import { Request, Response, NextFunction } from "express";
import { InventoryService } from "../service/inventory.service";
import { PermissionService } from "../../auth/service/permission.service";
import { getAvailableTransferActions } from "../transfer-actions";
import {
  GetInventoryQueryDTO,
  AdjustInventoryDTO,
  TransferInventoryDTO,
  RequestTransferDTO,
  ApproveTransferDTO,
  StartPickingDTO,
  CompletePickingDTO,
  VerifyTransferDTO,
  DispatchTransferDTO,
  ReceiveTransferDTO,
} from "../dto";
import { validationError } from "../../../lib/errors";
import { logger } from "../../../lib/logger";

export class InventoryController {
  private service = new InventoryService();

  /**
   * Attaches `availableActions` to a single transfer, computed from its
   * current status + the requesting user's resolved permissions. See
   * modules/inventory/transfer-actions.ts for the source of truth this
   * derives from — frontend should render exactly what comes back here,
   * not re-derive it from status.
   */
  private async withAvailableActions(transfer: any, userId: string): Promise<any> {
    const userPermissions = await PermissionService.getUserPermissions(userId);
    return {
      ...transfer,
      availableActions: getAvailableTransferActions(
        { status: transfer.status, pickingCompletedAt: transfer.pickingCompletedAt },
        userPermissions,
      ),
    };
  }

  private async withAvailableActionsList(transfers: any[], userId: string): Promise<any[]> {
    const userPermissions = await PermissionService.getUserPermissions(userId);
    return transfers.map((t) => ({
      ...t,
      availableActions: getAvailableTransferActions(
        { status: t.status, pickingCompletedAt: t.pickingCompletedAt },
        userPermissions,
      ),
    }));
  }

  /**
   * GET /inventory
   * Retrieve all inventory with filtering, sorting, and pagination
   * Query params:
   *   - page: number (default 1)
   *   - limit: number (default 20, max 100)
   *   - status: in_stock | low_stock | out_of_stock | discontinued
   *   - warehouseId: string
   *   - productId: string
   *   - productSku: string
   *   - lowStockOnly: boolean
   *   - search: string
   *   - sortBy: quantity | available | reserved | product_name | warehouse_name | status
   *   - sortOrder: asc | desc
   */
  async getInventory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const query: GetInventoryQueryDTO = req.query as any;

      logger.debug({ query }, "GET /inventory");

      const result = await this.service.getInventory(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error(error as Error, "Error in getInventory");
      next(error);
    }
  }

  /**
   * POST /inventory/adjust
   * Adjust inventory stock (increase or decrease)
   * Body:
   *   - productId: string (required)
   *   - warehouseId: string (required)
   *   - adjustmentType: "increase" | "decrease" (required)
   *   - quantity: number (required, must be positive)
   *   - reason: "receipt" | "damage" | "theft" | "count_variance" | "expiry" | "return" | "promotion" | "other" (required)
   *   - reference: string (optional) - PO number, RMA number, etc.
   *   - notes: string (optional)
   */
  async adjustInventory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto: AdjustInventoryDTO = req.body;

      // Validation
      if (!dto.productId || !dto.warehouseId) {
        throw validationError(
          "Missing required fields: productId, warehouseId",
        );
      }
      if (
        !dto.adjustmentType ||
        !["increase", "decrease"].includes(dto.adjustmentType)
      ) {
        throw validationError(
          "adjustmentType must be 'increase' or 'decrease'",
        );
      }
      if (!dto.quantity || dto.quantity <= 0) {
        throw validationError("quantity must be a positive number");
      }
      if (!dto.reason) {
        throw validationError("reason is required");
      }

      logger.debug(
        {
          productId: dto.productId,
          adjustmentType: dto.adjustmentType,
          quantity: dto.quantity,
        },
        "POST /inventory/adjust",
      );

      const userId = req.user?.userId;
      if (!userId) {
        throw validationError("Authentication context is missing");
      }
      const result = await this.service.adjustInventory(dto, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: `Inventory ${dto.adjustmentType}d by ${dto.quantity} units`,
      });
    } catch (error) {
      logger.error(error as Error, "Error in adjustInventory");
      next(error);
    }
  }

  /**
   * POST /inventory/transfer
   * Transfer inventory between warehouses
   * Body:
   *   - productId: string (required)
   *   - fromWarehouseId: string (required)
   *   - toWarehouseId: string (required, must be different from fromWarehouseId)
   *   - quantity: number (required, must be positive)
   *   - reason: string (optional) - Balancing, reorganization, branch movement, etc.
   *   - reference: string (optional) - Transfer order number, etc.
   *   - notes: string (optional)
   */
  async transferInventory(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto: TransferInventoryDTO = req.body;

      // Validation
      if (!dto.productId || !dto.fromWarehouseId || !dto.toWarehouseId) {
        throw validationError(
          "Missing required fields: productId, fromWarehouseId, toWarehouseId",
        );
      }
      if (dto.fromWarehouseId === dto.toWarehouseId) {
        throw validationError(
          "Source and destination warehouses must be different",
        );
      }
      if (!dto.quantity || dto.quantity <= 0) {
        throw validationError("quantity must be a positive number");
      }

      logger.debug(
        {
          productId: dto.productId,
          fromWarehouse: dto.fromWarehouseId,
          toWarehouse: dto.toWarehouseId,
          quantity: dto.quantity,
        },
        "POST /inventory/transfer",
      );

      const userId = req.user?.userId;
      if (!userId) {
        throw validationError("Authentication context is missing");
      }
      const result = await this.service.transferInventory(dto, userId);

      res.status(200).json({
        success: true,
        data: result,
        message: `Successfully transferred ${dto.quantity} units from warehouse ${dto.fromWarehouseId} to ${dto.toWarehouseId}`,
      });
    } catch (error) {
      logger.error(error as Error, "Error in transferInventory");
      next(error);
    }
  }

  /**
   * GET /inventory/alerts
   * Retrieve low stock alerts
   */
  async getLowStockAlerts(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { InventoryAlertService } =
        await import("../services/alert.service");
      const branchId = req.query.branchId as string | undefined;
      const criticalOnly = req.query.critical === "true";

      let alerts;
      if (criticalOnly) {
        alerts = await InventoryAlertService.getCriticalAlerts();
      } else if (branchId) {
        alerts = await InventoryAlertService.getBranchAlerts(branchId);
      } else {
        alerts = await InventoryAlertService.getLowStockAlerts();
      }

      res.json({
        success: true,
        data: alerts,
        message: `Found ${alerts.length} low stock alerts`,
      });
    } catch (error) {
      logger.error(error as Error, "Error in getLowStockAlerts");
      next(error);
    }
  }

  /**
   * POST /inventory/alerts/reorder
   * Create a reorder suggestion for low stock item
   */
  async createReorderSuggestion(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const { productId, branchId } = req.body;

      if (!productId || !branchId) {
        throw validationError("productId and branchId are required");
      }

      const { InventoryAlertService } =
        await import("../services/alert.service");
      const reorderQty = await InventoryAlertService.getSuggestedReorderQty(
        productId,
        branchId,
      );

      res.json({
        success: true,
        data: reorderQty,
        message: "Reorder suggestion calculated successfully",
      });
    } catch (error) {
      logger.error(error as Error, "Error in createReorderSuggestion");
      next(error);
    }
  }

  async requestTransfer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto: RequestTransferDTO = req.body;
      const userId = req.user?.userId;
      if (!userId) {
        throw validationError("Authentication context is missing");
      }

      // Validation
      if (!dto.sourceWarehouseId || !dto.destinationWarehouseId || !dto.items) {
        throw validationError(
          "Missing required fields: sourceWarehouseId, destinationWarehouseId, items",
        );
      }

      const result = await this.service.requestTransfer(userId, dto);
      const withActions = await this.withAvailableActions(result, userId);
      res.status(201).json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  async approveTransfer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const userId = req.user?.userId;
      if (!userId || !transferId) {
        throw validationError(
          "Authentication context or transfer id is missing",
        );
      }
      const dto: ApproveTransferDTO = req.body;

      const result = await this.service.approveTransfer(
        userId,
        transferId,
        dto,
      );
      const withActions = await this.withAvailableActions(result, userId);
      res.status(200).json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage: Start Picking (APPROVED -> PICKING). No line-item data
   * required — just claims the pick task.
   */
  async startPicking(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const userId = req.user?.userId;
      if (!userId || !transferId) {
        throw validationError(
          "Authentication context or transfer id is missing",
        );
      }
      const dto: StartPickingDTO = req.body;

      const result = await this.service.startPicking(userId, transferId, dto);
      const withActions = await this.withAvailableActions(result, userId);
      res.status(200).json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage: Complete Picking (stays in PICKING, sets pickingCompletedAt so
   * the "verify" action becomes available to whoever holds that
   * permission).
   */
  async completePicking(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const userId = req.user?.userId;
      if (!userId || !transferId) {
        throw validationError(
          "Authentication context or transfer id is missing",
        );
      }
      const dto: CompletePickingDTO = req.body;
      if (!dto.items || dto.items.length === 0) {
        throw validationError("items is required");
      }

      const result = await this.service.completePicking(userId, transferId, dto);
      const withActions = await this.withAvailableActions(result, userId);
      res.status(200).json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Stage: Verify (PICKING -> VERIFIED). Deliberately gated on a different
   * permission (inventory.transfer.verify) than picking, so the same
   * person doesn't have to be both picker and verifier.
   */
  async verifyTransfer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const userId = req.user?.userId;
      if (!userId || !transferId) {
        throw validationError(
          "Authentication context or transfer id is missing",
        );
      }
      const dto: VerifyTransferDTO = req.body;

      const result = await this.service.verifyTransfer(userId, transferId, dto);
      const withActions = await this.withAvailableActions(result, userId);
      res.status(200).json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  async dispatchTransfer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const userId = req.user?.userId;
      if (!userId || !transferId) {
        throw validationError(
          "Authentication context or transfer id is missing",
        );
      }
      const dto: DispatchTransferDTO = req.body;

      if (!dto.dispatchMode || !["RIDER", "TRUCK"].includes(dto.dispatchMode)) {
        throw validationError("dispatchMode must be 'RIDER' or 'TRUCK'");
      }
      if (!dto.driverId) {
        throw validationError("driverId is required");
      }

      const result = await this.service.dispatchTransfer(
        userId,
        transferId,
        dto,
      );
      const withActions = await this.withAvailableActions(result, userId);
      res.status(200).json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  async receiveTransfer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const userId = req.user?.userId;
      if (!userId || !transferId) {
        throw validationError(
          "Authentication context or transfer id is missing",
        );
      }
      const dto: ReceiveTransferDTO = req.body;

      const result = await this.service.receiveTransfer(
        userId,
        transferId,
        dto,
      );
      const withActions = await this.withAvailableActions(result, userId);
      res.status(200).json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /inventory/transfers
   * Previously referenced by routes/index.ts but not implemented on this
   * controller (only the service had listTransfers) — this route was
   * throwing "inventoryController.listTransfers is not a function" at
   * runtime.
   */
  async listTransfers(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const status = req.query.status as string | undefined;
      const warehouseId = req.query.warehouseId as string | undefined;
      const userId = req.user?.userId;
      const result = await this.service.listTransfers({ status, warehouseId });
      const withActions = userId
        ? await this.withAvailableActionsList(result, userId)
        : result;
      res.json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /inventory/transfers/:id
   * Same gap as listTransfers above — previously unimplemented on both the
   * controller and the service.
   */
  async getTransfer(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const transferId = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      if (!transferId) {
        throw validationError("Transfer id is required");
      }
      const userId = req.user?.userId;
      const result = await this.service.getTransferById(transferId);
      const withActions = userId
        ? await this.withAvailableActions(result, userId)
        : result;
      res.json({ success: true, data: withActions });
    } catch (error) {
      next(error);
    }
  }
}
