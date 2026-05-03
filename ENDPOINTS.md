# Complete API Endpoints Reference

**Base URL:** `http://localhost:3000/v1` or `process.env.NEXT_PUBLIC_API_URL`

---

## 🔐 Authentication Routes

**Prefix:** `/v1/auth`

| Method | Endpoint         | Handler                      | Auth | Purpose                                  |
| ------ | ---------------- | ---------------------------- | ---- | ---------------------------------------- |
| POST   | `/auth/login`    | AuthController.login         | ❌   | Login with email & password, returns JWT |
| POST   | `/auth/register` | AuthController.register      | ❌   | Register new user account                |
| GET    | `/auth/me`       | AuthController.me            | ✅   | Get current authenticated user           |
| PATCH  | `/auth/profile`  | AuthController.updateProfile | ✅   | Update user profile                      |
| POST   | `/auth/refresh`  | AuthController.refresh       | ✅   | Refresh authentication token             |

---

## 💰 Sales & Invoices

**Prefix:** `/v1/sales`

### Sales Documents (CRUD)

| Method | Endpoint                  | Handler                         | Permission             | Purpose                                                        |
| ------ | ------------------------- | ------------------------------- | ---------------------- | -------------------------------------------------------------- |
| POST   | `/documents`              | SalesController.createDocument  | sales.order.create     | Create new sales document (Draft, Quote, Invoice, Credit Note) |
| GET    | `/documents`              | SalesController.listDocuments   | sales.order.view_all   | List all sales documents with filters                          |
| GET    | `/documents/:id`          | SalesController.getDocumentById | sales.order.view_all   | Get single document details                                    |
| POST   | `/documents/:id/convert`  | SalesController.convertDocument | sales.order.manage     | Convert document type (Quote→Invoice)                          |
| POST   | `/documents/:id/void`     | SalesController.voidDocument    | sales.order.manage     | Void/cancel document                                           |
| POST   | `/documents/:id/payments` | SalesController.recordPayment   | finance.payment.record | Record payment for invoice                                     |

### Credit Notes

| Method | Endpoint                            | Handler                          | Permission         | Purpose                         |
| ------ | ----------------------------------- | -------------------------------- | ------------------ | ------------------------------- |
| POST   | `/invoices/:invoiceId/credit-notes` | SalesController.createCreditNote | sales.order.manage | Create credit note from invoice |

### POS Sales (Quick Checkout)

| Method | Endpoint         | Handler                        | Permission           | Purpose                                    |
| ------ | ---------------- | ------------------------------ | -------------------- | ------------------------------------------ |
| POST   | `/pos/sales`     | SalesController.createPOSSale  | sales.order.create   | Complete immediate POS sale (paid invoice) |
| GET    | `/pos/sales`     | SalesController.getPOSSales    | sales.order.view_all | List POS sales history with filtering      |
| GET    | `/pos/sales/:id` | SalesController.getPOSSaleById | sales.order.view_all | Get single POS sale details                |

### Park & Hold Sales (Phase 2)

| Method | Endpoint      | Handler                  | Permission         | Purpose                                         |
| ------ | ------------- | ------------------------ | ------------------ | ----------------------------------------------- |
| POST   | `/sales/park` | SalesController.parkSale | sales.order.create | Park sale (temporary hold, no inventory impact) |
| POST   | `/sales/hold` | SalesController.holdSale | sales.order.create | Hold sale (temporary hold, no inventory impact) |

### PDF & Documents

| Method | Endpoint                 | Handler                       | Permission           | Purpose                          |
| ------ | ------------------------ | ----------------------------- | -------------------- | -------------------------------- |
| GET    | `/documents/:id/pdf`     | PDFController.generatePDF     | sales.order.view_all | Generate PDF of sales document   |
| GET    | `/documents/:id/preview` | PDFController.previewDocument | sales.order.view_all | Preview document before printing |

---

## 📦 Inventory & Products

**Prefix:** `/v1/products`

### Products (CRUD)

