import { Request, Response, NextFunction } from "express";
import { LeaveService } from "./services/leave.service";
import { AppError, ErrorCode } from "../../lib/errors";
import { HrService } from "./service";
import { prisma } from "../../lib/db";

const leaveService = new LeaveService();
const hrService = new HrService();

export class HRController {
  /**
   * Get HR stats for dashboard
   */
  async getHRStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await hrService.getHRStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  }

  /**
   * List active departments — minimal reference-data endpoint, added for
   * the finance-department roadmap (Phase 2). The Department model has
   * existed since employee-numbering was built, but was never exposed via
   * any API route until now, so expense reports / purchase requisitions
   * had nothing to populate a cost-center dropdown from. Deliberately
   * open to any authenticated user (no specific permission) since anyone
   * submitting an expense or requisition needs to be able to pick their
   * own department.
   */
  async getDepartments(_req: Request, res: Response, next: NextFunction) {
    try {
      const departments = await prisma.department.findMany({
        where: { isActive: true },
        select: { id: true, name: true, prefix: true },
        orderBy: { name: "asc" },
      });
      res.json({ success: true, data: departments });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get leave types
   */
  async getLeaveTypes(_req: Request, res: Response, next: NextFunction) {
    try {
      const types = await leaveService.getLeaveTypes();
      res.json({ success: true, data: types });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get user leave balance
   */
  async getMyBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();
      const balance = await leaveService.getLeaveBalance(userId, year);
      res.json({ success: true, data: balance });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request leave
   */
  async requestLeave(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const request = await leaveService.createRequest(userId, req.body);
      res.status(201).json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get my requests
   */
  async getMyRequests(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const requests = await leaveService.getMyRequests(userId);
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get pending requests (Manager/Admin)
   */
  async getPendingRequests(_req: Request, res: Response, next: NextFunction) {
    try {
      const requests = await leaveService.getPendingRequests();
      res.json({ success: true, data: requests });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update request status (Manager/Admin)
   */
  async updateRequestStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const processedBy = (req as any).user.id;

      if (!["APPROVED", "REJECTED"].includes(status)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Invalid status");
      }

      const request = await leaveService.updateRequestStatus(
        id as string,
        status,
        processedBy,
      );
      res.json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }
}
