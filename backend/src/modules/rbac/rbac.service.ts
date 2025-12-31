import { prisma } from "../../lib/db";
import { notFoundError, validationError, forbiddenError } from "../../lib/errors";
import { logger } from "../../lib/logger";

export class RbacService {
  /**
   * List all roles with their permission counts and user counts
   */
  async listRoles() {
    return prisma.role.findMany({
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
  async getRoleById(id: string) {
    const role = await prisma.role.findUnique({
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
      throw notFoundError("Role", id);
    }

    return role;
  }

  /**
   * Create a new role
   */
  async createRole(data: { name: string; code: string; description?: string }) {
    try {
      return await prisma.role.create({
        data,
      });
    } catch (error: any) {
      if (error.code === "P2002") {
        throw validationError("Role with this name or code already exists");
      }
      logger.error({ data, error }, "Failed to create role");
      throw error;
    }
  }

  /**
   * Update role details
   */
  async updateRole(id: string, data: { name?: string; description?: string }) {
    return prisma.role.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a role
   */
  async deleteRole(id: string) {
    // Check if it's a protected role? (e.g. admin)
    const role = await prisma.role.findUnique({ where: { id } });
    if (role?.name.toLowerCase() === "admin" || role?.code.toLowerCase() === "admin") {
      throw forbiddenError("Cannot delete the admin role");
    }

    return prisma.role.delete({
      where: { id },
    });
  }

  /**
   * List all permissions grouped by module
   */
  async listPermissions() {
    return prisma.module.findMany({
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
  async syncRolePermissions(roleId: string, permissionIds: string[]) {
    return prisma.$transaction(async (tx) => {
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
  async getUserRoles(userId: string) {
    return prisma.roleAssignment.findMany({
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
  async assignUserRoles(userId: string, roleIds: string[]) {
    return prisma.$transaction(async (tx) => {
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
