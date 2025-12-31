// // backend/prisma/seed.ts
// import { prisma } from '../src/lib/db';
// import 'dotenv/config';
// import { 
//   UserRole, 
//   InventoryStatus, 
//   SalesStatus, 
//   PaymentMethod,
//   AccessScope
// } from '../src/generated/client';
// import bcrypt from 'bcrypt';

// async function main() {
//   console.log("🌱 Starting seed...");

//   // -----------------------------
//   // Clear existing data
//   // -----------------------------
//   console.log("🧹 Cleaning existing data...");

//   // RBAC
//   await prisma.roleAssignment.deleteMany();
//   await prisma.rolePermission.deleteMany();
//   await prisma.permission.deleteMany();
//   await prisma.role.deleteMany();
//   await prisma.module.deleteMany();

//   // HR & Performance
//   await prisma.benefitEnrollment.deleteMany();
//   await prisma.benefit.deleteMany();
//   await prisma.attendance.deleteMany();
//   await prisma.leaveRequest.deleteMany();
//   await prisma.leaveAllocation.deleteMany();
//   await prisma.leaveType.deleteMany();
//   await prisma.performanceEvaluation.deleteMany();
//   await prisma.goal.deleteMany();
//   await prisma.employeeTransfer.deleteMany();

//   // Recruitment
//   await prisma.interview.deleteMany();
//   await prisma.applicant.deleteMany();
//   await prisma.jobPosting.deleteMany();

//   // Finance
//   await prisma.payment.deleteMany();
//   await prisma.financeTransaction.deleteMany();
//   await prisma.journalEntry.deleteMany();
//   await prisma.journal.deleteMany();
//   await prisma.fiscalPeriod.deleteMany();
//   await prisma.fiscalYear.deleteMany();
//   await prisma.budget.deleteMany();
//   await prisma.bankStatementLine.deleteMany();
//   await prisma.bankStatement.deleteMany();
//   await prisma.bankAccount.deleteMany();
//   await prisma.accountReceivable.deleteMany();
//   await prisma.accountPayable.deleteMany();
//   await prisma.chartOfAccount.deleteMany();
//   await prisma.taxRecord.deleteMany();
//   await prisma.financialForecast.deleteMany();

//   // Sales & Logistics
//   await prisma.delivery.deleteMany();
//   await prisma.truck.deleteMany();
//   await prisma.stockMovement.deleteMany();
//   await prisma.transferItem.deleteMany();
//   await prisma.stockTransfer.deleteMany();
//   await prisma.salesDocumentItem.deleteMany();
//   await prisma.salesDocument.deleteMany();
//   await prisma.documentSequence.deleteMany();
//   await prisma.customer.deleteMany();
//   await prisma.salesItem.deleteMany();
//   await prisma.sales.deleteMany();

//   // Core Data
//   await prisma.payroll.deleteMany();
//   await prisma.inventory.deleteMany();
//   await prisma.product.deleteMany();
//   await prisma.warehouse.deleteMany();
//   await prisma.user.deleteMany();
//   await prisma.branch.deleteMany();

//   // -----------------------------
//   // Branches
//   // -----------------------------
//   console.log("🏢 Creating branches...");
//   const mainBranch = await prisma.branch.create({
//     data: {
//       code: "WH-001",
//       name: "Main Warehouse",
//       city: "Nairobi",
//       address: "Industrial Area, Nairobi",
//       phone: "+254 722 111 000",
//     },
//   });

//   const westlandsBranch = await prisma.branch.create({
//     data: {
//       code: "WL-001",
//       name: "Westlands Branch",
//       city: "Nairobi",
//       address: "Westlands, Nairobi",
//       phone: "+254 722 111 001",
//     },
//   });

//   // -----------------------------
//   // Warehouses
//   // -----------------------------
//   console.log("📦 Creating warehouses...");
//   const warehouse1 = await prisma.warehouse.create({
//     data: {
//       code: "WH-MAIN",
//       name: "Main Storage",
//       location: "Industrial Area",
//       capacity: 1000,
//       branchId: mainBranch.id,
//     },
//   });

