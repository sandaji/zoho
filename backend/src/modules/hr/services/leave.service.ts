
import { prisma } from "../../../lib/db";
import { AppError, ErrorCode } from "../../../lib/errors";

export class LeaveService {
  /**
   * Get all leave types
   */
  async getLeaveTypes() {
    return prisma.leaveType.findMany({
      orderBy: { name: 'asc' }
    });
  }

  /**
   * Get balance for a user
   */
  async getLeaveBalance(userId: string, year: number) {
    const types = await prisma.leaveType.findMany();
    const allocations = await prisma.leaveAllocation.findMany({
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
  async createRequest(userId: string, input: {
    leaveTypeId: string;
    startDate: string;
    endDate: string;
    reason?: string;
  }) {
    const { leaveTypeId, startDate, endDate, reason } = input;
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Simple day calculation (difference in days + 1)
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      throw new AppError(ErrorCode.INVALID_INPUT, 400, "Invalid date range");
    }

    // Check balance
    const year = start.getFullYear();
    const balance = await this.getLeaveBalance(userId, year);
    const typeBalance = balance.find(b => b.leaveType.id === leaveTypeId);

    if (!typeBalance || typeBalance.available < days) {
      throw new AppError(ErrorCode.INVALID_INPUT, 400, "Insufficient leave balance");
    }

    return prisma.leaveRequest.create({
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
  async getMyRequests(userId: string) {
    return prisma.leaveRequest.findMany({
      where: { userId },
      include: { leaveType: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Get all pending requests (for managers)
   */
  async getPendingRequests() {
    return prisma.leaveRequest.findMany({
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
  async updateRequestStatus(requestId: string, status: 'APPROVED' | 'REJECTED', processedBy: string) {
    const request = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { leaveType: true }
    });

    if (!request) {
      throw new AppError(ErrorCode.NOT_FOUND, 404, "Leave request not found");
    }

    if (request.status !== 'PENDING') {
      throw new AppError(ErrorCode.BAD_REQUEST, 400, "Request already processed");
    }

    return prisma.$transaction(async (tx) => {
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