| Method | Endpoint | Handler                       | Permission               | Purpose                                     |
| ------ | -------- | ----------------------------- | ------------------------ | ------------------------------------------- |
| POST   | `/`      | ProductService.createProduct  | inventory.product.manage | Create new product                          |
| GET    | `/`      | ProductService.getProducts    | inventory.product.view   | List all products with pagination & filters |
| GET    | `/:id`   | ProductService.getProductById | inventory.product.view   | Get single product details                  |
| PUT    | `/:id`   | ProductService.updateProduct  | inventory.product.manage | Update product (full replacement)           |
| PATCH  | `/:id`   | ProductService.updateProduct  | inventory.product.manage | Update product (partial)                    |
| DELETE | `/:id`   | ProductService.deleteProduct  | inventory.product.manage | Delete/deactivate product                   |

### Product Search (POS)

| Method | Endpoint      | Handler                             | Permission             | Purpose                                 |
| ------ | ------------- | ----------------------------------- | ---------------------- | --------------------------------------- |
| GET    | `/search/pos` | ProductService.searchProductsForPOS | inventory.product.view | Search products for POS with stock info |

---

## 🏢 Branches

**Prefix:** `/v1/branches`

| Method | Endpoint               | Handler                         | Permission          | Purpose                                       |
| ------ | ---------------------- | ------------------------------- | ------------------- | --------------------------------------------- |
| GET    | `/branches`            | BranchController.getAllBranches | admin.branch.manage | List all branches                             |
| GET    | `/branches/stats`      | BranchController.getBranchStats | hr.employee.view    | Get branch statistics & summary               |
| GET    | `/branches/:id`        | BranchController.getBranch      | -                   | Get single branch details                     |
| POST   | `/branches`            | BranchController.createBranch   | admin.branch.manage | Create new branch                             |
| PUT    | `/branches/:id`        | BranchController.updateBranch   | admin.branch.manage | Update branch details                         |
| DELETE | `/branches/:id`        | BranchController.deleteBranch   | admin.branch.manage | Delete branch                                 |
| POST   | `/branches/:id/switch` | BranchController.switchBranch   | admin.branch.manage | Switch user's branch context (get scoped JWT) |

---

## 🏭 Warehouse & Stock Management

**Prefix:** `/v1/warehouse`

### Warehouse (CRUD)

| Method | Endpoint | Handler                               | Permission                 | Purpose                  |
| ------ | -------- | ------------------------------------- | -------------------------- | ------------------------ |
| POST   | `/`      | WarehouseController.createWarehouse   | inventory.warehouse.create | Create new warehouse     |
| GET    | `/`      | WarehouseController.listWarehouses    | inventory.warehouse.view   | List all warehouses      |
| GET    | `/stats` | WarehouseController.getWarehouseStats | inventory.stock.view       | Get warehouse statistics |

### Stock Movements

| Method | Endpoint     | Handler                               | Permission           | Purpose                          |
| ------ | ------------ | ------------------------------------- | -------------------- | -------------------------------- |
| GET    | `/movements` | WarehouseController.getStockMovements | inventory.stock.view | Get stock movements with filters |

### Stock Transfers

| Method | Endpoint                | Handler                                  | Permission             | Purpose                   |
| ------ | ----------------------- | ---------------------------------------- | ---------------------- | ------------------------- |
| POST   | `/transfer`             | WarehouseController.createTransfer       | inventory.stock.adjust | Create new stock transfer |
| GET    | `/transfers`            | WarehouseController.getTransfers         | inventory.stock.view   | List stock transfers      |
| GET    | `/transfers/:id`        | WarehouseController.getTransferById      | inventory.stock.view   | Get transfer details      |
| PATCH  | `/transfers/:id/status` | WarehouseController.updateTransferStatus | inventory.stock.adjust | Update transfer status    |

---

## 💳 Purchasing & Vendors

**Prefix:** `/v1/purchasing`

### Vendors

