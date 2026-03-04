
import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "../modules/admin/admin.controller";
import { AuthController } from "../modules/auth/controller";
import { POSController } from "../modules/pos/controller";
import { InventoryController } from "../modules/inventory/controller";
import { WarehouseController } from "../modules/warehouse/controllers";
import { FleetController } from "../modules/fleet/controller";
import { HrController } from "../modules/hr/controller";
import { FinanceController } from "../modules/finance/controller";
import financeRoutes from "../modules/finance/finance.routes";
import { validateFiscalPeriod } from "../middleware/fiscal-period.middleware";
import { PayrollController } from "../modules/finance/controller/payroll.controller";
import { BranchController } from "../modules/finance/controller/branch.controller";
import {
  authMiddleware,
} from "../lib/auth";
import { requirePermission } from "../middleware/rbac.middleware";
import productRoutes from "../modules/products/routes/product.routes";
import branchRoutes from "./branches.routes";
import employeeRoutes from "./employees.routes";
import warehouseRoutes from "../modules/warehouse/routes/warehouse.routes";
import salesRoutes from "./sales.routes";
import salesOrderRoutes from "../modules/sales/routes/sales-orders.routes.js";
import reportsRoutes from "../modules/reports/reports.routes.js";
import customersRoutes from "../modules/customers/customers.routes";
import hrRoutes from "../modules/hr/routes/hr.routes";
import rbacRoutes from "../modules/rbac/rbac.routes";
import auditRoutes from "../modules/admin/audit.routes";
import purchasingRoutes from "../modules/purchasing/purchasing.routes";
import cashierRoutes from "../modules/cashier/routes/session.routes";

const router = Router();

// Initialize controllers
const adminController = new AdminController();
const authController = new AuthController();
const posController = new POSController();
const inventoryController = new InventoryController();
const warehouseController = new WarehouseController();
const fleetController = new FleetController();
const hrController = new HrController();
const financeController = new FinanceController();
const payrollController = new PayrollController();
const branchController = new BranchController();

// ============================================================================
// PUBLIC PRODUCTS ROUTES (No Auth Required - for initial load)
// ============================================================================

// TODO: Implement public products endpoint
// router.get("/products/public", (req, res, next) =>
//   inventoryController.getPublicProducts(req, res, next)
// );

// TODO: Implement public categories endpoint
// router.get("/products/public/categories", (req, res, next) =>
//   inventoryController.getPublicCategories(req, res, next)
// );

// ============================================================================
// PUBLIC BRANCHES ROUTES (No Auth Required)
// ============================================================================

// TODO: Implement public branches endpoint
// router.get("/branches/public", (req, res, next) =>
//   branchController.getPublicBranches(req, res, next)
// );

// ============================================================================
// ADMIN ROUTES (Protected - Admin Only or Manager Access where appropriate)
// ============================================================================
router.use('/audit-logs', authMiddleware, auditRoutes);

// Stats - Allow branch managers to view stats
router.get("/admin/stats", authMiddleware, requirePermission('hr.employee.view'), (req, res, next) =>
  adminController.getStats(req, res, next)
);

// Branches - Admin only for management, but allow viewing
router.get("/admin/branches", authMiddleware, requirePermission('admin.branch.manage'), (req, res, next) =>
  adminController.listBranches(req, res, next)
);

// Warehouses - Allow managers to view
router.get(
  "/admin/warehouses",
  authMiddleware,
  requirePermission('inventory.warehouse.manage'),
  (req, res, next) => adminController.listWarehouses(req, res, next)
);

// Users - Allow managers to view their team
router.get("/admin/users", authMiddleware, requirePermission('admin.user.manage'), (req, res, next) =>
  adminController.listUsers(req, res, next)
);

// Products - Allow managers to view products (they need this for dashboard)
router.get("/admin/products", authMiddleware, requirePermission('inventory.product.view'), (req, res, next) =>
  adminController.listProducts(req, res, next)
);

