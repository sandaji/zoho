import "dotenv/config";
import { prisma } from "../src/lib/db";

async function fixProcurementPermissions() {
  console.log("🔄 Fixing Procurement Officer Permissions...\n");

  try {
    // Get or create purchasing_officer role
    const role = await prisma.role.upsert({
      where: { code: "purchasing_officer" },
      update: {},
      create: {
        code: "purchasing_officer",
        name: "Purchasing Officer",
        description: "Purchasing operations",
        isSystem: true,
      },
    });
    console.log(`✅ Role: ${role.name} (${role.code})`);

    // Define required permissions for procurement officer
    const requiredPermissions = [
      "purchasing.order.create",
      "purchasing.order.submit",
      "purchasing.order.view_all",
      "purchasing.vendor.view",
      "purchasing.vendor.manage",
    ];

    // Get permission IDs
    const permissions = await prisma.permission.findMany({
      where: { code: { in: requiredPermissions } },
    });

    if (permissions.length === 0) {
      console.error("❌ No permissions found! Run RBAC update first.");
      process.exit(1);
    }

    console.log(`\n📋 Found ${permissions.length} permissions:`);
    permissions.forEach((p) => console.log(`   • ${p.code}: ${p.name}`));

    // Assign permissions to role
    let assignedCount = 0;
    for (const permission of permissions) {
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: { scope: "BRANCH" },
        create: {
          roleId: role.id,
          permissionId: permission.id,
          scope: "BRANCH",
        },
      });
      assignedCount++;
      console.log(`   ✅ ${permission.code}`);
    }

    console.log(
      `\n✅ Assigned ${assignedCount} permissions to Purchasing Officer role`,
    );

    // Verify user has the role
    const usersWithRole = await prisma.user.findMany({
      where: { role: "purchasing_officer" },
      select: { id: true, name: true, email: true, role: true },
    });

    if (usersWithRole.length > 0) {
      console.log(`\n👥 Users with Purchasing Officer role:`);
      usersWithRole.forEach((u) => console.log(`   • ${u.name} (${u.email})`));
      console.log(
        `\n🎉 These users now have access to Purchase Orders & Vendors!`,
      );
    } else {
      console.log(`\n⚠️  No users assigned to Purchasing Officer role yet`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

fixProcurementPermissions();
