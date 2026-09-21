// backend/scripts/add-manager-dashboard-rbac.ts
//
// Additive, idempotent RBAC patch for the Branch Manager dashboard.
//
// Why this exists: a fresh `prisma/seed.ts` only creates a base catalog of 37
// permission codes, but the routes require more (e.g. admin.user.view), and the
// seeded `branch_manager` role was missing `sales.order.view_all`. Only the
// `admin` / `super_admin` roles bypass permission checks, so a branch manager
// got 403 on /sales-documents/performance, /admin/users and /admin/warehouses.
//
// This does NOT delete or overwrite anything — unlike prisma/seed.ts, it is
// safe to run against a database that already has your data.
//
// Every grant is BRANCH-scoped, so a manager only ever sees their own branch
// (User, Warehouse and SalesDocument are branch-isolated in core/database/db.ts).
//
// Run with: cd backend && npx tsx scripts/add-manager-dashboard-rbac.ts
// Then have the manager log out and back in so the UI picks up the new list.

import "dotenv/config";
import { prisma } from "../src/core/database/db";

const GRANTS = [
  {
    code: "sales.order.view_all",
    name: "View All Sales Orders",
    moduleCode: "sales",
  },
  { code: "admin.user.view", name: "View Users", moduleCode: "admin" },
  {
    code: "admin.warehouse.view",
    name: "View Warehouses (Admin)",
    moduleCode: "admin",
  },
];

async function main() {
  console.log("🔐 Adding Branch Manager dashboard permissions...");

  const role = await prisma.role.findUnique({
    where: { code: "branch_manager" },
  });
  if (!role) {
    throw new Error(
      "branch_manager role not found — has prisma/seed.ts been run at least once?",
    );
  }

  for (const grant of GRANTS) {
    const module = await prisma.module.findUnique({
      where: { code: grant.moduleCode },
    });
    if (!module) {
      throw new Error(
        `Module '${grant.moduleCode}' not found — has prisma/seed.ts been run at least once?`,
      );
    }

    // Create the permission if the catalog doesn't have it yet; leave an
    // existing one untouched.
    const permission = await prisma.permission.upsert({
      where: { code: grant.code },
      update: {},
      create: { code: grant.code, name: grant.name, moduleId: module.id },
    });

    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: role.id, permissionId: permission.id },
      },
      update: { scope: "BRANCH" },
      create: { roleId: role.id, permissionId: permission.id, scope: "BRANCH" },
    });

    console.log(`  ✓ ${grant.code} → branch_manager (BRANCH)`);
  }

  console.log("\n✅ Done. Log out and back in as the manager.");
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
