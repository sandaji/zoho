import { Request, Response, NextFunction } from "express";
import { PurchaseRequisitionService } from "./requisition.service";
import { PurchaseRequisitionStatus } from "../../generated";
import { PermissionService } from "../auth/service/permission.service";

// Same reasoning as purchasing.controller.ts's identical helper: the JWT
// doesn't carry permissions (auth.service.ts only puts them in the login/
// refresh response body), so they're resolved live on each request via
// PermissionService — this also means a revoked permission takes effect
// immediately rather than waiting for token expiry.
async function getUserPermissions(req: Request): Promise<string[]> {
  const userId = (req as any).user?.userId;
  if (!userId) return [];
  return PermissionService.getUserPermissions(userId);
}

export class RequisitionController {
  private service = new PurchaseRequisitionService();

  createRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const requisition = await this.service.createRequisition(userId, req.body);
      res.status(201).json({ success: true, data: requisition });
    } catch (error) {
      next(error);
    }
  };

  updateRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requisition = await this.service.updateRequisition(req.params.id, req.body);
      res.status(200).json({ success: true, data: requisition });
    } catch (error) {
      next(error);
    }
  };

  getRequisition = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requisition = await this.service.getRequisition(req.params.id);
      res.status(200).json({ success: true, data: requisition });
    } catch (error) {
      next(error);
    }
  };

  listRequisitions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userPermissions = await getUserPermissions(req);
      const userBranchId = (req as any).user?.branchId;
      const { status, branchId, departmentId, skip, take } = req.query;

      const result = await this.service.listRequisitions({
        status: status as PurchaseRequisitionStatus | undefined,
        branchId: branchId as string | undefined,
        departmentId: departmentId as string | undefined,
        skip: skip ? parseInt(skip as string) : undefined,
        take: take ? parseInt(take as string) : undefined,
        userBranchId,
        userPermissions,
      });
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const userPermissions = await getUserPermissions(req);
      const { status, rejectionReason } = req.body;

      const requisition = await this.service.updateStatus(
        req.params.id,
        status,
        userId,
        userPermissions,
        rejectionReason,
      );
      res.status(200).json({ success: true, data: requisition });
    } catch (error) {
      next(error);
    }
  };

  convertToPurchaseOrder = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = (req as any).user?.userId;
      const po = await this.service.convertToPurchaseOrder(req.params.id, userId, req.body);
      res.status(201).json({ success: true, data: po });
    } catch (error) {
      next(error);
    }
  };
}
