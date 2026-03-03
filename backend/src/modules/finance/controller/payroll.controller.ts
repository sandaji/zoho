/**
 * Payroll Module - Controller Layer
 * Handles HTTP requests for payroll processing and management
 */

import { Request, Response, NextFunction } from "express";
import { PayrollService } from "../service/payroll.service";
import { PayrollRunDTO } from "../dto";
import { validationError } from "../../../lib/errors";

export class PayrollController {
  private service = new PayrollService();

  /**
   * Run payroll for employees in a given period
   */
  async runPayroll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const dto: PayrollRunDTO = req.body;

      // Validate required fields
      if (!dto.period_start || !dto.period_end || !dto.month || !dto.year) {
        throw validationError(
          "Missing required fields: period_start, period_end, month, year"
        );
      }

      // Validate month
      if (dto.month < 1 || dto.month > 12) {
        throw validationError("month must be between 1 and 12");
      }

      // Validate dates
      const startDate = new Date(dto.period_start);
      const endDate = new Date(dto.period_end);

      if (startDate >= endDate) {
        throw validationError("period_start must be before period_end");
      }

      const result = await this.service.runPayroll(dto);

      res.status(201).json({
        success: true,
        data: result,
        message: `Payroll run completed for ${result.payroll_count} employees`,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get payroll report for a period
   */
  async getPayrollReport(
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

      const result = await this.service.getPayrollReport(
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

  /**
   * Get payroll analytics with trends
   */
  async getPayrollAnalytics(
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

      const result = await this.service.getPayrollAnalytics(
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

  /**
   * Get single payroll by ID
   */
  async getPayroll(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

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

  /**
   * Update payroll status
   */
  async updatePayrollStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };
      const { status, paid_date } = req.body;

      if (!id) {
        throw validationError("ID is required");
      }

      if (!status) {
        throw validationError("status is required");
      }

      const result = await this.service.updatePayrollStatus(
        id,
        status,
        paid_date
      );

      res.json({
        success: true,
        data: result,
        message: `Payroll status updated to ${status}`,
      });
    } catch (error) {
      next(error);
    }
  }
}
