import { prisma } from "./backend/src/lib/db";
import { UserRole } from "@prisma/client";

async function seedRBAC() {
  console.log("Seeding SAP-like roles...");

  const roles = [
    { name: "SUPER_ADMIN", description: "Full system access including critical approvals" },
    { name: "ADMIN", description: "General administrative access" },
    { name: "PROCUREMENT_OFFICER", description: "PO creation and vendor management" },
    { name: "INVENTORY_MANAGER", description: "Stock transfers and levels" },
    { name: "WAREHOUSE_OFFICER", description: "Physical stock entry and transfers" },
    { name: "BRANCH_MANAGER", description: "Branch-specific operations" },
    { name: "FINANCE_OFFICER", description: "Payments and payroll" },
    { name: "VIEW_ONLY", description: "Read-only access" },
  ];

  // Note: These roles should ideally be in a Dedicated Role model if using dynamic RBAC,
  // but for this implementation we use the UserRole enum.
  // We'll ensure the first user is SUPER_ADMIN.

  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: "super_admin" as UserRole }
    });
    console.log(`Updated user ${firstUser.email} to super_admin`);
  }

  // Create a sample vendor if none exists
  const vendorCount = await prisma.vendor.count();
  if (vendorCount === 0) {
    await prisma.vendor.create({
      data: {
        code: "V-001",
        name: "Main Supplier Co.",
        email: "contact@mainsupplier.com",
        isActive: true
      }
    });
    console.log("Created sample vendor V-001");
  }

  // Create a sample branch if none exists
  const branchCount = await prisma.branch.count();
  if (branchCount === 0) {
    await prisma.branch.create({
      data: {
        code: "BR-001",
        name: "Main Branch",
        city: "Nairobi",
        isActive: true,
        warehouses: {
          create: {
            code: "WH-001",
            name: "Central Warehouse",
            location: "Main Branch HQ",
            capacity: 1000,
            isActive: true
          }
        }
      }
    });
    console.log("Created sample branch BR-001 with Central Warehouse");
  }

  console.log("Seeding complete.");
}

seedRBAC()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
