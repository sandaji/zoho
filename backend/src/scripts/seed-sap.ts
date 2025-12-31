import { prisma } from "../lib/db";
import { UserRole } from "@prisma/client";

async function seedRBAC() {
  console.log("Seeding SAP-like roles...");

  // Set the first user to super_admin
  const firstUser = await prisma.user.findFirst();
  if (firstUser) {
    await prisma.user.update({
      where: { id: firstUser.id },
      data: { role: "super_admin" as UserRole }
    });
    console.log(`Updated user ${firstUser.email} to super_admin`);
  }

  // Ensure sample vendor V-001 exists
  await prisma.vendor.upsert({
    where: { code: "V-001" },
    update: { isActive: true },
    create: {
      code: "V-001",
      name: "Main Supplier Co.",
      email: "contact@mainsupplier.com",
      isActive: true
    }
  });
  console.log("Ensured vendor V-001 exists");

  // Ensure sample branch BR-001 exists
  await prisma.branch.upsert({
    where: { code: "BR-001" },
    update: { isActive: true },
    create: {
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
  console.log("Ensured branch BR-001 exists with Central Warehouse");

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
