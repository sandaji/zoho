import { Router } from "express";
import { PurchasingController } from "./purchasing.controller";
import { authMiddleware } from "../../lib/auth";
import { requirePermission, hasAnyPermission } from "../../middleware/rbac.middleware";

const router = Router();
const controller = new PurchasingController();

// ========== VENDOR ROUTES ==========
// RBAC: Only SUPER_ADMIN, BRANCH_MANAGER, and PROCUREMENT_OFFICER can access

// GET /vendors - View vendors
router.get(
  "/vendors",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.view", "purchasing.vendor.manage"]),
  controller.listVendors
);

// POST /vendors - Create vendor
router.post(
  "/vendors",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.manage"]),
  controller.createVendor
);

// GET /vendors/:id - Get single vendor
router.get(
  "/vendors/:id",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.view", "purchasing.vendor.manage"]),
  controller.getVendor
);

// PATCH /vendors/:id - Update vendor
router.patch(
  "/vendors/:id",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.manage"]),
  controller.updateVendor
);

// DELETE /vendors/:id - Delete/deactivate vendor (soft delete)
router.delete(
  "/vendors/:id",
  authMiddleware,
  hasAnyPermission(["purchasing.vendor.manage"]),
  controller.deleteVendor
);

// ========== PURCHASE ORDER (LPO) ROUTES ==========

// POST /orders - Create LPO
router.post(
  "/orders",
  authMiddleware,
  requirePermission("purchasing.order.create"),
  controller.createPurchaseOrder
);

// GET /orders - List LPOs
router.get(
  "/orders",
  authMiddleware,
  requirePermission("purchasing.order.view_all"),  // ✅ ADD PERMISSION GATE
  controller.listPurchaseOrders
);

// GET /orders/:id - Get single LPO
router.get(
  "/orders/:id",
  authMiddleware,
  // ✅ Permission check moved to controller for ownership/branch validation
  controller.getPurchaseOrder
);

// PATCH /orders/:id/status - Update LPO status (General)
router.patch(
  "/orders/:id/status",
  authMiddleware,
  // ✅ Permission checked in controller based on target status + amount
  controller.updateStatus
);

// PATCH /orders/:id/approve - Dedicated route for LPO Approval
router.patch(
  "/orders/:id/approve",
  authMiddleware,
  hasAnyPermission(["system.role.super_admin", "purchasing.order.approve_standard", "purchasing.order.approve_high", "purchasing.order.approve_executive"]),
  controller.approvePurchaseOrder
);

// POST /orders/:id/receive - Receive goods for LPO
router.post(
  "/orders/:id/receive",
  authMiddleware,
  requirePermission("purchasing.order.receive"),  // ✅ NOW FIXED (was missing)
  controller.receiveGoods
);

// GET /orders/:id/pdf - Download LPO PDF
router.get(
  "/orders/:id/pdf",
  authMiddleware,
  // ✅ Permission checked in controller for branch isolation
  controller.generatePdf
);

export default router;
