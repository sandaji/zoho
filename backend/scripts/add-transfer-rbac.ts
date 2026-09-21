// backend/scripts/add-transfer-rbac.ts
//
// Additive, idempotent RBAC patch: adds four granular transfer-workflow
// permissions (request/approve/dispatch/receive) without touching any
// existing data. Safe to run against the live dev database — unlike
// prisma/seed.ts, this does NOT delete anything.
//
// Run with: cd backend && npx tsx scripts/add-transfer-rbac.ts

import "dotenv/config";
import { prisma } from "../src/core/database/db";

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
    { code: "inventory.transfer.issue", name: "Raise Transfer Issue" },
    {
      code: "inventory.transfer.resolve_issue",
      name: "Resolve Transfer Issue",
    },
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

  // Per-role grants. Design (see ERP role definitions):
  //   Branch Manager  -> REQUESTS transfers and receives them; does NOT approve
  //   Warehouse staff -> physical handling: pick, verify, dispatch, receive
  //   Manager (head office) -> requests/approves, verifies, resolves issues
  // Roles that don't exist yet (e.g. `manager` before update-rbac.ts has been
  // run) are skipped with a message.
  const P = (name: string) => `inventory.transfer.${name}`;
  const GRANTS: {
    role: string;
    scope: "GLOBAL" | "BRANCH";
    codes: string[];
  }[] = [
    {
      role: "branch_manager",
      scope: "BRANCH",
      codes: [P("request"), P("receive"), P("issue")],
    },
    {
      role: "warehouse_staff",
      scope: "BRANCH",
      codes: [
        P("pick"),
        P("verify"),
        P("dispatch"),
        P("receive"),
        P("issue"),
      ],
    },
    {
      role: "manager",
      scope: "GLOBAL",
      codes: [
        P("request"),
        P("approve"),
        P("verify"),
        P("issue"),
        P("resolve_issue"),
      ],
    },
  ];

  const idByCode = new Map(
    (
      await prisma.permission.findMany({
        where: { code: { in: newPermissions.map((p) => p.code) } },
        select: { id: true, code: true },
      })
    ).map((p) => [p.code, p.id]),
  );

  for (const grant of GRANTS) {
    const role = await prisma.role.findUnique({ where: { code: grant.role } });
    if (!role) {
      console.log(`  ⏭ Role ${grant.role} not found, skipping`);
      continue;
    }
    for (const code of grant.codes) {
      const permissionId = idByCode.get(code);
      if (!permissionId) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId } },
        update: { scope: grant.scope },
        create: { roleId: role.id, permissionId, scope: grant.scope },
      });
    }
    console.log(`  ✓ ${grant.role}: ${grant.codes.length} transfer permissions (${grant.scope})`);
  }

  // Revoke what earlier versions of this script over-granted. Upserts can't
  // remove anything, so without this a database that already ran the old
  // version would keep letting branch managers approve transfers.
  const REVOKE: { role: string; codes: string[] }[] = [
    {
      role: "branch_manager",
      codes: [
        P("approve"),
        P("pick"),
        P("verify"),
        P("dispatch"),
        P("resolve_issue"),
      ],
    },
    { role: "warehouse_staff", codes: [P("approve"), P("resolve_issue")] },
  ];
  for (const r of REVOKE) {
    const { count } = await prisma.rolePermission.deleteMany({
      where: {
        role: { code: r.role },
        permission: { code: { in: r.codes } },
      },
    });
    if (count > 0) console.log(`  ✗ Revoked ${count} from ${r.role}`);
  }

  console.log(
    "\n✅ Done. The existing blanket inventory.stock.adjust permission was left untouched \u2014 the pick/verify/dispatch/receive/issue routes still accept it as an override, but the APPROVE route does not.",
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
