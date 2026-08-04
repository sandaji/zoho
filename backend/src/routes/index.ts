import { Router, Request, Response, NextFunction } from "express";
import { AdminController } from "../modules/admin/admin.controller";
import { POSController } from "../modules/pos/controller";
import { InventoryController } from "../modules/inventory/controller";
import { WarehouseController } from "../modules/warehouse/controllers";
import { FleetController } from "../modules/fleet/controller";
import { HrController } from "../modules/hr/controller";
import { FinanceController } from "../modules/finance/controller";
import authRoutes from "../modules/auth/routes";
import financeRoutes from "../modules/finance/finance.routes";
import { validateFiscalPeriod } from "../middleware/fiscal-period.middleware";
import { PayrollController } from "../modules/finance/controller/payroll.controller";
import { BranchController } from "../modules/finance/controller/branch.controller";
import { authMiddleware } from "../lib/auth";
import { requirePermission } from "../middleware/rbac.middleware";
import { hasAnyPermission } from "../middleware/rbac.middleware";
import productRoutes from "../modules/products/routes/product.routes";
import branchRoutes from "./branches.routes";
import employeeRoutes from "./employees.routes";
import warehouseRoutes from "../modules/warehouse/routes/warehouse.routes";
import salesRoutes from "./sales.routes";
import salesOrderRoutes from "../modules/sales/routes/sales-orders.routes";
import reportsRoutes from "../modules/reports/reports.routes";
import customersRoutes from "../modules/customers/customers.routes";
import hrRoutes from "../modules/hr/routes/hr.routes";
import rbacRoutes from "../modules/rbac/rbac.routes";
import auditRoutes from "../modules/admin/audit.routes";
import purchasingRoutes from "../modules/purchasing/purchasing.routes";
import cashierRoutes from "../modules/cashier/routes/session.routes";
import { PDFController } from "../modules/pos/controller";

const router = Router();

// Initialize controllers
const adminController = new AdminController();
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
router.use("/audit-logs", authMiddleware, auditRoutes);

