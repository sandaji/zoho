import { Router } from "express";
import { PurchasingController } from "./purchasing.controller";
import { authMiddleware } from "../../lib/auth";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
const controller = new PurchasingController();

// Vendors
router.post(
  "/vendors",
  authMiddleware,
  requirePermission("purchasing.vendor.manage"), // Assuming permission, or admin.user.manage for now if not exists
  controller.createVendor
);

router.get("/vendors", authMiddleware, controller.listVendors);

// Purchase Orders
router.post(
  "/orders",
  authMiddleware,
  requirePermission("purchasing.order.create"),
  controller.createPurchaseOrder
);

router.get("/orders", authMiddleware, controller.listPurchaseOrders);

router.get("/orders/:id", authMiddleware, controller.getPurchaseOrder);

router.patch(
  "/orders/:id/status",
  authMiddleware,
  requirePermission("purchasing.order.approve"),
  controller.updateStatus
);

router.post(
  "/orders/:id/receive",
  authMiddleware,
  requirePermission("purchasing.order.receive"),
  controller.receiveGoods
);

router.get("/orders/:id/pdf", authMiddleware, controller.generatePdf);

export default router;
