import "dotenv/config";
import { prisma } from "../../src/core/database/db";

async function checkUserRole() {
  console.log("🔍 Checking Procurement Officer User...\n");

  try {
    const user = await prisma.user.findUnique({
      where: { email: "maldrine@swiftpos.co.ke" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        roles: {
          select: {
            role: {
              select: {
                code: true,
                permissions: {
                  select: {
                    permission: {
                      select: { code: true, name: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user) {
      console.log("❌ User not found");
      process.exit(1);
    }

    console.log(`✅ Found User:`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Role: ${user.role || "None"}\n`);

    // Permissions live on roles (User -> RoleAssignment -> Role -> RolePermission
    // -> Permission); flatten and de-duplicate across all assigned roles.
    const permissions = Array.from(
      new Map(
        user.roles
          .flatMap((ra) => ra.role.permissions)
          .map((rp) => [rp.permission.code, rp.permission] as const),
      ).values(),
    );

    if (permissions.length > 0) {
      console.log(`📋 Current Permissions (${permissions.length}):`);
      permissions.forEach((p) => {
        console.log(`   • ${p.code}: ${p.name}`);
      });
    } else {
      console.log("⚠️  No permissions assigned");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUserRole();
