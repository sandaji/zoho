/**
 * Warehouse Routes
 * API routes for warehouse management
 */

import { Router } from "express";
import { WarehouseController } from "./controllers";
import { authMiddleware } from "../../lib/auth";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
const warehouseController = new WarehouseController();

/**
 * Stock Transfer Routes
 */

// Create a new stock transfer
// POST /warehouse/transfer
router.post(
  "/transfer",
  authMiddleware,
  requirePermission('inventory.stock.adjust'),
  (req, res, next) => warehouseController.createTransfer(req, res, next)
);

// Get all transfers with filtering
// GET /warehouse/transfers
router.get(
  "/transfers",
  authMiddleware,
  requirePermission('inventory.stock.view'),
  (req, res, next) => warehouseController.getTransfers(req, res, next)
);

// Get a single transfer by ID
// GET /warehouse/transfers/:id
router.get(
  "/transfers/:id",
  authMiddleware,
  requirePermission('inventory.stock.view'),
  (req, res, next) => warehouseController.getTransferById(req, res, next)
);

// Update transfer status (to IN_TRANSIT or CANCELLED)
// PATCH /warehouse/transfers/:id/status
router.patch(
  "/transfers/:id/status",
  authMiddleware,
  requirePermission('inventory.stock.adjust'),
  (req, res, next) => warehouseController.updateTransferStatus(req, res, next)
);

// Fulfill/receive a transfer (completes the transfer)
// POST /warehouse/transfer/:id/receive
router.post(
  "/transfer/:id/receive",
  authMiddleware,
  requirePermission('inventory.stock.adjust'),
  (req, res, next) => warehouseController.fulfillTransfer(req, res, next)
);

/**
 * Stock Adjustment Routes
 */

// Adjust stock (increase or decrease)
// POST /warehouse/adjust
router.post(
  "/adjust",
  authMiddleware,
  requirePermission('inventory.stock.adjust'),
  (req, res, next) => warehouseController.adjustStock(req, res, next)
);

/**
 * Stock Movement Routes
 */

// Get stock movements with filtering
// GET /warehouse/movements
router.get(
  "/movements",
  authMiddleware,
  requirePermission('inventory.stock.view'),
  (req, res, next) => warehouseController.getStockMovements(req, res, next)
);

/**
 * Statistics Routes
 */

// Get warehouse statistics
// GET /warehouse/stats
router.get(
  "/stats",
  authMiddleware,
  requirePermission('inventory.stock.view'),
  (req, res, next) => warehouseController.getWarehouseStats(req, res, next)
);

export default router;
