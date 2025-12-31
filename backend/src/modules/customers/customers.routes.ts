// backend/src/modules/customers/customers.routes.ts
import { Router } from "express";
import { CustomersController } from "./customers.controller";
import { authMiddleware } from "../../lib/auth";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Quick search for POS (before :id route to avoid conflict)
router.get("/search", CustomersController.search);

// CRUD routes
router.post(
  "/",
  requirePermission('sales.customer.manage'),
  CustomersController.create
);

router.get("/", requirePermission('sales.customer.view'), CustomersController.findAll);

router.get("/:id", requirePermission('sales.customer.view'), CustomersController.findById);

router.put(
  "/:id",
  requirePermission('sales.customer.manage'),
  CustomersController.update
);

router.delete(
  "/:id",
  requirePermission('sales.customer.manage'),
  CustomersController.delete
);

export default router;
