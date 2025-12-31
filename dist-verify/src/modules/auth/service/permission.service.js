"use strict";
/**
 * Permission Service
 * Handles resolving and checking permissions for users based on their roles
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermissionService = void 0;
const db_1 = require("../../../lib/db");
const logger_1 = require("../../../lib/logger");
const SCOPE_PRIORITY = {
    GLOBAL: 3,
    BRANCH: 2,
    OWN: 1,
};
class PermissionService {
    /**
     * 🔹 Get all unique permission codes for a user across all assigned roles
     * Used mainly for UI toggles / feature visibility
     */
    static async getUserPermissions(userId) {
        try {
            const rows = await db_1.prisma.roleAssignment.findMany({
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
            if (rows.length === 0)
                return [];
            const permissionSet = new Set();
            for (const assignment of rows) {
                for (const rp of assignment.role.permissions) {
                    permissionSet.add(rp.permission.code);
                }
            }
            return [...permissionSet];
        }
        catch (error) {
            logger_1.logger.error({ userId, error: error }, "Failed to get user permissions");
            return [];
        }
    }
    /**
     * 🔹 Get all permissions with their MAXIMUM resolved scopes
     * (GLOBAL > BRANCH > OWN)
     */
    static async getUserPermissionsWithScopes(userId) {
        try {
            const rows = await db_1.prisma.roleAssignment.findMany({
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
            if (rows.length === 0)
                return [];
            const scopeMap = new Map();
            for (const assignment of rows) {
                for (const rp of assignment.role.permissions) {
                    const code = rp.permission.code;
                    const incomingScope = rp.scope;
                    const existingScope = scopeMap.get(code);
                    if (!existingScope ||
                        SCOPE_PRIORITY[incomingScope] > SCOPE_PRIORITY[existingScope]) {
                        scopeMap.set(code, incomingScope);
                    }
                }
            }
            return Array.from(scopeMap.entries()).map(([code, scope]) => ({
                code,
                scope,
            }));
        }
        catch (error) {
            logger_1.logger.error({ userId, error: error }, "Failed to get user permissions with scopes");
            return [];
        }
    }
    /**
     * 🔹 Resolve scope for ONE permission
     * Optimized: single DB hit, no array scanning
     */
    static async getResolvedScope(userId, permissionCode) {
        try {
            const rows = await db_1.prisma.roleAssignment.findMany({
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
            if (rows.length === 0)
                return null;
            let resolvedScope = null;
            for (const assignment of rows) {
                for (const rp of assignment.role.permissions) {
                    if (!resolvedScope ||
                        SCOPE_PRIORITY[rp.scope] > SCOPE_PRIORITY[resolvedScope]) {
                        resolvedScope = rp.scope;
                    }
                }
            }
            return resolvedScope;
        }
        catch (error) {
            logger_1.logger.error({ userId, permissionCode, error: error }, "Failed to resolve permission scope");
            return null;
        }
    }
    /**
     * 🔹 Boolean permission check (scope-agnostic)
     * ⚠️ Do NOT use for protected routes
     */
    static async hasPermission(userId, permissionCode) {
        try {
            const count = await db_1.prisma.roleAssignment.count({
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
        }
        catch (error) {
            logger_1.logger.error({ userId, permissionCode, error: error }, "Failed to check permission");
            return false;
        }
    }
}
exports.PermissionService = PermissionService;