| Method | Endpoint       | Handler                           | Permission                       | Purpose                         |
| ------ | -------------- | --------------------------------- | -------------------------------- | ------------------------------- |
| GET    | `/vendors`     | PurchasingController.listVendors  | purchasing.vendor.view OR manage | List vendors                    |
| POST   | `/vendors`     | PurchasingController.createVendor | purchasing.vendor.manage         | Create new vendor               |
| GET    | `/vendors/:id` | PurchasingController.getVendor    | purchasing.vendor.view OR manage | Get vendor details              |
| PATCH  | `/vendors/:id` | PurchasingController.updateVendor | purchasing.vendor.manage         | Update vendor                   |
| DELETE | `/vendors/:id` | PurchasingController.deleteVendor | purchasing.vendor.manage         | Deactivate vendor (soft delete) |

### Purchase Orders (LPO)

| Method | Endpoint              | Handler                                   | Permission                   | Purpose                                       |
| ------ | --------------------- | ----------------------------------------- | ---------------------------- | --------------------------------------------- |
| POST   | `/orders`             | PurchasingController.createPurchaseOrder  | purchasing.order.create      | Create new purchase order                     |
| GET    | `/orders`             | PurchasingController.listPurchaseOrders   | purchasing.order.view_all    | List all purchase orders                      |
| GET    | `/orders/:id`         | PurchasingController.getPurchaseOrder     | -                            | Get single PO details (checked in controller) |
| PATCH  | `/orders/:id/status`  | PurchasingController.updateStatus         | -                            | Update PO status                              |
| PATCH  | `/orders/:id/approve` | PurchasingController.approvePurchaseOrder | purchasing.order.approve\_\* | Approve purchase order (tier-based)           |
| POST   | `/orders/:id/receive` | PurchasingController.receiveGoods         | purchasing.order.receive     | Receive goods for PO                          |
| GET    | `/orders/:id/pdf`     | PurchasingController.generatePdf          | -                            | Generate PO PDF (checked in controller)       |

---

## 👥 Employees & HR

**Prefix:** `/v1/employees` or `/v1/hr`

### Employees (CRUD)

| Method | Endpoint                   | Handler                               | Permission         | Purpose                            |
| ------ | -------------------------- | ------------------------------------- | ------------------ | ---------------------------------- |
| GET    | `/employees`               | EmployeeController.getAllEmployees    | hr.employee.view   | List all employees                 |
| GET    | `/employees/:id`           | EmployeeController.getEmployee        | hr.employee.view   | Get employee with transfer history |
| POST   | `/employees`               | EmployeeController.createEmployee     | hr.employee.manage | Create new employee                |
| PUT    | `/employees/:id`           | EmployeeController.updateEmployee     | hr.employee.manage | Update employee                    |
| POST   | `/employees/:id/transfer`  | EmployeeController.transferEmployee   | hr.employee.manage | Transfer employee to branch        |
| GET    | `/employees/:id/transfers` | EmployeeController.getTransferHistory | hr.employee.view   | Get employee transfer history      |
| DELETE | `/employees/:id`           | EmployeeController.deleteEmployee     | hr.employee.manage | Delete employee                    |

### Users (Admin)

| Method | Endpoint        | Handler                 | Permission        | Purpose                |
| ------ | --------------- | ----------------------- | ----------------- | ---------------------- |
| POST   | `/hr/users`     | HrController.createUser | admin.user.manage | Create new system user |
| GET    | `/hr/users/:id` | HrController.getUser    | -                 | Get user details       |
| PATCH  | `/hr/users/:id` | HrController.updateUser | admin.user.manage | Update user            |

### Payroll

| Method | Endpoint          | Handler                    | Permission     | Purpose               |
| ------ | ----------------- | -------------------------- | -------------- | --------------------- |
| POST   | `/hr/payroll`     | HrController.createPayroll | hr.payroll.run | Create payroll record |
| GET    | `/hr/payroll`     | HrController.listPayroll   | -              | List payroll records  |
| GET    | `/hr/payroll/:id` | HrController.getPayroll    | -              | Get payroll details   |
| PATCH  | `/hr/payroll/:id` | HrController.updatePayroll | hr.payroll.run | Update payroll        |

### Recruitment

