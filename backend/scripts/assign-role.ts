// backend/scripts/assign-role.ts
import { prisma } from '../src/lib/db';
import { logger } from '../src/lib/logger';

async function assignRole() {
  const userId = process.argv[2];
  const roleCode = process.argv[3];

  if (!userId || !roleCode) {
    console.error('Usage: tsx backend/scripts/assign-role.ts <userId> <roleCode>');
    process.exit(1);
  }

  logger.info(`Assigning role '${roleCode}' to user '${userId}'...`);

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      logger.error(`User with ID '${userId}' not found.`);
      process.exit(1);
    }

    const roleToAssign = await prisma.role.findUnique({ where: { code: roleCode } });
    if (!roleToAssign) {
      logger.error(`Role with code '${roleCode}' not found.`);
      process.exit(1);
    }

    const existingAssignment = await prisma.roleAssignment.findUnique({
      where: {
        userId_roleId: {
          userId: user.id,
          roleId: roleToAssign.id,
        },
      },
    });

    if (existingAssignment) {
      logger.warn(`User '${userId}' already has role '${roleCode}'. No action taken.`);
      return;
    }

    await prisma.roleAssignment.create({
      data: {
        userId: user.id,
        roleId: roleToAssign.id,
      },
    });

    logger.info(`Successfully assigned role '${roleCode}' to user '${userId}'.`);
  } catch (error) {
    logger.error('Failed to assign role:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

assignRole();