// Deliveries - Allow managers to view deliveries
router.get(
  "/admin/deliveries",
  authMiddleware,
  requirePermission('sales.order.view_all'),
  (req, res, next) => adminController.listDeliveries(req, res, next)
);
router.get(
  "/admin/finance/transactions",
  authMiddleware,
  requirePermission('finance.gl.view'),
  (req, res, next) => adminController.listFinanceTransactions(req, res, next)
);
router.get("/admin/payroll", authMiddleware, requirePermission('hr.payroll.run'), (req, res, next) =>
  adminController.listPayroll(req, res, next)
);

// ============================================================================
// AUTH ROUTES (Public)
// ============================================================================

router.post("/auth/login", (req, res, next) =>
  authController.login(req, res, next)
);
router.post("/auth/register", (req, res, next) =>
  authController.register(req, res, next)
);

// ============================================================================
// AUTH ROUTES (Protected)
// ============================================================================

router.get("/auth/me", authMiddleware, (req, res, next) =>
  authController.me(req, res, next)
);
router.patch("/auth/profile", authMiddleware, (req, res, next) =>
  authController.updateProfile(req, res, next)
);

// ============================================================================
// POS ROUTES (Protected - Cashiers can create sales, managers can approve)
// ============================================================================

// Product search - All authenticated users
router.post("/pos/products/search", authMiddleware, (req, res, next) =>
  posController.searchProduct(req, res, next)
);

// Create sales - Cashiers and above
router.post("/pos/sales", authMiddleware, (req, res, next) =>
  posController.createSales(req, res, next)
);

// Daily summary - All authenticated users (RBAC middleware handles admin bypass automatically)
router.get(
  "/pos/daily-summary",
  authMiddleware,
  requirePermission('sales.order.view_all'),
  (req, res, next) => posController.getDailySummary(req, res, next)
);

// Get receipt - All authenticated users
router.get("/pos/sales/:id/receipt", authMiddleware, (req, res, next) =>
  posController.getReceipt(req, res, next)
);

// Get sales by ID - All authenticated users (must come after specific routes)
router.get("/pos/sales/:id", authMiddleware, (req, res, next) =>
  posController.getSalesById(req, res, next)
);

// List sales - All authenticated users
router.get("/pos/sales", authMiddleware, (req, res, next) =>
  posController.listSales(req, res, next)
);

// Update sales - Managers and admins only
router.patch(
  "/pos/sales/:id",
  authMiddleware,
  requirePermission('sales.order.manage'),
  (req, res, next) => posController.updateSales(req, res, next)
);

// Approve discount - Managers and admins only
router.post(
  "/pos/discount/approve",
  authMiddleware,
  requirePermission('sales.order.manage'),
  (req, res, next) => posController.approveDiscount(req, res, next)
);

// ============================================================================
// SALES DOCUMENTS ROUTES (V2) (Protected)
// ============================================================================

router.use("/sales-documents", salesRoutes);

// ============================================================================
// SALES ORDERS & DISPATCH ROUTES (Protected)
// ============================================================================

router.use("/sales/orders", salesOrderRoutes);

// ============================================================================
// REPORTS & ANALYTICS ROUTES (Protected - Admin/Manager only)
// ============================================================================

router.use("/reports", reportsRoutes);

// ============================================================================
// PRODUCT ROUTES (Protected)
// ============================================================================

router.use("/products", productRoutes);

// ============================================================================
// INVENTORY ROUTES (Protected)
// ============================================================================

// GET /inventory - Get all inventory with filtering and pagination
router.get("/inventory", authMiddleware, (req, res, next) =>
  inventoryController.getInventory(req, res, next)
);

// POST /inventory/adjust - Adjust stock (increase/decrease)
router.post(
  "/inventory/adjust",
  authMiddleware,
  requirePermission('inventory.stock.adjust'),
  validateFiscalPeriod(),
  (req, res, next) => inventoryController.adjustInventory(req, res, next)
);

// POST /inventory/transfer - Transfer between warehouses
router.post(
  "/inventory/transfer",
  authMiddleware,
  requirePermission('inventory.stock.adjust'),
  validateFiscalPeriod(),
  (req, res, next) => inventoryController.transferInventory(req, res, next)
);

