// backend/src/modules/customers/customers.routes.ts
import { Router } from "express";
import { CustomersController } from "./customers.controller";
import { authMiddleware } from "../../lib/auth";
import { requirePermission, hasAnyPermission } from "../../middleware/rbac.middleware";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// RBAC: Only SUPER_ADMIN, BRANCH_MANAGER, and SALES_REP can access customers
// Quick search for POS (before :id route to avoid conflict)
router.get(
  "/search",
  hasAnyPermission(['sales.customer.view', 'sales.customer.manage']),
  CustomersController.search
);

// CRUD routes with specific RBAC requirements
router.post(
  "/",
  hasAnyPermission(['sales.customer.manage']),
  CustomersController.create
);

router.get(
  "/",
  hasAnyPermission(['sales.customer.view', 'sales.customer.manage']),
  CustomersController.findAll
);

router.get(
  "/:id",
  hasAnyPermission(['sales.customer.view', 'sales.customer.manage']),
  CustomersController.findById
);

router.put(
  "/:id",
  hasAnyPermission(['sales.customer.manage']),
  CustomersController.update
);

router.delete(
  "/:id",
  hasAnyPermission(['sales.customer.manage']),
  CustomersController.delete
);

export default router;
