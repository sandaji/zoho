/**
 * Payroll Module - Controller Layer
 * Handles HTTP requests for payroll processing and management
 */

import { Request, Response, NextFunction } from "express";
import { PayrollService } from "../services/payroll.service";
import { PayrollRunDTO } from "../dtos";
import { validationError } from "@core/errors/errors";
import { HrService } from "../../hr/services";

export class PayrollController {
  private service = new PayrollService();
  private hrService = new HrService();

  /**
   * Submit draft payroll records for review in a given period
   */
  async runPayroll(
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> {
    try {
      const dto: PayrollRunDTO = req.body;

      // Validate required fields
      if (!dto.period_start || !dto.period_end || !dto.month || !dto.year) {
        throw validationError(
          "Missing required fields: period_start, period_end, month, year",
        );
      }

      // Validate month
      if (dto.month < 1 || dto.month > 12) {
        throw validationError("month must be between 1 and 12");
      }

      // Validate dates
      const startDate = new Date(dto.period_start);
      const endDate = new Date(dto.period_end);

      if (!Number.isFinite(startDate.getTime()) || !Number.isFinite(endDate.getTime()) || startDate > endDate) {
        throw validationError("A valid payroll period is required");
      }

      const result = await this.service.runPayroll(dto, {
        authorizedBranchIds: req.authorizedBranchIds,
        onlyOwnedRecords: req.onlyOwnedRecords,
        userId: req.user?.userId,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: `${result.payroll_count} draft payroll record(s) submitted for review`,
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
    next: NextFunction,
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw validationError(
          "Missing required query parameters: startDate, endDate",
        );
      }

      const result = await this.service.getPayrollReport(startDate as string, endDate as string, {
        authorizedBranchIds: req.authorizedBranchIds,
        onlyOwnedRecords: req.onlyOwnedRecords,
        userId: req.user?.userId,
      });

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
    next: NextFunction,
  ): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        throw validationError(
          "Missing required query parameters: startDate, endDate",
        );
      }

      const result = await this.service.getPayrollAnalytics(startDate as string, endDate as string, {
        authorizedBranchIds: req.authorizedBranchIds,
        onlyOwnedRecords: req.onlyOwnedRecords,
        userId: req.user?.userId,
      });

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
    next: NextFunction,
  ): Promise<void> {
    try {
      const { id } = req.params as { id: string };

      if (!id) {
        throw validationError("ID is required");
      }

      const result = await this.service.getPayroll(id, {
        authorizedBranchIds: req.authorizedBranchIds,
        onlyOwnedRecords: req.onlyOwnedRecords,
        userId: req.user?.userId,
      });

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
    next: NextFunction,
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

      const result = await this.hrService.updatePayroll(id, { status, paid_date, payment_method: req.body.payment_method }, {
        authorizedBranchIds: req.authorizedBranchIds,
        onlyOwnedRecords: req.onlyOwnedRecords,
        userId: req.user?.userId,
      });

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
