import { Router } from "express";
import { PurchasingController } from "./purchasing.controller";
import { RequisitionController } from "./requisition.controller";
import { authMiddleware } from '@core/middleware/auth';
import {
  requirePermission,
  hasAnyPermission,
} from "../../middleware/rbac.middleware";

// Anyone who can give final approval to an LPO. (The old lists spelled the
// high tier 'approve_high', which no role holds — so those routes were closed to
// everyone except super admin.)
const LPO_APPROVER_PERMISSIONS = [
  "system.role.super_admin",
  "purchasing.order.approve_standard",
  "purchasing.order.approve_high_value",
  "purchasing.order.approve_executive",
];

const router = Router();
const controller = new PurchasingController();
const requisitionController = new RequisitionController();

// ========== VENDOR ROUTES ==========
// RBAC: Only SUPER_ADMIN, BRANCH_MANAGER, and PROCUREMENT_OFFICER can access

// GET /vendors - View vendors
router.get(
  "/vendors",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.view", "purchasing.vendor.manage"]),
  controller.listVendors,
);

// POST /vendors - Create vendor
router.post(
  "/vendors",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.manage"]),
  controller.createVendor,
);

// GET /vendors/:id - Get single vendor
router.get(
  "/vendors/:id",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.view", "purchasing.vendor.manage"]),
  controller.getVendor,
);

// PATCH /vendors/:id - Update vendor
router.patch(
  "/vendors/:id",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.manage"]),
  controller.updateVendor,
);

// DELETE /vendors/:id - Delete/deactivate vendor (soft delete)
router.delete(
  "/vendors/:id",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.manage"]),
  controller.deleteVendor,
);

// ========== PURCHASE ORDER (LPO) ROUTES ==========

// POST /orders - Create LPO
router.post(
  "/orders",
  authMiddleware,
  requirePermission("purchasing.order.create"),
  controller.createPurchaseOrder,
);

// GET /orders - List LPOs
router.get(
  "/orders",
  authMiddleware,
  requirePermission("purchasing.order.view_all"), // ✅ ADD PERMISSION GATE
  controller.listPurchaseOrders,
);

// GET /orders/:id - Get single LPO
router.get(
  "/orders/:id",
  authMiddleware,
  // ✅ Permission check moved to controller for ownership/branch validation
  controller.getPurchaseOrder,
);

// PATCH /orders/:id - Edit an LPO (DRAFT only — service enforces this)
router.patch(
  "/orders/:id",
  authMiddleware,
  requirePermission("purchasing.order.create"),
  controller.updatePurchaseOrder,
);

// PATCH /orders/:id/status - Update LPO status (General)
router.patch(
  "/orders/:id/status",
  authMiddleware,
  // Permission per target status (submit / cancel / acknowledge / approve /
  // close) is enforced in PurchasingService.updateStatus
  controller.updateStatus,
);

// PATCH /orders/:id/approve - Dedicated route for LPO Approval
router.patch(
  "/orders/:id/approve",
  authMiddleware,
  hasAnyPermission(LPO_APPROVER_PERMISSIONS),
  controller.approvePurchaseOrder,
);

// PATCH /orders/:id/acknowledge - Finance acknowledges a submitted LPO
// (the step between procurement's submission and the MD / admin's approval)
router.patch(
  "/orders/:id/acknowledge",
  authMiddleware,
  requirePermission("purchasing.order.acknowledge"),
  controller.acknowledgePurchaseOrder,
);

// ========== APPROVAL INBOX ROUTES ==========
router.get(
  "/approvals/pending",
  authMiddleware,
  hasAnyPermission(LPO_APPROVER_PERMISSIONS),
  controller.listPendingApprovals,
);

router.post(
  "/approvals/:id/approve",
  authMiddleware,
  hasAnyPermission(LPO_APPROVER_PERMISSIONS),
  controller.approveApprovalRequest,
);

router.post(
  "/approvals/:id/reject",
  authMiddleware,
  hasAnyPermission(LPO_APPROVER_PERMISSIONS),
  controller.rejectApprovalRequest,
);

// POST /orders/:id/receive - Receive goods for LPO
router.post(
  "/orders/:id/receive",
  authMiddleware,
  requirePermission("purchasing.order.receive"), // ✅ NOW FIXED (was missing)
  controller.receiveGoods,
);

// GET /orders/:id/pdf - Download LPO PDF
router.get(
  "/orders/:id/pdf",
  authMiddleware,
  // ✅ Permission checked in controller for branch isolation
  controller.generatePdf,
);

// ========== PURCHASE REQUISITION ROUTES ==========
// Pre-PO stage: no vendor required, routes to the same amount-threshold
// approval tiers as LPOs but under 'purchasing.requisition.*' permissions.
// See erp-finance-gap-analysis.md §2.1 / implementation roadmap Phase 2.

// POST /requisitions - Create a Purchase Requisition
router.post(
  "/requisitions",
  authMiddleware,
  requirePermission("purchasing.requisition.create"),
  requisitionController.createRequisition,
);

// GET /requisitions - List Purchase Requisitions
router.get(
  "/requisitions",
  authMiddleware,
  requirePermission("purchasing.requisition.view"),
  requisitionController.listRequisitions,
);

// GET /requisitions/:id - Get a single Purchase Requisition
router.get(
  "/requisitions/:id",
  authMiddleware,
  requirePermission("purchasing.requisition.view"),
  requisitionController.getRequisition,
);

// PATCH /requisitions/:id - Edit a Requisition (DRAFT only — service enforces this)
router.patch(
  "/requisitions/:id",
  authMiddleware,
  requirePermission("purchasing.requisition.create"),
  requisitionController.updateRequisition,
);

// PATCH /requisitions/:id/status - Submit / Approve / Reject / Cancel
router.patch(
  "/requisitions/:id/status",
  authMiddleware,
  hasAnyPermission([
    "purchasing.requisition.create",
    "purchasing.requisition.approve_standard",
    "purchasing.requisition.approve_high_value",
    "purchasing.requisition.approve_executive",
  ]),
  // Fine-grained threshold + self-approval checks happen in the service,
  // same pattern as PO's /orders/:id/status route.
  requisitionController.updateStatus,
);

// POST /requisitions/:id/convert - Convert an APPROVED requisition into a real vendor-bound PO
router.post(
  "/requisitions/:id/convert",
  authMiddleware,
  requirePermission("purchasing.requisition.convert"),
  requisitionController.convertToPurchaseOrder,
);

export default router;
