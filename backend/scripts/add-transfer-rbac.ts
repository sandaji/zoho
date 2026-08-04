// backend/scripts/add-transfer-rbac.ts
//
// Additive, idempotent RBAC patch: adds four granular transfer-workflow
// permissions (request/approve/dispatch/receive) without touching any
// existing data. Safe to run against the live dev database — unlike
// prisma/seed.ts, this does NOT delete anything.
//
// Run with: cd backend && npx tsx scripts/add-transfer-rbac.ts

import "dotenv/config";
import { prisma } from "../src/lib/db";

async function main() {
  console.log("🔐 Adding granular transfer RBAC permissions...");

  const inventoryModule = await prisma.module.findUnique({
    where: { code: "inventory" },
  });
  if (!inventoryModule) {
    throw new Error(
      "Inventory module not found — has the main seed been run at least once?",
    );
  }

  const newPermissions = [
    { code: "inventory.transfer.request", name: "Request Stock Transfer" },
    { code: "inventory.transfer.approve", name: "Approve Stock Transfer" },
    { code: "inventory.transfer.pick", name: "Pick Stock Transfer" },
    { code: "inventory.transfer.verify", name: "Verify Picked Stock Transfer" },
    { code: "inventory.transfer.dispatch", name: "Dispatch Stock Transfer" },
    { code: "inventory.transfer.receive", name: "Receive Stock Transfer" },
  ];

  const permissionIds: string[] = [];
  for (const p of newPermissions) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: { name: p.name, moduleId: inventoryModule.id },
      create: { code: p.code, name: p.name, moduleId: inventoryModule.id },
    });
    permissionIds.push(perm.id);
    console.log(`  ✓ ${p.code}`);
  }

  // Grant to super_admin at GLOBAL scope, matching how every other
  // permission is already granted to this role.
  const superAdmin = await prisma.role.findUnique({
    where: { code: "super_admin" },
  });
  if (superAdmin) {
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: { roleId: superAdmin.id, permissionId },
        },
        update: { scope: "GLOBAL" },
        create: { roleId: superAdmin.id, permissionId, scope: "GLOBAL" },
      });
    }
    console.log("  ✓ Granted to super_admin (GLOBAL)");
  } else {
    console.log("  ⏭ Role super_admin not found, skipping");
  }

  // Grant to branch_manager and warehouse_staff at BRANCH scope — both
  // already handle physical stock day-to-day in this ERP.
  for (const roleCode of ["branch_manager", "warehouse_staff"]) {
    const role = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!role) {
      console.log(`  ⏭ Role ${roleCode} not found, skipping`);
      continue;
    }
    for (const permissionId of permissionIds) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope: "BRANCH" },
        create: { roleId: role.id, permissionId, scope: "BRANCH" },
      });
    }
    console.log(`  ✓ Granted to ${roleCode} (BRANCH)`);
  }

  console.log(
    "\n✅ Done. The existing blanket inventory.stock.adjust permission was left untouched \u2014 routes now check the new granular permissions in addition to it.",
  );
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
