/**
 * Warehouse Module - Controller Layer
 */

import { Request, Response, NextFunction } from "express";
import { WarehouseService } from "../service";
import {
  CreateWarehouseDTO,
  UpdateWarehouseDTO,
  WarehouseListQueryDTO,
} from "../dto";
import { validationError } from "../../../lib/errors";

export class WarehouseController {
  private service = new WarehouseService();

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

      const result = await this.service.createWarehouse(dto);

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

      const result = await this.service.getWarehouse(id);

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

      const result = await this.service.listWarehouses(query);

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

      const result = await this.service.updateWarehouse(id, dto);

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

      const result = await this.service.getWarehouseStock(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
