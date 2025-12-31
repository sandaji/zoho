"use strict";
/**
 * Warehouse Routes
 * API routes for warehouse management
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const warehouse_controller_1 = require("./warehouse.controller");
const auth_1 = require("../../lib/auth");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
const warehouseController = new warehouse_controller_1.WarehouseController();
/**
 * Stock Transfer Routes
 */
// Create a new stock transfer
// POST /warehouse/transfer
router.post("/transfer", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.adjust'), (req, res, next) => warehouseController.createTransfer(req, res, next));
// Get all transfers with filtering
// GET /warehouse/transfers
router.get("/transfers", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.view'), (req, res, next) => warehouseController.getTransfers(req, res, next));
// Get a single transfer by ID
// GET /warehouse/transfers/:id
router.get("/transfers/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.view'), (req, res, next) => warehouseController.getTransferById(req, res, next));
// Update transfer status (to IN_TRANSIT or CANCELLED)
// PATCH /warehouse/transfers/:id/status
router.patch("/transfers/:id/status", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.adjust'), (req, res, next) => warehouseController.updateTransferStatus(req, res, next));
// Fulfill/receive a transfer (completes the transfer)
// POST /warehouse/transfer/:id/receive
router.post("/transfer/:id/receive", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.adjust'), (req, res, next) => warehouseController.fulfillTransfer(req, res, next));
/**
 * Stock Adjustment Routes
 */
// Adjust stock (increase or decrease)
// POST /warehouse/adjust
router.post("/adjust", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.adjust'), (req, res, next) => warehouseController.adjustStock(req, res, next));
/**
 * Stock Movement Routes
 */
// Get stock movements with filtering
// GET /warehouse/movements
router.get("/movements", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.view'), (req, res, next) => warehouseController.getStockMovements(req, res, next));
/**
 * Statistics Routes
 */
// Get warehouse statistics
// GET /warehouse/stats
router.get("/stats", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.view'), (req, res, next) => warehouseController.getWarehouseStats(req, res, next));
exports.default = router;
