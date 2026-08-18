// backend/prisma/seed.ts

import "dotenv/config";
import { PrismaClient, Prisma } from "../src/generated";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

import bcrypt from "bcrypt";

// Use standard PrismaClient with adapter for seeding
// Use DIRECT_URL for seeding to bypass connection pooler issues
const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
const pool = new Pool({ connectionString, ssl: { rejectUnauthorized: false } });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seed...");

  const isMissingTableError = (err: unknown) => {
    if (!err || typeof err !== "object") return false;

    const message = (err as { message?: string }).message ?? "";
    const code = (err as { code?: string }).code;

    return (
      code === "P2021" ||
      /table .* does not exist|does not exist in the current database|relation .* does not exist/i.test(
        message,
      )
    );
  };

  // Helper: safe delete for any model
  const safeDelete = async (modelName: keyof typeof prisma) => {
    const key = String(modelName);
    const client = (prisma as any)[key];
    if (client && typeof client.deleteMany === "function") {
      try {
        await client.deleteMany();
        console.log(`🧹 Cleared ${key}`);
      } catch (err) {
        if (isMissingTableError(err)) {
          console.log(`⏭️ Skipping ${key} (table not present)`);
          return;
        }
        console.warn(`⚠️ Could not delete ${key}:`, err);
      }
    } else {
      console.warn(`⚠️ Model ${key} does not exist on prisma client`);
    }
  };

  console.log("🧹 Cleaning existing data...");
  const modelsToClear: (keyof typeof prisma)[] = [
    "auditLog",
    "developmentPlan",
    "performanceEvaluation",
    "goal",
    "interview",
    "applicant",
    "jobPosting",
    "leaveRequest",
    "leaveAllocation",
    "leaveType",
    "benefitEnrollment",
    "benefit",
    "taxRecord",
    "financialAlert",
    "financialForecast",
    "bankTransaction",
    "bankAccount",
    "aPPayment",
    "accountPayable",
    "aRPayment",
    "accountReceivable",
    "bankStatementLine",
    "bankStatement",
    "budget",
    "journalEntry",
    "fiscalPeriod",
    "fiscalYear",
    "journal",
    "chartOfAccount",
    "payroll",
    "dailySpendingLimit",
    "savingsGoal",
    "financeTransaction",
    "delivery",
    "truck",
    "gRNItem",
    "goodsReceiptNote",
    "purchaseOrderItem",
    "approvalRequest",
    "purchaseOrder",
    "vendor",
    "cashierSession",
    "dispatchItem",
    "dispatchNote",
    "sOItem",
    "salesOrder",
    "documentSequence",
    "payment",
    "salesDocumentItem",
    "salesDocument",
    "customer",
    "transferItem",
    "stockTransfer",
    "stockMovement",
    "stockBatch",
    "inventory",
    "branchInventory",
    "product",
    "warehouse",
    "employeeTransfer",
    "roleAssignment",
    "rolePermission",
    "permission",
    "role",
    "module",
    "user",
    "branch",
  ];

  for (const model of modelsToClear) {
    await safeDelete(model);
  }

  console.log("🏢 Creating branches...");
  const mainWarehouse = await prisma.branch.create({
    data: {
      code: "WH-001",
      name: "Main Warehouse",
      city: "Nairobi",
      address: "Industrial Area, Nairobi",
      phone: "+254 722 111 000",
    },
  });
  const westlandsBranch = await prisma.branch.create({
    data: {
      code: "WL-001",
      name: "Westlands Branch",
      city: "Nairobi",
      address: "Westlands, Nairobi",
      phone: "+254 722 111 001",
    },
  });

  console.log("📦 Creating warehouses...");
  const warehouse1 = await prisma.warehouse.create({
    data: {
      code: "WH-MAIN",
      name: "Main Storage",
      location: "Industrial Area",
      capacity: 1000,
      branchId: mainWarehouse.id,
    },
  });
  const warehouse2 = await prisma.warehouse.create({
    data: {
      code: "WH-WL",
      name: "Westlands Storage",
      location: "Westlands",
      capacity: 500,
      branchId: westlandsBranch.id,
    },
  });

  console.log("👥 Creating RBAC modules and permissions...");
  const hrModule = await prisma.module.create({
    data: { code: "hr", name: "Human Resources" },
  });
  const salesModule = await prisma.module.create({
    data: { code: "sales", name: "Sales" },
  });
  const financeModule = await prisma.module.create({
    data: { code: "finance", name: "Finance" },
  });
  const adminModule = await prisma.module.create({
    data: { code: "admin", name: "Administration" },
  });
  const inventoryModule = await prisma.module.create({
    data: { code: "inventory", name: "Inventory" },
  });
  const procurementModule = await prisma.module.create({
    data: { code: "procurement", name: "Procurement" },
  });
  const auditModule = await prisma.module.create({
    data: { code: "audit", name: "Audit" },
  });

  const permissions = [
    // HR Permissions
    { code: "hr.employee.view", name: "View Employees", moduleId: hrModule.id },
    {
      code: "hr.employee.manage",
      name: "Manage Employees",
      moduleId: hrModule.id,
    },
    { code: "hr.payroll.view", name: "View Payroll", moduleId: hrModule.id },
    {
      code: "hr.payroll.manage",
      name: "Manage Payroll",
      moduleId: hrModule.id,
    },
    {
      code: "hr.recruitment.view",
      name: "View Recruitment",
      moduleId: hrModule.id,
    },
    {
      code: "hr.recruitment.manage",
      name: "Manage Recruitment",
      moduleId: hrModule.id,
    },

    // Sales Permissions
    {
      code: "sales.order.create",
      name: "Create Sales Orders",
      moduleId: salesModule.id,
    },
    {
      code: "sales.order.view",
      name: "View Sales Orders",
      moduleId: salesModule.id,
    },
    {
      code: "sales.order.view_all",
      name: "View All Sales Orders",
      moduleId: salesModule.id,
    },
    {
      code: "sales.order.manage",
      name: "Manage Sales Orders",
      moduleId: salesModule.id,
    },
    {
      code: "sales.customer.view",
      name: "View Customers",
      moduleId: salesModule.id,
    },
    {
      code: "sales.customer.manage",
      name: "Manage Customers",
      moduleId: salesModule.id,
    },

    // Finance Permissions
    {
      code: "finance.invoice.create",
      name: "Create Invoices",
      moduleId: financeModule.id,
    },
    {
      code: "finance.invoice.view",
      name: "View Invoices",
      moduleId: financeModule.id,
    },
    {
      code: "finance.invoice.approve",
      name: "Approve Invoices",
      moduleId: financeModule.id,
    },
    {
      code: "finance.payment.create",
      name: "Create Payments",
      moduleId: financeModule.id,
    },
    {
      code: "finance.payment.view",
      name: "View Payments",
      moduleId: financeModule.id,
    },
    {
      code: "finance.reports.view",
      name: "View Financial Reports",
      moduleId: financeModule.id,
    },
    {
      code: "finance.gl.view",
      name: "View General Ledger",
      moduleId: financeModule.id,
    },
    {
      code: "finance.gl.manage",
      name: "Manage General Ledger",
      moduleId: financeModule.id,
    },

    // Admin Permissions
    {
      code: "admin.user.manage",
      name: "Manage Users",
      moduleId: adminModule.id,
    },
    {
      code: "admin.role.manage",
      name: "Manage Roles",
      moduleId: adminModule.id,
    },
    {
      code: "admin.branch.manage",
      name: "Manage Branches",
      moduleId: adminModule.id,
    },
    {
      code: "admin.system.view",
      name: "View System Settings",
      moduleId: adminModule.id,
    },
    {
      code: "admin.system.manage",
      name: "Manage System Settings",
      moduleId: adminModule.id,
    },

    // Inventory Permissions
    {
      code: "inventory.product.view",
      name: "View Products",
      moduleId: inventoryModule.id,
    },
    {
      code: "inventory.product.manage",
      name: "Manage Products",
      moduleId: inventoryModule.id,
    },
    {
      code: "inventory.stock.view",
      name: "View Stock",
      moduleId: inventoryModule.id,
    },
    {
      code: "inventory.stock.adjust",
      name: "Adjust Stock",
      moduleId: inventoryModule.id,
    },
    {
      code: "inventory.warehouse.manage",
      name: "Manage Warehouses",
      moduleId: inventoryModule.id,
    },
    {
      code: "inventory.warehouse.view",
      name: "View Warehouses",
      moduleId: inventoryModule.id,
    },

    // Procurement Permissions
    {
      code: "procurement.vendor.view",
      name: "View Vendors",
      moduleId: procurementModule.id,
    },
    {
      code: "procurement.vendor.manage",
      name: "Manage Vendors",
      moduleId: procurementModule.id,
    },
    {
      code: "procurement.order.create",
      name: "Create Purchase Orders",
      moduleId: procurementModule.id,
    },
    {
      code: "procurement.order.view",
      name: "View Purchase Orders",
      moduleId: procurementModule.id,
    },
    {
      code: "procurement.order.approve",
      name: "Approve Purchase Orders",
      moduleId: procurementModule.id,
    },

    // Audit Permissions
    {
      code: "audit.log.view",
      name: "View Audit Logs",
      moduleId: auditModule.id,
    },
  ];

  const permissionMap = new Map<string, string>();
  for (const p of permissions) {
    const perm = await prisma.permission.create({ data: p });
    permissionMap.set(p.code, perm.id);
  }

  console.log("🛡️ Creating roles...");
  const superAdminRole = await prisma.role.create({
    data: {
      code: "super_admin",
      name: "Super Admin",
      isSystem: true,
      description: "Global access",
    },
  });
  const branchManagerRole = await prisma.role.create({
    data: {
      code: "branch_manager",
      name: "Branch Manager",
      isSystem: true,
      description: "Branch-level access",
    },
  });
  const cashierRole = await prisma.role.create({
    data: {
      code: "cashier",
      name: "Cashier",
      isSystem: true,
      description: "Point of Sale access",
    },
  });
  const warehouseRole = await prisma.role.create({
    data: {
      code: "warehouse_staff",
      name: "Warehouse Staff",
      isSystem: true,
      description: "Inventory management access",
    },
  });

  console.log("🔗 Assigning role permissions...");
  // Super Admin: all permissions
  for (const permId of permissionMap.values()) {
    await prisma.rolePermission.create({
      data: {
        roleId: superAdminRole.id,
        permissionId: permId,
        scope: "GLOBAL",
      },
    });
  }

  // Branch Manager - manually assign permissions (bypassing blueprint sync due to Prisma Cloud transaction issues)
  const branchManagerPerms = [
    "hr.employee.view",
    "hr.payroll.view",
    "sales.order.create",
    "sales.order.view",
    "sales.customer.view",
    "finance.invoice.view",
    "finance.payment.view",
    "inventory.product.view",
    "inventory.stock.view",
    "inventory.warehouse.view",
    "procurement.vendor.view",
    "procurement.order.view",
    "admin.system.view",
  ];
  for (const code of branchManagerPerms) {
    const id = permissionMap.get(code);
    if (id)
      await prisma.rolePermission.create({
        data: { roleId: branchManagerRole.id, permissionId: id, scope: "BRANCH" },
      });
  }

  // Cashier
  const cashierPerms = ["sales.order.create"];
  for (const code of cashierPerms) {
    const id = permissionMap.get(code);
    if (id)
      await prisma.rolePermission.create({
        data: { roleId: cashierRole.id, permissionId: id, scope: "OWN" },
      });
  }

  // Warehouse
  const warehousePerms = ["sales.order.view_all"];
  for (const code of warehousePerms) {
    const id = permissionMap.get(code);
    if (id)
      await prisma.rolePermission.create({
        data: { roleId: warehouseRole.id, permissionId: id, scope: "BRANCH" },
      });
  }

  console.log("👤 Creating users...");
  const hashedPassword = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@zoho.co.ke",
      name: "Admin User",
      role: "admin",
      passwordHash: hashedPassword,
      branchId: mainWarehouse.id,
    },
  });
  await prisma.roleAssignment.create({
    data: { userId: admin.id, roleId: superAdminRole.id },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@zoho.co.ke",
      name: "Jane Smith",
      role: "manager",
      passwordHash: hashedPassword,
      branchId: westlandsBranch.id,
    },
  });
  await prisma.roleAssignment.create({
    data: { userId: manager.id, roleId: branchManagerRole.id },
  });

  const warehouseStaff = await prisma.user.create({
    data: {
      email: "warehouse@zoho.co.ke",
      name: "Bob Wilson",
      role: "warehouse_staff",
      passwordHash: hashedPassword,
      branchId: mainWarehouse.id,
    },
  });
  await prisma.roleAssignment.create({
    data: { userId: warehouseStaff.id, roleId: warehouseRole.id },
  });

  const cashier = await prisma.user.create({
    data: {
      email: "cashier@zoho.co.ke",
      name: "Alice Mideva",
      role: "cashier",
      passwordHash: hashedPassword,
      branchId: westlandsBranch.id,
    },
  });
  await prisma.roleAssignment.create({
    data: { userId: cashier.id, roleId: cashierRole.id },
  });

  const driver = await prisma.user.create({
    data: {
      email: "driver@zoho.co.ke",
      name: "Michael Brown",
      role: "driver",
      passwordHash: hashedPassword,
      branchId: westlandsBranch.id,
    },
  });

  console.log("🏭 Creating vendors...");
  const vendor1 = await prisma.vendor.create({
    data: {
      code: "VND-TRONIC",
      name: "Tronic Ltd",
      email: "info@tronic.co.ke",
      phone: "+254 700 000 111",
      address: "Mombasa Road, Nairobi",
      taxId: "P051234567A",
    },
  });
  const vendor2 = await prisma.vendor.create({
    data: {
      code: "VND-PHILIPS",
      name: "Philips East Africa",
      email: "sales@philips.co.ke",
      phone: "+254 700 000 222",
      address: "Westlands, Nairobi",
      taxId: "P051234568B",
    },
  });

  console.log("🛍️ Creating products and inventory...");
  const products = [
    {
      sku: "TRK 5213",
      barcode: "123456789001",
      name: "TRONIC TWIN SOCKET",
      description: "13A 2G Switched Socket",
      category: "ACCESSORIES",
      unit_price: 350,
      cost_price: 285,
      tax_rate: 0.16,
      quantity: 6000,
      reorder_level: 2000,
    },
    {
      sku: "TRK 7864",
      barcode: "123456788901",
      name: "Socket White 1.25mm Copper Cable",
      description: "1.25mm Copper Cable extension",
      category: "Extensions & Adaptors",
      unit_price: 1545,
      cost_price: 735,
      tax_rate: 0.16,
      quantity: 700,
      reorder_level: 200,
    },
    {
      sku: "MG 100L-0063-04",
      barcode: "123454689001",
      name: "MCCB 63A 4-Pole",
      description: "MCCB 63A 4-Pole – Industrial Circuit Breaker",
      category: "Switch Gear",
      unit_price: 4860,
      cost_price: 3500,
      tax_rate: 0.16,
      quantity: 60,
      reorder_level: 15,
    },
    {
      sku: "EM T18H",
      barcode: "1208454723401",
      name: "Mechanical Timer",
      description: "Mechanical Timer Switch 16Amps",
      category: "Protection Device",
      unit_price: 350,
      cost_price: 285,
      tax_rate: 0.16,
      quantity: 6000,
      reorder_level: 2000,
    },
    {
      sku: "EST EMGR-03",
      barcode: "123456789981",
      name: "Emergency Solar Floodlight",
      description: "ESTIA Solar LED Emergency Flood Light",
      category: "FLOODLIGHTS",
      unit_price: 3100,
      cost_price: 1400,
      tax_rate: 0.16,
      quantity: 309,
      reorder_level: 5,
    },
    {
      sku: "VP FG13-BS",
      barcode: "123456789002",
      name: "TRONIC 13A FRIDGE GUARD",
      description: "13A Fridge Guard",
      category: "GUARDS",
      unit_price: 2200,
      cost_price: 1070,
      tax_rate: 0.16,
      quantity: 2580,
      reorder_level: 500,
    },
    {
      sku: "VP TG13-BS",
      barcode: "123489789002",
      name: "TRONIC 13A TV GUARD",
      description: "13A TV Guard",
      category: "GUARDS",
      unit_price: 2200,
      cost_price: 1070,
      tax_rate: 0.16,
      quantity: 580,
      reorder_level: 500,
    },
    {
      sku: "LE T818-GL-DL",
      barcode: "190473789002",
      name: "LED 4FT 6500K TUBE",
      description: "180V-260V 4FT SLIM LED TUBE LIGHT TRONIC",
      category: "LIGHTING",
      unit_price: 300,
      cost_price: 191,
      tax_rate: 0.16,
      quantity: 58000,
      reorder_level: 500,
    },
    {
      sku: "LE T809-GL-DL",
      barcode: "1234875789002",
      name: "LED 2FT 6500K TUBE",
      description: "180V-260V 2FT SLIM LED TUBE LIGHT TRONIC",
      category: "LIGHTING",
      unit_price: 250,
      cost_price: 144,
      tax_rate: 0.16,
      quantity: 5000,
      reorder_level: 500,
    },
    {
      sku: "TRK 0619",
      barcode: "1234125789002",
      name: "CEILING ROSE",
      description: "Ceiling Rose TRONIC",
      category: "ACCESSORIES",
      unit_price: 250,
      cost_price: 195,
      tax_rate: 0.16,
      quantity: 58000,
      reorder_level: 500,
    },
  ];

  const createdProducts = [];
  const allowedProductFields = [
    "sku",
    "upc",
    "barcode",
    "name",
    "description",
    "category",
    "subcategory",
    "product_type",
    "cost_price",
    "unit_price",
    "tax_rate",
    "unit_of_measurement",
    "weight",
    "weight_unit",
    "length",
    "width",
    "height",
    "dimension_unit",
    "image_url",
    "supplier_part_number",
    "lead_time_days",
    "status",
    "isActive",
  ] as const;

  for (const p of products) {
    const { quantity, reorder_level, ...productData } = p;
    const safeProductData = Object.fromEntries(
      Object.entries(productData).filter(([key]) =>
        allowedProductFields.includes(
          key as (typeof allowedProductFields)[number],
        ),
      ),
    ) as Record<string, unknown>;

    const prod = await prisma.product.create({
      data: {
        ...(safeProductData as any),
        vendorId: p.name.includes("TRONIC") ? vendor1.id : vendor2.id,
      },
    });
    createdProducts.push(prod);

    // Split inventory between warehouses
    const qty1 = Math.floor(p.quantity * 0.6);
    const qty2 = Math.floor(p.quantity * 0.4);

    // Create Inventory and StockBatch for warehouse 1
    await prisma.inventory.create({
      data: {
        quantity: qty1,
        reserved: 0,
        available: qty1,
        status: "in_stock",
        productId: prod.id,
        warehouseId: warehouse1.id,
      },
    });
    await prisma.stockBatch.create({
      data: {
        productId: prod.id,
        warehouseId: warehouse1.id,
        initialQuantity: qty1,
        currentQuantity: qty1,
        unitCost: new Prisma.Decimal(p.cost_price),
        receivedAt: new Date(),
      },
    });

    // Create Inventory and StockBatch for warehouse 2
    await prisma.inventory.create({
      data: {
        quantity: qty2,
        reserved: 0,
        available: qty2,
        status: "in_stock",
        productId: prod.id,
        warehouseId: warehouse2.id,
      },
    });
    await prisma.stockBatch.create({
      data: {
        productId: prod.id,
        warehouseId: warehouse2.id,
        initialQuantity: qty2,
        currentQuantity: qty2,
        unitCost: new Prisma.Decimal(p.cost_price),
        receivedAt: new Date(),
      },
    });
  }

  console.log("🚚 Creating trucks...");
  await prisma.truck.create({
    data: {
      registration: "KCA 123A",
      model: "ASHOK LEYLAND",
      capacity: 2000,
      license_plate: "KCA-123A",
    },
  });

  console.log("🛒 Creating sample sales... (Legacy Sales model removed)");
  // Legacy sales seeding removed

  console.log("\n✅ Seed data created successfully!");
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
