"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeaveService = void 0;
const db_1 = require("../../../lib/db");
const errors_1 = require("../../../lib/errors");
class LeaveService {
    /**
     * Get all leave types
     */
    async getLeaveTypes() {
        return db_1.prisma.leaveType.findMany({
            orderBy: { name: 'asc' }
        });
    }
    /**
     * Get balance for a user
     */
    async getLeaveBalance(userId, year) {
        const types = await db_1.prisma.leaveType.findMany();
        const allocations = await db_1.prisma.leaveAllocation.findMany({
            where: { userId, year },
            include: { leaveType: true }
        });
        // Merge allocations with types (handle cases where allocation doesn't exist yet)
        return types.map(type => {
            const allocation = allocations.find(a => a.leaveTypeId === type.id);
            return {
                leaveType: type,
                allocated: allocation?.allocated || 0,
                used: allocation?.used || 0,
                available: (allocation?.allocated || 0) - (allocation?.used || 0)
            };
        });
    }
    /**
     * Create a leave request
     */
    async createRequest(userId, input) {
        const { leaveTypeId, startDate, endDate, reason } = input;
        const start = new Date(startDate);
        const end = new Date(endDate);
        // Simple day calculation (difference in days + 1)
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        if (days <= 0) {
            throw new errors_1.AppError(errors_1.ErrorCode.INVALID_INPUT, 400, "Invalid date range");
        }
        // Check balance
        const year = start.getFullYear();
        const balance = await this.getLeaveBalance(userId, year);
        const typeBalance = balance.find(b => b.leaveType.id === leaveTypeId);
        if (!typeBalance || typeBalance.available < days) {
            throw new errors_1.AppError(errors_1.ErrorCode.INVALID_INPUT, 400, "Insufficient leave balance");
        }
        return db_1.prisma.leaveRequest.create({
            data: {
                userId,
                leaveTypeId,
                startDate: start,
                endDate: end,
                days,
                reason,
                status: 'PENDING'
            }
        });
    }
    /**
     * Get requests for a user
     */
    async getMyRequests(userId) {
        return db_1.prisma.leaveRequest.findMany({
            where: { userId },
            include: { leaveType: true },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * Get all pending requests (for managers)
     */
    async getPendingRequests() {
        return db_1.prisma.leaveRequest.findMany({
            where: { status: 'PENDING' },
            include: {
                user: { select: { id: true, name: true, email: true } },
                leaveType: true
            },
            orderBy: { createdAt: 'asc' }
        });
    }
    /**
     * Update request status (Approve/Reject)
     */
    async updateRequestStatus(requestId, status, processedBy) {
        const request = await db_1.prisma.leaveRequest.findUnique({
            where: { id: requestId },
            include: { leaveType: true }
        });
        if (!request) {
            throw new errors_1.AppError(errors_1.ErrorCode.NOT_FOUND, 404, "Leave request not found");
        }
        if (request.status !== 'PENDING') {
            throw new errors_1.AppError(errors_1.ErrorCode.BAD_REQUEST, 400, "Request already processed");
        }
        return db_1.prisma.$transaction(async (tx) => {
            const updatedRequest = await tx.leaveRequest.update({
                where: { id: requestId },
                data: {
                    status,
                    processedBy,
                    processedAt: new Date()
                }
            });
            if (status === 'APPROVED') {
                const year = request.startDate.getFullYear();
                // Update allocation
                await tx.leaveAllocation.update({
                    where: {
                        userId_leaveTypeId_year: {
                            userId: request.userId,
                            leaveTypeId: request.leaveTypeId,
                            year
                        }
                    },
                    data: {
                        used: { increment: request.days }
                    }
                });
            }
            return updatedRequest;
        });
    }
}
exports.LeaveService = LeaveService;
