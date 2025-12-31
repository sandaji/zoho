/**
 * Branch Module - Controller Layer
 * Handles HTTP requests for branch dashboard operations
 */

import { Request, Response, NextFunction } from "express";
import { BranchService } from "../service/branch.service";
import { validationError } from "../../../lib/errors";

export class BranchController {
  private service = new BranchService();

  /**
   * GET /branches/:id/dashboard
   * Get complete branch dashboard with KPIs and metrics
   */
  async getDashboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw validationError("Branch ID is required");
      }

      const dashboard = await this.service.getBranchDashboard(id);

      res.status(200).json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      next(error);
    }
  }
}