//   const warehouse2 = await prisma.warehouse.create({
//     data: {
//       code: "WH-WL",
//       name: "Westlands Storage",
//       location: "Westlands",
//       capacity: 500,
//       branchId: westlandsBranch.id,
//     },
//   });

//   // -----------------------------
//   // Users & RBAC
//   // -----------------------------
//   console.log("👥 Creating users with RBAC assignments...");
//   const hashedPassword = await bcrypt.hash("password123", 10);

//   console.log("🛠️ Seeding RBAC data...");
//   const hrModule = await prisma.module.create({ data: { code: 'hr', name: 'HR' } });
//   const salesModule = await prisma.module.create({ data: { code: 'sales', name: 'Sales' } });
//   const financeModule = await prisma.module.create({ data: { code: 'finance', name: 'Finance' } });
//   const adminModule = await prisma.module.create({ data: { code: 'admin', name: 'Admin' } });

//   const permissions = [
//     { code: 'hr.employee.view', name: 'View Employees', moduleId: hrModule.id },
//     { code: 'hr.employee.manage', name: 'Manage Employees', moduleId: hrModule.id },
//     { code: 'sales.order.create', name: 'Create Sales', moduleId: salesModule.id },
//     { code: 'sales.order.view_all', name: 'View All Sales', moduleId: salesModule.id },
//     { code: 'finance.reports.view', name: 'View Reports', moduleId: financeModule.id },
//     { code: 'admin.user.manage', name: 'Manage Users', moduleId: adminModule.id },
//     { code: 'admin.role.manage', name: 'Manage Roles', moduleId: adminModule.id },
//   ];

//   const permissionMap = new Map<string, string>();
//   for (const p of permissions) {
//     const perm = await prisma.permission.create({ data: p });
//     permissionMap.set(p.code, perm.id);
//   }

//   const superAdminRole = await prisma.role.create({
//     data: { code: 'super_admin', name: 'Super Administrator', isSystem: true, description: 'Global access' }
//   });

//   const branchManagerRole = await prisma.role.create({
//     data: { code: 'branch_manager', name: 'Branch Manager', isSystem: true, description: 'Branch-level access' }
//   });

//   const cashierRole = await prisma.role.create({
//     data: { code: 'cashier', name: 'Cashier', isSystem: true, description: 'POS access' }
//   });

//   const warehouseRole = await prisma.role.create({
//     data: { code: 'warehouse_staff', name: 'Warehouse Staff', isSystem: true, description: 'Inventory access' }
//   });

//   // Assign permissions
//   for (const permId of permissionMap.values()) {
//     await prisma.rolePermission.create({ data: { roleId: superAdminRole.id, permissionId: permId, scope: AccessScope.GLOBAL } });
//   }

//   const bmPerms = ['hr.employee.view', 'sales.order.create', 'sales.order.view_all'];
//   for (const code of bmPerms) {
//     const id = permissionMap.get(code);
//     if (id) await prisma.rolePermission.create({ data: { roleId: branchManagerRole.id, permissionId: id, scope: AccessScope.BRANCH } });
//   }

//   const cashierPerms = ['sales.order.create'];
//   for (const code of cashierPerms) {
//     const id = permissionMap.get(code);
//     if (id) await prisma.rolePermission.create({ data: { roleId: cashierRole.id, permissionId: id, scope: AccessScope.OWN } });
//   }

//   const warehousePerms = ['sales.order.view_all'];
//   for (const code of warehousePerms) {
//     const id = permissionMap.get(code);
//     if (id) await prisma.rolePermission.create({ data: { roleId: warehouseRole.id, permissionId: id, scope: AccessScope.BRANCH } });
//   }

//   // Users
//   const admin = await prisma.user.create({
//     data: { email: "admin@lunatech.co.ke", name: "Admin User", passwordHash: hashedPassword, role: UserRole.admin, branchId: mainBranch.id }
//   });
//   await prisma.roleAssignment.create({ data: { userId: admin.id, roleId: superAdminRole.id } });

