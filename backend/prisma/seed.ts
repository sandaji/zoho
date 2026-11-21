// backend/prisma/seed.ts

import "dotenv/config";
import { execSync } from "child_process";
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
  const safeDelete = async (modelName: string) => {
    const client = (prisma as any)[modelName];
    if (client && typeof client.deleteMany === "function") {
      try {
        await client.deleteMany();
        console.log(`🧹 Cleared ${modelName}`);
      } catch (err) {
        if (isMissingTableError(err)) {
          console.log(`⏭️ Skipping ${modelName} (table not present)`);
          return;
        }
        console.warn(`⚠️ Could not delete ${modelName}:`, err);
      }
    } else {
      console.warn(`⚠️ Model ${modelName} does not exist on prisma client`);
    }
  };

  console.log("🧹 Cleaning existing data...");
  // Children first. Models that don't exist on the client are skipped with a warning.
  const modelsToClear: string[] = [
    // Integrations / messaging / payments
    "webhookDelivery",
    "webhookEndpoint",
    "apiKey",
    "messageLog",
    "messageTemplate",
    "mpesaRequest",
    // Promotions
    "promotionRedemption",
    "promotion",
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

  // ==========================================================
  // RBAC: scripts/maintenance/update-rbac.ts is the single source of truth
  // for modules, permissions, roles and role grants (it is idempotent).
  // Running it here keeps the seed in step with the live system instead of
  // maintaining a second, drifting copy of the permission list.
  // ==========================================================
  console.log("🛡️ Seeding RBAC via scripts/maintenance/update-rbac.ts ...");
  execSync("npx tsx scripts/maintenance/update-rbac.ts", {
    stdio: "inherit",
    cwd: process.cwd(),
    env: process.env,
  });

  const roleIdByCode = new Map<string, string>();
  for (const r of await prisma.role.findMany({
    select: { id: true, code: true },
  })) {
    roleIdByCode.set(r.code, r.id);
  }

  console.log("👤 Creating users...");
  const hashedPassword = await bcrypt.hash("123456", 10);

  const seedUsers: {
    email: string;
    name: string;
    role: string; // legacy User.role string == RBAC role code
    branchId: string;
    assignRole?: boolean;
  }[] = [
    { email: "admin@swiftpos.com", name: "Ijamy Vincent", role: "super_admin", branchId: mainWarehouse.id },
    { email: "manager@swiftpos.com", name: "SwiftPos Sandaji", role: "branch_manager", branchId: westlandsBranch.id },
    { email: "max@swiftpos.com", name: "maxwell Omenya", role: "store_clerk", branchId: mainWarehouse.id },
    { email: "cashier@swiftpos.co.ke", name: "Alice Mideva", role: "cashier", branchId: westlandsBranch.id },
    { email: "hr@swiftpos.co.ke", name: "Sarah Jenkins", role: "hr_manager", branchId: mainWarehouse.id },
    { email: "finance@swiftpos.co.ke", name: "James Donovan", role: "finance_manager", branchId: mainWarehouse.id },
    { email: "sales@swiftpos.co.ke", name: "David Rodriguez", role: "sales_rep", branchId: westlandsBranch.id },
    { email: "procurement@swiftpos.co.ke", name: "Priya Patel", role: "purchasing_officer", branchId: mainWarehouse.id },
    // Driver has no RBAC role (delivery app only)
    { email: "driver@swiftpos.co.ke", name: "Michael Brown", role: "driver", branchId: westlandsBranch.id, assignRole: false },
  ];

  const usersByEmail = new Map<string, { id: string }>();
  for (const u of seedUsers) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash: hashedPassword,
        branchId: u.branchId,
      },
    });
    usersByEmail.set(u.email, user);

    if (u.assignRole === false) continue;
    const roleId = roleIdByCode.get(u.role);
    if (!roleId) {
      console.warn(`⚠️ Role ${u.role} not found; ${u.email} has no assignment`);
      continue;
    }
    await prisma.roleAssignment.create({
      data: { userId: user.id, roleId },
    });
  }

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
  const T = 0.16;
  const products = [
    { sku: "TRK 5213", barcode: "123456789001", name: "TRONIC TWIN SOCKET", description: "13A 2G Switched Socket", category: "ACCESSORIES", unit_price: 350, cost_price: 285, tax_rate: T, quantity: 6000 },
    { sku: "TRK 7864", barcode: "123456788901", name: "Socket White 1.25mm Copper Cable", description: "1.25mm Copper Cable extension", category: "Extensions & Adaptors", unit_price: 1545, cost_price: 735, tax_rate: T, quantity: 700 },
    { sku: "MG 100L-0063-04", barcode: "123454689001", name: "MCCB 63A 4-Pole", description: "MCCB 63A 4-Pole – Industrial Circuit Breaker", category: "Switch Gear", unit_price: 4860, cost_price: 3500, tax_rate: T, quantity: 60 },
    { sku: "EM T18H", barcode: "1208454723401", name: "Mechanical Timer", description: "Mechanical Timer Switch 16Amps", category: "Protection Device", unit_price: 350, cost_price: 285, tax_rate: T, quantity: 6000 },
    { sku: "EST EMGR-03", barcode: "123456789981", name: "Emergency Solar Floodlight", description: "ESTIA Solar LED Emergency Flood Light", category: "FLOODLIGHTS", unit_price: 3100, cost_price: 1400, tax_rate: T, quantity: 309 },
    { sku: "VP FG13-BS", barcode: "123456789002", name: "TRONIC 13A FRIDGE GUARD", description: "13A Fridge Guard", category: "GUARDS", unit_price: 2200, cost_price: 1070, tax_rate: T, quantity: 2580 },
    { sku: "VP TG13-BS", barcode: "123489789002", name: "TRONIC 13A TV GUARD", description: "13A TV Guard", category: "GUARDS", unit_price: 2200, cost_price: 1070, tax_rate: T, quantity: 580 },
    { sku: "LE T818-GL-DL", barcode: "190473789002", name: "LED 4FT 6500K TUBE", description: "180V-260V 4FT SLIM LED TUBE LIGHT TRONIC", category: "LIGHTING", unit_price: 300, cost_price: 191, tax_rate: T, quantity: 58000 },
    { sku: "LE T809-GL-DL", barcode: "1234875789002", name: "LED 2FT 6500K TUBE", description: "180V-260V 2FT SLIM LED TUBE LIGHT TRONIC", category: "LIGHTING", unit_price: 250, cost_price: 144, tax_rate: T, quantity: 5000 },
    { sku: "TRK 0619", barcode: "1234125789002", name: "CEILING ROSE", description: "Ceiling Rose TRONIC", category: "ACCESSORIES", unit_price: 250, cost_price: 195, tax_rate: T, quantity: 58000 },
    { sku: "PHL 9W-E27", barcode: "8718696482121", name: "PHILIPS LED Bulb 9W", description: "9W E27 Cool Daylight LED Bulb", category: "LIGHTING", unit_price: 450, cost_price: 280, tax_rate: T, quantity: 12000 },
    { sku: "TRK 45A-DP", barcode: "1234125789111", name: "TRONIC 45A DP SWITCH", description: "45A Double Pole Switch for Water Heaters/Cookers", category: "ACCESSORIES", unit_price: 850, cost_price: 520, tax_rate: T, quantity: 3500 },
    { sku: "PHL 12W-DL", barcode: "8718696482122", name: "PHILIPS Downlight 12W", description: "12W Recessed LED Downlight 6500K", category: "LIGHTING", unit_price: 1100, cost_price: 700, tax_rate: T, quantity: 4200 },
    { sku: "TRK EXT-5M", barcode: "1234125789222", name: "TRONIC Extension Cable 5M", description: "4-Way Extension Reel with 5-Meter Cable", category: "Extensions & Adaptors", unit_price: 2100, cost_price: 1250, tax_rate: T, quantity: 850 },
    { sku: "TRK JB-30", barcode: "1234125789333", name: "TRONIC Junction Box 30A", description: "Heavy Duty 30A Junction Box 3 Terminal", category: "ACCESSORIES", unit_price: 180, cost_price: 110, tax_rate: T, quantity: 8000 },
    { sku: "PHL IRN-100", barcode: "8718696482123", name: "PHILIPS Dry Iron 1000W", description: "Classic Dry Iron Box with Non-Stick Soleplate", category: "APPLIANCES", unit_price: 2800, cost_price: 1850, tax_rate: T, quantity: 300 },
  ];

  for (const p of products) {
    const { quantity, ...productData } = p;

    const prod = await prisma.product.create({
      data: {
        ...(productData as any),
        vendorId: p.name.includes("TRONIC") ? vendor1.id : vendor2.id,
      },
    });

    // Split stock between the two warehouses (60/40)
    const splits = [
      { warehouseId: warehouse1.id, qty: Math.floor(quantity * 0.6) },
      { warehouseId: warehouse2.id, qty: Math.floor(quantity * 0.4) },
    ];
    for (const s of splits) {
      await prisma.inventory.create({
        data: {
          quantity: s.qty,
          reserved: 0,
          available: s.qty,
          status: "in_stock",
          productId: prod.id,
          warehouseId: s.warehouseId,
        },
      });
      await prisma.stockBatch.create({
        data: {
          productId: prod.id,
          warehouseId: s.warehouseId,
          initialQuantity: s.qty,
          currentQuantity: s.qty,
          unitCost: new Prisma.Decimal(p.cost_price),
          receivedAt: new Date(),
        },
      });
    }
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

  console.log("\n✅ Seed data created successfully!");
  console.log(
    "ℹ️  Customers are not seeded. Every customer needs a salesman (salesmanId); create them in the app or via CRM lead conversion.",
  );
}

main()
  .catch((e) => {
    console.error("\n❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
