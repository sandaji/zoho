/**
 * Employee Controller
 * Handles employee management, role assignment, and transfers
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/db";
import { UserRole } from "../../types";
import { AppError, ErrorCode } from "../../lib/errors";
import { logger } from "../../lib/logger";
import { CodeGeneratorService } from "../../lib/code-generator.service";
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
          employeeCode: true,
          departmentId: true,
          department: { select: { id: true, name: true, prefix: true } },
          isActive: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              role: {
                select: { code: true },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      });

      // Map roles from RoleAssignment table
      const employeesWithRoles = employees.map((emp: any) => {
        const assignedRoles = emp.roles.map((r: any) => r.role.code);
        return {
          ...emp,
          role: assignedRoles.length > 0 ? assignedRoles[0] : emp.role,
        };
      });

      res.json({
        success: true,
        data: employeesWithRoles,
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
          employeeCode: true,
          departmentId: true,
          department: { select: { id: true, name: true, prefix: true } },
          isActive: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              role: {
                select: { code: true },
              },
            },
          },
        },
      });

      if (!employee) {
        throw new AppError(ErrorCode.NOT_FOUND, 404, "Employee not found");
      }

      // Map role from RoleAssignment table
      const assignedRoles = (employee as any).roles.map(
        (r: any) => r.role.code,
      );
      const employeeWithRole = {
        ...employee,
        role:
          assignedRoles.length > 0 ? assignedRoles[0] : (employee as any).role,
      };

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
          ...employeeWithRole,
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
      const { email, name, phone, password, role, branchId, departmentId } = req.body;

      // Validate required fields
      if (!email || !name) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Missing required fields: email, name",
        );
      }

      if (!departmentId) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "departmentId is required so the employee's code can be generated (HR sets up departments and their prefixes first).",
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
          `Email '${email}' already in use`,
        );
      }

      let targetBranchId = branchId;
      // Record-level isolation: Ensure manager can't create user for another branch
      if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
        if (!targetBranchId) {
          // Auto-assign to the manager's branch if none specified
          targetBranchId = req.authorizedBranchIds[0];
        } else if (!req.authorizedBranchIds.includes(targetBranchId)) {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            403,
            "Cannot create user for another branch",
          );
        }
      }

      // Validate branch exists if provided
      if (targetBranchId) {
        const branch = await prisma.branch.findUnique({
          where: { id: targetBranchId },
        });

        if (!branch) {
          throw new AppError(ErrorCode.NOT_FOUND, 404, "Branch not found");
        }
      }

      // Employee code: HR-configured 2-letter department prefix + an
      // auto-incrementing number scoped to that department (e.g. JS001).
      // Claimed atomically before the user row is written.
      const employeeCode = await CodeGeneratorService.generateEmployeeCode(departmentId);

      // Hash password if provided, otherwise create a dummy hash since it's required by the schema
      // Employees created here do NOT have system access initially
      const passwordToHash =
        password || Math.random().toString(36).slice(-10) + "NoAccess!";
      const passwordHash = await bcrypt.hash(passwordToHash, 10);

      const employee = await prisma.user.create({
        data: {
          email,
          name,
          phone,
          passwordHash,
          role: role || "cashier",
          branchId: targetBranchId,
          departmentId,
          employeeCode,
          hasSystemAccess: false,
        },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          branchId: true,
          branch: { select: { id: true, name: true } },
          employeeCode: true,
          departmentId: true,
          department: { select: { id: true, name: true, prefix: true } },
          isActive: true,
          createdAt: true,
        },
      });

      logger.info(`Employee created: ${employee.id} (${employee.employeeCode})`);

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
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { name, phone, role, branchId, isActive, departmentId } = req.body;

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

      // Department reassignment: validate the new department exists.
      // An employee who doesn't yet have a code (legacy record, or one
      // created before departments existed) gets one generated now, scoped
      // to whichever department they're being assigned into. Employees who
      // already have a code keep it — moving departments later doesn't
      // reissue a new code.
      let employeeCodeUpdate: string | undefined;
      if (departmentId && departmentId !== employee.departmentId) {
        await CodeGeneratorService.getDepartment(departmentId);
        if (!employee.employeeCode) {
          employeeCodeUpdate = await CodeGeneratorService.generateEmployeeCode(departmentId);
        }
      }

      const updatedEmployee = await prisma.user.update({
        where: { id },
        data: {
          name: name ?? employee.name,
          phone: phone ?? employee.phone,
          role: role ?? employee.role,
          branchId: branchId ?? employee.branchId,
          departmentId: departmentId ?? employee.departmentId,
          ...(employeeCodeUpdate ? { employeeCode: employeeCodeUpdate } : {}),
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
          employeeCode: true,
          departmentId: true,
          department: { select: { id: true, name: true, prefix: true } },
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
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;
      const { toBranchId, toRole, effectiveDate, reason, notes, approvedBy } =
        req.body;

      // Validate required fields
      if (!toBranchId || !toRole) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Missing required fields: toBranchId, toRole",
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
          `Invalid role: ${toRole}`,
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
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

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
      const id = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

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
          "Cannot delete employee with associated records. Archive instead or delete related records first.",
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

  // ============================================================
  // Departments (HR-managed employee code prefixes)
  // ============================================================

  /**
   * List all departments, each with its HR-chosen prefix, current
   * employee count, and next code preview.
   */
  async listDepartments(req: Request, res: Response, next: NextFunction) {
    try {
      const departments = await CodeGeneratorService.listDepartments();
      const data = departments.map((d: any) => ({
        id: d.id,
        name: d.name,
        prefix: d.prefix,
        isActive: d.isActive,
        employeeCount: d._count.users,
        nextCode: `${d.prefix}${String(d.nextNumber).padStart(3, "0")}`,
        createdAt: d.createdAt,
      }));

      res.json({
        success: true,
        data,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * HR creates a department with its own 2-letter code prefix, e.g.
   * { name: "Junior Staff", prefix: "JS" } → employees get JS001, JS002...
   */
  async createDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, prefix } = req.body;

      if (!name || !prefix) {
        throw new AppError(
          ErrorCode.VALIDATION_ERROR,
          400,
          "Missing required fields: name, prefix",
        );
      }

      const department = await CodeGeneratorService.createDepartment(name, prefix);

      logger.info(`Department created: ${department.id} (${department.prefix})`);

      res.status(201).json({
        success: true,
        data: {
          ...department,
          nextCode: `${department.prefix}${String(department.nextNumber).padStart(3, "0")}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * HR updates a department's name, prefix, or active status.
   * Changing the prefix does not reset that department's counter.
   */
  async updateDepartment(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
      const { name, prefix, isActive } = req.body;

      const department = await CodeGeneratorService.updateDepartment(id, {
        name,
        prefix,
        isActive,
      });

      logger.info(`Department updated: ${id}`);

      res.json({
        success: true,
        data: {
          ...department,
          nextCode: `${department.prefix}${String(department.nextNumber).padStart(3, "0")}`,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
