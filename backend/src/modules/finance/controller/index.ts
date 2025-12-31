/**
 * Finance Module - Controller Layer
 */

import { Request, Response, NextFunction } from "express";
import { FinanceService } from "../service";
import {
  CreateTransactionDTO,
  UpdateTransactionDTO,
  TransactionListQueryDTO,
} from "../dto";
import { validationError } from "../../../lib/errors";

export class FinanceController {
  private service = new FinanceService();

  async createTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: CreateTransactionDTO = req.body;

      if (!dto.type || !dto.reference_no || !dto.description || !dto.amount) {
        throw validationError(
          "Missing required fields: type, reference_no, description, amount"
        );
      }

      const result = await this.service.createTransaction(dto);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.getTransaction(id);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async listTransactions(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const query: TransactionListQueryDTO = req.query as any;

      const result = await this.service.listTransactions(query);

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

  async updateTransaction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const dto: UpdateTransactionDTO = req.body;

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.updateTransaction(id, dto);

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getFinancialReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw validationError(
          "Missing required query parameters: startDate, endDate"
        );
      }

      const result = await this.service.getFinancialReport(
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getRevenueAnalytics(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw validationError(
          "Missing required query parameters: startDate, endDate"
        );
      }

      const result = await this.service.getRevenueAnalytics(
        startDate as string,
        endDate as string
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async getMonthlyReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        throw validationError("Missing required query parameters: month, year");
      }

      const monthNum = parseInt(month as string);
      const yearNum = parseInt(year as string);

      if (isNaN(monthNum) || isNaN(yearNum)) {
        throw validationError("month and year must be valid numbers");
      }

      const result = await this.service.getMonthlyReport({
        month: monthNum,
        year: yearNum,
        includeExpenses: true,
        includeRevenue: true,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
