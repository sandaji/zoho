"use strict";
/**
 * Employee Controller
 * Handles employee management, role assignment, and transfers
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeController = void 0;
const db_1 = require("../../lib/db");
const errors_1 = require("../../lib/errors");
const logger_1 = require("../../lib/logger");
const bcrypt = __importStar(require("bcrypt"));
class EmployeeController {
    /**
     * Get all employees with optional filtering
     */
    async getAllEmployees(req, res, next) {
        try {
            const { search, role, branchId, isActive } = req.query;
            const where = {};
            if (role) {
                where.role = role;
            }
            // Record-level isolation: Enforce authorized branches from middleware
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                where.branchId = { in: req.authorizedBranchIds };
            }
            else if (branchId) {
                where.branchId = branchId;
            }
            if (isActive !== undefined) {
                where.isActive = isActive === "true";
            }
            if (search) {
                where.OR = [
                    { name: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { phone: { contains: search, mode: "insensitive" } },
                ];
            }
            const employees = await db_1.prisma.user.findMany({
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get single employee with transfer history
     */
    async getEmployee(req, res, next) {
        try {
            const { id } = req.params;
            const where = { id };
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                where.branchId = { in: req.authorizedBranchIds };
            }
            const employee = await db_1.prisma.user.findFirst({
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
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Employee not found");
            }
            // Get transfer history
            const transfers = await db_1.prisma.employeeTransfer.findMany({
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create new employee
     */
    async createEmployee(req, res, next) {
        try {
            const { email, name, phone, password, role, branchId } = req.body;
            // Validate required fields
            if (!email || !name || !password) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Missing required fields: email, name, password");
            }
            // Check if email already exists
            const existingUser = await db_1.prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, `Email '${email}' already in use`);
            }
            // Record-level isolation: Ensure manager can't create user for another branch
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                if (!branchId || !req.authorizedBranchIds.includes(branchId)) {
                    throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, "Cannot create user for another branch");
                }
            }
            // Validate branch exists if provided
            if (branchId) {
                const branch = await db_1.prisma.branch.findUnique({
                    where: { id: branchId },
                });
                if (!branch) {
                    throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Branch not found");
                }
            }
            // Hash password
            const passwordHash = await bcrypt.hash(password, 10);
            const employee = await db_1.prisma.user.create({
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
            logger_1.logger.info(`Employee created: ${employee.id}`);
            res.status(201).json({
                success: true,
                data: employee,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update employee
     */
    async updateEmployee(req, res, next) {
        try {
            const { id } = req.params;
            const { name, phone, role, branchId, isActive } = req.body;
            const where = { id };
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                where.branchId = { in: req.authorizedBranchIds };
            }
            const employee = await db_1.prisma.user.findFirst({ where });
            if (!employee) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Employee not found");
            }
            // Validate branch exists if updating branchId
            if (branchId && branchId !== employee.branchId) {
                const branch = await db_1.prisma.branch.findUnique({
                    where: { id: branchId },
                });
                if (!branch) {
                    throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Branch not found");
                }
            }
            const updatedEmployee = await db_1.prisma.user.update({
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
            logger_1.logger.info(`Employee updated: ${id}`);
            res.json({
                success: true,
                data: updatedEmployee,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Transfer employee to different branch and/or role
     */
    async transferEmployee(req, res, next) {
        try {
            const { id } = req.params;
            const { toBranchId, toRole, effectiveDate, reason, notes, approvedBy } = req.body;
            // Validate required fields
            if (!toBranchId || !toRole) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Missing required fields: toBranchId, toRole");
            }
            // Get employee
            const employee = await db_1.prisma.user.findUnique({
                where: { id },
                include: { branch: { select: { id: true, name: true } } },
            });
            if (!employee) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Employee not found");
            }
            // Validate target branch exists
            const targetBranch = await db_1.prisma.branch.findUnique({
                where: { id: toBranchId },
            });
            if (!targetBranch) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Target branch not found");
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
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, `Invalid role: ${toRole}`);
            }
            // Create transfer record
            const transfer = await db_1.prisma.employeeTransfer.create({
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
                await db_1.prisma.user.update({
                    where: { id },
                    data: {
                        branchId: toBranchId,
                        role: toRole,
                    },
                });
            }
            logger_1.logger.info(`Employee transferred: ${id}`);
            res.status(201).json({
                success: true,
                data: transfer,
                message: "Employee transfer initiated successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get employee transfer history
     */
    async getTransferHistory(req, res, next) {
        try {
            const { id } = req.params;
            // Verify employee exists
            const employee = await db_1.prisma.user.findUnique({ where: { id } });
            if (!employee) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Employee not found");
            }
            const transfers = await db_1.prisma.employeeTransfer.findMany({
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
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete employee
     */
    async deleteEmployee(req, res, next) {
        try {
            const { id } = req.params;
            const where = { id };
            if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
                where.branchId = { in: req.authorizedBranchIds };
            }
            const employee = await db_1.prisma.user.findFirst({
                where,
                include: {
                    sales: { select: { id: true } },
                    deliveries: { select: { id: true } },
                    payrollRecords: { select: { id: true } },
                },
            });
            if (!employee) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Employee not found");
            }
            // Check if employee has dependencies
            if (employee.sales.length > 0 ||
                employee.deliveries.length > 0 ||
                employee.payrollRecords.length > 0) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Cannot delete employee with associated records. Archive instead or delete related records first.");
            }
            await db_1.prisma.user.delete({ where: { id } });
            logger_1.logger.info(`Employee deleted: ${id}`);
            res.json({
                success: true,
                message: "Employee deleted successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.EmployeeController = EmployeeController;
