"use strict";
/**
 * Branch Routes
 * /v1/branches
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const branch_controller_1 = require("../modules/branches/branch.controller");
const auth_1 = require("../lib/auth");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
const branchController = new branch_controller_1.BranchController();
// Get all branches
router.get("/branches", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.branch.manage'), (req, res, next) => branchController.getAllBranches(req, res, next));
// Get branch stats (Managers and Admins)
router.get("/branches/stats", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.view'), (req, res, next) => branchController.getBranchStats(req, res, next));
// Get single branch
router.get("/branches/:id", auth_1.authMiddleware, (req, res, next) => branchController.getBranch(req, res, next));
// Create a new branch (Admin only)
router.post("/branches", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.branch.manage'), (req, res, next) => branchController.createBranch(req, res, next));
// Update a branch (Admin only)
router.put("/branches/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.branch.manage'), (req, res, next) => branchController.updateBranch(req, res, next));
// Delete a branch (Admin only)
router.delete("/branches/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.branch.manage'), (req, res, next) => branchController.deleteBranch(req, res, next));
exports.default = router;