// Legacy endpoints for backwards compatibility
router.patch(
  "/inventory/:productId/:warehouseId",
  authMiddleware,
  (req, res, next) => inventoryController.updateInventory(req, res, next)
);
router.get(
  "/inventory/:productId/:warehouseId",
  authMiddleware,
  (req, res, next) => inventoryController.getInventory(req, res, next)
);

// ============================================================================
// WAREHOUSE ENTITY ROUTES (Protected) - Renamed to /warehouses to avoid conflict with /warehouse management
// ============================================================================

router.post("/warehouses", authMiddleware, requirePermission('inventory.warehouse.manage'), (req, res, next) =>
  warehouseController.createWarehouse(req, res, next)
);
router.get("/warehouses/:id", authMiddleware, (req, res, next) =>
  warehouseController.getWarehouse(req, res, next)
);
router.get("/warehouses", authMiddleware, (req, res, next) =>
  warehouseController.listWarehouses(req, res, next)
);
router.patch("/warehouses/:id", authMiddleware, requirePermission('inventory.warehouse.manage'), (req, res, next) =>
  warehouseController.updateWarehouse(req, res, next)
);
router.get("/warehouses/:id/stock", authMiddleware, (req, res, next) =>
  warehouseController.getWarehouseStock(req, res, next)
);

// ============================================================================
// FLEET ROUTES (Protected)
// ============================================================================

// GET /trucks - List all trucks with filtering and pagination
router.get("/trucks", authMiddleware, (req, res, next) =>
  fleetController.getTrucks(req, res, next)
);

// POST /deliveries - Create new delivery
router.post("/deliveries", authMiddleware, requirePermission('sales.order.create'), (req, res, next) =>
  fleetController.createDelivery(req, res, next)
);

// PATCH /deliveries/:id/status - Update delivery status
router.patch(
  "/deliveries/:id/status",
  authMiddleware,
  requirePermission('sales.order.manage'),
  (req, res, next) => fleetController.updateDeliveryStatus(req, res, next)
);

// GET /deliveries/:id/timeline - Get delivery progress timeline
router.get("/deliveries/:id/timeline", authMiddleware, (req, res, next) =>
  fleetController.getDeliveryTimeline(req, res, next)
);

// GET /deliveries - List deliveries with filtering
router.get("/deliveries", authMiddleware, (req, res, next) =>
  fleetController.listDeliveries(req, res, next)
);

// Legacy fleet routes for backwards compatibility
// Trucks
router.post("/fleet/trucks", authMiddleware, requirePermission('inventory.product.manage'), (req, res, next) =>
  fleetController.createTruck(req, res, next)
);
router.get("/fleet/trucks/:id", authMiddleware, (req, res, next) =>
  fleetController.getTruck(req, res, next)
);
router.patch(
  "/fleet/trucks/:id",
  authMiddleware,
  requirePermission('inventory.product.manage'),
  (req, res, next) => fleetController.updateTruck(req, res, next)
);

// Legacy Deliveries
router.post(
  "/fleet/deliveries",
  authMiddleware,
  requirePermission('sales.order.create'),
  (req, res, next) => fleetController.createDelivery(req, res, next)
);
router.get("/fleet/deliveries/:id", authMiddleware, (req, res, next) =>
  fleetController.getDelivery(req, res, next)
);
router.get("/fleet/deliveries", authMiddleware, (req, res, next) =>
  fleetController.listDeliveries(req, res, next)
);
router.patch(
  "/fleet/deliveries/:id",
  authMiddleware,
  requirePermission('sales.order.manage'),
  (req, res, next) => fleetController.updateDelivery(req, res, next)
);

// ============================================================================
// HR ROUTES (Protected - Managers & Admins)
// ============================================================================

// Users
router.post("/hr/users", authMiddleware, requirePermission('admin.user.manage'), (req, res, next) =>
  hrController.createUser(req, res, next)
);
router.get("/hr/users/:id", authMiddleware, (req, res, next) =>
  hrController.getUser(req, res, next)
);
router.patch("/hr/users/:id", authMiddleware, requirePermission('admin.user.manage'), (req, res, next) =>
  hrController.updateUser(req, res, next)
);