| Method | Endpoint                                | Handler                                     | Permission            | Purpose                 |
| ------ | --------------------------------------- | ------------------------------------------- | --------------------- | ----------------------- |
| POST   | `/hr/recruitment/postings`              | RecruitmentController.createJobPosting      | hr.recruitment.manage | Create job posting      |
| GET    | `/hr/recruitment/postings`              | RecruitmentController.getJobPostings        | -                     | List job postings       |
| GET    | `/hr/recruitment/postings/:id`          | RecruitmentController.getJobPostingById     | -                     | Get posting details     |
| POST   | `/hr/recruitment/applicants`            | RecruitmentController.createApplicant       | -                     | Submit job application  |
| PATCH  | `/hr/recruitment/applicants/:id/status` | RecruitmentController.updateApplicantStatus | hr.recruitment.manage | Update applicant status |
| POST   | `/hr/recruitment/interviews`            | RecruitmentController.scheduleInterview     | hr.recruitment.manage | Schedule interview      |
| PATCH  | `/hr/recruitment/interviews/:id`        | RecruitmentController.updateInterview       | hr.recruitment.manage | Update interview        |

### Performance Management

| Method | Endpoint                        | Handler                          | Permission            | Purpose                                 |
| ------ | ------------------------------- | -------------------------------- | --------------------- | --------------------------------------- |
| POST   | `/hr/performance/goals`         | PerformanceController.createGoal | -                     | Create performance goal                 |
| GET    | `/hr/performance/goals`         | PerformanceController.getGoals   | -                     | List goals (own or all with permission) |
| GET    | `/hr/performance/goals/:userId` | PerformanceController.getGoals   | hr.performance.manage | Get employee's goals                    |

---

## 💰 Finance & Accounting

**Prefix:** `/v1/finance`

### General Ledger

| Method | Endpoint               | Handler                                    | Permission        | Purpose                     |
| ------ | ---------------------- | ------------------------------------------ | ----------------- | --------------------------- |
| GET    | `/finance/gl/journals` | FinanceController.getJournals              | finance.gl.view   | Get journal entries         |
| GET    | `/finance/gl/entries`  | FinanceController.getLedgerEntries         | finance.gl.view   | Get ledger entries          |
| POST   | `/finance/gl/entries`  | FinanceController.createManualJournalEntry | finance.gl.create | Create manual journal entry |

### Accounts Receivable (AR)

| Method | Endpoint                    | Handler                             | Permission                      | Purpose                      |
| ------ | --------------------------- | ----------------------------------- | ------------------------------- | ---------------------------- |
| GET    | `/finance/ar/list`          | FinanceController.getReceivables    | finance.gl.view                 | List outstanding receivables |
| POST   | `/finance/ar/payment`       | FinanceController.recordARPayment   | finance.payment.record          | Record AR payment            |
| GET    | `/finance/ar/aging`         | FinanceController.getARAgingReport  | finance.report.aging            | Get AR aging report          |
| GET    | `/finance/ar/aging-summary` | FinanceController.getARAgingSummary | finance.gl.view OR report.aging | Get AR aging summary         |

### Accounts Payable (AP)

| Method | Endpoint              | Handler                              | Permission                      | Purpose                   |
| ------ | --------------------- | ------------------------------------ | ------------------------------- | ------------------------- |
| GET    | `/finance/ap/list`    | FinanceController.getPayables        | finance.gl.view                 | List outstanding payables |
| POST   | `/finance/ap/payment` | FinanceController.recordAPPayment    | finance.payment.record          | Record AP payment         |
| GET    | `/finance/ap/status`  | FinanceController.getAPStatusSummary | finance.gl.view OR report.aging | Get AP status summary     |

### Fiscal Periods

| Method | Endpoint                      | Handler                            | Permission               | Purpose                       |
| ------ | ----------------------------- | ---------------------------------- | ------------------------ | ----------------------------- |
| GET    | `/finance/periods`            | FinanceController.getFiscalPeriods | finance.settings.periods | List fiscal periods           |
| POST   | `/finance/periods/initialize` | FinanceController.initializePeriod | finance.settings.periods | Initialize new fiscal period  |
| PATCH  | `/finance/periods/:id`        | FinanceController.updatePeriod     | finance.settings.periods | Update period                 |
| POST   | `/finance/periods/:id/lock`   | FinanceController.lockPeriod       | finance.settings.periods | Lock period (prevent changes) |
| POST   | `/finance/periods/:id/unlock` | FinanceController.unlockPeriod     | finance.settings.periods | Unlock period                 |

