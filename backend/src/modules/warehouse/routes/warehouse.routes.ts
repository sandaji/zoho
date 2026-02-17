/**
 * Warehouse Routes
 * API routes for warehouse management and inventory operations
 */

import { Router } from "express";
import { WarehouseController } from "../controllers/warehouse.controller";
import { authMiddleware } from "../../../lib/auth";
import { requirePermission } from "../../../middleware/rbac.middleware";

const router = Router();
const warehouseController = new WarehouseController();

/**
 * Warehouse CRUD Routes
 */

// Create a new warehouse
// POST /warehouse
router.post(
  "/",
  authMiddleware,
  requirePermission("inventory.warehouse.create"),
  (req, res, next) => warehouseController.createWarehouse(req, res, next)
);

// Get all warehouses with filtering and pagination
// GET /warehouse
router.get(
  "/",
  authMiddleware,
  requirePermission("inventory.warehouse.view"),
  (req, res, next) => warehouseController.listWarehouses(req, res, next)
);

/**
 * Statistics Routes (MUST be before /:id to avoid matching "stats" as an ID)
 */

// Get warehouse statistics
// GET /warehouse/stats
router.get(
  "/stats",
  authMiddleware,
  requirePermission("inventory.stock.view"),
  (req, res, next) => warehouseController.getWarehouseStats(req, res, next)
);

/**
 * Stock Movement Routes (MUST be before /:id to avoid matching "movements" as an ID)
 */

// Get stock movements with filtering
// GET /warehouse/movements
router.get(
  "/movements",
  authMiddleware,
  requirePermission("inventory.stock.view"),
  (req, res, next) => warehouseController.getStockMovements(req, res, next)
);

/**
 * Stock Transfer Routes (MUST be before /:id)
 */

// Create a new stock transfer
// POST /warehouse/transfer
router.post(
  "/transfer",
  authMiddleware,
  requirePermission("inventory.stock.adjust"),
  (req, res, next) => warehouseController.createTransfer(req, res, next)
);

// Get all transfers with filtering
// GET /warehouse/transfers
router.get(
  "/transfers",
  authMiddleware,
  requirePermission("inventory.stock.view"),
  (req, res, next) => warehouseController.getTransfers(req, res, next)
);

// Get a single transfer by ID
// GET /warehouse/transfers/:id
router.get(
  "/transfers/:id",
  authMiddleware,
  requirePermission("inventory.stock.view"),
  (req, res, next) => warehouseController.getTransferById(req, res, next)
);

// Update transfer status (to IN_TRANSIT or CANCELLED)
// PATCH /warehouse/transfers/:id/status
router.patch(
  "/transfers/:id/status",
  authMiddleware,
  requirePermission("inventory.stock.adjust"),
  (req, res, next) => warehouseController.updateTransferStatus(req, res, next)
);

// Fulfill/receive a transfer (completes the transfer)
// POST /warehouse/transfer/:id/receive
router.post(
  "/transfer/:id/receive",
  authMiddleware,
  requirePermission("inventory.stock.adjust"),
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
  requirePermission("inventory.stock.adjust"),
  (req, res, next) => warehouseController.adjustStock(req, res, next)
);

/**
 * Parameterized Routes (MUST be LAST to avoid catching named routes)
 */

// Get a single warehouse by ID
// GET /warehouse/:id
router.get(
  "/:id",
  authMiddleware,
  requirePermission("inventory.warehouse.view"),
  (req, res, next) => warehouseController.getWarehouse(req, res, next)
);

// Update warehouse details
// PATCH /warehouse/:id
router.patch(
  "/:id",
  authMiddleware,
  requirePermission("inventory.warehouse.update"),
  (req, res, next) => warehouseController.updateWarehouse(req, res, next)
);

// Get warehouse stock details
// GET /warehouse/:id/stock
router.get(
  "/:id/stock",
  authMiddleware,
  requirePermission("inventory.stock.view"),
  (req, res, next) => warehouseController.getWarehouseStock(req, res, next)
);

export default router;

