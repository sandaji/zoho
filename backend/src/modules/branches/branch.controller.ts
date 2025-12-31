/**
 * Branch Controller
 * Handles branch management operations
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/db";
import { AppError, ErrorCode } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { BranchService } from "../finance/service/branch.service";

export class BranchController {
  private branchService = new BranchService();

  /**
   * Get all branches with employee count
   */
  async getAllBranches(_req: Request, res: Response, next: NextFunction) {
    try {
      const branches = await this.branchService.getAllBranchSummaries();

      res.json({
        success: true,
        data: branches,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single branch
   */
  async getBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const branch = await prisma.branch.findUnique({
        where: { id },
        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              isActive: true,
            },
          },
          warehouses: {
            select: { id: true, name: true, location: true, capacity: true },
          },
        },
      });

      if (!branch) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
      }

      res.json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new branch
   */
  async createBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, name, city, address, phone } = req.body;

      // Validate required fields
      if (!code || !name || !city) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Missing required fields: code, name, city"
        );
      }

      // Check if code already exists
      const existingBranch = await prisma.branch.findUnique({
        where: { code },
      });

      if (existingBranch) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          `Branch code '${code}' already exists`
        );
      }

      const branch = await prisma.branch.create({
        data: {
          code,
          name,
          city,
          address,
          phone,
        },
      });

      // Optional: Assign manager if managerId provided
      if (req.body.managerId) {
        await prisma.user.update({
          where: { id: req.body.managerId },
          data: { branchId: branch.id, role: "manager" }
        });
      }

      logger.info(`Branch created: ${branch.id}`);

      res.status(201).json({
        success: true,
        data: branch,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update branch
   */
  async updateBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, city, address, phone, isActive } = req.body;

      const branch = await prisma.branch.findUnique({ where: { id } });

      if (!branch) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
      }

      const updatedBranch = await prisma.branch.update({
        where: { id },
        data: {
          name: name ?? branch.name,
          city: city ?? branch.city,
          address: address ?? branch.address,
          phone: phone ?? branch.phone,
          isActive: isActive ?? branch.isActive,
        },
      });

      // Optional: Update manager
      if (req.body.managerId) {
        // Clear previous managers for this branch if needed, or just set the new one
        await prisma.user.update({
          where: { id: req.body.managerId },
          data: { branchId: id, role: "manager" }
        });
      }

      logger.info(`Branch updated: ${id}`);

      res.json({
        success: true,
        data: updatedBranch,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete branch
   */
  async deleteBranch(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const branch = await prisma.branch.findUnique({
        where: { id },
        include: {
          users: { select: { id: true } },
          warehouses: { select: { id: true } },
          sales: { select: { id: true } },
        },
      });

      if (!branch) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
      }

      // Check if branch has dependencies
      if (
        branch.users.length > 0 ||
        branch.warehouses.length > 0 ||
        branch.sales.length > 0
      ) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Cannot delete branch with associated employees, warehouses, or sales. Transfer or delete them first."
        );
      }

      await prisma.branch.delete({ where: { id } });

      logger.info(`Branch deleted: ${id}`);

      res.json({
        success: true,
        message: "Branch deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get branch statistics/dashboard
   */
  async getBranchStats(req: Request, res: Response, next: NextFunction) {
    try {
      const { branchId } = req.query;
      if (!branchId || typeof branchId !== 'string') {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Branch ID is required");
      }

      const stats = await this.branchService.getBranchDashboard(branchId);
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}
