/**
 * Read-only report: who holds which role, and whether every approval chain has
 * someone who can actually decide each stage.
 *
 *   npx tsx scripts/maintenance/report-roles.ts
 */
import "dotenv/config";
import { prisma } from "../../src/core/database/db";
import { DEFAULT_DEFINITIONS } from "../../src/modules/workflow/workflow.defaults";

async function main() {
  const roles = await prisma.role.findMany({
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      _count: { select: { permissions: true } },
    },
  });
  const perRole = await prisma.roleAssignment.groupBy({ by: ["roleId"], where: { user: { isActive: true } }, _count: true });
  const usersByRole = new Map(perRole.map((p) => [p.roleId, p._count as number]));

  console.log("\n=== ROLES ===");
  console.table(
    roles.map((r) => ({ code: r.code, name: r.name, permissions: r._count.permissions, activeUsers: usersByRole.get(r.id) ?? 0 })),
  );

  const assignments = await prisma.roleAssignment.findMany({
    where: { user: { isActive: true } },
    select: { userId: true, role: { select: { code: true } }, user: { select: { name: true, email: true, branchId: true } } },
  });
  const byUser = new Map<string, { name: string; email: string; roles: string[] }>();
  for (const a of assignments) {
    const e = byUser.get(a.userId) ?? { name: a.user.name, email: a.user.email, roles: [] };
    e.roles.push(a.role.code);
    byUser.set(a.userId, e);
  }
  console.log("\n=== ACTIVE USERS AND THEIR ROLES ===");
  console.table([...byUser.values()].map((u) => ({ name: u.name, email: u.email, roles: u.roles.join(", ") })));

  const noRole = await prisma.user.count({ where: { isActive: true, roles: { none: {} } } });
  if (noRole) console.log(`\n⚠️  ${noRole} active user(s) have NO role assigned.`);

  // Does every approval stage have at least one active user who holds its permission?
  console.log("\n=== APPROVAL CHAINS ===");
  const holders = async (code: string) => {
    const rows = await prisma.roleAssignment.findMany({
      where: { user: { isActive: true }, role: { permissions: { some: { permission: { code } } } } },
      select: { userId: true },
    });
    return new Set(rows.map((r) => r.userId)).size;
  };
  let gaps = 0;
  for (const d of DEFAULT_DEFINITIONS) {
    console.log(`\n${d.name} (${d.code})`);
    for (const s of d.stages) {
      const n = await holders(s.approverPermission);
      if (n === 0) gaps++;
      console.log(`  stage ${s.order} ${s.name.padEnd(32)} ${s.approverPermission.padEnd(44)} ${n === 0 ? "❌ NOBODY can approve" : `✅ ${n} user(s)`}`);
    }
  }
  console.log(gaps ? `\n${gaps} stage(s) have no approver. Assign the roles or permissions above.` : "\nEvery approval stage has at least one approver.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
