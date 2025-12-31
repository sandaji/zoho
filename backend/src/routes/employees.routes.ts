/**
 * Employee Routes
 * /v1/employees
 */

import { Router } from "express";
import { EmployeeController } from "../modules/employees/employee.controller";
import { authMiddleware } from "../lib/auth";
import { requirePermission } from "../middleware/rbac.middleware";

const router = Router();
const employeeController = new EmployeeController();

// Get all employees
router.get("/employees", authMiddleware, requirePermission('hr.employee.view'), (req, res, next) =>
  employeeController.getAllEmployees(req, res, next)
);

// Get single employee with transfer history
router.get("/employees/:id", authMiddleware, requirePermission('hr.employee.view'), (req, res, next) =>
  employeeController.getEmployee(req, res, next)
);

// Create employee (Admin/Manager)
router.post("/employees", authMiddleware, requirePermission('hr.employee.manage'), (req, res, next) =>
  employeeController.createEmployee(req, res, next)
);

// Update employee (Admin/Manager)
router.put("/employees/:id", authMiddleware, requirePermission('hr.employee.manage'), (req, res, next) =>
  employeeController.updateEmployee(req, res, next)
);

// Transfer employee (Admin only)
router.post(
  "/employees/:id/transfer",
  authMiddleware,
  requirePermission('hr.employee.manage'),
  (req, res, next) => employeeController.transferEmployee(req, res, next)
);

// Get employee transfer history
router.get("/employees/:id/transfers", authMiddleware, requirePermission('hr.employee.view'), (req, res, next) =>
  employeeController.getTransferHistory(req, res, next)
);

// Delete employee (Admin only)
router.delete("/employees/:id", authMiddleware, requirePermission('hr.employee.manage'), (req, res, next) =>
  employeeController.deleteEmployee(req, res, next)
);

export default router;
