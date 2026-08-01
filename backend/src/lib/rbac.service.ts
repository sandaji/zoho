/**
 * RBACService — canonical facade for all permission and role operations.
 *
 * Problem this solves:
 *   Consumers across the codebase import PermissionService from
 *   "modules/auth/service/permission.service" and RbacService from
 *   "modules/rbac/rbac.service" independently — and one controller even
 *   used a mid-method dynamic import() to avoid a circular dep.
 *
 * This facade provides a single stable import path (lib/rbac.service) that
 * re-exports everything callers need.  The underlying PermissionService and
 *RbacService continue to own the actual DB logic.
 *
 * Usage:
 *   import { RBACService } from "../../lib/rbac.service";
 *   await RBACService.hasPermission(userId, "sales.credit_note.approve");
 *   await RBACService.getUserPermissions(userId);
 *   const roles = await new RBACService().listRoles();
 */

import { PermissionService, type ResolvedPermission } from "../modules/auth/service/permission.service";
import { RbacService } from "../modules/rbac/rbac.service";
import { type AccessScope } from "../generated/client";

// Re-export the underlying types so callers only need this one import
export type { ResolvedPermission, AccessScope };
export { PermissionService, RbacService };

/**
 * Static permission helpers — thin pass-throughs to PermissionService.
 * Use these anywhere you need a quick boolean check or a permissions list.
 */
export class RBACService extends RbacService {
  // ── Permission checks (delegate to PermissionService) ──────────────────────

  /**
   * Boolean check: does userId hold permissionCode in any role?
   * Equivalent to `PermissionService.hasPermission(userId, code)`.
   */
  static async hasPermission(userId: string, permissionCode: string): Promise<boolean> {
    return PermissionService.hasPermission(userId, permissionCode);
  }

  /**
   * Get all unique permission codes for a user (UI visibility checks).
   */
  static async getUserPermissions(userId: string): Promise<string[]> {
    return PermissionService.getUserPermissions(userId);
  }

  /**
   * Get all role codes assigned to a user.
   */
  static async getUserRoles(userId: string): Promise<string[]> {
    return PermissionService.getUserRoles(userId);
  }

  /**
   * Get every permission code with its maximum resolved scope.
   */
  static async getUserPermissionsWithScopes(userId: string): Promise<ResolvedPermission[]> {
    return PermissionService.getUserPermissionsWithScopes(userId);
  }

  /**
   * Resolve the effective access scope for one permission on one user.
   * Returns null if the user does not hold the permission at all.
   */
  static async getResolvedScope(userId: string, permissionCode: string): Promise<AccessScope | null> {
    return PermissionService.getResolvedScope(userId, permissionCode);
  }
}
