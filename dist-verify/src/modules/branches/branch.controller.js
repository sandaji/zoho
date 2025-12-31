"use strict";
/**
 * Branch Controller
 * Handles branch management operations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BranchController = void 0;
const db_1 = require("../../lib/db");
const errors_1 = require("../../lib/errors");
const logger_1 = require("../../lib/logger");
const branch_service_1 = require("../finance/service/branch.service");
class BranchController {
    constructor() {
        this.branchService = new branch_service_1.BranchService();
    }
    /**
     * Get all branches with employee count
     */
    async getAllBranches(_req, res, next) {
        try {
            const branches = await this.branchService.getAllBranchSummaries();
            res.json({
                success: true,
                data: branches,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get single branch
     */
    async getBranch(req, res, next) {
        try {
            const { id } = req.params;
            const branch = await db_1.prisma.branch.findUnique({
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
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Branch not found");
            }
            res.json({
                success: true,
                data: branch,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Create new branch
     */
    async createBranch(req, res, next) {
        try {
            const { code, name, city, address, phone } = req.body;
            // Validate required fields
            if (!code || !name || !city) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Missing required fields: code, name, city");
            }
            // Check if code already exists
            const existingBranch = await db_1.prisma.branch.findUnique({
                where: { code },
            });
            if (existingBranch) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, `Branch code '${code}' already exists`);
            }
            const branch = await db_1.prisma.branch.create({
                data: {
                    code,
                    name,
                    city,
                    address,
                    phone,
                },
            });
            logger_1.logger.info(`Branch created: ${branch.id}`);
            res.status(201).json({
                success: true,
                data: branch,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Update branch
     */
    async updateBranch(req, res, next) {
        try {
            const { id } = req.params;
            const { name, city, address, phone, isActive } = req.body;
            const branch = await db_1.prisma.branch.findUnique({ where: { id } });
            if (!branch) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Branch not found");
            }
            const updatedBranch = await db_1.prisma.branch.update({
                where: { id },
                data: {
                    name: name ?? branch.name,
                    city: city ?? branch.city,
                    address: address ?? branch.address,
                    phone: phone ?? branch.phone,
                    isActive: isActive ?? branch.isActive,
                },
            });
            logger_1.logger.info(`Branch updated: ${id}`);
            res.json({
                success: true,
                data: updatedBranch,
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Delete branch
     */
    async deleteBranch(req, res, next) {
        try {
            const { id } = req.params;
            const branch = await db_1.prisma.branch.findUnique({
                where: { id },
                include: {
                    users: { select: { id: true } },
                    warehouses: { select: { id: true } },
                    sales: { select: { id: true } },
                },
            });
            if (!branch) {
                throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Branch not found");
            }
            // Check if branch has dependencies
            if (branch.users.length > 0 ||
                branch.warehouses.length > 0 ||
                branch.sales.length > 0) {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Cannot delete branch with associated employees, warehouses, or sales. Transfer or delete them first.");
            }
            await db_1.prisma.branch.delete({ where: { id } });
            logger_1.logger.info(`Branch deleted: ${id}`);
            res.json({
                success: true,
                message: "Branch deleted successfully",
            });
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * Get branch statistics/dashboard
     */
    async getBranchStats(req, res, next) {
        try {
            const { branchId } = req.query;
            if (!branchId || typeof branchId !== 'string') {
                throw new errors_1.AppError(errors_1.ErrorCode.VALIDATION_ERROR, 400, "Branch ID is required");
            }
            const stats = await this.branchService.getBranchDashboard(branchId);
            res.json({
                success: true,
                data: stats
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.BranchController = BranchController;
