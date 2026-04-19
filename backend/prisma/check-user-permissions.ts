import "dotenv/config";
import { prisma } from "../src/lib/db";

async function checkUserRole() {
  console.log("🔍 Checking Procurement Officer User...\n");

  try {
    const user = await prisma.user.findUnique({
      where: { email: "maldrine@zoho.co.ke" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        permissions: {
          select: {
            permission: {
              select: { code: true, name: true },
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

    if (user.permissions && user.permissions.length > 0) {
      console.log(`📋 Current Permissions (${user.permissions.length}):`);
      user.permissions.forEach((p) => {
        console.log(`   • ${p.permission.code}: ${p.permission.name}`);
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
