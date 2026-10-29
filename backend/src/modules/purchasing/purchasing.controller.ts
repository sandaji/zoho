import { Request, Response, NextFunction } from "express";
import { PurchasingService } from "./purchasing.service";
import { AppError, ErrorCode } from "@core/errors/errors";
import { PurchaseOrderStatus } from "../../generated/enums.js";
import { PermissionService } from "../auth/services/permission.service";

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

      // Creating straight into SUBMITTED hands the LPO to Finance, so it needs
      // the same permission as submitting a draft.
      if (req.body?.status === PurchaseOrderStatus.SUBMITTED) {
        const perms = await getUserPermissions(req);
        if (!perms.includes("purchasing.order.submit")) {
          throw new AppError(
            ErrorCode.FORBIDDEN,
            403,
            "Permission denied: purchasing.order.submit",
            { requiredPermission: "purchasing.order.submit" },
          );
        }
      }

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

  updatePurchaseOrder = async (
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
      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      }

      const userBranchId = (req as any).user?.branchId;
      const userPermissions = await getUserPermissions(req);

      // Verify PO belongs to user's branch before allowing an edit — same
      // isolation rule as updateStatus/approve.
      const existing = await this.service.getPurchaseOrder(id);
      const hasViewAll = userPermissions.includes("purchasing.order.view_all");
      if (!hasViewAll && existing.branchId !== userBranchId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Cannot modify Purchase Orders from other branches",
        );
      }

      const order = await this.service.updatePurchaseOrder(id, req.body);

      res.json({
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

  /**
   * PATCH /purchasing/orders/:id/acknowledge
   * Finance acknowledges a submitted LPO. This is NOT an approval: the MD /
   * admin still has to approve it afterwards.
   */
  acknowledgePurchaseOrder = async (
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
      if (!id) {
        throw new AppError(ErrorCode.BAD_REQUEST, 400, "Order ID is required");
      }

      const userBranchId = (req as any).user?.branchId;
      const userPermissions = await getUserPermissions(req);

      // Same branch isolation as the other order actions
      const existing = await this.service.getPurchaseOrder(id);
      const hasViewAll = userPermissions.includes("purchasing.order.view_all");
      if (!hasViewAll && existing.branchId !== userBranchId) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Cannot acknowledge Purchase Orders from other branches",
        );
      }

      const order = await this.service.updateStatus(
        id,
        PurchaseOrderStatus.ACKNOWLEDGED,
        req.user.userId,
        userPermissions,
      );

      res.json({
        success: true,
        message: "Purchase Order acknowledged",
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

      // Driven by the real LPO workflow (ACKNOWLEDGED orders this user may
      // approve), not the legacy ApprovalRequest table.
      const pendingApprovals = await this.service.listPendingApprovals(
        userId,
        await getUserPermissions(req),
        (req as any).user?.branchId,
      );

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
      // The inbox id is the purchase order's id.
      const approvalId = req.params.id as string;
      const userId = (req as any).user?.userId;

      if (!approvalId || !userId) {
        throw new AppError(
          ErrorCode.BAD_REQUEST,
          400,
          "Missing required parameters",
        );
      }

      const userPermissions = await getUserPermissions(req);
      const existing = await this.service.getPurchaseOrder(approvalId);
      if (
        !userPermissions.includes("purchasing.order.view_all") &&
        !userPermissions.includes("org.branches.view_all") &&
        existing.branchId !== (req as any).user?.branchId
      ) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Cannot approve Purchase Orders from other branches",
        );
      }

      // Same checks as every other approval: tier, requester, acknowledger.
      const result = await this.service.updateStatus(
        approvalId,
        PurchaseOrderStatus.APPROVED,
        userId,
        userPermissions,
      );

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

      const userPermissions = await getUserPermissions(req);
      const existing = await this.service.getPurchaseOrder(approvalId);
      if (
        !userPermissions.includes("purchasing.order.view_all") &&
        !userPermissions.includes("org.branches.view_all") &&
        existing.branchId !== (req as any).user?.branchId
      ) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          "Cannot reject Purchase Orders from other branches",
        );
      }

      const result = await this.service.rejectPurchaseOrder(
        approvalId,
        userId,
        userPermissions,
        reason,
      );

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
