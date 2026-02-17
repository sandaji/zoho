// backend/src/middleware/rbac.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../modules/auth/service/permission.service';
import { AppError, ErrorCode } from '../lib/errors';

/**
 * Middleware to enforce a specific permission
 * @param permissionCode - The code of the permission to check (e.g., 'finance.invoice.create')
 */
export const requirePermission = (permissionCode: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User not authenticated'
        );
      }

      // Admin users have full access to all endpoints
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        // Grant GLOBAL scope to admin users
        next();
        return;
      }

      const userId = req.user.userId;

      // Resolve effective scope for this permission
      const scope = await PermissionService.getResolvedScope(userId, permissionCode);

      if (!scope) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          `Permission denied: ${permissionCode}`,
          { requiredPermission: permissionCode }
        );
      }

      // Record-level isolation: Inject resolved scopes into request object
      if (scope === 'BRANCH') {
        if (!req.user.branchId) {
          // If user is supposed to be restricted to a branch but doesn't have one,
          // this is a configuration error or they are a global user with wrong role.
          // For safety, we block if they have no branch context.
          throw new AppError(ErrorCode.FORBIDDEN, 403, 'User must belong to a branch for branch-scoped actions');
        }
        req.authorizedBranchIds = [req.user.branchId];
      } else if (scope === 'OWN') {
        req.onlyOwnedRecords = true;
      }
      // If scope is GLOBAL, we don't inject any restrictions (authorizedBranchIds/onlyOwnedRecords remain undefined)

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware to check if user has ANY of the provided permissions
 */
export const hasAnyPermission = (permissionCodes: string[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(
          ErrorCode.UNAUTHORIZED,
          401,
          'User not authenticated'
        );
      }

      // Admin users have full access to all endpoints
      if (req.user.role === 'admin' || req.user.role === 'super_admin') {
        next();
        return;
      }

      const userId = req.user.userId;

      const userPermissions = await PermissionService.getUserPermissions(userId);

      const hasAccess = permissionCodes.some(code => userPermissions.includes(code));

      if (!hasAccess) {
        throw new AppError(
          ErrorCode.FORBIDDEN,
          403,
          'Insufficient permissions',
          { requiredAny: permissionCodes }
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
