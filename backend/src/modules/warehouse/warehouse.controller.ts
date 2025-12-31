/**
 * Warehouse Controller
 * Handles HTTP requests for warehouse operations
 */

import { Request, Response, NextFunction } from "express";
import { WarehouseService } from "./warehouse.service";
import {
  createTransferSchema,
  adjustStockSchema,
  getStockMovementsSchema,
  getTransfersSchema,
  updateTransferStatusSchema,
} from "./warehouse.schema";
import { AppError, ErrorCode } from "../../lib/errors";

export class WarehouseController {
  private warehouseService: WarehouseService;

  constructor() {
    this.warehouseService = new WarehouseService();
  }

  /**
   * Create a new stock transfer
   * POST /warehouse/transfer
   */
  async createTransfer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated"
        );
      }

      const validated = createTransferSchema.parse(req.body);
      const transfer = await this.warehouseService.createTransfer(
        validated,
        userId
      );

      res.status(201).json({
        success: true,
        data: transfer,
        message: "Transfer created successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Fulfill/receive a stock transfer
   * POST /warehouse/transfer/:id/receive
   */
  async fulfillTransfer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated"
        );
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError(ErrorCode.NOT_FOUND, 400, "Transfer ID is required");
      }
      const transfer = await this.warehouseService.fulfillTransfer(id, userId);

      res.json({
        success: true,
        data: transfer,
        message: "Transfer completed successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Adjust stock (increase or decrease)
   * POST /warehouse/adjust
   */
  async adjustStock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated"
        );
      }

      const validated = adjustStockSchema.parse(req.body);
      const result = await this.warehouseService.adjustStock(validated, userId);

      res.json({
        success: true,
        data: result,
        message: "Stock adjusted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock movements
   * GET /warehouse/movements
   */
  async getStockMovements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const params = {
        warehouseId: req.query.warehouseId as string,
        productId: req.query.productId as string,
        type: req.query.type as any,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      const validated = getStockMovementsSchema.parse(params);
      const result = await this.warehouseService.getStockMovements(validated);

      res.json({
        success: true,
        data: result.movements,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get stock transfers
   * GET /warehouse/transfers
   */
  async getTransfers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const params = {
        status: req.query.status as any,
        sourceId: req.query.sourceId as string,
        targetId: req.query.targetId as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 50,
      };

      const validated = getTransfersSchema.parse(params);
      const result = await this.warehouseService.getTransfers(validated);

      res.json({
        success: true,
        data: result.transfers,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get a single transfer by ID
   * GET /warehouse/transfers/:id
   */
  async getTransferById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        throw new AppError(ErrorCode.NOT_FOUND, 400, "Transfer ID is required");
      }
      const transfer = await this.warehouseService.getTransferById(id);

      res.json({
        success: true,
        data: transfer,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update transfer status
   * PATCH /warehouse/transfers/:id/status
   */
  async updateTransferStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user?.userId;
      if (!userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated"
        );
      }

      const { id } = req.params;
      if (!id) {
        throw new AppError(ErrorCode.NOT_FOUND, 400, "Transfer ID is required");
      }
      const validated = updateTransferStatusSchema.parse(req.body);
      const transfer = await this.warehouseService.updateTransferStatus(
        id,
        validated,
        userId
      );

      res.json({
        success: true,
        data: transfer,
        message: "Transfer status updated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get warehouse statistics
   * GET /warehouse/stats
   */
  async getWarehouseStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const warehouseId = req.query.warehouseId as string | undefined;
      const stats = await this.warehouseService.getWarehouseStats(warehouseId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