// Payroll
router.post("/hr/payroll", authMiddleware, requirePermission('hr.payroll.run'), (req, res, next) =>
  hrController.createPayroll(req, res, next)
);
router.get("/hr/payroll/:id", authMiddleware, (req, res, next) =>
  hrController.getPayroll(req, res, next)
);
router.get("/hr/payroll", authMiddleware, (req, res, next) =>
  hrController.listPayroll(req, res, next)
);
router.patch(
  "/hr/payroll/:id",
  authMiddleware,
  requirePermission('hr.payroll.run'),
  (req, res, next) => hrController.updatePayroll(req, res, next)
);

// ============================================================================
// FINANCE ROUTES (Protected - Managers & Admins)
// ============================================================================

router.use("/finance", financeRoutes);

router.post(
  "/finance/transactions",
  authMiddleware,
  requirePermission('finance.gl.create'),
  (req, res, next) => financeController.createTransaction(req, res, next)
);
router.get("/finance/transactions/:id", authMiddleware, (req, res, next) =>
  financeController.getTransaction(req, res, next)
);
router.get("/finance/transactions", authMiddleware, (req, res, next) =>
  financeController.listTransactions(req, res, next)
);
router.patch(
  "/finance/transactions/:id",
  authMiddleware,
  requirePermission('finance.gl.create'),
  (req, res, next) => financeController.updateTransaction(req, res, next)
);
router.get(
  "/finance/report",
  authMiddleware,
  requirePermission('finance.report.aging'),
  (req, res, next) => financeController.getFinancialReport(req, res, next)
);
router.get(
  "/finance/analytics/revenue",
  authMiddleware,
  requirePermission('finance.report.aging'),
  (req, res, next) => financeController.getRevenueAnalytics(req, res, next)
);
router.get(
  "/finance/reports/monthly",
  authMiddleware,
  requirePermission('finance.report.aging'),
  (req, res, next) => financeController.getMonthlyReport(req, res, next)
);

// ============================================================================
// PAYROLL ROUTES (Protected - Managers & Admins)
// ============================================================================

router.post("/payroll/run", authMiddleware, requirePermission('hr.payroll.run'), (req, res, next) =>
  payrollController.runPayroll(req, res, next)
);
router.get("/payroll/:id", authMiddleware, (req, res, next) =>
  payrollController.getPayroll(req, res, next)
);
router.patch(
  "/payroll/:id/status",
  authMiddleware,
  requirePermission('hr.payroll.run'),
  (req, res, next) => payrollController.updatePayrollStatus(req, res, next)
);
router.get(
  "/payroll/reports/summary",
  authMiddleware,
  requirePermission('hr.payroll.run'),
  (req, res, next) => payrollController.getPayrollReport(req, res, next)
);
router.get(
  "/payroll/analytics/trends",
  authMiddleware,
  requirePermission('hr.payroll.run'),
  (req, res, next) => payrollController.getPayrollAnalytics(req, res, next)
);

// ============================================================================
// BRANCH DASHBOARD ROUTES (Protected - Managers & Admins)
// ============================================================================

router.get(
  "/branches/:id/dashboard",
  authMiddleware,
  requirePermission('hr.employee.view'),
  (req, res, next) => branchController.getDashboard(req, res, next)
);

// ============================================================================
// BRANCH MANAGEMENT ROUTES (Protected)
// ============================================================================
router.use(branchRoutes);

// ============================================================================
// EMPLOYEE MANAGEMENT ROUTES (Protected)
// ============================================================================
router.use(employeeRoutes);

// ============================================================================
// WAREHOUSE MANAGEMENT ROUTES (Protected)
// ============================================================================
router.use("/warehouse", warehouseRoutes);

// ============================================================================
// CUSTOMERS ROUTES (Protected)
// ============================================================================
router.use("/customers", customersRoutes);

// ============================================================================
// HR MODULE ROUTES (V2) - LEAVE MANAGEMENT ETC.
// ============================================================================
router.use("/hr", hrRoutes);
router.use("/rbac", rbacRoutes);

// ============================================================================
// PURCHASING MODULE ROUTES
// ============================================================================
router.use("/purchasing", purchasingRoutes);

// ============================================================================
// CASHIER SESSION MANAGEMENT ROUTES (Protected)
// ============================================================================
router.use("/cashier", cashierRoutes);

export default router;