//   const manager = await prisma.user.create({
//     data: { email: "manager@lunatech.co.ke", name: "Jane Smith", passwordHash: hashedPassword, role: UserRole.manager, branchId: westlandsBranch.id }
//   });
//   await prisma.roleAssignment.create({ data: { userId: manager.id, roleId: branchManagerRole.id } });

//   const warehouseStaff = await prisma.user.create({
//     data: { email: "warehouse@lunatech.co.ke", name: "Bob Wilson", passwordHash: hashedPassword, role: UserRole.warehouse_staff, branchId: mainBranch.id }
//   });
//   await prisma.roleAssignment.create({ data: { userId: warehouseStaff.id, roleId: warehouseRole.id } });

//   const cashier = await prisma.user.create({
//     data: { email: "cashier@lunatech.co.ke", name: "Alice Johnson", passwordHash: hashedPassword, role: UserRole.cashier, branchId: westlandsBranch.id }
//   });
//   await prisma.roleAssignment.create({ data: { userId: cashier.id, roleId: cashierRole.id } });

//   const driver = await prisma.user.create({
//     data: { email: "driver@lunatech.co.ke", name: "Michael Brown", passwordHash: hashedPassword, role: UserRole.driver, branchId: westlandsBranch.id }
//   });

//   // -----------------------------
//   // Products & Inventory
//   // -----------------------------
//   console.log("🛍️ Creating products...");
//   const createdProducts = await Promise.all([
//     prisma.product.create({ data: { sku: "LAP-001", barcode: "123456789001", name: "Dell Latitude 5420", description: "Business Laptop", category: "Computers", unit_price: 120000, cost_price: 95000, tax_rate: 0.16, quantity: 60, reorder_level: 5 } }),
//     prisma.product.create({ data: { sku: "LAP-002", barcode: "123456789002", name: "HP Elitebook 840", description: "Enterprise Laptop", category: "Computers", unit_price: 115000, cost_price: 92000, tax_rate: 0.16, quantity: 40, reorder_level: 5 } }),
//   ]);

//   console.log("📊 Creating inventory records...");
//   for (const product of createdProducts) {
//     const qty1 = Math.floor(product.quantity * 0.6);
//     const qty2 = Math.floor(product.quantity * 0.4);
//     await prisma.inventory.create({ data: { quantity: qty1, reserved: 0, available: qty1, status: InventoryStatus.in_stock, productId: product.id, warehouseId: warehouse1.id } });
//     await prisma.inventory.create({ data: { quantity: qty2, reserved: 0, available: qty2, status: InventoryStatus.in_stock, productId: product.id, warehouseId: warehouse2.id } });
//   }

//   // -----------------------------
//   // Trucks
//   // -----------------------------
//   console.log("🚚 Creating trucks...");
//   await prisma.truck.create({ data: { registration: "KCA 123A", model: "Toyota Hiace", capacity: 2000, license_plate: "KCA-123A" } });

//   // -----------------------------
//   // Sample Sales
//   // -----------------------------
//   console.log("🛒 Creating sample sales...");
//   function calculateTotals(items: { unit_price: number; quantity: number; tax_rate: number }[]) {
//     let subtotal = 0;
//     let tax = 0;
//     for (const item of items) {
//       const lineSubtotal = item.unit_price * item.quantity;
//       const lineTax = lineSubtotal * item.tax_rate;
//       subtotal += lineSubtotal;
//       tax += lineTax;
//     }
//     return { subtotal, tax, grand_total: subtotal + tax };
//   }

//   for (let i = 1; i <= 3; i++) {
//     const itemsForSale = createdProducts.map(product => {
//       const quantity = Math.floor(Math.random() * 3) + 1;
//       return { product, quantity, unit_price: product.unit_price, tax_rate: product.tax_rate };
//     });

//     const totals = calculateTotals(itemsForSale);

