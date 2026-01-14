// backend/prisma/seed.ts

import { prisma } from '../src/lib/db';
import 'dotenv/config';
import {
  InventoryStatus,
  SalesStatus,
  DeliveryStatus,
  TransactionType,
  PayrollStatus,
  PaymentMethod,
  AccessScope,
} from '../src/generated/client';
import bcrypt from 'bcrypt';

async function main() {
  console.log('🌱 Starting seed...');

  // Helper: safe delete for any model
  const safeDelete = async (modelName: keyof typeof prisma) => {
    const key = String(modelName);
    const client = (prisma as any)[key];
    if (client && typeof client.deleteMany === 'function') {
      try {
        await client.deleteMany();
        console.log(`🧹 Cleared ${key}`);
      } catch (err) {
        console.warn(`⚠️ Could not delete ${key}:`, err);
      }
    } else {
      console.warn(`⚠️ Model ${key} does not exist on prisma client`);
    }
  };

  console.log('🧹 Cleaning existing data...');
  const modelsToClear: (keyof typeof prisma)[] = [
    'roleAssignment',
    'rolePermission',
    'permission',
    'role',
    'module',
    'benefitEnrollment',
    'benefit',
    'attendance',
    'leaveRequest',
    'leaveAllocation',
    'leaveType',
    'performanceEvaluation',
    'goal',
    'employeeTransfer',
    'interview',
    'applicant',
    'jobPosting',
    'payment',
    'financeTransaction',
    'journalEntry',
    'journal',
    'fiscalPeriod',
    'fiscalYear',
    'budget',
    'bankStatementLine',
    'bankStatement',
    'bankAccount',
    'accountReceivable',
    'accountPayable',
    'chartOfAccount',
    'taxRecord',
    'financialForecast',
    'delivery',
    'truck',
    'stockMovement',
    'transferItem',
    'stockTransfer',
    'salesDocumentItem',
    'salesDocument',
    'documentSequence',
    'customer',
    'salesItem',
    'sales',
    'payroll',
    'inventory',
    'product',
    'warehouse',
    'user',
    'branch',
  ];

  for (const model of modelsToClear) {
    await safeDelete(model);
  }

  console.log('🏢 Creating branches...');
  const mainWarehouse = await prisma.branch.create({
    data: { code: 'WH-001', name: 'Main Warehouse', city: 'Nairobi', address: 'Industrial Area, Nairobi', phone: '+254 722 111 000' },
  });
  const westlandsBranch = await prisma.branch.create({
    data: { code: 'WL-001', name: 'Westlands Branch', city: 'Nairobi', address: 'Westlands, Nairobi', phone: '+254 722 111 001' },
  });

  console.log('📦 Creating warehouses...');
  const warehouse1 = await prisma.warehouse.create({
    data: { code: 'WH-MAIN', name: 'Main Storage', location: 'Industrial Area', capacity: 1000, branchId: mainWarehouse.id },
  });
  const warehouse2 = await prisma.warehouse.create({
    data: { code: 'WH-WL', name: 'Westlands Storage', location: 'Westlands', capacity: 500, branchId: westlandsBranch.id },
  });

  console.log('👥 Creating RBAC modules and permissions...');
  const hrModule = await prisma.module.create({ data: { code: 'hr', name: 'Human Resources' } });
  const salesModule = await prisma.module.create({ data: { code: 'sales', name: 'Sales' } });
  const financeModule = await prisma.module.create({ data: { code: 'finance', name: 'Finance' } });
  const adminModule = await prisma.module.create({ data: { code: 'admin', name: 'Administration' } });
  const inventoryModule = await prisma.module.create({ data: { code: 'inventory', name: 'Inventory' } });
  const procurementModule = await prisma.module.create({ data: { code: 'procurement', name: 'Procurement' } });
  const auditModule = await prisma.module.create({ data: { code: 'audit', name: 'Audit' } });

  const permissions = [
    // HR Permissions
    { code: 'hr.employee.view', name: 'View Employees', moduleId: hrModule.id },
    { code: 'hr.employee.manage', name: 'Manage Employees', moduleId: hrModule.id },
    { code: 'hr.payroll.view', name: 'View Payroll', moduleId: hrModule.id },
    { code: 'hr.payroll.manage', name: 'Manage Payroll', moduleId: hrModule.id },
    { code: 'hr.recruitment.view', name: 'View Recruitment', moduleId: hrModule.id },
    { code: 'hr.recruitment.manage', name: 'Manage Recruitment', moduleId: hrModule.id },

    // Sales Permissions
    { code: 'sales.order.create', name: 'Create Sales Orders', moduleId: salesModule.id },
    { code: 'sales.order.view', name: 'View Sales Orders', moduleId: salesModule.id },
    { code: 'sales.order.view_all', name: 'View All Sales Orders', moduleId: salesModule.id },
    { code: 'sales.order.manage', name: 'Manage Sales Orders', moduleId: salesModule.id },
    { code: 'sales.customer.view', name: 'View Customers', moduleId: salesModule.id },
    { code: 'sales.customer.manage', name: 'Manage Customers', moduleId: salesModule.id },

    // Finance Permissions
    { code: 'finance.invoice.create', name: 'Create Invoices', moduleId: financeModule.id },
    { code: 'finance.invoice.view', name: 'View Invoices', moduleId: financeModule.id },
    { code: 'finance.invoice.approve', name: 'Approve Invoices', moduleId: financeModule.id },
    { code: 'finance.payment.create', name: 'Create Payments', moduleId: financeModule.id },
    { code: 'finance.payment.view', name: 'View Payments', moduleId: financeModule.id },
    { code: 'finance.reports.view', name: 'View Financial Reports', moduleId: financeModule.id },
    { code: 'finance.gl.view', name: 'View General Ledger', moduleId: financeModule.id },
    { code: 'finance.gl.manage', name: 'Manage General Ledger', moduleId: financeModule.id },

    // Admin Permissions
    { code: 'admin.user.manage', name: 'Manage Users', moduleId: adminModule.id },
    { code: 'admin.role.manage', name: 'Manage Roles', moduleId: adminModule.id },
    { code: 'admin.branch.manage', name: 'Manage Branches', moduleId: adminModule.id },
    { code: 'admin.system.view', name: 'View System Settings', moduleId: adminModule.id },
    { code: 'admin.system.manage', name: 'Manage System Settings', moduleId: adminModule.id },

    // Inventory Permissions
    { code: 'inventory.product.view', name: 'View Products', moduleId: inventoryModule.id },
    { code: 'inventory.product.manage', name: 'Manage Products', moduleId: inventoryModule.id },
    { code: 'inventory.stock.view', name: 'View Stock', moduleId: inventoryModule.id },
    { code: 'inventory.stock.adjust', name: 'Adjust Stock', moduleId: inventoryModule.id },
    { code: 'inventory.warehouse.manage', name: 'Manage Warehouses', moduleId: inventoryModule.id },

    // Procurement Permissions
    { code: 'procurement.vendor.view', name: 'View Vendors', moduleId: procurementModule.id },
    { code: 'procurement.vendor.manage', name: 'Manage Vendors', moduleId: procurementModule.id },
    { code: 'procurement.order.create', name: 'Create Purchase Orders', moduleId: procurementModule.id },
    { code: 'procurement.order.view', name: 'View Purchase Orders', moduleId: procurementModule.id },
    { code: 'procurement.order.approve', name: 'Approve Purchase Orders', moduleId: procurementModule.id },

    // Audit Permissions
    { code: 'audit.log.view', name: 'View Audit Logs', moduleId: auditModule.id },
  ];

  const permissionMap = new Map<string, string>();
  for (const p of permissions) {
    const perm = await prisma.permission.create({ data: p });
    permissionMap.set(p.code, perm.id);
  }

  console.log('🛡️ Creating roles...');
  const superAdminRole = await prisma.role.create({ data: { code: 'super_admin', name: 'Super Admin', isSystem: true, description: 'Global access' } });
  const branchManagerRole = await prisma.role.create({ data: { code: 'branch_manager', name: 'Branch Manager', isSystem: true, description: 'Branch-level access' } });
  const cashierRole = await prisma.role.create({ data: { code: 'cashier', name: 'Cashier', isSystem: true, description: 'Point of Sale access' } });
  const warehouseRole = await prisma.role.create({ data: { code: 'warehouse_staff', name: 'Warehouse Staff', isSystem: true, description: 'Inventory management access' } });

  console.log('🔗 Assigning role permissions...');
  // Super Admin: all permissions
  for (const permId of permissionMap.values()) {
    await prisma.rolePermission.create({ data: { roleId: superAdminRole.id, permissionId: permId, scope: AccessScope.GLOBAL } });
  }

  // Branch Manager
  const bmPerms = ['hr.employee.view', 'sales.order.create', 'sales.order.view_all'];
  for (const code of bmPerms) {
    const id = permissionMap.get(code);
    if (id) await prisma.rolePermission.create({ data: { roleId: branchManagerRole.id, permissionId: id, scope: AccessScope.BRANCH } });
  }

  // Cashier
  const cashierPerms = ['sales.order.create'];
  for (const code of cashierPerms) {
    const id = permissionMap.get(code);
    if (id) await prisma.rolePermission.create({ data: { roleId: cashierRole.id, permissionId: id, scope: AccessScope.OWN } });
  }

  // Warehouse
  const warehousePerms = ['sales.order.view_all'];
  for (const code of warehousePerms) {
    const id = permissionMap.get(code);
    if (id) await prisma.rolePermission.create({ data: { roleId: warehouseRole.id, permissionId: id, scope: AccessScope.BRANCH } });
  }

  console.log('👤 Creating users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: { email: 'admin@lunatech.co.ke', name: 'Admin User', passwordHash: hashedPassword, branchId: mainWarehouse.id },
  });
  await prisma.roleAssignment.create({ data: { userId: admin.id, roleId: superAdminRole.id } });

  const manager = await prisma.user.create({
    data: { email: 'manager@lunatech.co.ke', name: 'Jane Smith', passwordHash: hashedPassword, branchId: westlandsBranch.id },
  });
  await prisma.roleAssignment.create({ data: { userId: manager.id, roleId: branchManagerRole.id } });

  const warehouseStaff = await prisma.user.create({
    data: { email: 'warehouse@lunatech.co.ke', name: 'Bob Wilson', passwordHash: hashedPassword, branchId: mainWarehouse.id },
  });
  await prisma.roleAssignment.create({ data: { userId: warehouseStaff.id, roleId: warehouseRole.id } });

  const cashier = await prisma.user.create({
    data: { email: 'cashier@lunatech.co.ke', name: 'Alice Johnson', passwordHash: hashedPassword, branchId: westlandsBranch.id },
  });
  await prisma.roleAssignment.create({ data: { userId: cashier.id, roleId: cashierRole.id } });

  const driver = await prisma.user.create({
    data: { email: 'driver@lunatech.co.ke', name: 'Michael Brown', passwordHash: hashedPassword, branchId: westlandsBranch.id },
  });

  console.log('🛍️ Creating products and inventory...');
  const products = [
    { sku: 'LAP-001', barcode: '123456789001', name: 'Dell Latitude 5420', description: 'Professional Laptop', category: 'Computers', unit_price: 120000, cost_price: 95000, tax_rate: 0.16, quantity: 60, reorder_level: 5 },
    { sku: 'LAP-002', barcode: '123456789002', name: 'HP Elitebook 840', description: 'Enterprise Laptop', category: 'Computers', unit_price: 115000, cost_price: 92000, tax_rate: 0.16, quantity: 40, reorder_level: 5 },
  ];

  const createdProducts = [];
  for (const p of products) {
    const prod = await prisma.product.create({ data: p });
    createdProducts.push(prod);

    // Split inventory between warehouses
    const qty1 = Math.floor(p.quantity * 0.6);
    const qty2 = Math.floor(p.quantity * 0.4);

    await prisma.inventory.create({ data: { quantity: qty1, reserved: 0, available: qty1, status: InventoryStatus.in_stock, productId: prod.id, warehouseId: warehouse1.id } });
    await prisma.inventory.create({ data: { quantity: qty2, reserved: 0, available: qty2, status: InventoryStatus.in_stock, productId: prod.id, warehouseId: warehouse2.id } });
  }

  console.log('🚚 Creating trucks...');
  await prisma.truck.create({ data: { registration: 'KCA 123A', model: 'Toyota Hiace', capacity: 2000, license_plate: 'KCA-123A' } });

  console.log('🛒 Creating sample sales...');
  const sale = await prisma.sales.create({
    data: {
      invoice_no: 'INV-2024-001',
      status: SalesStatus.confirmed,
      payment_method: PaymentMethod.card,
      branchId: westlandsBranch.id,
      userId: cashier.id,
      createdById: manager.id,
      subtotal: 120000,
      total_amount: 120000,
      discount: 0,
      tax: 19200,
      grand_total: 139200,
      amount_paid: 139200,
      change: 0,
    },
  });

  await prisma.salesItem.create({
    data: { quantity: 1, unit_price: 120000, subtotal: 120000, tax_rate: 0.16, tax_amount: 19200, amount: 139200, salesId: sale.id, productId: createdProducts[0].id },
  });

  console.log('\n✅ Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
