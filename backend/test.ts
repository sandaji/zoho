import { prisma } from './src/lib/db';

async function main() {
  // Check role assignments
  const assignments = await prisma.roleAssignment.findMany({
    include: {
      user: { select: { email: true, role: true } },
      role: { select: { code: true, name: true } },
    }
  });
  
  console.log('=== Role Assignments ===');
  if (assignments.length === 0) {
    console.log('⚠️  NO ROLE ASSIGNMENTS FOUND - This is the root cause of 403 errors!');
  } else {
    console.table(assignments.map(a => ({
      userEmail: a.user.email,
      userLegacyRole: a.user.role,
      rbacRole: a.role.code,
      rbacRoleName: a.role.name,
    })));
  }

  // Check what roles exist
  const roles = await prisma.role.findMany({ select: { code: true, name: true } });
  console.log('\n=== Available RBAC Roles ===');
  console.table(roles);
}

main().catch(console.error).finally(() => prisma.$disconnect());
