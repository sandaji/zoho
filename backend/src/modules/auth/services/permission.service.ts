/**
 * Permission Service
 * Handles resolving and checking permissions for users based on their roles
 */

import { prisma } from "@core/database/db";
import { logger } from "@core/utils/logger";
import { AccessScope } from "../../../generated";

export interface ResolvedPermission {
  code: string;
  scope: AccessScope;
}

const SCOPE_PRIORITY: Record<AccessScope, number> = {
  GLOBAL: 3,
  BRANCH: 2,
  OWN: 1,
};

// Earlier seeded roles use `procurement.*`; Purchasing routes now check
// `purchasing.*`. Treat the former grants as aliases for their direct
// equivalents so existing role assignments keep working without widening
// access to unrelated purchasing actions.
const PERMISSION_ALIASES: Record<string, string[]> = {
  "purchasing.vendor.view": ["procurement.vendor.view"],
  "purchasing.vendor.manage": ["procurement.vendor.manage"],
  "purchasing.order.create": ["procurement.order.create"],
  "purchasing.order.view_all": ["procurement.order.view"],
  "purchasing.order.approve_standard": ["procurement.order.approve"],
};

function permissionCodesFor(code: string): string[] {
  const aliases = PERMISSION_ALIASES[code] ?? [];
  const canonical = Object.entries(PERMISSION_ALIASES)
    .filter(([, legacyCodes]) => legacyCodes.includes(code))
    .map(([canonicalCode]) => canonicalCode);

  return [...new Set([code, ...aliases, ...canonical])];
}

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
          for (const alias of permissionCodesFor(rp.permission.code)) {
            permissionSet.add(alias);
          }
        }
      }

      return [...permissionSet];
    } catch (error) {
      logger.error(
        { userId, error: error as Error },
        "Failed to get user permissions",
      );
      return [];
    }
  }

  /**
   * 🔹 Get all role codes assigned to a user
   */
  static async getUserRoles(userId: string): Promise<string[]> {
    try {
      const rows = await prisma.roleAssignment.findMany({
        where: { userId },
        select: {
          role: {
            select: { code: true },
          },
        },
      });

      return rows.map((r) => r.role.code);
    } catch (error) {
      logger.error(
        { userId, error: error as Error },
        "Failed to get user roles",
      );
      return [];
    }
  }

  /**
   * 🔹 Get all permissions with their MAXIMUM resolved scopes
   * (GLOBAL > BRANCH > OWN)
   */
  static async getUserPermissionsWithScopes(
    userId: string,
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
        "Failed to get user permissions with scopes",
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
    permissionCode: string,
  ): Promise<AccessScope | null> {
    try {
      const rows = await prisma.roleAssignment.findMany({
        where: {
          userId,
          role: {
            permissions: {
              some: {
                permission: {
                  code: { in: permissionCodesFor(permissionCode) },
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
                    code: { in: permissionCodesFor(permissionCode) },
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
        "Failed to resolve permission scope",
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
    permissionCode: string,
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
        "Failed to check permission",
      );
      return false;
    }
  }
}