### Charts & Reports (Dashboard)

| Method | Endpoint                         | Handler                                      | Permission                      | Purpose                               |
| ------ | -------------------------------- | -------------------------------------------- | ------------------------------- | ------------------------------------- |
| GET    | `/finance/summary`               | FinanceController.getFinancialSummary        | -                               | Get financial dashboard summary       |
| GET    | `/finance/income-statement`      | FinanceController.getIncomeStatement         | -                               | Get income statement                  |
| GET    | `/finance/revenue-expense-chart` | FinanceController.getRevenueExpenseChartData | -                               | Get revenue/expense chart data        |
| GET    | `/finance/top-products`          | FinanceController.getTopSellingProducts      | -                               | Get top selling products              |
| GET    | `/finance/sales-by-payment`      | FinanceController.getSalesByPaymentMethod    | -                               | Get sales breakdown by payment method |
| GET    | `/finance/kpis`                  | FinanceController.getFinancialKPIs           | -                               | Get financial KPIs                    |
| GET    | `/finance/expense-categories`    | FinanceController.getExpenseCategories       | finance.gl.view OR report.aging | Get expense categories                |
| GET    | `/finance/daily-spending`        | FinanceController.getDailySpending           | finance.gl.view OR report.aging | Get daily spending                    |
| GET    | `/finance/savings-goals`         | FinanceController.getSavingsGoals            | finance.gl.view OR report.aging | Get savings goals                     |

### Savings Goals

| Method | Endpoint                     | Handler                             | Permission        | Purpose             |
| ------ | ---------------------------- | ----------------------------------- | ----------------- | ------------------- |
| POST   | `/finance/savings-goals`     | FinanceController.createSavingsGoal | finance.gl.create | Create savings goal |
| PATCH  | `/finance/savings-goals/:id` | FinanceController.updateSavingsGoal | finance.gl.create | Update savings goal |
| DELETE | `/finance/savings-goals/:id` | FinanceController.deleteSavingsGoal | finance.gl.create | Delete savings goal |

### Transactions

| Method | Endpoint                    | Handler                             | Permission        | Purpose                      |
| ------ | --------------------------- | ----------------------------------- | ----------------- | ---------------------------- |
| POST   | `/finance/transactions`     | FinanceController.createTransaction | finance.gl.create | Create financial transaction |
| GET    | `/finance/transactions/:id` | FinanceController.getTransaction    | -                 | Get transaction details      |
| GET    | `/finance/transactions`     | FinanceController.listTransactions  | -                 | List transactions            |
| PATCH  | `/finance/transactions/:id` | FinanceController.updateTransaction | finance.gl.create | Update transaction           |

---

## 🎫 Cashier Sessions

**Prefix:** `/v1/cashier`

| Method | Endpoint                  | Handler                                    | Permission                           | Purpose                                     |
| ------ | ------------------------- | ------------------------------------------ | ------------------------------------ | ------------------------------------------- |
| POST   | `/sessions/open`          | CashierSessionController.openSession       | cashier.session.open                 | Open new cashier session                    |
| POST   | `/sessions/:id/close`     | CashierSessionController.closeSession      | cashier.session.close                | Close session & calculate variance          |
| GET    | `/sessions/current`       | CashierSessionController.getCurrentSession | -                                    | Get active session for user                 |
| GET    | `/sessions`               | CashierSessionController.listSessions      | cashier.session.view_own OR view_all | List sessions (filtered by permission)      |
| GET    | `/sessions/:id`           | CashierSessionController.getSessionDetails | -                                    | Get session details (checked in controller) |
| POST   | `/sessions/:id/reconcile` | CashierSessionController.reconcileSession  | cashier.variance.approve             | Reconcile session variance                  |
| GET    | `/reports/daily`          | CashierSessionController.getDailySummary   | cashier.session.view_own OR view_all | Get daily summary report                    |