// Stats — visible to any authenticated user with branch or admin access
router.get(
  "/admin/stats",
  authMiddleware,
  requirePermission("admin.branch.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getStats(req, res, next),
);

// Global consolidated financials (aggregated across all branches)
router.get(
  "/admin/global-financials",
  authMiddleware,
  requirePermission("admin.branch.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getGlobalFinancials(req, res, next),
);

// Inter-Branch Transfer monitor
router.get(
  "/admin/ibt-monitor",
  authMiddleware,
  requirePermission("admin.branch.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getIBTMonitor(req, res, next),
);

// System health snapshot
router.get(
  "/admin/system-health",
  authMiddleware,
  requirePermission("admin.branch.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    adminController.getSystemHealth(req, res, next),
);

// Branches - Admin only for management, but allow viewing
router.get(
  "/admin/branches",
  authMiddleware,
  requirePermission("admin.branch.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    adminController.listBranches(req, res, next),
);

// Warehouses - Allow managers to view
router.get(
  "/admin/warehouses",
  authMiddleware,
  requirePermission("admin.warehouse.view"),
  adminController.listWarehouses.bind(adminController),
);

// Users - Allow managers to view their team
router.get(
  "/admin/users",
  authMiddleware,
  requirePermission("admin.user.view"),
  adminController.listUsers.bind(adminController),
);

// New System Access Routes
router.get(
  "/admin/eligible-employees",
  authMiddleware,
  requirePermission("admin.user.manage"),
  adminController.listEligibleEmployees.bind(adminController),
);
router.put(
  "/admin/users/:id/grant-access",
  authMiddleware,
  requirePermission("admin.user.manage"),
  adminController.grantSystemAccess.bind(adminController),
);

// Products - Allow managers to view products
router.get(
  "/admin/products",
  authMiddleware,
  requirePermission("admin.product.view"),
  adminController.listProducts.bind(adminController),
);

// Deliveries
router.get(
  "/admin/deliveries",
  authMiddleware,
  requirePermission("admin.delivery.view"),
  adminController.listDeliveries.bind(adminController),
);

// Finance & Payroll
router.get(
  "/admin/finance/transactions",
  authMiddleware,
  requirePermission("admin.finance.view"),
  adminController.listFinanceTransactions.bind(adminController),
);
// Payroll — alias /admin/payroll to the actual /admin/payroll/records handler
router.get(
  "/admin/payroll",
  authMiddleware,
  requirePermission("admin.payroll.view"),
  adminController.listPayroll.bind(adminController),
);
router.get(
  "/admin/payroll/records",
  authMiddleware,
  requirePermission("admin.payroll.view"),
  adminController.listPayroll.bind(adminController),
);

// ============================================================================
// AUTH ROUTES (All - Public & Protected)
// ============================================================================

router.use("/auth", authRoutes);

// ============================================================================
// POS ROUTES (Protected - Cashiers can create sales, managers can approve)
// ============================================================================

// Product search - All authenticated users
router.post(
  "/pos/products/search",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    posController.searchProduct(req, res, next),
);

// Create sales - Cashiers and above
router.post(
  "/pos/sales",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    posController.createSales(req, res, next),
);

// Daily summary — cashiers and managers can view their branch summary
router.get(
  "/pos/daily-summary",
  authMiddleware,
  requirePermission("pos.session.view"),
  (req: Request, res: Response, next: NextFunction) =>
    posController.getDailySummary(req, res, next),
);

// Get receipt - All authenticated users
router.get(
  "/pos/sales/:id/receipt",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    posController.getReceipt(req, res, next),
);

// Get sales by ID - All authenticated users (must come after specific routes)
  router.get(
    "/pos/sales/:id",
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      posController.getSalesById(req, res, next),
  );

  // List sales - All authenticated users
  router.get(
    "/pos/sales",
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      posController.listSales(req, res, next),
  );

  // PDF routes for POS sales (use PDFController)
  router.get(
    "/pos/sales/:id/pdf",
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      PDFController.generatePDF(req, res, next),
  );
  router.get(
    "/pos/sales/:id/preview",
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) =>
      PDFController.previewDocument(req, res, next),
  );

// Update sales - Managers and admins only
router.patch(
  "/pos/sales/:id",
  authMiddleware,
  requirePermission("sales.order.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    posController.updateSales(req, res, next),
);

// Approve discount - Managers and admins only
router.post(
  "/pos/discount/approve",
  authMiddleware,
  requirePermission("sales.order.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    posController.approveDiscount(req, res, next),
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
router.get(
  "/inventory",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.getInventory(req, res, next),
);

// POST /inventory/adjust - Adjust stock (increase/decrease)
router.post(
  "/inventory/adjust",
  authMiddleware,
  requirePermission("inventory.stock.adjust"),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.adjustInventory(req, res, next),
);

// POST /inventory/transfer - LEGACY
router.post(
  "/inventory/transfer",
  authMiddleware,
  requirePermission("inventory.stock.adjust"),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.transferInventory(req, res, next),
);

// GET /inventory/transfers - List stock transfers
router.get(
  "/inventory/transfers",
  authMiddleware,
  requirePermission("inventory.stock.view"),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.listTransfers(req, res, next),
);

// GET /inventory/transfers/:id - Get a single transfer with line-item detail
router.get(
  "/inventory/transfers/:id",
  authMiddleware,
  requirePermission("inventory.stock.view"),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.getTransfer(req, res, next),
);

// POST /inventory/transfers/request - Stage 1: Request a new transfer
router.post(
  "/inventory/transfers/request",
  authMiddleware,
  hasAnyPermission(["inventory.transfer.request", "inventory.stock.adjust"]),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.requestTransfer(req, res, next),
);

// POST /inventory/transfers/:id/approve - Stage 2: Approve a transfer
router.post(
  "/inventory/transfers/:id/approve",
  authMiddleware,
  hasAnyPermission(["inventory.transfer.approve", "inventory.stock.adjust"]),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.approveTransfer(req, res, next),
);

// POST /inventory/transfers/:id/start-picking - Stage 3: Claim the pick task
router.post(
  "/inventory/transfers/:id/start-picking",
  authMiddleware,
  hasAnyPermission(["inventory.transfer.pick", "inventory.stock.adjust"]),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.startPicking(req, res, next),
);

// POST /inventory/transfers/:id/complete-picking - Stage 4: Record picked quantities
router.post(
  "/inventory/transfers/:id/complete-picking",
  authMiddleware,
  hasAnyPermission(["inventory.transfer.pick", "inventory.stock.adjust"]),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.completePicking(req, res, next),
);

// POST /inventory/transfers/:id/verify - Stage 5: Verify picked items
router.post(
  "/inventory/transfers/:id/verify",
  authMiddleware,
  hasAnyPermission(["inventory.transfer.verify", "inventory.stock.adjust"]),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.verifyTransfer(req, res, next),
);

// POST /inventory/transfers/:id/dispatch - Stage 6: Dispatch a transfer
router.post(
  "/inventory/transfers/:id/dispatch",
  authMiddleware,
  hasAnyPermission(["inventory.transfer.dispatch", "inventory.stock.adjust"]),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.dispatchTransfer(req, res, next),
);

// POST /inventory/transfers/:id/receive - Stage 7: Receive a transfer
router.post(
  "/inventory/transfers/:id/receive",
  authMiddleware,
  hasAnyPermission(["inventory.transfer.receive", "inventory.stock.adjust"]),
  validateFiscalPeriod(),
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.receiveTransfer(req, res, next),
);

// Legacy endpoints for backwards compatibility
router.patch(
  "/inventory/:productId/:warehouseId",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.updateInventory(req, res, next),
);
router.get(
  "/inventory/:productId/:warehouseId",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    inventoryController.getInventory(req, res, next),
);

// ============================================================================
// WAREHOUSE ENTITY ROUTES (Protected) - Renamed to /warehouses to avoid conflict with /warehouse management
// ============================================================================

router.post(
  "/warehouses",
  authMiddleware,
  requirePermission("inventory.warehouse.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    warehouseController.createWarehouse(req, res, next),
);
router.get(
  "/warehouses/:id",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    warehouseController.getWarehouse(req, res, next),
);
router.get(
  "/warehouses",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    warehouseController.listWarehouses(req, res, next),
);
router.patch(
  "/warehouses/:id",
  authMiddleware,
  requirePermission("inventory.warehouse.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    warehouseController.updateWarehouse(req, res, next),
);
router.get(
  "/warehouses/:id/stock",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    warehouseController.getWarehouseStock(req, res, next),
);

// ============================================================================
// FLEET ROUTES (Protected)
// ============================================================================

// GET /trucks - List all trucks with filtering and pagination
router.get(
  "/trucks",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.getTrucks(req, res, next),
);

// POST /deliveries - Create new delivery
router.post(
  "/deliveries",
  authMiddleware,
  requirePermission("sales.order.create"),
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.createDelivery(req, res, next),
);

// PATCH /deliveries/:id/status - Update delivery status
router.patch(
  "/deliveries/:id/status",
  authMiddleware,
  requirePermission("sales.order.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.updateDeliveryStatus(req, res, next),
);

// GET /deliveries/:id/timeline - Get delivery progress timeline
router.get(
  "/deliveries/:id/timeline",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.getDeliveryTimeline(req, res, next),
);

// GET /deliveries - List deliveries with filtering
router.get(
  "/deliveries",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.listDeliveries(req, res, next),
);

// Legacy fleet routes for backwards compatibility
// Trucks
router.post(
  "/fleet/trucks",
  authMiddleware,
  requirePermission("inventory.product.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.createTruck(req, res, next),
);
router.get(
  "/fleet/trucks/:id",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.getTruck(req, res, next),
);
router.patch(
  "/fleet/trucks/:id",
  authMiddleware,
  requirePermission("inventory.product.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.updateTruck(req, res, next),
);

// Legacy Deliveries
router.post(
  "/fleet/deliveries",
  authMiddleware,
  requirePermission("sales.order.create"),
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.createDelivery(req, res, next),
);
router.get(
  "/fleet/deliveries/:id",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.getDelivery(req, res, next),
);
router.get(
  "/fleet/deliveries",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.listDeliveries(req, res, next),
);
router.patch(
  "/fleet/deliveries/:id",
  authMiddleware,
  requirePermission("sales.order.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    fleetController.updateDelivery(req, res, next),
);

// ============================================================================
// HR ROUTES (Protected - Managers & Admins)
// ============================================================================

// Users
router.post(
  "/hr/users",
  authMiddleware,
  requirePermission("admin.user.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    hrController.createUser(req, res, next),
);
router.get(
  "/hr/users/:id",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    hrController.getUser(req, res, next),
);
router.patch(
  "/hr/users/:id",
  authMiddleware,
  requirePermission("admin.user.manage"),
  (req: Request, res: Response, next: NextFunction) =>
    hrController.updateUser(req, res, next),
);

// Payroll
router.post(
  "/hr/payroll",
  authMiddleware,
  requirePermission("hr.payroll.run"),
  (req: Request, res: Response, next: NextFunction) =>
    hrController.createPayroll(req, res, next),
);
router.get(
  "/hr/payroll/:id",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    hrController.getPayroll(req, res, next),
);
router.get(
  "/hr/payroll",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    hrController.listPayroll(req, res, next),
);
router.patch(
  "/hr/payroll/:id",
  authMiddleware,
  requirePermission("hr.payroll.run"),
  (req: Request, res: Response, next: NextFunction) =>
    hrController.updatePayroll(req, res, next),
);

// ============================================================================
// FINANCE ROUTES (Protected - Managers & Admins)
// ============================================================================

router.use("/finance", financeRoutes);

router.post(
  "/finance/transactions",
  authMiddleware,
  requirePermission("finance.gl.create"),
  (req: Request, res: Response, next: NextFunction) =>
    financeController.createTransaction(req, res, next),
);
router.get(
  "/finance/transactions/:id",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    financeController.getTransaction(req, res, next),
);
router.get(
  "/finance/transactions",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    financeController.listTransactions(req, res, next),
);
router.patch(
  "/finance/transactions/:id",
  authMiddleware,
  requirePermission("finance.gl.create"),
  (req: Request, res: Response, next: NextFunction) =>
    financeController.updateTransaction(req, res, next),
);
router.get(
  "/finance/report",
  authMiddleware,
  requirePermission("finance.report.aging"),
  (req: Request, res: Response, next: NextFunction) =>
    financeController.getFinancialReport(req, res, next),
);
router.get(
  "/finance/analytics/revenue",
  authMiddleware,
  requirePermission("finance.report.aging"),
  (req: Request, res: Response, next: NextFunction) =>
    financeController.getRevenueAnalytics(req, res, next),
);
router.get(
  "/finance/reports/monthly",
  authMiddleware,
  requirePermission("finance.report.aging"),
  (req: Request, res: Response, next: NextFunction) =>
    financeController.getMonthlyReport(req, res, next),
);

// ============================================================================
// PAYROLL ROUTES (Protected - Managers & Admins)
// ============================================================================

router.post(
  "/payroll/run",
  authMiddleware,
  requirePermission("hr.payroll.run"),
  (req: Request, res: Response, next: NextFunction) =>
    payrollController.runPayroll(req, res, next),
);
router.get(
  "/payroll/:id",
  authMiddleware,
  (req: Request, res: Response, next: NextFunction) =>
    payrollController.getPayroll(req, res, next),
);
router.patch(
  "/payroll/:id/status",
  authMiddleware,
  requirePermission("hr.payroll.run"),
  (req: Request, res: Response, next: NextFunction) =>
    payrollController.updatePayrollStatus(req, res, next),
);
router.get(
  "/payroll/reports/summary",
  authMiddleware,
  requirePermission("hr.payroll.run"),
  (req: Request, res: Response, next: NextFunction) =>
    payrollController.getPayrollReport(req, res, next),
);
router.get(
  "/payroll/analytics/trends",
  authMiddleware,
  requirePermission("hr.payroll.run"),
  (req: Request, res: Response, next: NextFunction) =>
    payrollController.getPayrollAnalytics(req, res, next),
);

// ============================================================================
// BRANCH DASHBOARD ROUTES (Protected - Managers & Admins)
// ============================================================================

router.get(
  "/branches/:id/dashboard",
  authMiddleware,
  requirePermission("hr.employee.view"),
  (req: Request, res: Response, next: NextFunction) =>
    branchController.getDashboard(req, res, next),
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
