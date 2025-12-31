"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HrService = void 0;
const db_1 = require("../../../lib/db");
const logger_1 = require("../../../lib/logger");
const errors_1 = require("../../../lib/errors");
class HrService {
    constructor() {
        this.prisma = db_1.prisma;
    }
    // HR DASHBOARD STATS
    async getHRStats(authorizedBranchIds) {
        try {
            const branchFilter = authorizedBranchIds && authorizedBranchIds.length > 0
                ? { branchId: { in: authorizedBranchIds } }
                : {};
            const [totalEmployees, activeJobPostings, pendingLeaveRequests, upcomingEvaluations] = await Promise.all([
                this.prisma.user.count({
                    where: {
                        isActive: true,
                        ...branchFilter
                    }
                }),
                this.prisma.jobPosting.count({ where: { status: 'PUBLISHED' } }), // Job postings are usually not branch-bound in this schema yet
                this.prisma.leaveRequest.count({
                    where: {
                        status: 'PENDING',
                        user: branchFilter
                    }
                }),
                this.prisma.performanceEvaluation.count({
                    where: {
                        date: { gte: new Date() }, // Future reviews
                        user: branchFilter
                    }
                }),
            ]);
            return {
                totalEmployees,
                activeJobPostings,
                pendingLeaveRequests,
                upcomingEvaluations
            };
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to fetch HR stats");
            throw error;
        }
    }
    // USER OPERATIONS
    async createUser(dto) {
        try {
            logger_1.logger.debug({ email: dto.email }, "Creating user");
            const user = await this.prisma.user.create({
                data: {
                    email: dto.email,
                    passwordHash: dto.password, // In production, hash this!
                    name: dto.name,
                    phone: dto.phone,
                    role: dto.role,
                    branchId: dto.branchId,
                },
            });
            logger_1.logger.info({ id: user.id, email: user.email }, "User created");
            return this.formatUserResponse(user);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to create user");
            throw error;
        }
    }
    async getUser(id, authorizedBranchIds) {
        try {
            const where = { id };
            if (authorizedBranchIds && authorizedBranchIds.length > 0) {
                where.branchId = { in: authorizedBranchIds };
            }
            const user = await this.prisma.user.findFirst({
                where,
            });
            if (!user) {
                throw (0, errors_1.notFoundError)("User", id);
            }
            return this.formatUserResponse(user);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to fetch user");
            throw error;
        }
    }
    async updateUser(id, dto, authorizedBranchIds) {
        try {
            const where = { id };
            if (authorizedBranchIds && authorizedBranchIds.length > 0) {
                where.branchId = { in: authorizedBranchIds };
            }
            const user = await this.prisma.user.findFirst({ where });
            if (!user) {
                throw (0, errors_1.notFoundError)("User", id);
            }
            const updated = await this.prisma.user.update({
                where: { id },
                data: {
                    name: dto.name ?? user.name,
                    phone: dto.phone ?? user.phone,
                    role: dto.role,
                    branchId: dto.branchId ?? user.branchId,
                    isActive: dto.isActive ?? user.isActive,
                },
            });
            logger_1.logger.info({ id, name: updated.name }, "User updated");
            return this.formatUserResponse(updated);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to update user");
            throw error;
        }
    }
    // PAYROLL OPERATIONS
    async createPayroll(dto) {
        try {
            logger_1.logger.debug({ userId: dto.userId }, "Creating payroll");
            const calculation = this.calculateNetSalary({
                baseSalary: dto.base_salary,
                allowances: dto.allowances || 0,
                deductions: dto.deductions || 0,
            });
            const payroll = await this.prisma.payroll.create({
                data: {
                    payroll_no: `PAY-${Date.now()}`,
                    status: "draft",
                    userId: dto.userId,
                    base_salary: dto.base_salary,
                    allowances: dto.allowances || 0,
                    deductions: dto.deductions || 0,
                    net_salary: calculation.netSalary,
                    period_start: new Date(dto.period_start),
                    period_end: new Date(dto.period_end),
                    notes: dto.notes,
                },
            });
            logger_1.logger.info({
                id: payroll.id,
                payrollNo: payroll.payroll_no,
            }, "Payroll created");
            return this.formatPayrollResponse(payroll);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to create payroll");
            throw error;
        }
    }
    async getPayroll(id) {
        try {
            const payroll = await this.prisma.payroll.findUnique({
                where: { id },
            });
            if (!payroll) {
                throw (0, errors_1.notFoundError)("Payroll", id);
            }
            return this.formatPayrollResponse(payroll);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to fetch payroll");
            throw error;
        }
    }
    async listPayroll(query, authorizedBranchIds) {
        try {
            const page = query.page || 1;
            const limit = query.limit || 20;
            const skip = (page - 1) * limit;
            const where = {};
            if (authorizedBranchIds && authorizedBranchIds.length > 0) {
                where.user = { branchId: { in: authorizedBranchIds } };
            }
            if (query.status)
                where.status = query.status;
            if (query.userId) {
                // If we already have a branch filter, we need to be careful with nested AND
                if (where.user) {
                    where.user.id = query.userId;
                }
                else {
                    where.userId = query.userId;
                }
            }
            if (query.startDate || query.endDate) {
                where.period_start = {};
                if (query.startDate) {
                    where.period_start.gte = new Date(query.startDate);
                }
                if (query.endDate) {
                    where.period_start.lte = new Date(query.endDate);
                }
            }
            const [data, total] = await Promise.all([
                this.prisma.payroll.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { period_start: "desc" },
                }),
                this.prisma.payroll.count({ where }),
            ]);
            return {
                data: data.map((p) => this.formatPayrollResponse(p)),
                total,
            };
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to list payroll");
            throw error;
        }
    }
    async updatePayroll(id, dto) {
        try {
            const payroll = await this.prisma.payroll.findUnique({ where: { id } });
            if (!payroll) {
                throw (0, errors_1.notFoundError)("Payroll", id);
            }
            const base = dto.base_salary ?? payroll.base_salary;
            const allowances = dto.allowances ?? payroll.allowances;
            const deductions = dto.deductions ?? payroll.deductions;
            const calculation = this.calculateNetSalary({
                baseSalary: base,
                allowances,
                deductions,
            });
            const updated = await this.prisma.payroll.update({
                where: { id },
                data: {
                    status: dto.status,
                    base_salary: base,
                    allowances,
                    deductions,
                    net_salary: calculation.netSalary,
                    paid_date: dto.paid_date ? new Date(dto.paid_date) : undefined,
                    notes: dto.notes,
                },
            });
            logger_1.logger.info({ id, status: updated.status }, "Payroll updated");
            return this.formatPayrollResponse(updated);
        }
        catch (error) {
            logger_1.logger.error({ err: error }, "Failed to update payroll");
            throw error;
        }
    }
    calculateNetSalary(dto) {
        const netSalary = dto.baseSalary + dto.allowances - dto.deductions;
        return {
            baseSalary: dto.baseSalary,
            allowances: dto.allowances,
            deductions: dto.deductions,
            netSalary: Math.max(0, netSalary),
        };
    }
    formatUserResponse(user) {
        return {
            id: user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            role: user.role,
            branchId: user.branchId,
            isActive: user.isActive,
            createdAt: user.createdAt.toISOString(),
            updatedAt: user.updatedAt.toISOString(),
        };
    }
    formatPayrollResponse(payroll) {
        return {
            id: payroll.id,
            payroll_no: payroll.payroll_no,
            status: payroll.status,
            userId: payroll.userId,
            base_salary: payroll.base_salary,
            allowances: payroll.allowances,
            deductions: payroll.deductions,
            net_salary: payroll.net_salary,
            period_start: payroll.period_start.toISOString(),
            period_end: payroll.period_end.toISOString(),
            paid_date: payroll.paid_date?.toISOString(),
            notes: payroll.notes,
        };
    }
}
exports.HrService = HrService;
