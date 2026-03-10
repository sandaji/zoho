import 'dotenv/config';
import { prisma } from '../src/lib/db';
import { logger } from '../src/lib/logger';

// Type alias to replace the Prisma enum import that's failing at runtime
type AccessScope = 'GLOBAL' | 'BRANCH' | 'OWN';
const AccessScope = {
  GLOBAL: 'GLOBAL' as AccessScope,
  BRANCH: 'BRANCH' as AccessScope,
  OWN: 'OWN' as AccessScope,
};

async function main() {
  console.log('🔄 Starting RBAC Update...');

  // ==========================================
  // 1. Define Modules
  // ==========================================
  const modules = [
    { code: 'admin', name: 'Administration' },
    { code: 'hr', name: 'Human Resources' },
    { code: 'finance', name: 'Finance' },
    { code: 'sales', name: 'Sales' },
    { code: 'inventory', name: 'Inventory' },
    { code: 'purchasing', name: 'Purchasing' },
    { code: 'audit', name: 'Audit' },
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
    // Admin
    { code: 'admin.user.manage', name: 'Manage Users', module: 'admin' },
    { code: 'admin.role.manage', name: 'Manage Roles', module: 'admin' },
    { code: 'admin.branch.manage', name: 'Manage Branches', module: 'admin' },
    { code: 'admin.system.view', name: 'View System Settings', module: 'admin' },
    { code: 'admin.system.manage', name: 'Manage System Settings', module: 'admin' },

    // HR
    { code: 'hr.employee.view', name: 'View Employees', module: 'hr' },
    { code: 'hr.employee.manage', name: 'Manage Employees', module: 'hr' },
    { code: 'hr.payroll.view', name: 'View Payroll', module: 'hr' },
    { code: 'hr.payroll.run', name: 'Run Payroll', module: 'hr' },
    { code: 'hr.payroll.manage', name: 'Manage Payroll', module: 'hr' },
    { code: 'hr.recruitment.manage', name: 'Manage Recruitment', module: 'hr' },
    { code: 'hr.performance.manage', name: 'Manage Performance', module: 'hr' },
    { code: 'hr.benefits.manage', name: 'Manage Benefits', module: 'hr' },
    { code: 'hr.leave.approve', name: 'Approve Leave', module: 'hr' },

    // Finance
    { code: 'finance.gl.view', name: 'View General Ledger', module: 'finance' },
    { code: 'finance.gl.create', name: 'Create GL Entries', module: 'finance' },
    { code: 'finance.gl.manage', name: 'Manage General Ledger', module: 'finance' },
    { code: 'finance.report.aging', name: 'View Aging Reports', module: 'finance' },
    { code: 'finance.invoice.create', name: 'Create Invoices', module: 'finance' },
    { code: 'finance.invoice.view', name: 'View Invoices', module: 'finance' },
    { code: 'finance.invoice.approve', name: 'Approve Invoices', module: 'finance' },
    { code: 'finance.payment.create', name: 'Create Payments', module: 'finance' },
    { code: 'finance.payment.view', name: 'View Payments', module: 'finance' },
    { code: 'finance.settings.periods', name: 'Manage Fiscal Periods', module: 'finance' },

    // Sales
    { code: 'sales.order.view_all', name: 'View All Sales Orders', module: 'sales' },
    { code: 'sales.order.create', name: 'Create Sales Orders', module: 'sales' },
    { code: 'sales.order.manage', name: 'Manage Sales Orders', module: 'sales' },
    { code: 'sales.customer.view', name: 'View Customers', module: 'sales' },
    { code: 'sales.customer.manage', name: 'Manage Customers', module: 'sales' },

    // Inventory
    { code: 'inventory.product.view', name: 'View Products', module: 'inventory' },
    { code: 'inventory.product.manage', name: 'Manage Products', module: 'inventory' },
    { code: 'inventory.stock.view', name: 'View Stock', module: 'inventory' },
    { code: 'inventory.stock.adjust', name: 'Adjust Stock', module: 'inventory' },
    { code: 'inventory.warehouse.manage', name: 'Manage Warehouses', module: 'inventory' },

    // Purchasing (LPO - Local Purchase Orders) - KSH Currency
    // View & List permissions
    { code: 'purchasing.order.view_all', name: 'View All Purchase Orders (LPO)', module: 'purchasing' },
    { code: 'purchasing.vendor.view', name: 'View Vendors', module: 'purchasing' },
    
    // Create & Submit
    { code: 'purchasing.order.create', name: 'Create Purchase Orders (LPO)', module: 'purchasing' },
    { code: 'purchasing.order.submit', name: 'Submit Purchase Orders for Approval', module: 'purchasing' },
    
    // Approval by Threshold (KSH)
    { code: 'purchasing.order.approve_standard', name: 'Approve Standard LPOs (< KSH 10,000)', module: 'purchasing' },
    { code: 'purchasing.order.approve_high_value', name: 'Approve High-Value LPOs (KSH 10,000 - 100,000)', module: 'purchasing' },
    { code: 'purchasing.order.approve_executive', name: 'Approve Executive LPOs (> KSH 100,000)', module: 'purchasing' },
    
    // Goods Receipt & Closeout
    { code: 'purchasing.order.receive', name: 'Receive Goods for LPOs', module: 'purchasing' },
    { code: 'purchasing.order.cancel', name: 'Cancel Purchase Orders', module: 'purchasing' },
    
    // Vendor Management
    { code: 'purchasing.vendor.manage', name: 'Manage Vendors (Create/Edit)', module: 'purchasing' },
    { code: 'purchasing.vendor.delete', name: 'Delete/Deactivate Vendors', module: 'purchasing' },

    // Audit
    { code: 'audit.log.view', name: 'View Audit Logs', module: 'audit' },
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
  console.log('✅ Permissions synced');

  // ==========================================
  // 3. Define Roles
  // ==========================================
  const roles = [
    { code: 'super_admin', name: 'System Administrator', isSystem: true, description: 'Full access to everything' },
    { code: 'erp_admin', name: 'ERP Administrator', isSystem: true, description: 'Functional administration' },
    { code: 'it_support', name: 'IT Support', isSystem: true, description: 'Technical support access' },
    { code: 'auditor', name: 'Auditor', isSystem: true, description: 'Read-only access for auditing' },
    { code: 'ceo', name: 'Managing Director / CEO', isSystem: true, description: 'Executive view' },
    { code: 'branch_manager', name: 'Branch Manager', isSystem: true, description: 'Manage specific branch' },
    { code: 'finance_manager', name: 'Finance Manager', isSystem: true, description: 'Head of Finance' },
    { code: 'accountant', name: 'Accountant', isSystem: true, description: 'Daily accounting operations' },
    { code: 'cashier', name: 'Cashier', isSystem: true, description: 'POS and basic sales' },
    { code: 'sales_manager', name: 'Sales Manager', isSystem: true, description: 'Head of Sales' },
    { code: 'sales_rep', name: 'Sales Representative', isSystem: true, description: 'Sales operations' },
    { code: 'warehouse_manager', name: 'Warehouse Manager', isSystem: true, description: 'Head of Warehousing' },
    { code: 'store_clerk', name: 'Store Clerk', isSystem: true, description: 'Basic inventory operations' },
    { code: 'purchasing_manager', name: 'Purchasing Manager', isSystem: true, description: 'Head of Purchasing' },
    { code: 'purchasing_officer', name: 'Purchasing Officer', isSystem: true, description: 'Purchasing operations' },
    { code: 'hr_manager', name: 'HR Manager', isSystem: true, description: 'Head of HR' },
    { code: 'hr_officer', name: 'HR Officer', isSystem: true, description: 'HR operations' },
  ];

  const roleMap = new Map<string, string>();

  for (const r of roles) {
    const role = await prisma.role.upsert({
      where: { code: r.code },
      update: { name: r.name, description: r.description, isSystem: r.isSystem },
      create: { code: r.code, name: r.name, description: r.description, isSystem: r.isSystem },
    });
    roleMap.set(r.code, role.id);
  }
  console.log('✅ Roles synced');

  // ==========================================
  // 4. Assign Permissions to Roles
  // ==========================================

  // Helper to assign permission to role
  const assign = async (roleCode: string, permCode: string, scope: AccessScope = AccessScope.BRANCH) => {
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

  const assignAll = async (roleCode: string, permCodes: string[], scope: AccessScope = AccessScope.BRANCH) => {
    for (const p of permCodes) {
      await assign(roleCode, p, scope);
    }
  };

  // --- Assignments ---

  // Super Admin: Everything (GLOBAL)
  const allPerms = Array.from(permissionMap.keys());
  await assignAll('super_admin', allPerms, AccessScope.GLOBAL);

  // ERP Admin: Full functional access
  await assignAll('erp_admin', allPerms, AccessScope.GLOBAL); // Or restrict system settings?

  // IT Support
  await assign('it_support', 'admin.user.manage', AccessScope.GLOBAL);
  await assign('it_support', 'admin.system.view', AccessScope.GLOBAL);

  // Auditor: Read-only mostly
  const readOnlyPerms = allPerms.filter(p => p.includes('view') || p.includes('report') || p.includes('log'));
  await assignAll('auditor', readOnlyPerms, AccessScope.GLOBAL);

  // CEO: View all, Approve high level
  await assignAll('ceo', readOnlyPerms, AccessScope.GLOBAL);

  // Branch Manager
  const bmPerms = [
    'hr.employee.view', 'hr.employee.manage', 'hr.leave.approve',
    'sales.order.view_all', 'sales.order.manage', 'sales.customer.view',
    'inventory.stock.view', 'inventory.stock.adjust', 'inventory.product.view',
    'finance.invoice.view',
    'purchasing.order.view_all',
    'purchasing.vendor.view',
  ];
  await assignAll('branch_manager', bmPerms, AccessScope.BRANCH);

  // Finance Manager
  const financeManagerPerms = permissions.filter(p => p.module === 'finance').map(p => p.code);
  await assignAll('finance_manager', financeManagerPerms, AccessScope.GLOBAL);
  // Also needs payroll run
  await assign('finance_manager', 'hr.payroll.run', AccessScope.GLOBAL);

  // Accountant
  const accountantPerms = [
    'finance.gl.view', 'finance.report.aging', 'finance.invoice.create', 'finance.invoice.view',
    'finance.payment.create', 'finance.payment.view'
  ];
  await assignAll('accountant', accountantPerms, AccessScope.BRANCH);

  // Sales Manager
  const salesManagerPerms = permissions.filter(p => p.module === 'sales').map(p => p.code);
  await assignAll('sales_manager', salesManagerPerms, AccessScope.GLOBAL);

  // Sales Rep
  await assignAll('sales_rep', ['sales.order.create', 'sales.order.view_all', 'sales.customer.view', 'inventory.product.view'], AccessScope.OWN);

  // Cashier
  await assignAll('cashier', ['sales.order.create', 'sales.customer.view'], AccessScope.OWN);

  // Warehouse Manager
  const whManagerPerms = permissions.filter(p => p.module === 'inventory').map(p => p.code);
  await assignAll('warehouse_manager', whManagerPerms, AccessScope.BRANCH);
  await assign('warehouse_manager', 'sales.order.view_all', AccessScope.BRANCH); // To see orders for dispatch

  // Store Clerk
  await assignAll('store_clerk', ['inventory.stock.view', 'inventory.product.view'], AccessScope.BRANCH);

  // Purchasing Manager (Full control)
  const purManagerPerms = permissions.filter(p => p.module === 'purchasing').map(p => p.code);
  await assignAll('purchasing_manager', purManagerPerms, AccessScope.GLOBAL);

  // Purchasing Officer (Create & Submit LPOs, View vendors)
  await assignAll('purchasing_officer', [
    'purchasing.order.create',
    'purchasing.order.submit',
    'purchasing.order.view_all',
    'purchasing.vendor.view',
    'purchasing.vendor.manage'
  ], AccessScope.BRANCH);

  // Procurement Role (Full purchasing access - used by procurement staff)
  await assignAll('procurement', [
    'purchasing.order.create',
    'purchasing.order.submit',
    'purchasing.order.view_all',
    'purchasing.order.receive',
    'purchasing.vendor.view',
    'purchasing.vendor.manage',
  ], AccessScope.BRANCH);

  // Finance Manager (Approve standard & high-value, receive goods)
  await assignAll('finance_manager', [
    'purchasing.order.approve_standard',
    'purchasing.order.approve_high_value',
    'purchasing.order.view_all',
    'purchasing.order.receive',
    'purchasing.vendor.view'
  ], AccessScope.BRANCH);

  // Director (Approve all including executive, full purchasing oversight)
  await assignAll('director', [
    'purchasing.order.view_all',
    'purchasing.order.approve_standard',
    'purchasing.order.approve_high_value',
    'purchasing.order.approve_executive',
    'purchasing.order.cancel',
    'purchasing.order.receive',
    'purchasing.vendor.view',
    'purchasing.vendor.manage',
    'purchasing.vendor.delete'
  ], AccessScope.BRANCH);

  // HR Manager
  const hrManagerPerms = permissions.filter(p => p.module === 'hr').map(p => p.code);
  await assignAll('hr_manager', hrManagerPerms, AccessScope.GLOBAL);

  // HR Officer
  const hrOfficerPerms = ['hr.employee.view', 'hr.employee.manage', 'hr.recruitment.manage'];
  await assignAll('hr_officer', hrOfficerPerms, AccessScope.BRANCH);


  console.log('✅ Role Assignments completed');
  console.log('🎉 RBAC Update Finished Successfully');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