---

## 👨‍💼 Admin & System Management

### Admin Dashboard

| Method | Endpoint                      | Handler                                 | Permission          | Purpose                     |
| ------ | ----------------------------- | --------------------------------------- | ------------------- | --------------------------- |
| GET    | `/admin/branches`             | AdminController.listBranches            | admin.branch.view   | List branches (admin view)  |
| GET    | `/admin/employees`            | AdminController.listEmployees           | admin.employee.view | List employees (admin view) |
| GET    | `/admin/products`             | AdminController.listProducts            | admin.product.view  | List products (admin view)  |
| GET    | `/admin/deliveries`           | AdminController.listDeliveries          | admin.delivery.view | List deliveries             |
| GET    | `/admin/finance/transactions` | AdminController.listFinanceTransactions | admin.finance.view  | List transactions           |
| GET    | `/admin/payroll`              | AdminController.listPayroll             | admin.payroll.view  | List payroll records        |
| GET    | `/admin/payroll/records`      | AdminController.listPayroll             | admin.payroll.view  | Alias for payroll list      |

### RBAC Management

**Prefix:** `/v1/rbac`

| Method | Endpoint                      | Handler                            | Permission        | Purpose                        |
| ------ | ----------------------------- | ---------------------------------- | ----------------- | ------------------------------ |
| GET    | `/rbac/roles`                 | RbacController.listRoles           | admin.user.manage | List all roles                 |
| GET    | `/rbac/roles/:id`             | RbacController.getRole             | admin.user.manage | Get role details               |
| POST   | `/rbac/roles`                 | RbacController.createRole          | admin.user.manage | Create new role                |
| PATCH  | `/rbac/roles/:id`             | RbacController.updateRole          | admin.user.manage | Update role                    |
| DELETE | `/rbac/roles/:id`             | RbacController.deleteRole          | admin.user.manage | Delete role                    |
| GET    | `/rbac/permissions`           | RbacController.listPermissions     | admin.user.manage | List all available permissions |
| POST   | `/rbac/roles/:id/permissions` | RbacController.syncRolePermissions | admin.user.manage | Sync permissions to role       |
| GET    | `/rbac/users/:userId/roles`   | RbacController.getUserRoles        | admin.user.manage | Get user's assigned roles      |
| POST   | `/rbac/users/:userId/roles`   | RbacController.assignUserRoles     | admin.user.manage | Assign roles to user           |

### Audit Logs

**Prefix:** `/v1/audit`

| Method | Endpoint | Handler                      | Permission        | Purpose        |
| ------ | -------- | ---------------------------- | ----------------- | -------------- |
| GET    | `/audit` | AuditController.getAuditLogs | admin.user.manage | Get audit logs |

---

## 🚚 Fleet & Delivery Management

**Prefix:** `/v1/fleet` or `/v1/deliveries`

### Trucks

| Method | Endpoint             | Handler                     | Permission               | Purpose           |
| ------ | -------------------- | --------------------------- | ------------------------ | ----------------- |
| GET    | `/deliveries/trucks` | FleetController.getTrucks   | -                        | List trucks       |
| POST   | `/fleet/trucks`      | FleetController.createTruck | inventory.product.manage | Create new truck  |
| GET    | `/fleet/trucks/:id`  | FleetController.getTruck    | -                        | Get truck details |
| PATCH  | `/fleet/trucks/:id`  | FleetController.updateTruck | inventory.product.manage | Update truck      |

### Deliveries

| Method | Endpoint                   | Handler                              | Permission         | Purpose                        |
| ------ | -------------------------- | ------------------------------------ | ------------------ | ------------------------------ |
| POST   | `/deliveries`              | FleetController.createDelivery       | sales.order.create | Create new delivery            |
| GET    | `/deliveries`              | FleetController.listDeliveries       | -                  | List deliveries                |
| GET    | `/deliveries/:id`          | FleetController.getDelivery          | -                  | Get delivery details           |
| GET    | `/deliveries/:id/timeline` | FleetController.getDeliveryTimeline  | -                  | Get delivery progress timeline |
| PATCH  | `/deliveries/:id`          | FleetController.updateDelivery       | sales.order.manage | Update delivery                |
| PATCH  | `/deliveries/:id/status`   | FleetController.updateDeliveryStatus | sales.order.manage | Update delivery status         |

