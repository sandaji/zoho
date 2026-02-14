/**
 * Employee Controller
 * Handles employee management, role assignment, and transfers
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/db";
import { UserRole } from "../../types";
import { AppError, ErrorCode } from "../../lib/errors";
import { logger } from "../../lib/logger";
import * as bcrypt from "bcrypt";

export class EmployeeController {
  /**
   * Get all employees with optional filtering
   */
  async getAllEmployees(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, role, branchId, isActive } = req.query;

      const where: any = {};

      if (role) {
        where.role = role as UserRole;
      }

      // Record-level isolation: Enforce authorized branches from middleware
      if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
        where.branchId = { in: req.authorizedBranchIds };
      } else if (branchId) {
        where.branchId = branchId as string;
      }

      if (isActive !== undefined) {
        where.isActive = isActive === "true";
      }

      if (search) {
        where.OR = [
          { name: { contains: search as string, mode: "insensitive" } },
          { email: { contains: search as string, mode: "insensitive" } },
          { phone: { contains: search as string, mode: "insensitive" } },
        ];
      }

      const employees = await prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: { select: { id: true, name: true, code: true } },
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { name: "asc" },
      });

      res.json({
        success: true,
        data: employees,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single employee with transfer history
   */
  async getEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const where: any = { id };
      if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
        where.branchId = { in: req.authorizedBranchIds };
      }

      const employee = await prisma.user.findFirst({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: { select: { id: true, name: true, code: true } },
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!employee) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Employee not found");
      }

      // Get transfer history
      const transfers = await (prisma as any).employeeTransfer.findMany({
        where: { userId: id },
        include: {
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
        },
        orderBy: { transferDate: "desc" },
      });

      res.json({
        success: true,
        data: {
          ...employee,
          transfers,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new employee
   */
  async createEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, name, phone, password, role, branchId } = req.body;

      // Validate required fields
      if (!email || !name || !password) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Missing required fields: email, name, password"
        );
      }

      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          `Email '${email}' already in use`
        );
      }

      // Record-level isolation: Ensure manager can't create user for another branch
      if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
        if (!branchId || !req.authorizedBranchIds.includes(branchId)) {
          throw new AppError(ErrorCode.FORBIDDEN, 403, "Cannot create user for another branch");
        }
      }

      // Validate branch exists if provided
      if (branchId) {
        const branch = await prisma.branch.findUnique({
          where: { id: branchId },
        });

        if (!branch) {
          throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
        }
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      const employee = await prisma.user.create({
        data: {
          email,
          name,
          phone,
          passwordHash,
          role: role || "cashier",
          branchId,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          isActive: true,
          createdAt: true,
        },
      });

      logger.info(`Employee created: ${employee.id}`);

      res.status(201).json({
        success: true,
        data: employee,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update employee
   */
  async updateEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { name, phone, role, branchId, isActive } = req.body;

      const where: any = { id };
      if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
        where.branchId = { in: req.authorizedBranchIds };
      }

      const employee = await prisma.user.findFirst({ where });

      if (!employee) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Employee not found");
      }

      // Validate branch exists if updating branchId
      if (branchId && branchId !== employee.branchId) {
        const branch = await prisma.branch.findUnique({
          where: { id: branchId },
        });

        if (!branch) {
          throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
        }
      }

      const updatedEmployee = await prisma.user.update({
        where: { id },
        data: {
          name: name ?? employee.name,
          phone: phone ?? employee.phone,
          role: role ?? employee.role,
          branchId: branchId ?? employee.branchId,
          isActive: isActive ?? employee.isActive,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      logger.info(`Employee updated: ${id}`);

      res.json({
        success: true,
        data: updatedEmployee,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Transfer employee to different branch and/or role
   */
  async transferEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { toBranchId, toRole, effectiveDate, reason, notes, approvedBy } =
        req.body;

      // Validate required fields
      if (!toBranchId || !toRole) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Missing required fields: toBranchId, toRole"
        );
      }

      // Get employee
      const employee = await prisma.user.findUnique({
        where: { id },
        include: { branch: { select: { id: true, name: true } } },
      });

      if (!employee) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Employee not found");
      }

      // Validate target branch exists
      const targetBranch = await prisma.branch.findUnique({
        where: { id: toBranchId },
      });

      if (!targetBranch) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Target branch not found");
      }

      // Validate role
      const validRoles = [
        "cashier",
        "warehouse_staff",
        "driver",
        "branch_manager",
        "hr",
        "accountant",
        "manager",
        "admin",
      ];
      if (!validRoles.includes(toRole)) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          `Invalid role: ${toRole}`
        );
      }

      // Create transfer record
      const transfer = await (prisma as any).employeeTransfer.create({
        data: {
          userId: id,
          fromBranchId: employee.branchId,
          fromRole: employee.role,
          toBranchId,
          toRole,
          effectiveDate: new Date(effectiveDate || new Date()),
          reason,
          notes,
          approvedBy,
          approvedAt: approvedBy ? new Date() : null,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          fromBranch: { select: { id: true, name: true } },
          toBranch: { select: { id: true, name: true } },
        },
      });

      // Update employee if effective date is today or past
      if (new Date(effectiveDate || new Date()) <= new Date()) {
        await prisma.user.update({
          where: { id },
          data: {
            branchId: toBranchId,
            role: toRole as UserRole,
          },
        });
      }

      logger.info(`Employee transferred: ${id}`);

      res.status(201).json({
        success: true,
        data: transfer,
        message: "Employee transfer initiated successfully",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get employee transfer history
   */
  async getTransferHistory(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      // Verify employee exists
      const employee = await prisma.user.findUnique({ where: { id } });

      if (!employee) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Employee not found");
      }

      const transfers = await (prisma as any).employeeTransfer.findMany({
        where: { userId: id },
        include: {
          fromBranch: { select: { id: true, name: true, code: true } },
          toBranch: { select: { id: true, name: true, code: true } },
        },
        orderBy: { transferDate: "desc" },
      });

      res.json({
        success: true,
        data: transfers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete employee
   */
  async deleteEmployee(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const where: any = { id };
      if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
        where.branchId = { in: req.authorizedBranchIds };
      }

      const employee = await prisma.user.findFirst({
        where,
        include: {
          createdSalesDocuments: { select: { id: true } },
          deliveries: { select: { id: true } },
          payrollRecords: { select: { id: true } },
        },
      });

      if (!employee) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Employee not found");
      }

      // Check if employee has dependencies
      if (
        employee.createdSalesDocuments.length > 0 ||
        employee.deliveries.length > 0 ||
        employee.payrollRecords.length > 0
      ) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Cannot delete employee with associated records. Archive instead or delete related records first."
        );
      }

      await prisma.user.delete({ where: { id } });

      logger.info(`Employee deleted: ${id}`);

      res.json({
        success: true,
        message: "Employee deleted successfully",
      });
    } catch (error) {
      next(error);
    }
  }
}
