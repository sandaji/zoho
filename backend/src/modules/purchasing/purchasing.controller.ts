import { Request, Response, NextFunction } from "express";
import { PurchasingService } from "./purchasing.service";
import { AppError, ErrorCode } from "../../lib/errors";
import { PurchaseOrderStatus } from "../../generated";
import { PermissionService } from "../auth/service/permission.service";

// TokenPayload (backend/src/types/index.ts) never carries a `permissions`
// field — auth.service.ts computes permissions at login/refresh but only
// puts them in the response body for the frontend, not on the signed JWT.
// `(req as any).user?.permissions` was therefore always undefined here,
// silently defaulting every branch-isolation check below to an empty
// permission list (i.e. "no view_all access") regardless of the user's
// real permissions. Resolving permissions live via PermissionService on
// each request — the same approach the requirePermission middleware
// already uses — avoids baking permissions into the JWT, which would
// otherwise mean a revoked permission stays valid until the token
// expires or is refreshed (up to 24h per JWT_EXPIRY).
async function getUserPermissions(req: Request): Promise<string[]> {
  const userId = (req as any).user?.userId;
  if (!userId) return [];
  return PermissionService.getUserPermissions(userId);
}

export class PurchasingController {
  private service = new PurchasingService();

  createVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const vendor = await this.service.createVendor(req.body);
      res.status(201).json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  listVendors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await this.service.listVendors({
        search: req.query.search as string,
        skip: req.query.skip ? parseInt(req.query.skip as string) : undefined,
        take: req.query.take ? parseInt(req.query.take as string) : undefined,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  getVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id)
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Vendor ID is required");

      const vendor = await this.service.getVendorById(id);
      res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  updateVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id)
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Vendor ID is required");

      const vendor = await this.service.updateVendor(id, req.body);
      res.json({
        success: true,
        data: vendor,
      });
    } catch (error) {
      next(error);
    }
  };

  createPurchaseOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user || !req.user.userId)
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated",
        );

      const order = await this.service.createPurchaseOrder(
        req.user.userId,
        req.body,
      );
      res.status(201).json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  getPurchaseOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      }

      const userBranchId = (req as any).user?.branchId;
      const userPermissions = await getUserPermissions(req);

      const order = await this.service.getPurchaseOrder(id);

      // ✅ NEW: Verify branch access (Branch Isolation)
      const hasViewAll = userPermissions.includes("purchasing.order.view_all");
      if (!hasViewAll && order.branchId !== userBranchId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "You do not have permission to view Purchase Orders from other branches",
        );
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  listPurchaseOrders = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userBranchId = (req as any).user?.branchId;
      const userPermissions = await getUserPermissions(req);

      const result = await this.service.listPurchaseOrders({
        status: req.query.status as any,
        vendorId: req.query.vendorId as string,
        branchId: req.query.branchId as string,
        skip: req.query.skip ? parseInt(req.query.skip as string) : undefined,
        take: req.query.take ? parseInt(req.query.take as string) : undefined,
        // ✅ NEW: Pass user context for branch isolation
        userBranchId,
        userPermissions,
      });
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  updateStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated",
        );
      }

      const { status } = req.body;
      if (!status) {
        throw new AppError(ErrorCode.MISSING_FIELD, 400, "Status is required");
      }

      const id = req.params.id as string;
      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      }

      const userBranchId = (req as any).user?.branchId;
      const userPermissions = await getUserPermissions(req);

      // ✅ NEW: Verify PO belongs to user's branch
      const order = await this.service.getPurchaseOrder(id);
      const hasViewAll = userPermissions.includes("purchasing.order.view_all");
      if (!hasViewAll && order.branchId !== userBranchId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Cannot modify Purchase Orders from other branches",
        );
      }

      // ✅ NEW: Pass user permissions for threshold validation and segregation of duties
      const updatedOrder = await this.service.updateStatus(
        id,
        status as any,
        req.user.userId,
        userPermissions, // Pass for threshold checking
      );

      res.json({
        success: true,
        data: updatedOrder,
      });
    } catch (error) {
      next(error);
    }
  };

  approvePurchaseOrder = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      if (!req.user || !req.user.userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated",
        );
      }

      const id = req.params.id as string;
      const userPermissions = await getUserPermissions(req);

      // Note: We don't check for specific roles here because the route middleware
      // already enforces that the user has approval permissions.
      // Additionally, the service layer enforces segregation of duties and approval thresholds.

      const order = await this.service.updateStatus(
        id,
        PurchaseOrderStatus.APPROVED,
        req.user.userId,
        userPermissions,
      );

      res.json({
        success: true,
        message: "Purchase Order approved successfully",
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  receiveGoods = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.user.userId)
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated",
        );

      const id = req.params.id as string;
      if (!id)
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      const order = await this.service.receiveGoods(
        id,
        req.user.userId,
        req.body, // expected: { warehouseId, items: [] }
      );

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      next(error);
    }
  };

  generatePdf = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      }

      const userBranchId = (req as any).user?.branchId;
      const userPermissions = await getUserPermissions(req);

      const order = await this.service.getPurchaseOrder(id);

      // ✅ NEW: Verify branch access before generating PDF
      const hasViewAll = userPermissions.includes("purchasing.order.view_all");
      if (!hasViewAll && order.branchId !== userBranchId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "You do not have permission to download this Purchase Order",
        );
      }

      const pdfBuffer = await this.service.generatePoPdf(id);

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=LPO-${order.poNumber}.pdf`,
        "Content-Length": pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  };

  deleteVendor = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params.id as string;
      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Vendor ID is required");
      }

      await this.service.deleteVendor(id);
      res.json({
        success: true,
        message: "Vendor deactivated successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /purchasing/approvals/pending
   * Get pending approvals for current user
   */
  listPendingApprovals = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const userId = (req as any).user?.userId;
      if (!userId) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          "User not authenticated",
        );
      }

      const { getPendingApprovalsForUser } =
        await import("./services/approval.service");
      const pendingApprovals = await getPendingApprovalsForUser(userId);

      res.json({
        success: true,
        data: pendingApprovals,
        count: pendingApprovals.length,
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /purchasing/approvals/{id}/approve
   * Approve a purchase order through approval workflow
   */
  approveApprovalRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const approvalId = req.params.id as string;
      const userId = (req as any).user?.userId;
      const { comments } = req.body;

      if (!approvalId || !userId) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Missing required parameters",
        );
      }

      const { approvePurchaseOrder } =
        await import("./services/approval.service");
      const result = await approvePurchaseOrder(approvalId, userId, comments);

      res.json({
        success: true,
        data: result,
        message: "Purchase order approved successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /purchasing/approvals/{id}/reject
   * Reject a purchase order through approval workflow
   */
  rejectApprovalRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const approvalId = req.params.id as string;
      const userId = (req as any).user?.userId;
      const { reason } = req.body;

      if (!approvalId || !userId || !reason) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Missing required parameters",
        );
      }

      const { rejectPurchaseOrder } =
        await import("./services/approval.service");
      const result = await rejectPurchaseOrder(approvalId, userId, reason);

      res.json({
        success: true,
        data: result,
        message: "Purchase order rejected successfully",
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /purchasing/orders/{id}/approvals
   * Get approval history for a purchase order
   */
  listApprovalHistory = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const poId = req.params.id as string;
      if (!poId) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "PO ID is required");
      }

      const { getApprovalHistory } =
        await import("./services/approval.service");
      const history = await getApprovalHistory(poId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      next(error);
    }
  };
}
