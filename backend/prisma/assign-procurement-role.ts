import "dotenv/config";
import { prisma } from "../src/lib/db";

async function assignProcurementRole() {
  console.log("🔄 Assigning Purchasing Officer Role to User...\n");

  try {
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: "maldrine@zoho.co.ke" },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!user) {
      console.log("❌ User not found with email: maldrine@zoho.co.ke");
      process.exit(1);
    }

    console.log(`✅ Found User: ${user.name} (${user.email})`);
    console.log(`   Current role: ${user.role}\n`);

    // Get the purchasing_officer role
    const role = await prisma.role.findUnique({
      where: { code: "purchasing_officer" },
      select: { id: true, name: true, code: true },
    });

    if (!role) {
      console.log('❌ Role "purchasing_officer" not found!');
      console.log(
        "   Make sure to run: npx tsx prisma/fix-procurement-permissions.ts",
      );
      process.exit(1);
    }

    console.log(`✅ Found Role: ${role.name} (${role.code})\n`);

    // Check if user already has this role
    const existingAssignment = await prisma.roleAssignment.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: role.id,
        },
      },
    });

    if (existingAssignment) {
      console.log("ℹ️  User already has this role assigned");
    } else {
      // Assign the role
      await prisma.roleAssignment.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });
      console.log(`✅ Assigned Purchasing Officer role to ${user.name}`);
    }

    // Verify permissions
    const assignments = await prisma.roleAssignment.findMany({
      where: { userId: user.id },
      include: {
        role: {
          include: {
            permissions: {
              include: { permission: { select: { code: true, name: true } } },
            },
          },
        },
      },
    });

    console.log(`\n👤 User Roles & Permissions (${assignments.length}):`);
    let totalPerms = 0;
    for (const assignment of assignments) {
      const permCount = assignment.role.permissions.length;
      totalPerms += permCount;
      console.log(`\n   📋 Role: ${assignment.role.name}`);
      console.log(`      Permissions: ${permCount}`);
      if (permCount > 0) {
        assignment.role.permissions.forEach((rp) => {
          console.log(`      ✓ ${rp.permission.code}`);
        });
      }
    }

    console.log(`\n🎉 Total Permissions: ${totalPerms}`);
    console.log(`✅ User can now access Purchasing Module!`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

assignProcurementRole();