//     const sale = await prisma.sales.create({
//       data: {
//         invoice_no: `INV-2025-00${i}`,
//         status: SalesStatus.confirmed,
//         payment_method: PaymentMethod.cash,
//         branchId: i % 2 === 0 ? mainBranch.id : westlandsBranch.id,
//         userId: i % 2 === 0 ? warehouseStaff.id : cashier.id,
//         createdById: manager.id,
//         subtotal: totals.subtotal,
//         total_amount: totals.subtotal,
//         discount: 0,
//         tax: totals.tax,
//         grand_total: totals.grand_total,
//         amount_paid: totals.grand_total,
//         change: 0,
//       },
//     });

//     for (const item of itemsForSale) {
//       await prisma.salesItem.create({
//         data: {
//           quantity: item.quantity,
//           unit_price: item.unit_price,
//           subtotal: item.unit_price * item.quantity,
//           tax_rate: item.tax_rate,
//           tax_amount: item.unit_price * item.quantity * item.tax_rate,
//           amount: item.unit_price * item.quantity * (1 + item.tax_rate),
//           salesId: sale.id,
//           productId: item.product.id,
//         },
//       });
//     }
//   }

//   console.log("\n✅ Seed data created successfully!");
// }

// main()
//   .catch(e => { console.error("\n❌ Seed failed:"); console.error(e); process.exit(1); })
//   .finally(async () => { /* process exit handles disconnect */ });



// backend/prisma/seed.ts

import { prisma } from '../src/lib/db';
import 'dotenv/config';
import {
  UserRole,
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
  const hrModule = await prisma.module.create({ data: { code: 'hr', name: 'HR' } });
  const salesModule = await prisma.module.create({ data: { code: 'sales', name: 'Sales' } });
  const financeModule = await prisma.module.create({ data: { code: 'finance', name: 'Finance' } });
  const adminModule = await prisma.module.create({ data: { code: 'admin', name: 'Admin' } });

  const permissions = [
    { code: 'hr.employee.view', name: 'View Employees', moduleId: hrModule.id },
    { code: 'hr.employee.manage', name: 'Manage Employees', moduleId: hrModule.id },
    { code: 'sales.order.create', name: 'Create Sales', moduleId: salesModule.id },
    { code: 'sales.order.view_all', name: 'View All Sales', moduleId: salesModule.id },
    { code: 'finance.reports.view', name: 'View Reports', moduleId: financeModule.id },
    { code: 'admin.user.manage', name: 'Manage Users', moduleId: adminModule.id },
    { code: 'admin.role.manage', name: 'Manage Roles', moduleId: adminModule.id },
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
    data: { email: 'admin@lunatech.co.ke', name: 'Admin User', passwordHash: hashedPassword, role: UserRole.admin, branchId: mainWarehouse.id },
  });
  await prisma.roleAssignment.create({ data: { userId: admin.id, roleId: superAdminRole.id } });

  const manager = await prisma.user.create({
    data: { email: 'manager@lunatech.co.ke', name: 'Jane Smith', passwordHash: hashedPassword, role: UserRole.manager, branchId: westlandsBranch.id },
  });
  await prisma.roleAssignment.create({ data: { userId: manager.id, roleId: branchManagerRole.id } });

  const warehouseStaff = await prisma.user.create({
    data: { email: 'warehouse@lunatech.co.ke', name: 'Bob Wilson', passwordHash: hashedPassword, role: UserRole.warehouse_staff, branchId: mainWarehouse.id },
  });
  await prisma.roleAssignment.create({ data: { userId: warehouseStaff.id, roleId: warehouseRole.id } });

  const cashier = await prisma.user.create({
    data: { email: 'cashier@lunatech.co.ke', name: 'Alice Johnson', passwordHash: hashedPassword, role: UserRole.cashier, branchId: westlandsBranch.id },
  });
  await prisma.roleAssignment.create({ data: { userId: cashier.id, roleId: cashierRole.id } });

  const driver = await prisma.user.create({
    data: { email: 'driver@lunatech.co.ke', name: 'Michael Brown', passwordHash: hashedPassword, role: UserRole.driver, branchId: westlandsBranch.id },
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
