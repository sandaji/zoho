/**
 * HR Module - Controller Layer
 */

import { Request, Response, NextFunction } from "express";
import { HrService } from "../service";
import {
  CreateUserDTO,
  UpdateUserDTO,
  CreatePayrollDTO,
  UpdatePayrollDTO,
  PayrollListQueryDTO,
} from "../dto";
import { validationError } from "../../../lib/errors";

export class HrController {
  private service = new HrService();

  // DASHBOARD ENDPOINTS
  async getHRStats(
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const result = await this.service.getHRStats();
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // USER ENDPOINTS
  async createUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateUserDTO = req.body;

      if (!dto.email || !dto.password || !dto.name || !dto.role) {
        throw validationError(
          "Missing required fields: email, password, name, role"
        );
      }

      const result = await this.service.createUser(dto);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.getUser(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateUserDTO = req.body;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.updateUser(id, dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // PAYROLL ENDPOINTS
  async createPayroll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreatePayrollDTO = req.body;

      if (
        !dto.userId ||
        !dto.base_salary ||
        !dto.period_start ||
        !dto.period_end
      ) {
        throw validationError(
          "Missing required fields: userId, base_salary, period_start, period_end"
        );
      }

      const result = await this.service.createPayroll(dto);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPayroll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.getPayroll(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listPayroll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: PayrollListQueryDTO = req.query as any;

      const result = await this.service.listPayroll(query);

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

  async updatePayroll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdatePayrollDTO = req.body;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.updatePayroll(id, dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