### Legacy Fleet Routes

| Method | Endpoint                | Handler                        | Purpose                  |
| ------ | ----------------------- | ------------------------------ | ------------------------ |
| POST   | `/fleet/deliveries`     | FleetController.createDelivery | Create delivery (legacy) |
| GET    | `/fleet/deliveries/:id` | FleetController.getDelivery    | Get delivery (legacy)    |
| PATCH  | `/fleet/deliveries/:id` | FleetController.updateDelivery | Update delivery (legacy) |

---

## 🛒 POS System (Additional Routes in index.ts)

| Method | Endpoint                 | Handler                       | Permission       | Purpose                 |
| ------ | ------------------------ | ----------------------------- | ---------------- | ----------------------- |
| POST   | `/pos/products/search`   | POSController.searchProduct   | -                | Search products for POS |
| GET    | `/pos/sales/:id/receipt` | POSController.getReceipt      | -                | Get sale receipt        |
| GET    | `/pos/daily-summary`     | POSController.getDailySummary | pos.session.view | Get POS daily summary   |
| GET    | `/pos/sales/:id`         | POSController.getSalesById    | -                | Get sale by ID          |

---

## 📊 Reports

**Prefix:** `/v1/reports`

_Routes available in_ `modules/reports/reports.routes.ts`

---

## 📝 Sales Orders

**Prefix:** `/v1/sales/orders`

| Method | Endpoint                     | Handler                            | Permission                   | Purpose              |
| ------ | ---------------------------- | ---------------------------------- | ---------------------------- | -------------------- |
| POST   | `/sales/orders`              | SalesController.createSalesOrder   | sales.order.create           | Create sales order   |
| GET    | `/sales/orders`              | SalesController.listSalesOrders    | sales.order.view OR view_all | List sales orders    |
| GET    | `/sales/orders/:id`          | SalesController.getSalesOrder      | sales.order.view OR view_all | Get order details    |
| PATCH  | `/sales/orders/:id`          | SalesController.updateSalesOrder   | -                            | Update sales order   |
| POST   | `/sales/orders/:id/dispatch` | SalesController.createDispatchNote | -                            | Create dispatch note |

---

## 🔍 Customers

**Prefix:** `/v1/customers`

| Method | Endpoint            | Handler                      | Permission                    | Purpose                     |
| ------ | ------------------- | ---------------------------- | ----------------------------- | --------------------------- |
| GET    | `/customers/search` | CustomersController.search   | sales.customer.view OR manage | Quick customer search (POS) |
| POST   | `/customers`        | CustomersController.create   | sales.customer.manage         | Create new customer         |
| GET    | `/customers`        | CustomersController.findAll  | sales.customer.view OR manage | List customers              |
| GET    | `/customers/:id`    | CustomersController.findById | sales.customer.view OR manage | Get customer details        |
| PUT    | `/customers/:id`    | CustomersController.update   | sales.customer.manage         | Update customer             |
| DELETE | `/customers/:id`    | CustomersController.delete   | sales.customer.manage         | Delete customer             |

---

## 🏥 System Health

| Method | Endpoint   | Handler            | Purpose                        |
| ------ | ---------- | ------------------ | ------------------------------ |
| GET    | `/health`  | Express            | Application health check       |
| GET    | `/metrics` | Metrics Middleware | Application metrics/statistics |

---

## Summary Statistics

- **Total Endpoints:** ~150+
- **Authentication Required:** ~95% (except /auth/login, /auth/register, public endpoints)
- **RBAC Gated:** ~90% (based on permissions)
- **POS-Specific:** 8+ endpoints
- **Finance/Accounting:** 25+ endpoints
- **HR/Payroll:** 20+ endpoints
- **Inventory/Warehouse:** 15+ endpoints
- **Purchasing:** 10+ endpoints
- **Fleet/Delivery:** 12+ endpoints
- **Admin/System:** 15+ endpoints
