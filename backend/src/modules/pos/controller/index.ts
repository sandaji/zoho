/**
 * POS Module - Controller Layer
 * backend/src/modules/pos/controller/index.ts
 */

import { Request, Response, NextFunction } from "express";
import { PosService } from "../service";
import {
  CreateSalesDTO,
  UpdateSalesDTO,
  SalesListQueryDTO,
  DailySummaryDTO,
  ProductSearchDTO,
  ApproveDiscountDTO,
} from "../dto";
import { validationError } from "../../../lib/errors";

export class PosController {
  private service = new PosService();

  /**
   * POST /pos/products/search
   * Search product by SKU or barcode
   */
  async searchProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: ProductSearchDTO = req.body;

      if (!dto.search) {
        throw validationError("Search term is required");
      }

      const result = await this.service.searchProduct(dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /pos/sales
   * Create new sales order
   */
  async createSales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateSalesDTO = req.body;

      if (
        !dto.branchId ||
        !dto.userId ||
        !dto.items ||
        dto.items.length === 0
      ) {
        throw validationError(
          "Missing required fields: branchId, userId, items"
        );
      }

      if (!dto.payment_method) {
        throw validationError("Payment method is required");
      }

      const result = await this.service.createSales(dto);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales/:id
   * Get sales by ID
   */
  async getSalesById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.getSalesById(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales
   * List sales with filtering
   */
  async listSales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: SalesListQueryDTO = req.query as any;

      const result = await this.service.listSales(query);

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

  /**
   * PATCH /pos/sales/:id
   * Update sales order
   */
  async updateSales(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateSalesDTO = req.body;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.updateSales(id, dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales/daily-summary
   * Get daily summary for a branch
   */
  async getDailySummary(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: DailySummaryDTO = {
        branchId: req.query.branch_id as string,
        date: req.query.date as string,
      };

      const result = await this.service.getDailySummary(dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /pos/sales/:id/receipt
   * Generate receipt for a sale
   */
  async getReceipt(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("Sale ID is required");
      }

      const result = await this.service.generateReceipt(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /pos/discount/approve
   * Manager approval for discounts > 10%
   */
  async approveDiscount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: ApproveDiscountDTO = req.body;

      if (!dto.salesId || !dto.managerId || !dto.managerPassword) {
        throw validationError(
          "Missing required fields: salesId, managerId, managerPassword"
        );
      }

      await this.service.approveDiscount(dto);

      res.json({
        success: true,
        message: "Discount approved successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
