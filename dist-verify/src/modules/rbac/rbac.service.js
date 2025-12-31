"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RbacService = void 0;
const db_1 = require("../../lib/db");
const errors_1 = require("../../lib/errors");
const logger_1 = require("../../lib/logger");
class RbacService {
    /**
     * List all roles with their permission counts and user counts
     */
    async listRoles() {
        return db_1.prisma.role.findMany({
            include: {
                _count: {
                    select: {
                        permissions: true,
                        users: true,
                    },
                },
            },
            orderBy: { name: "asc" },
        });
    }
    /**
     * Get role details including permissions
     */
    async getRoleById(id) {
        const role = await db_1.prisma.role.findUnique({
            where: { id },
            include: {
                permissions: {
                    include: {
                        permission: {
                            include: {
                                module: true,
                            },
                        },
                    },
                },
            },
        });
        if (!role) {
            throw (0, errors_1.notFoundError)("Role", id);
        }
        return role;
    }
    /**
     * Create a new role
     */
    async createRole(data) {
        try {
            return await db_1.prisma.role.create({
                data,
            });
        }
        catch (error) {
            if (error.code === "P2002") {
                throw (0, errors_1.validationError)("Role with this name or code already exists");
            }
            logger_1.logger.error({ data, error }, "Failed to create role");
            throw error;
        }
    }
    /**
     * Update role details
     */
    async updateRole(id, data) {
        return db_1.prisma.role.update({
            where: { id },
            data,
        });
    }
    /**
     * Delete a role
     */
    async deleteRole(id) {
        // Check if it's a protected role? (e.g. admin)
        const role = await db_1.prisma.role.findUnique({ where: { id } });
        if (role?.name.toLowerCase() === "admin" || role?.code.toLowerCase() === "admin") {
            throw (0, errors_1.forbiddenError)("Cannot delete the admin role");
        }
        return db_1.prisma.role.delete({
            where: { id },
        });
    }
    /**
     * List all permissions grouped by module
     */
    async listPermissions() {
        return db_1.prisma.module.findMany({
            include: {
                permissions: true,
            },
            orderBy: { name: "asc" },
        });
    }
    /**
     * Sync permissions for a role
     * Replaces existing permissions with the new list
     */
    async syncRolePermissions(roleId, permissionIds) {
        return db_1.prisma.$transaction(async (tx) => {
            // 1. Remove all existing permissions for this role
            await tx.rolePermission.deleteMany({
                where: { roleId },
            });
            // 2. Add new permissions
            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map((permissionId) => ({
                        roleId,
                        permissionId,
                    })),
                });
            }
            return this.getRoleById(roleId);
        });
    }
    /**
     * Get roles assigned to a user
     */
    async getUserRoles(userId) {
        return db_1.prisma.roleAssignment.findMany({
            where: { userId },
            include: {
                role: true,
            },
        });
    }
    /**
     * Assign roles to a user
     * Replaces existing roles
     */
    async assignUserRoles(userId, roleIds) {
        return db_1.prisma.$transaction(async (tx) => {
            // 1. Remove existing assignments
            await tx.roleAssignment.deleteMany({
                where: { userId },
            });
            // 2. Add new assignments
            if (roleIds.length > 0) {
                await tx.roleAssignment.createMany({
                    data: roleIds.map((roleId) => ({
                        userId,
                        roleId,
                    })),
                });
            }
            return tx.roleAssignment.findMany({
                where: { userId },
                include: { role: true },
            });
        });
    }
}
exports.RbacService = RbacService;
