/**
 * Branch Controller
 * Thin controller layer — delegates to BranchService and AuthService
 */

import { Request, Response, NextFunction } from "express";
import { AppError, ErrorCode } from "../../lib/errors";
import { BranchService } from "./branch.service";
import { BranchService as FinanceBranchService } from "../finance/service/branch.service";
import { AuthService } from "../auth/service/auth.service";
import { CreateBranchDTO, UpdateBranchDTO } from "./branch.dto";

export class BranchController {
  private branchService = new BranchService();
  private financeBranchService = new FinanceBranchService();
  private authService = new AuthService();

  /**
   * GET /branches
   * Get all branches with enriched summary data
   */
  async getAllBranches(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, isActive, page, limit } = req.query;

      const result = await this.branchService.getAllBranches({
        search: search as string | undefined,
        isActive: isActive !== undefined ? isActive === "true" : undefined,
        page: page ? parseInt(page as string, 10) : undefined,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        authorizedBranchIds: req.authorizedBranchIds,
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
   * GET /branches/:id
   * Get single branch with users + warehouses
   */
  async getBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const branch = await this.branchService.getBranch(id);

      res.json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /branches
   * Create a new branch (Admin only)
   */
  async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const dto: CreateBranchDTO = req.body;
      const branch = await this.branchService.createBranch(dto);

      res.status(201).json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /branches/:id
   * Update a branch (Admin only)
   */
  async updateBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      const dto: UpdateBranchDTO = req.body;
      const branch = await this.branchService.updateBranch(id, dto);

      res.json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /branches/:id
   * Delete a branch (Admin only)
   */
  async deleteBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params as { id: string };
      await this.branchService.deleteBranch(id);

      res.json({
        success: true,
        message: "Branch deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /branches/:id/switch
   * Admin-only: re-issue JWT scoped to a different branch
   */
  async switchBranch(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        throw new AppError(ErrorCode.UNAUTHORIZED, 401, "Not authenticated");
      }

      const { id: targetBranchId } = req.params as { id: string };
      const result = await this.authService.switchBranch(req.user.userId, targetBranchId);

      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /branches/stats
   * Get branch statistics/dashboard
   */
  async getBranchStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.query;
      if (!branchId || typeof branchId !== "string") {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Branch ID is required");
      }

      const stats = await this.financeBranchService.getBranchDashboard(branchId);
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}
