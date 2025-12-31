"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../modules/admin/admin.controller");
const controller_1 = require("../modules/auth/controller");
const controller_2 = require("../modules/pos/controller");
const controller_3 = require("../modules/inventory/controller");
const controller_4 = require("../modules/warehouse/controller");
const controller_5 = require("../modules/fleet/controller");
const controller_6 = require("../modules/hr/controller");
const controller_7 = require("../modules/finance/controller");
const finance_routes_1 = __importDefault(require("../modules/finance/finance.routes"));
const fiscal_period_middleware_1 = require("../middleware/fiscal-period.middleware");
const payroll_controller_1 = require("../modules/finance/controller/payroll.controller");
const branch_controller_1 = require("../modules/finance/controller/branch.controller");
const auth_1 = require("../lib/auth");
const rbac_middleware_1 = require("../middleware/rbac.middleware");
const product_routes_1 = __importDefault(require("../modules/products/routes/product.routes"));
const branches_routes_1 = __importDefault(require("./branches.routes"));
const employees_routes_1 = __importDefault(require("./employees.routes"));
const warehouse_routes_1 = __importDefault(require("../modules/warehouse/warehouse.routes"));
const sales_routes_1 = __importDefault(require("./sales.routes"));
const customers_routes_1 = __importDefault(require("../modules/customers/customers.routes"));
const hr_routes_1 = __importDefault(require("../modules/hr/routes/hr.routes"));
const rbac_routes_1 = __importDefault(require("../modules/rbac/rbac.routes"));
const audit_routes_1 = __importDefault(require("../modules/admin/audit.routes"));
const router = (0, express_1.Router)();
// Initialize controllers
const adminController = new admin_controller_1.AdminController();
const authController = new controller_1.AuthController();
const posController = new controller_2.PosController();
const inventoryController = new controller_3.InventoryController();
const warehouseController = new controller_4.WarehouseController();
const fleetController = new controller_5.FleetController();
const hrController = new controller_6.HrController();
const financeController = new controller_7.FinanceController();
const payrollController = new payroll_controller_1.PayrollController();
const branchController = new branch_controller_1.BranchController();
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
router.use('/audit-logs', auth_1.authMiddleware, audit_routes_1.default);
// Stats - Allow branch managers to view stats
router.get("/admin/stats", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.view'), (req, res, next) => adminController.getStats(req, res, next));
// Branches - Admin only for management, but allow viewing
router.get("/admin/branches", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.branch.manage'), (req, res, next) => adminController.listBranches(req, res, next));
// Warehouses - Allow managers to view
router.get("/admin/warehouses", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.warehouse.manage'), (req, res, next) => adminController.listWarehouses(req, res, next));
// Users - Allow managers to view their team
router.get("/admin/users", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.user.manage'), (req, res, next) => adminController.listUsers(req, res, next));
// Products - Allow managers to view products (they need this for dashboard)
router.get("/admin/products", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.view'), (req, res, next) => adminController.listProducts(req, res, next));
// Deliveries - Allow managers to view deliveries
router.get("/admin/deliveries", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), (req, res, next) => adminController.listDeliveries(req, res, next));
router.get("/admin/finance/transactions", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('finance.gl.view'), (req, res, next) => adminController.listFinanceTransactions(req, res, next));
router.get("/admin/payroll", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.payroll.run'), (req, res, next) => adminController.listPayroll(req, res, next));
// ============================================================================
// AUTH ROUTES (Public)
// ============================================================================
router.post("/auth/login", (req, res, next) => authController.login(req, res, next));
router.post("/auth/register", (req, res, next) => authController.register(req, res, next));
// ============================================================================
// AUTH ROUTES (Protected)
// ============================================================================
router.get("/auth/me", auth_1.authMiddleware, (req, res, next) => authController.me(req, res, next));
router.patch("/auth/profile", auth_1.authMiddleware, (req, res, next) => authController.updateProfile(req, res, next));
// ============================================================================
// POS ROUTES (Protected - Cashiers can create sales, managers can approve)
// ============================================================================
// Product search - All authenticated users
router.post("/pos/products/search", auth_1.authMiddleware, (req, res, next) => posController.searchProduct(req, res, next));
// Create sales - Cashiers and above
router.post("/pos/sales", auth_1.authMiddleware, (req, res, next) => posController.createSales(req, res, next));
// Daily summary - Managers and admins only
router.get("/pos/daily-summary", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.view_all'), (req, res, next) => posController.getDailySummary(req, res, next));
// Get receipt - All authenticated users
router.get("/pos/sales/:id/receipt", auth_1.authMiddleware, (req, res, next) => posController.getReceipt(req, res, next));
// Get sales by ID - All authenticated users (must come after specific routes)
router.get("/pos/sales/:id", auth_1.authMiddleware, (req, res, next) => posController.getSalesById(req, res, next));
// List sales - All authenticated users
router.get("/pos/sales", auth_1.authMiddleware, (req, res, next) => posController.listSales(req, res, next));
// Update sales - Managers and admins only
router.patch("/pos/sales/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.manage'), (req, res, next) => posController.updateSales(req, res, next));
// Approve discount - Managers and admins only
router.post("/pos/discount/approve", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.manage'), (req, res, next) => posController.approveDiscount(req, res, next));
// ============================================================================
// SALES DOCUMENTS ROUTES (V2) (Protected)
// ============================================================================
router.use("/sales-documents", sales_routes_1.default);
// ============================================================================
// PRODUCT ROUTES (Protected)
// ============================================================================
router.use("/products", product_routes_1.default);
// ============================================================================
// INVENTORY ROUTES (Protected)
// ============================================================================
// GET /inventory - Get all inventory with filtering and pagination
router.get("/inventory", auth_1.authMiddleware, (req, res, next) => inventoryController.getInventory(req, res, next));
// POST /inventory/adjust - Adjust stock (increase/decrease)
router.post("/inventory/adjust", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.adjust'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), (req, res, next) => inventoryController.adjustInventory(req, res, next));
// POST /inventory/transfer - Transfer between warehouses
router.post("/inventory/transfer", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.stock.adjust'), (0, fiscal_period_middleware_1.validateFiscalPeriod)(), (req, res, next) => inventoryController.transferInventory(req, res, next));
// Legacy endpoints for backwards compatibility
router.patch("/inventory/:productId/:warehouseId", auth_1.authMiddleware, (req, res, next) => inventoryController.updateInventory(req, res, next));
router.get("/inventory/:productId/:warehouseId", auth_1.authMiddleware, (req, res, next) => inventoryController.getInventory(req, res, next));
// ============================================================================
// WAREHOUSE ENTITY ROUTES (Protected) - Renamed to /warehouses to avoid conflict with /warehouse management
// ============================================================================
router.post("/warehouses", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.warehouse.manage'), (req, res, next) => warehouseController.createWarehouse(req, res, next));
router.get("/warehouses/:id", auth_1.authMiddleware, (req, res, next) => warehouseController.getWarehouse(req, res, next));
router.get("/warehouses", auth_1.authMiddleware, (req, res, next) => warehouseController.listWarehouses(req, res, next));
router.patch("/warehouses/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.warehouse.manage'), (req, res, next) => warehouseController.updateWarehouse(req, res, next));
router.get("/warehouses/:id/stock", auth_1.authMiddleware, (req, res, next) => warehouseController.getWarehouseStock(req, res, next));
// ============================================================================
// FLEET ROUTES (Protected)
// ============================================================================
// GET /trucks - List all trucks with filtering and pagination
router.get("/trucks", auth_1.authMiddleware, (req, res, next) => fleetController.getTrucks(req, res, next));
// POST /deliveries - Create new delivery
router.post("/deliveries", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.create'), (req, res, next) => fleetController.createDelivery(req, res, next));
// PATCH /deliveries/:id/status - Update delivery status
router.patch("/deliveries/:id/status", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.manage'), (req, res, next) => fleetController.updateDeliveryStatus(req, res, next));
// GET /deliveries/:id/timeline - Get delivery progress timeline
router.get("/deliveries/:id/timeline", auth_1.authMiddleware, (req, res, next) => fleetController.getDeliveryTimeline(req, res, next));
// GET /deliveries - List deliveries with filtering
router.get("/deliveries", auth_1.authMiddleware, (req, res, next) => fleetController.listDeliveries(req, res, next));
// Legacy fleet routes for backwards compatibility
// Trucks
router.post("/fleet/trucks", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.manage'), (req, res, next) => fleetController.createTruck(req, res, next));
router.get("/fleet/trucks/:id", auth_1.authMiddleware, (req, res, next) => fleetController.getTruck(req, res, next));
router.patch("/fleet/trucks/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('inventory.product.manage'), (req, res, next) => fleetController.updateTruck(req, res, next));
// Legacy Deliveries
router.post("/fleet/deliveries", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.create'), (req, res, next) => fleetController.createDelivery(req, res, next));
router.get("/fleet/deliveries/:id", auth_1.authMiddleware, (req, res, next) => fleetController.getDelivery(req, res, next));
router.get("/fleet/deliveries", auth_1.authMiddleware, (req, res, next) => fleetController.listDeliveries(req, res, next));
router.patch("/fleet/deliveries/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('sales.order.manage'), (req, res, next) => fleetController.updateDelivery(req, res, next));
// ============================================================================
// HR ROUTES (Protected - Managers & Admins)
// ============================================================================
// Users
router.post("/hr/users", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.user.manage'), (req, res, next) => hrController.createUser(req, res, next));
router.get("/hr/users/:id", auth_1.authMiddleware, (req, res, next) => hrController.getUser(req, res, next));
router.patch("/hr/users/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('admin.user.manage'), (req, res, next) => hrController.updateUser(req, res, next));
// Payroll
router.post("/hr/payroll", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.payroll.run'), (req, res, next) => hrController.createPayroll(req, res, next));
router.get("/hr/payroll/:id", auth_1.authMiddleware, (req, res, next) => hrController.getPayroll(req, res, next));
router.get("/hr/payroll", auth_1.authMiddleware, (req, res, next) => hrController.listPayroll(req, res, next));
router.patch("/hr/payroll/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.payroll.run'), (req, res, next) => hrController.updatePayroll(req, res, next));
// ============================================================================
// FINANCE ROUTES (Protected - Managers & Admins)
// ============================================================================
router.use("/finance", finance_routes_1.default);
router.post("/finance/transactions", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('finance.gl.create'), (req, res, next) => financeController.createTransaction(req, res, next));
router.get("/finance/transactions/:id", auth_1.authMiddleware, (req, res, next) => financeController.getTransaction(req, res, next));
router.get("/finance/transactions", auth_1.authMiddleware, (req, res, next) => financeController.listTransactions(req, res, next));
router.patch("/finance/transactions/:id", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('finance.gl.create'), (req, res, next) => financeController.updateTransaction(req, res, next));
router.get("/finance/report", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('finance.report.aging'), (req, res, next) => financeController.getFinancialReport(req, res, next));
router.get("/finance/analytics/revenue", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('finance.report.aging'), (req, res, next) => financeController.getRevenueAnalytics(req, res, next));
router.get("/finance/reports/monthly", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('finance.report.aging'), (req, res, next) => financeController.getMonthlyReport(req, res, next));
// ============================================================================
// PAYROLL ROUTES (Protected - Managers & Admins)
// ============================================================================
router.post("/payroll/run", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.payroll.run'), (req, res, next) => payrollController.runPayroll(req, res, next));
router.get("/payroll/:id", auth_1.authMiddleware, (req, res, next) => payrollController.getPayroll(req, res, next));
router.patch("/payroll/:id/status", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.payroll.run'), (req, res, next) => payrollController.updatePayrollStatus(req, res, next));
router.get("/payroll/reports/summary", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.payroll.run'), (req, res, next) => payrollController.getPayrollReport(req, res, next));
router.get("/payroll/analytics/trends", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.payroll.run'), (req, res, next) => payrollController.getPayrollAnalytics(req, res, next));
// ============================================================================
// BRANCH DASHBOARD ROUTES (Protected - Managers & Admins)
// ============================================================================
router.get("/branches/:id/dashboard", auth_1.authMiddleware, (0, rbac_middleware_1.requirePermission)('hr.employee.view'), (req, res, next) => branchController.getDashboard(req, res, next));
// ============================================================================
// BRANCH MANAGEMENT ROUTES (Protected)
// ============================================================================
router.use(branches_routes_1.default);
// ============================================================================
// EMPLOYEE MANAGEMENT ROUTES (Protected)
// ============================================================================
router.use(employees_routes_1.default);
// ============================================================================
// WAREHOUSE MANAGEMENT ROUTES (Protected)
// ============================================================================
router.use("/warehouse", warehouse_routes_1.default);
// ============================================================================
// CUSTOMERS ROUTES (Protected)
// ============================================================================
router.use("/customers", customers_routes_1.default);
// ============================================================================
// HR MODULE ROUTES (V2) - LEAVE MANAGEMENT ETC.
// ============================================================================
router.use("/hr", hr_routes_1.default);
router.use("/rbac", rbac_routes_1.default);
exports.default = router;
