/**
 * Warehouse Controller
 * Handles HTTP requests for both warehouse metadata and inventory management
 */

import { Request, Response, NextFunction } from "express";
import { WarehouseInventoryService } from "../services/warehouse-inventory.service";
import { WarehouseCrudService } from "../services/warehouse-crud.service";
import {
  createTransferSchema,
  adjustStockSchema,
  getStockMovementsSchema,
  getTransfersSchema,
  updateTransferStatusSchema,
} from "../warehouse.schema";
import { AppError, ErrorCode, validationError } from "../../../lib/errors";
import type {
  CreateWarehouseDTO,
  UpdateWarehouseDTO,
  WarehouseListQueryDTO,
} from "../dto";

export class WarehouseController {
  private inventoryService: WarehouseInventoryService;
  private crudService: WarehouseCrudService;

  constructor() {
    this.inventoryService = new WarehouseInventoryService();
    this.crudService = new WarehouseCrudService();
  }

  /**
   * WAREHOUSE CRUD OPERATIONS
   */

  async createWarehouse(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateWarehouseDTO = req.body;

      if (
        !dto.code ||
        !dto.name ||
        !dto.location ||
        !dto.capacity ||
        !dto.branchId
      ) {
        throw validationError(
          "Missing required fields: code, name, location, capacity, branchId"
        );
      }

      const result = await this.crudService.createWarehouse(dto);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWarehouse(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.crudService.getWarehouse(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listWarehouses(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: WarehouseListQueryDTO = req.query as any;

      const result = await this.crudService.listWarehouses(query);

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

  async updateWarehouse(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateWarehouseDTO = req.body;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.crudService.updateWarehouse(id, dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getWarehouseStock(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.crudService.getWarehouseStock(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * INVENTORY MANAGEMENT OPERATIONS
   */

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
      const transfer = await this.inventoryService.createTransfer(
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
      const transfer = await this.inventoryService.fulfillTransfer(id, userId);

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
      const result = await this.inventoryService.adjustStock(validated, userId);

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
      const result = await this.inventoryService.getStockMovements(validated);

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
      const result = await this.inventoryService.getTransfers(validated);

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
      const transfer = await this.inventoryService.getTransferById(id);

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
      const transfer = await this.inventoryService.updateTransferStatus(
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
      const stats = await this.inventoryService.getWarehouseStats(warehouseId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
