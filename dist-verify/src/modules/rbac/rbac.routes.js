"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const rbac_controller_1 = require("./rbac.controller");
const auth_1 = require("../../lib/auth");
const rbac_middleware_1 = require("../../middleware/rbac.middleware");
const router = (0, express_1.Router)();
const controller = new rbac_controller_1.RbacController();
// All RBAC management routes require admin permission
router.use(auth_1.authMiddleware);
router.use((0, rbac_middleware_1.requirePermission)('admin.user.manage'));
// Role routes
router.get("/roles", (req, res, next) => controller.listRoles(req, res, next));
router.get("/roles/:id", (req, res, next) => controller.getRole(req, res, next));
router.post("/roles", (req, res, next) => controller.createRole(req, res, next));
router.patch("/roles/:id", (req, res, next) => controller.updateRole(req, res, next));
router.delete("/roles/:id", (req, res, next) => controller.deleteRole(req, res, next));
// Permission routes
router.get("/permissions", (req, res, next) => controller.listPermissions(req, res, next));
router.post("/roles/:id/permissions", (req, res, next) => controller.syncRolePermissions(req, res, next));
// User Role assignment routes
router.get("/users/:userId/roles", (req, res, next) => controller.getUserRoles(req, res, next));
router.post("/users/:userId/roles", (req, res, next) => controller.assignUserRoles(req, res, next));
exports.default = router;
