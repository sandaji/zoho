import "dotenv/config";
import { prisma } from "../../src/core/database/db";
import { logger } from "../../src/core/utils/logger";

// Type alias to replace the Prisma enum import that's failing at runtime
type AccessScope = "GLOBAL" | "BRANCH" | "OWN";
const AccessScope = {
  GLOBAL: "GLOBAL" as AccessScope,
  BRANCH: "BRANCH" as AccessScope,
  OWN: "OWN" as AccessScope,
};

async function main() {
  console.log("🔄 Starting RBAC Update...");

  // ==========================================
  // 1. Define Modules
  // ==========================================
  const modules = [
    { code: "admin", name: "Administration" },
    { code: "hr", name: "Human Resources" },
    { code: "finance", name: "Finance" },
    { code: "sales", name: "Sales" },
    { code: "inventory", name: "Inventory" },
    { code: "purchasing", name: "Purchasing" },
    { code: "audit", name: "Audit" },
    { code: "crm", name: "CRM" },
    { code: "workflow", name: "Workflow & Approvals" },
    { code: "dashboard", name: "Role Dashboards" },
    { code: "messaging", name: "Messaging" },
    { code: "integrations", name: "Integrations" },
  ];

  const moduleMap = new Map<string, string>();

  for (const m of modules) {
    const mod = await prisma.module.upsert({
      where: { code: m.code },
      update: { name: m.name },
      create: { code: m.code, name: m.name },
    });
    moduleMap.set(m.code, mod.id);
    console.log(`✅ Module: ${m.name}`);
  }

  // ==========================================
  // 2. Define Permissions
  // ==========================================
  const permissions = [
    // Demand forecasting
    { code: "purchasing.forecast.view", name: "View Demand Forecast and Reorder Suggestions", module: "purchasing" },
    { code: "purchasing.forecast.requisition", name: "Raise Draft Requisitions from Forecast", module: "purchasing" },
    // Integrations: API keys and webhooks
    { code: "integrations.view", name: "View API Keys, Webhooks and Deliveries", module: "integrations" },
    { code: "integrations.manage", name: "Create and Revoke API Keys and Webhooks", module: "integrations" },
    // M-Pesa STK push
    { code: "sales.mpesa.initiate", name: "Request M-Pesa Payments (STK Push)", module: "sales" },
    { code: "sales.mpesa.view", name: "View All M-Pesa Requests", module: "sales" },
    // Messaging (email / SMS / WhatsApp)
    { code: "messaging.view", name: "View Message Log and Templates", module: "messaging" },
    { code: "messaging.send", name: "Send Customer Messages and Receipts", module: "messaging" },
    { code: "messaging.manage", name: "Manage Templates, Retry Messages, Opt-outs", module: "messaging" },
    // Promotions
    { code: "sales.promotion.view", name: "View Promotions", module: "sales" },
    { code: "sales.promotion.manage", name: "Create and Edit Promotions", module: "sales" },
    { code: "sales.promotion.activate", name: "Activate Promotions", module: "sales" },
    // RFQs and supplier evaluation
    { code: "purchasing.rfq.view", name: "View RFQs", module: "purchasing" },
    { code: "purchasing.rfq.manage", name: "Run RFQs and Record Quotes", module: "purchasing" },
    { code: "purchasing.rfq.award", name: "Award RFQs", module: "purchasing" },
    { code: "purchasing.vendor.evaluate", name: "Evaluate Suppliers", module: "purchasing" },
    // Stock counts
    { code: "inventory.count.view", name: "View Stock Counts", module: "inventory" },
    { code: "inventory.count.enter", name: "Enter Stock Count Quantities", module: "inventory" },
    { code: "inventory.count.manage", name: "Create, Review and Post Stock Counts", module: "inventory" },
    { code: "workflow.stock_count.approve_high", name: "Approve Large Stock Count Variances", module: "workflow" },
    // People: contracts and salary structures
    { code: "hr.contract.view", name: "View Employment Contracts", module: "hr" },
    { code: "hr.contract.manage", name: "Draft Employment Contracts", module: "hr" },
    { code: "hr.contract.activate", name: "Activate / Terminate Contracts", module: "hr" },
    { code: "hr.salary_structure.manage", name: "Manage Salary Structures", module: "hr" },
    // Role dashboards
    { code: "dashboard.executive.view", name: "View Executive Dashboard", module: "dashboard" },
    { code: "dashboard.inventory.view", name: "View Inventory Dashboard", module: "dashboard" },
    { code: "dashboard.sales.view", name: "View Sales Dashboard", module: "dashboard" },
    // Admin
    { code: "admin.user.manage", name: "Manage Users", module: "admin" },
    { code: "admin.role.manage", name: "Manage Roles", module: "admin" },
    { code: "admin.branch.manage", name: "Manage Branches", module: "admin" },
    {
      code: "admin.system.view",
      name: "View System Settings",
      module: "admin",
    },
    {
      code: "admin.system.manage",
      name: "Manage System Settings",
      module: "admin",
    },
    // Read-only admin endpoints (routes/index.ts). Catalog only: grant these to
    // roles from the admin Roles screen — none are assigned in this script.
    { code: "admin.user.view", name: "View Users", module: "admin" },
    {
      code: "admin.warehouse.view",
      name: "View Warehouses (Admin)",
      module: "admin",
    },
    {
      code: "admin.product.view",
      name: "View Products (Admin)",
      module: "admin",
    },
    {
      code: "admin.delivery.view",
      name: "View Deliveries (Admin)",
      module: "admin",
    },
    {
      code: "admin.finance.view",
      name: "View Finance Transactions (Admin)",
      module: "admin",
    },
    {
      code: "admin.payroll.view",
      name: "View Payroll (Admin)",
      module: "admin",
    },

    // Head-office oversight switch. A role holding this is exempt from branch
    // isolation (db.ts) and from BRANCH-scoping in requirePermission: it sees
    // every branch's data. Tick it on head-office roles from the Roles screen;
    // leave it OFF for anything that belongs to a single branch.
    {
      code: "org.branches.view_all",
      name: "Access All Branches (Head Office Oversight)",
      module: "admin",
    },

    // HR
    { code: "hr.employee.view", name: "View Employees", module: "hr" },
    { code: "hr.employee.manage", name: "Manage Employees", module: "hr" },
    { code: "hr.payroll.view", name: "View Payroll", module: "hr" },
    { code: "hr.payroll.run", name: "Run Payroll", module: "hr" },
    { code: "hr.payroll.manage", name: "Manage Payroll", module: "hr" },
    { code: "hr.recruitment.manage", name: "Manage Recruitment", module: "hr" },
    { code: "hr.performance.manage", name: "Manage Performance", module: "hr" },
    { code: "hr.benefits.manage", name: "Manage Benefits", module: "hr" },
    { code: "hr.leave.approve", name: "Approve Leave", module: "hr" },

    // Workflow engine: who may decide each approval stage, and who oversees
    { code: "sales.refund.request", name: "Raise Customer Refunds", module: "sales" },
    {
      code: "workflow.refund.branch_approve",
      name: "Approve Refunds (Branch Manager stage)",
      module: "workflow",
    },
    {
      code: "workflow.refund.finance_approve",
      name: "Approve Refunds (Finance stage)",
      module: "workflow",
    },
    {
      code: "sales.price.override",
      name: "Sell Below Catalogue Price Without Approval",
      module: "sales",
    },
    {
      code: "workflow.price_override.sales_approve",
      name: "Approve Price Overrides (Sales Manager stage)",
      module: "workflow",
    },
    {
      code: "workflow.price_override.branch_approve",
      name: "Approve Price Overrides (Branch Manager stage)",
      module: "workflow",
    },
    {
      code: "workflow.payroll.hr_approve",
      name: "Approve Payroll (HR Manager stage)",
      module: "workflow",
    },
    {
      code: "workflow.payroll.finance_approve",
      name: "Approve Payroll (Finance Manager stage)",
      module: "workflow",
    },
    {
      code: "workflow.payroll.md_approve",
      name: "Approve Payroll (MD final stage)",
      module: "workflow",
    },
    {
      code: "workflow.stock_adjust.warehouse_approve",
      name: "Approve Stock Adjustments (Warehouse Manager stage)",
      module: "workflow",
    },
    {
      code: "workflow.stock_adjust.inventory_approve",
      name: "Approve Stock Adjustments (Inventory Manager stage)",
      module: "workflow",
    },
    {
      code: "workflow.view_all",
      name: "View Every Approval Request and Its History",
      module: "workflow",
    },
    {
      code: "workflow.design.manage",
      name: "Design Approval Workflows and Retry Failed Outcomes",
      module: "workflow",
    },

    // Audit governance: findings and the risk register
    { code: "audit.finding.view", name: "View All Audit Findings", module: "audit" },
    { code: "audit.finding.manage", name: "Raise, Edit and Close Audit Findings", module: "audit" },
    { code: "audit.risk.view", name: "View the Risk Register", module: "audit" },
    { code: "audit.risk.manage", name: "Maintain the Risk Register", module: "audit" },

    // CRM: leads, pipeline, follow-ups, territories, sales targets
    { code: "crm.pipeline.view", name: "View Own CRM Pipeline", module: "crm" },
    {
      code: "crm.pipeline.manage",
      name: "Manage Leads, Opportunities and Follow-ups",
      module: "crm",
    },
    {
      code: "crm.pipeline.view_all",
      name: "View Everyone's CRM Pipeline (Sales Manager)",
      module: "crm",
    },
    {
      code: "crm.territory.manage",
      name: "Manage Sales Territories",
      module: "crm",
    },
    { code: "crm.target.view", name: "View Own Sales Targets", module: "crm" },
    { code: "crm.target.manage", name: "Set Sales Targets", module: "crm" },

    // Finance
    { code: "finance.gl.view", name: "View General Ledger", module: "finance" },
    { code: "finance.gl.create", name: "Create GL Entries", module: "finance" },
    {
      code: "finance.gl.approve",
      name: "Approve GL Entries",
      module: "finance",
    },
    {
      code: "finance.gl.manage",
      name: "Manage General Ledger",
      module: "finance",
    },
    {
      code: "finance.report.aging",
      name: "View Aging Reports",
      module: "finance",
    },
    {
      code: "finance.invoice.create",
      name: "Create Invoices",
      module: "finance",
    },
    { code: "finance.invoice.view", name: "View Invoices", module: "finance" },
    {
      code: "finance.invoice.approve",
      name: "Approve Invoices",
      module: "finance",
    },
    {
      code: "finance.payment.create",
      name: "Create Payments",
      module: "finance",
    },
    { code: "finance.payment.view", name: "View Payments", module: "finance" },
    {
      code: "finance.payment.record",
      name: "Record Payments on Sales Documents",
      module: "finance",
    },
    {
      code: "finance.settings.periods",
      name: "Manage Fiscal Periods",
      module: "finance",
    },

    // Expense Reports (finance-department roadmap Phase 1/2)
    {
      code: "finance.expense.view",
      name: "View Own Expense Reports",
      module: "finance",
    },
    {
      code: "finance.expense.view_all",
      name: "View All Expense Reports",
      module: "finance",
    },
    {
      code: "finance.expense.create",
      name: "Submit Expense Reports",
      module: "finance",
    },
    {
      code: "finance.expense.post",
      name: "Post Approved Expenses to GL",
      module: "finance",
    },
    {
      code: "finance.expense.approve_standard",
      name: "Approve Standard Expenses (< KSH 10,000)",
      module: "finance",
    },
    {
      code: "finance.expense.approve_high_value",
      name: "Approve High-Value Expenses (KSH 10,000 - 100,000)",
      module: "finance",
    },
    {
      code: "finance.expense.approve_executive",
      name: "Approve Executive Expenses (> KSH 100,000)",
      module: "finance",
    },

    // Payment vouchers (general money out)
    { code: "finance.voucher.create", name: "Raise Payment Vouchers", module: "finance" },
    { code: "finance.voucher.view_all", name: "View All Payment Vouchers", module: "finance" },
    { code: "finance.voucher.approve_standard", name: "Approve Standard Payment Vouchers (< KSH 10,000)", module: "finance" },
    { code: "finance.voucher.approve_high_value", name: "Approve High-Value Payment Vouchers (KSH 10,000 - 100,000)", module: "finance" },
    { code: "finance.voucher.approve_executive", name: "Approve Executive Payment Vouchers (> KSH 100,000)", module: "finance" },
    { code: "finance.voucher.pay", name: "Pay Approved Payment Vouchers", module: "finance" },

    // Petty cash (imprest funds)
    { code: "finance.pettycash.view", name: "View Own Petty Cash Fund", module: "finance" },
    { code: "finance.pettycash.view_all", name: "View All Petty Cash Funds", module: "finance" },
    { code: "finance.pettycash.disburse", name: "Pay Out of Petty Cash (Custodian)", module: "finance" },
    { code: "finance.pettycash.manage", name: "Manage Petty Cash Funds (Create, Top Up, Void)", module: "finance" },

    // Sales
    {
      code: "sales.order.view_all",
      name: "View All Sales Orders",
      module: "sales",
    },
    {
      code: "sales.order.create",
      name: "Create Sales Orders",
      module: "sales",
    },
    {
      code: "sales.order.manage",
      name: "Manage Sales Orders",
      module: "sales",
    },
    { code: "sales.customer.view", name: "View Customers", module: "sales" },
    {
      code: "sales.customer.manage",
      name: "Manage Customers",
      module: "sales",
    },
    {
      code: "pos.session.view",
      name: "View POS Sessions / Daily Summary",
      module: "sales",
    },

    // Inventory
    {
      code: "inventory.product.view",
      name: "View Products",
      module: "inventory",
    },
    {
      code: "inventory.product.manage",
      name: "Manage Products",
      module: "inventory",
    },
    { code: "inventory.stock.view", name: "View Stock", module: "inventory" },
    {
      code: "inventory.stock.adjust",
      name: "Adjust Stock",
      module: "inventory",
    },
    {
      code: "inventory.warehouse.manage",
      name: "Manage Warehouses",
      module: "inventory",
    },

    // Purchasing (LPO - Local Purchase Orders) - KSH Currency
    // View & List permissions
    {
      code: "purchasing.order.view_all",
      name: "View All Purchase Orders (LPO)",
      module: "purchasing",
    },
    {
      code: "purchasing.vendor.view",
      name: "View Vendors",
      module: "purchasing",
    },

    // Create & Submit
    {
      code: "purchasing.order.create",
      name: "Create Purchase Orders (LPO)",
      module: "purchasing",
    },
    {
      code: "purchasing.order.submit",
      name: "Submit Purchase Orders to Finance",
      module: "purchasing",
    },
    // Finance step between procurement's submission and the MD / admin's approval
    {
      code: "purchasing.order.acknowledge",
      name: "Acknowledge Purchase Orders (Finance)",
      module: "purchasing",
    },

    // Approval by Threshold (KSH)
    {
      code: "purchasing.order.approve_standard",
      name: "Approve Standard LPOs (< KSH 10,000)",
      module: "purchasing",
    },
    {
      code: "purchasing.order.approve_high_value",
      name: "Approve High-Value LPOs (KSH 10,000 - 100,000)",
      module: "purchasing",
    },
    {
      code: "purchasing.order.approve_executive",
      name: "Approve Executive LPOs (> KSH 100,000)",
      module: "purchasing",
    },

    // Goods Receipt & Closeout
    {
      code: "purchasing.order.receive",
      name: "Receive Goods for LPOs",
      module: "purchasing",
    },
    {
      code: "purchasing.order.cancel",
      name: "Cancel Purchase Orders",
      module: "purchasing",
    },

    // Vendor Management
    {
      code: "purchasing.vendor.manage",
      name: "Manage Vendors (Create/Edit)",
      module: "purchasing",
    },
    {
      code: "purchasing.vendor.delete",
      name: "Delete/Deactivate Vendors",
      module: "purchasing",
    },

    // Purchase Requisitions (pre-PO stage, finance-department roadmap Phase 1/2)
    {
      code: "purchasing.requisition.view",
      name: "View Purchase Requisitions",
      module: "purchasing",
    },
    {
      code: "purchasing.requisition.create",
      name: "Create Purchase Requisitions",
      module: "purchasing",
    },
    {
      code: "purchasing.requisition.approve_standard",
      name: "Approve Standard Requisitions (< KSH 10,000)",
      module: "purchasing",
    },
    {
      code: "purchasing.requisition.approve_high_value",
      name: "Approve High-Value Requisitions (KSH 10,000 - 100,000)",
      module: "purchasing",
    },
    {
      code: "purchasing.requisition.approve_executive",
      name: "Approve Executive Requisitions (> KSH 100,000)",
      module: "purchasing",
    },
    {
      code: "purchasing.requisition.convert",
      name: "Convert Requisition to Purchase Order",
      module: "purchasing",
    },

    // Audit
    { code: "audit.log.view", name: "View Audit Logs", module: "audit" },
  ];

  const permissionMap = new Map<string, string>();

  for (const p of permissions) {
    const moduleId = moduleMap.get(p.module);
    if (!moduleId) {
      console.warn(`⚠️ Module not found for permission: ${p.code}`);
      continue;
    }

    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, moduleId },
      create: { code: p.code, name: p.name, moduleId },
    });
    permissionMap.set(p.code, perm.id);
  }
  console.log("✅ Permissions synced");

  // ==========================================
  // 3. Define Roles
  // ==========================================
  const roles = [
    {
      code: "super_admin",
      name: "System Administrator",
      isSystem: true,
      description: "Full access to everything",
    },
    {
      code: "erp_admin",
      name: "ERP Administrator",
      isSystem: true,
      description: "Functional administration",
    },
    {
      code: "it_support",
      name: "IT Support",
      isSystem: true,
      description: "Technical support access",
    },
    {
      code: "auditor",
      name: "Auditor",
      isSystem: true,
      description: "Read-only access for auditing",
    },
    {
      code: "ceo",
      name: "Managing Director / CEO",
      isSystem: true,
      description: "Executive view",
    },
    {
      code: "branch_manager",
      name: "Branch Manager",
      isSystem: true,
      description:
        "Runs ONE branch (single-branch scope). Requests stock transfers but cannot approve them.",
    },
    // --- Organisation structure ------------------------------------------
    //   Head office (all branches):  manager, finance_manager, director, ...
    //   Each branch (one branch):    branch_manager + branch_finance_manager
    // Branch finance managers report to finance_manager (the main finance
    // officer at head office); branch managers report to manager.
    {
      code: "manager",
      name: "Manager (Head Office / Operations)",
      isSystem: true,
      description:
        "Oversees all branches: supervises branch managers, approves stock transfers and high-value transactions. Not a system administrator.",
    },
    {
      code: "branch_finance_manager",
      name: "Branch Finance Manager (Head Accountant)",
      isSystem: true,
      description:
        "Runs one branch's finances independently (ledger, payments, expenses, branch reports). Reports to the head-office Finance Manager.",
    },
    // --- Finance seniority tiers (finance-department roadmap Phase 1, see
    // erp-finance-gap-analysis.md §3.1). The requirement asked for four
    // tiers: Junior Accountant, Senior Accountant, Finance Manager, Finance
    // Controller. Rather than adding a 5th role that duplicates 'director'
    // (already used below as the top-level executive approver on both LPOs
    // and, now, expense/requisition approvals), the mapping is:
    //   junior_accountant  -> Junior Accountant (new, view-only)
    //   senior_accountant  -> Senior Accountant (new: can post, cannot approve high-value)
    //   finance_manager    -> Finance Manager (existing)
    //   director           -> Finance Controller / Finance Director (existing, see below)
    // 'accountant' (below) predates this tiering and overlaps with
    // senior_accountant — kept for backward compatibility with any users
    // already assigned that role code; assign new users to senior_accountant
    // going forward and consider migrating 'accountant' users off it later.
    {
      code: "junior_accountant",
      name: "Junior Accountant",
      isSystem: true,
      description:
        "View-only access to finance records; cannot post or approve",
    },
    {
      code: "senior_accountant",
      name: "Senior Accountant",
      isSystem: true,
      description:
        "Can post journal entries and submit expenses/requisitions; cannot approve high-value transactions",
    },
    {
      code: "finance_manager",
      name: "Finance Manager (Head Office)",
      isSystem: true,
      description:
        "Main finance officer at head office: oversees every branch's finances; branch finance managers report to this role",
    },
    {
      code: "accountant",
      name: "Accountant (legacy — see senior_accountant)",
      isSystem: true,
      description: "Daily accounting operations",
    },
    {
      code: "cashier",
      name: "Cashier",
      isSystem: true,
      description: "POS and basic sales",
    },
    {
      code: "sales_manager",
      name: "Sales Manager",
      isSystem: true,
      description: "Head of Sales",
    },
    {
      code: "sales_rep",
      name: "Sales Representative",
      isSystem: true,
      description: "Sales operations",
    },
    {
      code: "warehouse_manager",
      name: "Warehouse Manager",
      isSystem: true,
      description: "Head of Warehousing",
    },
    {
      code: "inventory_manager",
      name: "Inventory Manager (Head Office)",
      isSystem: true,
      description:
        "Head-office control of stock across all branches: final approver of stock adjustments.",
    },
    {
      code: "store_clerk",
      name: "Store Clerk",
      isSystem: true,
      description: "Basic inventory operations",
    },
    {
      code: "purchasing_manager",
      name: "Purchasing Manager",
      isSystem: true,
      description: "Head of Purchasing",
    },
    {
      code: "purchasing_officer",
      name: "Purchasing Officer",
      isSystem: true,
      description: "Purchasing operations",
    },
    {
      code: "hr_manager",
      name: "HR Manager",
      isSystem: true,
      description: "Head of HR",
    },
    {
      code: "hr_officer",
      name: "HR Officer",
      isSystem: true,
      description: "HR operations",
    },
    // NOTE: 'director' and 'procurement' were previously referenced below in
    // assignAll() calls without ever being created here — assign()'s
    // roleMap.get(roleCode) silently returned undefined for both, so those
    // permission assignments were no-ops (logged as "⚠️ Missing ID for
    // assignment" and nothing else). Adding them here fixes that; if
    // 'director' and 'procurement' should really just be aliases for the
    // existing 'ceo'/'purchasing_manager' roles instead of new distinct
    // roles, replace the role codes in the assignAll() calls below rather
    // than keeping both this entry and the alias.
    {
      code: "petty_cash_custodian",
      name: "Petty Cash Custodian",
      isSystem: true,
      description:
        "Finance office: holds the petty cash float and pays small expenses. Read access to the finance modules; cannot approve or top up.",
    },
    {
      code: "director",
      name: "Finance Director / Finance Controller",
      isSystem: true,
      description:
        "Executive-level financial sign-off (LPOs, expenses, requisitions)",
    },
    {
      code: "procurement",
      name: "Procurement Staff",
      isSystem: true,
      description: "General procurement operations",
    },
  ];

  const roleMap = new Map<string, string>();

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: {
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
      },
      create: {
        code: r.code,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
      },
    });
    roleMap.set(r.code, role.id);
  }
  console.log("✅ Roles synced");

  // ==========================================
  // 4. Assign Permissions to Roles
  // ==========================================

  // Helper to assign permission to role
  const assign = async (
    roleCode: string,
    permCode: string,
    scope: AccessScope = AccessScope.BRANCH,
  ) => {
    const roleId = roleMap.get(roleCode);
    const permId = permissionMap.get(permCode);

    if (!roleId || !permId) {
      console.warn(`⚠️ Missing ID for assignment: ${roleCode} -> ${permCode}`);
      return;
    }

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId,
          permissionId: permId,
        },
      },
      update: { scope },
      create: { roleId, permissionId: permId, scope },
    });
  };

  const assignAll = async (
    roleCode: string,
    permCodes: string[],
    scope: AccessScope = AccessScope.BRANCH,
  ) => {
    for (const p of permCodes) {
      await assign(roleCode, p, scope);
    }
  };

  // --- Assignments ---

  // Super Admin: Everything (GLOBAL)
  const allPerms = Array.from(permissionMap.keys());
  await assignAll("super_admin", allPerms, AccessScope.GLOBAL);

  // ERP Admin: Full functional access
  await assignAll("erp_admin", allPerms, AccessScope.GLOBAL); // Or restrict system settings?

  // IT Support
  await assign("it_support", "admin.user.manage", AccessScope.GLOBAL);
  await assign("it_support", "admin.system.view", AccessScope.GLOBAL);

  // Auditor: Read-only mostly
  const readOnlyPerms = allPerms.filter(
    (p) => p.includes("view") || p.includes("report") || p.includes("log"),
  );
  await assignAll("auditor", readOnlyPerms, AccessScope.GLOBAL);

  // CEO: View all, Approve high level
  await assignAll("ceo", readOnlyPerms, AccessScope.GLOBAL);

  // Branch Manager — also serves as the "Dept Head" Level 1 approver in
  // the finance-department escalation chain (see erp-finance-gap-
  // analysis.md §3.3 / implementation roadmap Phase 3): every PO,
  // requisition, and expense report needs Level-1 sign-off regardless of
  // amount, and until now nobody held 'approve_standard' except
  // Finance Manager/Director — meaning there was no genuinely distinct
  // Level 1 tier below Finance Manager. This closes that gap.
  const bmPerms = [
    "hr.employee.view",
    "hr.employee.manage",
    "hr.leave.approve",
    "sales.order.view_all",
    "sales.order.manage",
    "sales.customer.view",
    "inventory.stock.view",
    "inventory.stock.adjust",
    "inventory.product.view",
    "finance.invoice.view",
    "purchasing.order.view_all",
    "purchasing.vendor.view",
    "purchasing.requisition.view",
    "purchasing.requisition.approve_standard",
    "finance.expense.approve_standard",
  ];
  await assignAll("branch_manager", bmPerms, AccessScope.BRANCH);

  // Finance Manager
  const financeManagerPerms = permissions
    .filter((p) => p.module === "finance")
    .map((p) => p.code);
  await assignAll("finance_manager", financeManagerPerms, AccessScope.GLOBAL);
  // Also needs payroll run
  await assign("finance_manager", "hr.payroll.run", AccessScope.GLOBAL);

  // Accountant
  const accountantPerms = [
    "finance.gl.view",
    "finance.report.aging",
    "finance.invoice.create",
    "finance.invoice.view",
    "finance.payment.create",
    "finance.payment.view",
  ];
  await assignAll("accountant", accountantPerms, AccessScope.BRANCH);

  // Junior Accountant: view-only across finance, expenses, and requisitions
  // ("can only view data, not approve" — erp-finance-gap-analysis.md §3.1)
  const juniorAccountantPerms = [
    "finance.gl.view",
    "finance.report.aging",
    "finance.invoice.view",
    "finance.payment.view",
    "finance.expense.view",
    "purchasing.requisition.view",
    "purchasing.vendor.view",
  ];
  await assignAll(
    "junior_accountant",
    juniorAccountantPerms,
    AccessScope.BRANCH,
  );

  // Senior Accountant: can post GL entries and submit expenses/requisitions,
  // but no approve_* permissions of any kind — approval starts at Finance
  // Manager. ("can post journal entries but cannot approve high-value
  // requests" — erp-finance-gap-analysis.md §3.1)
  const seniorAccountantPerms = [
    "finance.gl.view",
    "finance.gl.create",
    "finance.report.aging",
    "finance.invoice.create",
    "finance.invoice.view",
    "finance.payment.create",
    "finance.payment.view",
    "finance.expense.view",
    "finance.expense.create",
    "finance.expense.post",
    "purchasing.requisition.view",
    "purchasing.requisition.create",
    "purchasing.vendor.view",
  ];
  await assignAll(
    "senior_accountant",
    seniorAccountantPerms,
    AccessScope.BRANCH,
  );

  // Sales Manager
  const salesManagerPerms = permissions
    .filter((p) => p.module === "sales")
    .map((p) => p.code);
  await assignAll("sales_manager", salesManagerPerms, AccessScope.GLOBAL);

  // Sales Rep
  await assignAll(
    "sales_rep",
    [
      "sales.order.create",
      "sales.order.view_all",
      "sales.customer.view",
      "inventory.product.view",
    ],
    AccessScope.OWN,
  );

  // Cashier
  await assignAll(
    "cashier",
    ["sales.order.create", "sales.customer.view"],
    AccessScope.OWN,
  );

  // Warehouse Manager
  const whManagerPerms = permissions
    .filter((p) => p.module === "inventory")
    .map((p) => p.code);
  await assignAll("warehouse_manager", whManagerPerms, AccessScope.BRANCH);
  await assign("warehouse_manager", "sales.order.view_all", AccessScope.BRANCH); // To see orders for dispatch

  // Inventory Manager (head office): sees and controls stock in every branch and
  // gives the final approval on stock adjustments (workflow grant further down).
  await assignAll("inventory_manager", whManagerPerms, AccessScope.GLOBAL);
  await assign("inventory_manager", "org.branches.view_all", AccessScope.GLOBAL);

  // Store Clerk
  await assignAll(
    "store_clerk",
    // stock.adjust lets a clerk RAISE an adjustment; it is only applied after the
    // warehouse manager and inventory manager approve it.
    ["inventory.stock.view", "inventory.product.view", "inventory.stock.adjust"],
    AccessScope.BRANCH,
  );

  // Purchasing Manager (Full control)
  const purManagerPerms = permissions
    .filter((p) => p.module === "purchasing")
    .map((p) => p.code);
  // Procurement never approves or acknowledges the LPOs it raises: Finance
  // acknowledges, the MD / admin approves.
  await assignAll(
    "purchasing_manager",
    purManagerPerms.filter(
      (p) =>
        !p.startsWith("purchasing.order.approve_") &&
        p !== "purchasing.order.acknowledge",
    ),
    AccessScope.GLOBAL,
  );

  // Purchasing Officer (Create & Submit LPOs, View vendors)
  await assignAll(
    "purchasing_officer",
    [
      "purchasing.order.create",
      "purchasing.order.submit",
      "purchasing.order.view_all",
      "purchasing.vendor.view",
      "purchasing.vendor.manage",
    ],
    AccessScope.BRANCH,
  );

  // Procurement Role (Full purchasing access - used by procurement staff)
  await assignAll(
    "procurement",
    [
      "purchasing.order.create",
      "purchasing.order.submit",
      "purchasing.order.view_all",
      "purchasing.order.receive",
      "purchasing.vendor.view",
      "purchasing.vendor.manage",
      "purchasing.requisition.view",
      "purchasing.requisition.convert",
    ],
    AccessScope.BRANCH,
  );

  // Finance Manager (Approve standard & high-value, receive goods)
  // Head-office role: GLOBAL. This block previously re-assigned these at BRANCH
  // scope, which (assign() upserts) silently downgraded the finance.* approvals
  // the block above had just granted GLOBAL — leaving the main finance officer
  // unable to approve other branches' items.
  await assignAll(
    "finance_manager",
    [
      "purchasing.order.view_all",
      "purchasing.order.receive",
      "purchasing.vendor.view",
      "purchasing.requisition.view",
      "finance.expense.view_all",
      "finance.expense.approve_standard",
      "finance.expense.approve_high_value",
      "finance.gl.approve",
    ],
    AccessScope.GLOBAL,
  );

  // Director (Approve all including executive, full purchasing oversight)
  await assignAll(
    "director",
    [
      "purchasing.order.view_all",
      "purchasing.order.cancel",
      "purchasing.order.receive",
      "purchasing.vendor.view",
      "purchasing.vendor.manage",
      "purchasing.vendor.delete",
      "purchasing.requisition.view",
      "finance.expense.view_all",
      "finance.expense.approve_standard",
      "finance.expense.approve_high_value",
      "finance.expense.approve_executive",
      "finance.gl.approve",
    ],
    AccessScope.GLOBAL, // head-office executive approver
  );

  // HR Manager
  const hrManagerPerms = permissions
    .filter((p) => p.module === "hr")
    .map((p) => p.code);
  await assignAll("hr_manager", hrManagerPerms, AccessScope.GLOBAL);

  // HR Officer
  const hrOfficerPerms = [
    "hr.employee.view",
    "hr.employee.manage",
    "hr.recruitment.manage",
  ];
  await assignAll("hr_officer", hrOfficerPerms, AccessScope.BRANCH);
  // The HR officer prepares and submits payroll; the HR manager approves it. (If the
  // same person did both, segregation of duties would leave nobody to approve.)
  await assignAll("hr_officer", ["hr.payroll.view", "hr.payroll.manage"], AccessScope.GLOBAL);

  // ==========================================================================
  // Organisation structure: head office oversees; each branch is independent
  // ==========================================================================

  // Manager (head-office operations) — oversees every branch. Can supervise
  // branch managers and approve up to the high-value tier, but is deliberately
  // NOT a system admin: no admin.user.manage / admin.role.manage /
  // admin.branch.manage / admin.system.manage. Stock-transfer permissions
  // (request/approve/verify/...) are granted in scripts/add-transfer-rbac.ts.
  await assignAll(
    "manager",
    [
      "hr.employee.view",
      "hr.employee.manage", // create/manage branch managers
      "hr.leave.approve",
      "hr.payroll.view",
      "sales.order.view_all",
      "sales.order.manage",
      "sales.customer.view",
      "sales.customer.manage",
      "pos.session.view",
      "inventory.product.view",
      "inventory.stock.view",
      "inventory.stock.adjust",
      "finance.gl.view",
      "finance.report.aging",
      "finance.invoice.view",
      "finance.payment.view",
      "finance.expense.view_all",
      "finance.expense.approve_standard",
      "finance.expense.approve_high_value",
      "purchasing.order.view_all",
      "purchasing.vendor.view",
      "purchasing.requisition.view",
      "purchasing.requisition.approve_standard",
      "purchasing.requisition.approve_high_value",
      "admin.system.view",
      "admin.user.view",
      "admin.warehouse.view",
      "admin.product.view",
      "admin.delivery.view",
    ],
    AccessScope.GLOBAL,
  );

  // Branch Finance Manager (Head Accountant) — runs ONE branch's finances
  // independently. Everything BRANCH-scoped. Approves only the standard tier;
  // high-value and above escalate to head office (finance_manager / manager),
  // and period locking / GL approval stay at head office.
  await assignAll(
    "branch_finance_manager",
    [
      "finance.gl.view",
      "finance.gl.create",
      "finance.report.aging",
      "finance.invoice.create",
      "finance.invoice.view",
      "finance.payment.create",
      "finance.payment.view",
      "finance.payment.record",
      "finance.expense.view_all",
      "finance.expense.create",
      "finance.expense.post",
      "finance.expense.approve_standard",
      "purchasing.requisition.view",
      "purchasing.requisition.create",
      "purchasing.order.view_all",
      "purchasing.vendor.view",
      "hr.payroll.view",
      "sales.order.view_all",
      "sales.customer.view",
      "pos.session.view",
      "inventory.stock.view",
    ],
    AccessScope.BRANCH,
  );

  // Head-office oversight switch (org.branches.view_all). super_admin and
  // erp_admin already get it via allPerms, and auditor/ceo via readOnlyPerms
  // (the code contains "view"). These are the other head-of-function roles that
  // already hold GLOBAL grants above — the switch just makes that intent real at
  // the data layer. Branch-level roles (branch_manager, branch_finance_manager,
  // cashier, ...) deliberately do NOT get it.
  for (const roleCode of [
    "manager",
    "finance_manager",
    "director",
    "hr_manager",
    "purchasing_manager",
    "sales_manager",
  ]) {
    await assign(roleCode, "org.branches.view_all", AccessScope.GLOBAL);
  }

  // ==========================================================================
  // Procure-to-pay workflow
  //   any user raises a requisition -> manager approves it -> procurement
  //   converts it into an LPO and submits it -> Finance acknowledges ->
  //   MD / admin gives the final approval
  // ==========================================================================

  // Finance acknowledges submitted LPOs. Acknowledging is NOT approving: the
  // service also stops the same person doing both.
  await assign(
    "finance_manager",
    "purchasing.order.acknowledge",
    AccessScope.GLOBAL,
  );
  await assign(
    "branch_finance_manager",
    "purchasing.order.acknowledge",
    AccessScope.BRANCH,
  );

  // MD / CEO gives the final approval. 'approve_executive' covers every amount
  // tier (the service accepts it for standard and high-value LPOs as well).
  await assignAll(
    "ceo",
    [
      "purchasing.order.view_all",
      "purchasing.order.approve_standard",
      "purchasing.order.approve_high_value",
      "purchasing.order.approve_executive",
      "purchasing.order.cancel",
      "purchasing.vendor.view",
      "purchasing.requisition.view",
    ],
    AccessScope.GLOBAL,
  );

  // Payment vouchers: finance raises and pays, directors / the MD approve.
  // (Approvers can't approve their own; the payer can't be the requester.)
  await assignAll(
    "finance_manager",
    ["finance.voucher.create", "finance.voucher.view_all", "finance.voucher.pay"],
    AccessScope.GLOBAL,
  );
  await assignAll(
    "branch_finance_manager",
    ["finance.voucher.create", "finance.voucher.view_all", "finance.voucher.pay"],
    AccessScope.BRANCH,
  );
  await assignAll(
    "senior_accountant",
    ["finance.voucher.create"],
    AccessScope.BRANCH,
  );
  await assignAll(
    "director",
    [
      "finance.voucher.view_all",
      "finance.voucher.approve_standard",
      "finance.voucher.approve_high_value",
    ],
    AccessScope.GLOBAL,
  );
  await assignAll(
    "ceo",
    [
      "finance.voucher.view_all",
      "finance.voucher.approve_standard",
      "finance.voucher.approve_high_value",
      "finance.voucher.approve_executive",
    ],
    AccessScope.GLOBAL,
  );

  // Petty cash custodian: runs the float, can see the finance modules
  // (read-only) and raise expense reports / payment vouchers, but approves and
  // tops up nothing. BRANCH scope: only their own branch's books.
  await assignAll(
    "petty_cash_custodian",
    [
      "finance.pettycash.view",
      "finance.pettycash.disburse",
      "finance.gl.view",
      "finance.report.aging",
      "finance.invoice.view",
      "finance.payment.view",
      "finance.expense.view",
      "finance.expense.create",
      "finance.voucher.create",
      "purchasing.vendor.view",
    ],
    AccessScope.BRANCH,
  );
  // The director / MD can see every fund; Finance manages them.
  await assign("director", "finance.pettycash.view_all", AccessScope.GLOBAL);
  await assign("ceo", "finance.pettycash.view_all", AccessScope.GLOBAL);
  await assign("finance_manager", "finance.pettycash.manage", AccessScope.GLOBAL);
  await assign("branch_finance_manager", "finance.pettycash.manage", AccessScope.BRANCH);
  await assign("branch_finance_manager", "finance.pettycash.view_all", AccessScope.BRANCH);

  // CRM: reps work their own leads and territories; managers see the whole
  // pipeline, shape territories and set targets. Roles that don't exist in this
  // database are skipped, so this is safe to run on any install.
  const CRM_REP = ["crm.pipeline.view", "crm.pipeline.manage", "crm.target.view"];
  const CRM_MANAGER = [
    ...CRM_REP,
    "crm.pipeline.view_all",
    "crm.territory.manage",
    "crm.target.manage",
  ];
  const crmGrants: [string, string[], AccessScope][] = [
    ["sales_manager", CRM_MANAGER, AccessScope.GLOBAL],
    ["manager", CRM_MANAGER, AccessScope.GLOBAL],
    ["branch_manager", CRM_MANAGER, AccessScope.BRANCH],
    ["sales_rep", CRM_REP, AccessScope.BRANCH],
    ["sales_representative", CRM_REP, AccessScope.BRANCH],
    ["ceo", ["crm.pipeline.view", "crm.pipeline.view_all", "crm.target.view"], AccessScope.GLOBAL],
    ["director", ["crm.pipeline.view", "crm.pipeline.view_all", "crm.target.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of crmGrants) {
    const role = await prisma.role.findFirst({
      where: { code: roleCode },
      select: { id: true },
    });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - CRM grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Workflow engine grants. Refund chain: cashier raises it, the branch manager
  // reviews it (own branch), finance gives the final approval. Directors and the
  // MD can see every request; only admins design workflows (they hold all perms).
  const wfGrants: [string, string[], AccessScope][] = [
    ["cashier", ["sales.refund.request"], AccessScope.BRANCH],
    ["sales_rep", ["sales.refund.request"], AccessScope.BRANCH],
    ["branch_manager", ["workflow.refund.branch_approve"], AccessScope.BRANCH],
    ["finance_manager", ["workflow.refund.finance_approve", "workflow.payroll.finance_approve"], AccessScope.GLOBAL],
    ["hr_manager", ["workflow.payroll.hr_approve"], AccessScope.GLOBAL],
    ["ceo", ["workflow.payroll.md_approve"], AccessScope.GLOBAL],
    ["sales_manager", ["workflow.price_override.sales_approve", "sales.price.override"], AccessScope.BRANCH],
    ["branch_manager", ["workflow.price_override.branch_approve", "sales.price.override"], AccessScope.BRANCH],
    ["warehouse_manager", ["workflow.stock_adjust.warehouse_approve"], AccessScope.BRANCH],
    ["inventory_manager", ["workflow.stock_adjust.inventory_approve"], AccessScope.GLOBAL],
    ["auditor", ["audit.finding.view", "audit.finding.manage", "audit.risk.view", "audit.risk.manage", "workflow.view_all"], AccessScope.GLOBAL],
    ["ceo", ["audit.finding.view", "audit.risk.view", "audit.risk.manage"], AccessScope.GLOBAL],
    ["director", ["audit.finding.view", "audit.risk.view", "workflow.view_all"], AccessScope.GLOBAL],
    ["ceo", ["workflow.view_all"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of wfGrants) {
    const role = await prisma.role.findFirst({
      where: { code: roleCode },
      select: { id: true },
    });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - workflow grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // RFQs: officers run them, the purchasing manager awards (never the person who ran it).
  const rfqGrants: [string, string[], AccessScope][] = [
    ["purchasing_officer", ["purchasing.rfq.view", "purchasing.rfq.manage", "purchasing.vendor.view"], AccessScope.BRANCH],
    ["purchasing_manager", ["purchasing.rfq.view", "purchasing.rfq.manage", "purchasing.rfq.award", "purchasing.vendor.view", "purchasing.vendor.evaluate"], AccessScope.GLOBAL],
    ["warehouse_manager", ["purchasing.vendor.view", "purchasing.vendor.evaluate"], AccessScope.BRANCH],
    ["branch_manager", ["purchasing.rfq.view"], AccessScope.BRANCH],
    ["finance_manager", ["purchasing.rfq.view", "purchasing.vendor.view"], AccessScope.GLOBAL],
    ["ceo", ["purchasing.rfq.view", "purchasing.rfq.award", "purchasing.vendor.view"], AccessScope.GLOBAL],
    ["auditor", ["purchasing.rfq.view", "purchasing.vendor.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of rfqGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - RFQ grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      // Never downgrade a wider grant the role already has
      const existing = await prisma.rolePermission.findUnique({ where: { roleId_permissionId: { roleId: role.id, permissionId } } });
      if (existing && existing.scope === AccessScope.GLOBAL) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Stock counts: clerks count, the warehouse manager reviews and posts, the inventory manager approves.
  const countGrants: [string, string[], AccessScope][] = [
    ["store_clerk", ["inventory.count.view", "inventory.count.enter"], AccessScope.BRANCH],
    ["warehouse_manager", ["inventory.count.view", "inventory.count.enter", "inventory.count.manage"], AccessScope.BRANCH],
    ["inventory_manager", ["inventory.count.view", "inventory.count.enter", "inventory.count.manage"], AccessScope.GLOBAL],
    ["branch_manager", ["inventory.count.view"], AccessScope.BRANCH],
    ["finance_manager", ["inventory.count.view", "workflow.stock_count.approve_high"], AccessScope.GLOBAL],
    ["ceo", ["inventory.count.view", "workflow.stock_count.approve_high"], AccessScope.GLOBAL],
    ["auditor", ["inventory.count.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of countGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - stock count grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // People: HR officers draft contracts, the HR manager activates them (Segregation of Duties).
  const peopleGrants: [string, string[], AccessScope][] = [
    ["hr_manager", ["hr.contract.view", "hr.contract.manage", "hr.contract.activate", "hr.salary_structure.manage"], AccessScope.GLOBAL],
    ["hr_officer", ["hr.contract.view", "hr.contract.manage"], AccessScope.GLOBAL],
    ["finance_manager", ["hr.contract.view"], AccessScope.GLOBAL],
    ["director", ["hr.contract.view"], AccessScope.GLOBAL],
    ["branch_manager", ["hr.contract.view"], AccessScope.BRANCH],
  ];
  for (const [roleCode, codes, scope] of peopleGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - people grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Role dashboards. Head-office roles see every branch; branch roles see theirs.
  const dashGrants: [string, string[], AccessScope][] = [
    ["ceo", ["dashboard.executive.view", "dashboard.inventory.view", "dashboard.sales.view"], AccessScope.GLOBAL],
    ["director", ["dashboard.executive.view", "dashboard.sales.view"], AccessScope.GLOBAL],
    ["finance_manager", ["dashboard.executive.view"], AccessScope.GLOBAL],
    ["manager", ["dashboard.executive.view", "dashboard.inventory.view", "dashboard.sales.view"], AccessScope.GLOBAL],
    ["branch_manager", ["dashboard.executive.view", "dashboard.inventory.view", "dashboard.sales.view"], AccessScope.BRANCH],
    ["sales_manager", ["dashboard.sales.view"], AccessScope.GLOBAL],
    ["sales_rep", ["dashboard.sales.view"], AccessScope.OWN],
    ["cashier", ["dashboard.sales.view"], AccessScope.OWN],
    ["inventory_manager", ["dashboard.inventory.view"], AccessScope.GLOBAL],
    ["warehouse_manager", ["dashboard.inventory.view"], AccessScope.BRANCH],
    ["purchasing_manager", ["dashboard.inventory.view"], AccessScope.GLOBAL],
    ["auditor", ["dashboard.executive.view", "dashboard.inventory.view", "dashboard.sales.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of dashGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - dashboard grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Promotions: sales managers draft them, a different person (director, MD,
  // finance) switches them on. Cashiers need nothing: the till applies them.
  const promoGrants: [string, string[], AccessScope][] = [
    ["sales_manager", ["sales.promotion.view", "sales.promotion.manage"], AccessScope.GLOBAL],
    ["manager", ["sales.promotion.view", "sales.promotion.manage", "sales.promotion.activate"], AccessScope.GLOBAL],
    ["director", ["sales.promotion.view", "sales.promotion.activate"], AccessScope.GLOBAL],
    ["ceo", ["sales.promotion.view", "sales.promotion.activate"], AccessScope.GLOBAL],
    ["finance_manager", ["sales.promotion.view", "sales.promotion.activate"], AccessScope.GLOBAL],
    ["branch_manager", ["sales.promotion.view"], AccessScope.GLOBAL],
    ["auditor", ["sales.promotion.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of promoGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - promotion grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Integrations: technical staff only. Admins bypass; IT support and the MD get access.
  const integGrants: [string, string[], AccessScope][] = [
    ["it_support", ["integrations.view", "integrations.manage"], AccessScope.GLOBAL],
    ["ceo", ["integrations.view"], AccessScope.GLOBAL],
    ["auditor", ["integrations.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of integGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - integration grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope },
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // M-Pesa: tills request payments; managers and finance see every request.
  const mpesaGrants: [string, string[], AccessScope][] = [
    ["cashier", ["sales.mpesa.initiate"], AccessScope.BRANCH],
    ["sales_rep", ["sales.mpesa.initiate"], AccessScope.BRANCH],
    ["sales_manager", ["sales.mpesa.initiate", "sales.mpesa.view"], AccessScope.GLOBAL],
    ["branch_manager", ["sales.mpesa.initiate", "sales.mpesa.view"], AccessScope.BRANCH],
    ["manager", ["sales.mpesa.initiate", "sales.mpesa.view"], AccessScope.GLOBAL],
    ["finance_manager", ["sales.mpesa.view"], AccessScope.GLOBAL],
    ["ceo", ["sales.mpesa.view"], AccessScope.GLOBAL],
    ["director", ["sales.mpesa.view"], AccessScope.GLOBAL],
    ["auditor", ["sales.mpesa.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of mpesaGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - M-Pesa grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: scope === AccessScope.GLOBAL ? { scope } : {},
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Messaging: front-line staff can send a receipt; managers see the log; IT / admins manage.
  const msgGrants: [string, string[], AccessScope][] = [
    ["cashier", ["messaging.send"], AccessScope.BRANCH],
    ["sales_rep", ["messaging.send"], AccessScope.BRANCH],
    ["sales_manager", ["messaging.send", "messaging.view"], AccessScope.GLOBAL],
    ["branch_manager", ["messaging.send", "messaging.view"], AccessScope.BRANCH],
    ["manager", ["messaging.send", "messaging.view", "messaging.manage"], AccessScope.GLOBAL],
    ["finance_manager", ["messaging.send", "messaging.view"], AccessScope.GLOBAL],
    ["it_support", ["messaging.view", "messaging.manage"], AccessScope.GLOBAL],
    ["ceo", ["messaging.view"], AccessScope.GLOBAL],
    ["director", ["messaging.view"], AccessScope.GLOBAL],
    ["auditor", ["messaging.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of msgGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) {
      console.log(`ℹ️  Role ${roleCode} not found - messaging grants skipped`);
      continue;
    }
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        // never narrow an existing wider grant
        update: scope === AccessScope.GLOBAL ? { scope } : {},
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Forecasting: purchasing and stock people plan; leadership reads.
  const forecastGrants: [string, string[], AccessScope][] = [
    ["purchasing_officer", ["purchasing.forecast.view", "purchasing.forecast.requisition"], AccessScope.GLOBAL],
    ["procurement_officer", ["purchasing.forecast.view", "purchasing.forecast.requisition"], AccessScope.GLOBAL],
    ["warehouse_manager", ["purchasing.forecast.view", "purchasing.forecast.requisition"], AccessScope.GLOBAL],
    ["inventory_manager", ["purchasing.forecast.view", "purchasing.forecast.requisition"], AccessScope.GLOBAL],
    ["manager", ["purchasing.forecast.view"], AccessScope.GLOBAL],
    ["ceo", ["purchasing.forecast.view"], AccessScope.GLOBAL],
    ["director", ["purchasing.forecast.view"], AccessScope.GLOBAL],
    ["finance_manager", ["purchasing.forecast.view"], AccessScope.GLOBAL],
    ["auditor", ["purchasing.forecast.view"], AccessScope.GLOBAL],
  ];
  for (const [roleCode, codes, scope] of forecastGrants) {
    const role = await prisma.role.findFirst({ where: { code: roleCode }, select: { id: true } });
    if (!role) continue;
    for (const code of codes) {
      const permissionId = permissionMap.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId, scope },
      });
    }
  }

  // Purchasing officers turn approved requisitions into LPOs.
  await assignAll(
    "purchasing_officer",
    ["purchasing.requisition.view", "purchasing.requisition.convert"],
    AccessScope.BRANCH,
  );

  // Any user can raise requisitions and see their own. This only CREATES a
  // grant where a role has none — it never touches the scope of an existing
  // one (assign() above upserts and would otherwise downgrade GLOBAL grants).
  // Covers every role in the database, not just the ones defined in this file,
  // since older seeds created a few others (warehouse_staff, procurement_officer).
  const everyRole = await prisma.role.findMany({
    select: { id: true, code: true },
  });
  for (const role of everyRole) {
    if (role.code === "auditor") continue; // read-only role
    for (const permCode of [
      "purchasing.requisition.create",
      "purchasing.requisition.view",
    ]) {
      const permissionId = permissionMap.get(permCode);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: {},
        create: { roleId: role.id, permissionId, scope: AccessScope.BRANCH },
      });
    }
  }

  // ==========================================================================
  // Separation of duties: take back approvals that older runs of this script
  // (or the seed) granted to roles that should no longer hold them.
  //   - LPO approval is the MD / admin's (ceo, super_admin, erp_admin only)
  //   - Finance acknowledges LPOs; it does not approve them or requisitions,
  //     and it does not convert requisitions (procurement does)
  // Only the roles named here are touched, so custom roles built on the Roles
  // screen keep whatever they were given.
  // ==========================================================================
  const noLpoApproval = [
    "finance_manager",
    "branch_finance_manager",
    "director",
    "manager",
    "branch_manager",
    "purchasing_manager",
    "purchasing_officer",
    "procurement",
    "accountant",
    "senior_accountant",
    "junior_accountant",
  ];
  const revokedLpo = await prisma.rolePermission.deleteMany({
    where: {
      role: { code: { in: noLpoApproval } },
      permission: { code: { startsWith: "purchasing.order.approve_" } },
    },
  });
  const revokedReq = await prisma.rolePermission.deleteMany({
    where: {
      role: {
        code: { in: ["finance_manager", "branch_finance_manager", "director"] },
      },
      permission: {
        code: {
          in: [
            "purchasing.requisition.approve_standard",
            "purchasing.requisition.approve_high_value",
            "purchasing.requisition.approve_executive",
            "purchasing.requisition.convert",
          ],
        },
      },
    },
  });
  // finance_manager is granted every finance.* permission above; payment
  // vouchers are raised and paid by Finance but approved by director / MD.
  await prisma.rolePermission.deleteMany({
    where: {
      role: { code: { in: ["finance_manager", "branch_finance_manager"] } },
      permission: { code: { startsWith: "finance.voucher.approve_" } },
    },
  });

  console.log(
    `✅ Revoked ${revokedLpo.count} LPO-approval and ${revokedReq.count} finance requisition grants`,
  );

  console.log("✅ Role Assignments completed");
  console.log("🎉 RBAC Update Finished Successfully");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
