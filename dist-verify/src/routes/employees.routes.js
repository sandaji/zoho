"use strict";
/**
 * Employee Routes
 * /v1/employees
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const employee_controller_1 = require("../modules/employees/employee.controller");
const auth_1 = require("../lib/auth");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const router = (0, express_1.Router)();
const employeeController = new employee_controller_1.EmployeeController();
// Get all employees
router.get("/employees", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.view'), (req, res, next) => employeeController.getAllEmployees(req, res, next));
// Get single employee with transfer history
router.get("/employees/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.view'), (req, res, next) => employeeController.getEmployee(req, res, next));
// Create employee (Admin/Manager)
router.post("/employees", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.manage'), (req, res, next) => employeeController.createEmployee(req, res, next));
// Update employee (Admin/Manager)
router.put("/employees/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.manage'), (req, res, next) => employeeController.updateEmployee(req, res, next));
// Transfer employee (Admin only)
router.post("/employees/:id/transfer", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.manage'), (req, res, next) => employeeController.transferEmployee(req, res, next));
// Get employee transfer history
router.get("/employees/:id/transfers", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.view'), (req, res, next) => employeeController.getTransferHistory(req, res, next));
// Delete employee (Admin only)
router.delete("/employees/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.manage'), (req, res, next) => employeeController.deleteEmployee(req, res, next));
exports.default = router;
