import { Request, Response, NextFunction } from "express";
import { LeaveService } from "./services/leave.service";
import { AppError, ErrorCode } from "../../lib/errors";
import { HrService } from "./service";

const leaveService = new LeaveService();
const hrService = new HrService();

export class HRController {
  /**
   * Get HR stats for dashboard
   */
  async getHRStats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await hrService.getHRStats(req.authorizedBranchIds);
      res.json({ success: true, data: stats });
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
      const year = parseInt(req.query.year as string) || new Date().getFullYear();
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
      
      if (!['APPROVED', 'REJECTED'].includes(status)) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 400, "Invalid status");
      }

      const request = await leaveService.updateRequestStatus(id as string, status, processedBy);
      res.json({ success: true, data: request });
    } catch (error) {
      next(error);
    }
  }
}
