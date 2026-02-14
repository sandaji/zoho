/**
 * Permission Service
 * Handles resolving and checking permissions for users based on their roles
 */

import { prisma } from "../../../lib/db";
import { logger } from "../../../lib/logger";
import { AccessScope } from "../../../generated/client.js";

export interface ResolvedPermission {
  code: string;
  scope: AccessScope;
}

const SCOPE_PRIORITY: Record<AccessScope, number> = {
  GLOBAL: 3,
  BRANCH: 2,
  OWN: 1,
};

export class PermissionService {
  /**
   * 🔹 Get all unique permission codes for a user across all assigned roles
   * Used mainly for UI toggles / feature visibility
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    try {
      const rows = await prisma.roleAssignment.findMany({
        where: { userId },
        select: {
          role: {
            select: {
              permissions: {
                select: {
                  permission: {
                    select: { code: true },
                  },
                },
              },
            },
          },
        },
      });

      if (rows.length === 0) return [];

      const permissionSet = new Set<string>();

      for (const assignment of rows) {
        for (const rp of assignment.role.permissions) {
          permissionSet.add(rp.permission.code);
        }
      }

      return [...permissionSet];
    } catch (error) {
      logger.error(
        { userId, error: error as Error },
        "Failed to get user permissions"
      );
      return [];
    }
  }

  /**
   * 🔹 Get all permissions with their MAXIMUM resolved scopes
   * (GLOBAL > BRANCH > OWN)
   */
  static async getUserPermissionsWithScopes(
    userId: string
  ): Promise<ResolvedPermission[]> {
    try {
      const rows = await prisma.roleAssignment.findMany({
        where: { userId },
        select: {
          role: {
            select: {
              permissions: {
                select: {
                  scope: true,
                  permission: {
                    select: { code: true },
                  },
                },
              },
            },
          },
        },
      });

      if (rows.length === 0) return [];

      const scopeMap = new Map<string, AccessScope>();

      for (const assignment of rows) {
        for (const rp of assignment.role.permissions) {
          const code = rp.permission.code;
          const incomingScope = rp.scope as AccessScope;
          const existingScope = scopeMap.get(code);

          if (
            !existingScope ||
            SCOPE_PRIORITY[incomingScope] > SCOPE_PRIORITY[existingScope]
          ) {
            scopeMap.set(code, incomingScope);
          }
        }
      }

      return Array.from(scopeMap.entries()).map(([code, scope]) => ({
        code,
        scope,
      }));
    } catch (error) {
      logger.error(
        { userId, error: error as Error },
        "Failed to get user permissions with scopes"
      );
      return [];
    }
  }

  /**
   * 🔹 Resolve scope for ONE permission
   * Optimized: single DB hit, no array scanning
   */
  static async getResolvedScope(
    userId: string,
    permissionCode: string
  ): Promise<AccessScope | null> {
    try {
      const rows = await prisma.roleAssignment.findMany({
        where: {
          userId,
          role: {
            permissions: {
              some: {
                permission: {
                  code: permissionCode,
                },
              },
            },
          },
        },
        select: {
          role: {
            select: {
              permissions: {
                where: {
                  permission: {
                    code: permissionCode,
                  },
                },
                select: {
                  scope: true,
                },
              },
            },
          },
        },
      });

      if (rows.length === 0) return null;

      let resolvedScope: AccessScope | null = null;

      for (const assignment of rows) {
        for (const rp of assignment.role.permissions) {
          if (
            !resolvedScope ||
            SCOPE_PRIORITY[rp.scope] > SCOPE_PRIORITY[resolvedScope]
          ) {
            resolvedScope = rp.scope;
          }
        }
      }

      return resolvedScope;
    } catch (error) {
      logger.error(
        { userId, permissionCode, error: error as Error },
        "Failed to resolve permission scope"
      );
      return null;
    }
  }

  /**
   * 🔹 Boolean permission check (scope-agnostic)
   * ⚠️ Do NOT use for protected routes
   */
  static async hasPermission(
    userId: string,
    permissionCode: string
  ): Promise<boolean> {
    try {
      const count = await prisma.roleAssignment.count({
        where: {
          userId,
          role: {
            permissions: {
              some: {
                permission: {
                  code: permissionCode,
                },
              },
            },
          },
        },
      });

      return count > 0;
    } catch (error) {
      logger.error(
        { userId, permissionCode, error: error as Error },
        "Failed to check permission"
      );
      return false;
    }
  }
}
