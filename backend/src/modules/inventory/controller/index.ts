/**
 * Inventory Module - Controller Layer
 */

import { Request, Response, NextFunction } from "express";
import { InventoryService } from "../service";
import {
  UpdateInventoryDTO,
  InventoryListQueryDTO,
  StockAdjustmentDTO,
  GetInventoryQueryDTO,
  AdjustInventoryDTO,
  TransferInventoryDTO,
} from "../dto";
import { validationError } from "../../../lib/errors";

export class InventoryController {
  private service = new InventoryService();

  async updateInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: UpdateInventoryDTO = req.body;

      if (!dto.productId || !dto.warehouseId) {
        throw validationError(
          "Missing required fields: productId, warehouseId"
        );
      }

      const result = await this.service.updateInventory(dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { productId, warehouseId } = req.params;

      if (!productId || !warehouseId) {
        throw validationError(
          "Missing required parameters: productId, warehouseId"
        );
      }

      const result = await this.service.getInventory({
        productId: productId as string,
        warehouseId: warehouseId as string
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: InventoryListQueryDTO = req.query as any;

      const result = await this.service.listInventory(query);

      res.json({
        success: true,
        data: result.data,
        pagination: {
          total: result.total,
          page: query.page || 1,
          limit: query.limit || 20,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async adjustStock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: StockAdjustmentDTO = req.body;

      if (!dto.productId || !dto.warehouseId || !dto.quantity) {
        throw validationError(
          "Missing required fields: productId, warehouseId, quantity"
        );
      }

      const result = await this.service.adjustStock(dto);

      res.json({
        success: true,
        data: result,
        message: `Stock adjusted by ${dto.quantity} units`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /inventory - Enhanced version
   * Retrieve all inventory with filtering, sorting, and pagination
   */
  async getInventoryList(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: GetInventoryQueryDTO = req.query as any;

      const result = await this.service.getInventory(query);

      res.json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /inventory/adjust - Enhanced version
   * Adjust inventory stock (increase or decrease)
   */
  async adjustInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: AdjustInventoryDTO = req.body;

      // Validation
      if (!dto.productId || !dto.warehouseId) {
        throw validationError(
          "Missing required fields: productId, warehouseId"
        );
      }
      if (
        !dto.adjustmentType ||
        !["increase", "decrease"].includes(dto.adjustmentType)
      ) {
        throw validationError(
          "adjustmentType must be 'increase' or 'decrease'"
        );
      }
      if (!dto.quantity || dto.quantity <= 0) {
        throw validationError("quantity must be a positive number");
      }
      if (!dto.reason) {
        throw validationError("reason is required");
      }

      const result = await this.service.adjustInventory(dto);

      res.status(200).json({
        success: true,
        data: result,
        message: `Inventory ${dto.adjustmentType}d by ${dto.quantity} units`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /inventory/transfer
   * Transfer inventory between warehouses
   */
  async transferInventory(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: TransferInventoryDTO = req.body;

      // Validation
      if (!dto.productId || !dto.fromWarehouseId || !dto.toWarehouseId) {
        throw validationError(
          "Missing required fields: productId, fromWarehouseId, toWarehouseId"
        );
      }
      if (dto.fromWarehouseId === dto.toWarehouseId) {
        throw validationError(
          "Source and destination warehouses must be different"
        );
      }
      if (!dto.quantity || dto.quantity <= 0) {
        throw validationError("quantity must be a positive number");
      }

      const result = await this.service.transferInventory(dto);

      res.status(200).json({
        success: true,
        data: result,
        message: `Successfully transferred ${dto.quantity} units from warehouse ${dto.fromWarehouseId} to ${dto.toWarehouseId}`,
      });
    } catch (error) {
      next(error);
    }
  }
}
