import { prisma } from "../../../lib/db";
import { ROLE_BLUEPRINTS } from "../../../lib/rbac-config";
import { logger } from "../../../lib/logger";
import { AccessScope } from "../../../generated/client";

/**
 * RbacManagementService - Scalable Role & Permission Management
 * 
 * Provides utilities to manage complex permission sets using high-level
 * blueprints and packs, reducing the risk of permission explosion.
 */
export class RbacManagementService {
  /**
   * Synchronizes a database role with a high-level Role Blueprint.
   * 
   * @param roleCode - The code of the role in the database (e.g., 'branch_manager')
   * @param blueprintKey - The key of the blueprint in ROLE_BLUEPRINTS
   * @param defaultScope - The default AccessScope to apply to all permissions in the blueprint
   */
  static async syncRoleWithBlueprint(
    roleCode: string, 
    blueprintKey: keyof typeof ROLE_BLUEPRINTS,
    defaultScope: AccessScope = 'BRANCH'
  ) {
    const blueprint = ROLE_BLUEPRINTS[blueprintKey];
    
    // Flatten all permission codes from packs and individual entries
    const allPermissionCodes = new Set<string>();
    blueprint.packs.forEach(pack => pack.forEach(code => allPermissionCodes.add(code)));
    blueprint.individual.forEach(code => allPermissionCodes.add(code));

    const permissionCodes = Array.from(allPermissionCodes);

    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Ensure the role exists
        const role = await tx.role.findUnique({ 
          where: { code: roleCode } 
        });

        if (!role) {
          throw new Error(`Cannot sync: Role with code "${roleCode}" not found in database.`);
        }

        // 2. Fetch all valid permissions from the database
        const validPermissions = await tx.permission.findMany({
          where: { code: { in: permissionCodes } },
          select: { id: true, code: true }
        });

        const foundCodes = validPermissions.map(p => p.code);
        const missingCodes = permissionCodes.filter(c => !foundCodes.includes(c));
        
        if (missingCodes.length > 0) {
          logger.warn(
            { roleCode, missingCodes }, 
            'Some blueprint permissions were skipped because they do not exist in the database'
          );
        }

        // 3. Remove existing permission assignments for this role
        // This ensures the role matches the blueprint EXACTLY (declarative approach)
        await tx.rolePermission.deleteMany({ 
          where: { roleId: role.id } 
        });

        // 4. Create new assignments based on the blueprint
        if (validPermissions.length > 0) {
          await tx.rolePermission.createMany({
            data: validPermissions.map(p => ({
              roleId: role.id,
              permissionId: p.id,
              scope: defaultScope
            }))
          });
        }

        logger.info(
          { roleCode, blueprintKey, assignedCount: validPermissions.length }, 
          '✅ Role successfully synchronized with blueprint'
        );

        return {
          success: true,
          role: roleCode,
          blueprint: blueprintKey,
          permissionsSynced: validPermissions.length,
          missingInDb: missingCodes
        };
      });
    } catch (error) {
      logger.error({ roleCode, blueprintKey, error }, '❌ Failed to sync role with blueprint');
      throw error;
    }
  }

  /**
   * Bootstrap system roles from blueprints.
   * Useful during initialization or post-deployment migrations.
   */
  static async bootstrapSystemRoles() {
    logger.info('🚀 Bootstrapping system roles from blueprints...');
    
    const rolesToSync: Array<{ code: string, blueprint: keyof typeof ROLE_BLUEPRINTS }> = [
      { code: 'branch_manager', blueprint: 'BRANCH_MANAGER' },
      { code: 'warehouse_staff', blueprint: 'WAREHOUSE_MANAGER' }, // Mapping warehouse_staff code to manager blueprint
    ];

    for (const item of rolesToSync) {
      await this.syncRoleWithBlueprint(item.code, item.blueprint);
    }

    logger.info('✅ System roles bootstrap complete');
  }
}
