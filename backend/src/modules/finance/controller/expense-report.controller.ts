import { Request, Response, NextFunction } from "express";
import { ExpenseReportService } from "../services/expense-report.service";
import { ExpenseReportStatus } from "../../../generated";
import { PermissionService } from "../../auth/service/permission.service";
import { logger } from "../../../lib/logger";

// Same reasoning as purchasing.controller.ts / requisition.controller.ts:
// the JWT doesn't carry permissions, so they're resolved live per request.
async function getUserPermissions(req: Request): Promise<string[]> {
  // @ts-ignore
  const userId = (req.user as any)?.userId;
  if (!userId) return [];
  return PermissionService.getUserPermissions(userId);
}

export class ExpenseReportController {
  private service = new ExpenseReportService();

  async createExpenseReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // @ts-ignore
      const userId = (req.user as any)?.userId;
      const report = await this.service.createExpenseReport(userId, req.body);
      res.status(201).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error creating expense report:");
      next(error);
    }
  }

  async updateExpenseReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const report = await this.service.updateExpenseReport(id as string, req.body);
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error updating expense report:");
      next(error);
    }
  }

  async getExpenseReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const report = await this.service.getExpenseReport(id as string);
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error fetching expense report:");
      next(error);
    }
  }

  async listExpenseReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // @ts-ignore
      const userId = (req.user as any)?.userId;
      const userPermissions = await getUserPermissions(req);
      const { status, departmentId, skip, take } = req.query;

      const result = await this.service.listExpenseReports({
        status: status as ExpenseReportStatus | undefined,
        departmentId: departmentId as string | undefined,
        skip: skip ? parseInt(skip as string) : undefined,
        take: take ? parseInt(take as string) : undefined,
        userId,
        userPermissions,
      });
      res.status(200).json({ status: "success", data: result });
    } catch (error) {
      logger.error(error, "Error listing expense reports:");
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // @ts-ignore
      const userId = (req.user as any)?.userId;
      const userPermissions = await getUserPermissions(req);
      const { status, rejectionReason } = req.body;
      const { id } = req.params;

      const report = await this.service.updateStatus(
        id as string,
        status,
        userId,
        userPermissions,
        rejectionReason,
      );
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error updating expense report status:");
      next(error);
    }
  }

  async postToGL(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // @ts-ignore
      const userId = (req.user as any)?.userId;
      const { id } = req.params;
      const report = await this.service.postToGL(id as string, userId);
      res.status(200).json({ status: "success", data: report });
    } catch (error) {
      logger.error(error, "Error posting expense report to GL:");
      next(error);
    }
  }
}

export default new ExpenseReportController();
