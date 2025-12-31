"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/src/modules/customers/customers.routes.ts
const express_1 = require("express");
const customers_controller_1 = require("./customers.controller");
const auth_1 = require("../../lib/auth");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
// All routes require authentication
router.use(auth_1.authMiddleware);
// Quick search for POS (before :id route to avoid conflict)
router.get("/search", customers_controller_1.CustomersController.search);
// CRUD routes
router.post("/", (0, rbac_middleware_1.requirePermission)('sales.customer.manage'), customers_controller_1.CustomersController.create);
router.get("/", (0, rbac_middleware_1.requirePermission)('sales.customer.view'), customers_controller_1.CustomersController.findAll);
router.get("/:id", (0, rbac_middleware_1.requirePermission)('sales.customer.view'), customers_controller_1.CustomersController.findById);
router.put("/:id", (0, rbac_middleware_1.requirePermission)('sales.customer.manage'), customers_controller_1.CustomersController.update);
router.delete("/:id", (0, rbac_middleware_1.requirePermission)('sales.customer.manage'), customers_controller_1.CustomersController.delete);
exports.default = router;
