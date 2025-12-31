import { Router } from "express";
import { RbacController } from "./rbac.controller";
import { authMiddleware } from "../../lib/auth";
import { requirePermission } from "../../middleware/rbac.middleware";

const router = Router();
const controller = new RbacController();

// All RBAC management routes require admin permission
router.use(authMiddleware);
router.use(requirePermission('admin.user.manage'));

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

export default router;
