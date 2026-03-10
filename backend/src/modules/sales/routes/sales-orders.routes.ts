import { Router } from 'express';
import { SalesController } from '../sales.controller';
import { authMiddleware as authenticate } from '../../../lib/auth';
import { requirePermission, hasAnyPermission } from '../../../middleware/rbac.middleware';

const router = Router();

/**
 * Sales Order Routes
 * Prefix: /v1/sales/orders
 */

// Create sales order
// RBAC: SALES_REP, ADMIN
router.post(
  '/',
  authenticate,
  hasAnyPermission(['sales.order.create']),
  SalesController.createSalesOrder
);

// List sales orders
// RBAC: SALES_REP, SALES_MANAGER, WAREHOUSE_STAFF, ADMIN
router.get(
  '/',
  authenticate,
  hasAnyPermission(['sales.order.view', 'sales.order.view_all']),
  SalesController.listSalesOrders
);

// Get specific sales order
// RBAC: SALES_REP, SALES_MANAGER, WAREHOUSE_STAFF, ADMIN
router.get(
  '/:id',
  authenticate,
  hasAnyPermission(['sales.order.view', 'sales.order.view_all']),
  SalesController.getSalesOrder
);

// Dispatch sales order
// RBAC: WAREHOUSE_CLERK, WAREHOUSE_MANAGER, ADMIN only
// Sales reps CANNOT dispatch their own goods
router.post(
  '/:id/dispatch',
  authenticate,
  hasAnyPermission(['warehouse.dispatch.create']),
  SalesController.dispatchSalesOrder
);

export default router;
