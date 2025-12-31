/**
 * Branch Routes
 * /v1/branches
 */

import { Router } from "express";
import { BranchController } from "../modules/branches/branch.controller";
import { authMiddleware } from "../lib/auth";
import { requirePermission } from "../middleware/rbac.middleware";

const router = Router();
const branchController = new BranchController();

// Get all branches
router.get("/branches", authMiddleware, requirePermission('admin.branch.manage'), (req, res, next) =>
  branchController.getAllBranches(req, res, next)
);

// Get branch stats (Managers and Admins)
router.get("/branches/stats", authMiddleware, requirePermission('hr.employee.view'), (req, res, next) =>
  branchController.getBranchStats(req, res, next)
);

// Get single branch
router.get("/branches/:id", authMiddleware, (req, res, next) =>
  branchController.getBranch(req, res, next)
);

// Create a new branch (Admin only)
router.post("/branches", authMiddleware, requirePermission('admin.branch.manage'), (req, res, next) =>
  branchController.createBranch(req, res, next)
);

// Update a branch (Admin only)
router.put("/branches/:id", authMiddleware, requirePermission('admin.branch.manage'), (req, res, next) =>
  branchController.updateBranch(req, res, next)
);

// Delete a branch (Admin only)
router.delete("/branches/:id", authMiddleware, requirePermission('admin.branch.manage'), (req, res, next) =>
  branchController.deleteBranch(req, res, next)
);

export default router;
