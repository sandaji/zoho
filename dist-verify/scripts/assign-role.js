"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// backend/scripts/assign-role.ts
const db_1 = require("../src/lib/db");
const logger_1 = require("../src/lib/logger");
async function assignRole() {
    const userId = process.argv[2];
    const roleCode = process.argv[3];
    if (!userId || !roleCode) {
        console.error('Usage: tsx backend/scripts/assign-role.ts <userId> <roleCode>');
        process.exit(1);
    }
    logger_1.logger.info(`Assigning role '${roleCode}' to user '${userId}'...`);
    try {
        const user = await db_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            logger_1.logger.error(`User with ID '${userId}' not found.`);
            process.exit(1);
        }
        const roleToAssign = await db_1.prisma.role.findUnique({ where: { code: roleCode } });
        if (!roleToAssign) {
            logger_1.logger.error(`Role with code '${roleCode}' not found.`);
            process.exit(1);
        }
        const existingAssignment = await db_1.prisma.roleAssignment.findUnique({
            where: {
                userId_roleId: {
                    userId: user.id,
                    roleId: roleToAssign.id,
                },
            },
        });
        if (existingAssignment) {
            logger_1.logger.warn(`User '${userId}' already has role '${roleCode}'. No action taken.`);
            return;
        }
        await db_1.prisma.roleAssignment.create({
            data: {
                userId: user.id,
                roleId: roleToAssign.id,
            },
        });
        logger_1.logger.info(`Successfully assigned role '${roleCode}' to user '${userId}'.`);
    }
    catch (error) {
        logger_1.logger.error('Failed to assign role:', error);
        process.exit(1);
    }
    finally {
        await db_1.prisma.$disconnect();
    }
}
assignRole();
