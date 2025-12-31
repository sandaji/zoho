"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasAnyPermission = exports.requirePermission = void 0;
const permission_service_1 = require("../modules/auth/service/permission.service");
const errors_1 = require("../lib/errors");
/**
 * Middleware to enforce a specific permission
 * @param permissionCode - The code of the permission to check (e.g., 'finance.invoice.create')
 */
const requirePermission = (permissionCode) => {
    return async (req, _res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, 'User not authenticated');
            }
            const userId = req.user.userId;
            // Super admin check could be added here
            // Resolve effective scope for this permission
            const scope = await permission_service_1.PermissionService.getResolvedScope(userId, permissionCode);
            if (!scope) {
                throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, `Permission denied: ${permissionCode}`, { requiredPermission: permissionCode });
            }
            // Record-level isolation: Inject resolved scopes into request object
            if (scope === 'BRANCH') {
                if (!req.user.branchId) {
                    // If user is supposed to be restricted to a branch but doesn't have one,
                    // this is a configuration error or they are a global user with wrong role.
                    // For safety, we block if they have no branch context.
                    throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'User must belong to a branch for branch-scoped actions');
                }
                req.authorizedBranchIds = [req.user.branchId];
            }
            else if (scope === 'OWN') {
                req.onlyOwnedRecords = true;
            }
            // If scope is GLOBAL, we don't inject any restrictions (authorizedBranchIds/onlyOwnedRecords remain undefined)
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.requirePermission = requirePermission;
/**
 * Middleware to check if user has ANY of the provided permissions
 */
const hasAnyPermission = (permissionCodes) => {
    return async (req, _res, next) => {
        try {
            if (!req.user) {
                throw new errors_1.AppError(errors_1.ErrorCode.UNAUTHORIZED, 401, 'User not authenticated');
            }
            const userId = req.user.userId;
            const userPermissions = await permission_service_1.PermissionService.getUserPermissions(userId);
            const hasAccess = permissionCodes.some(code => userPermissions.includes(code));
            if (!hasAccess) {
                throw new errors_1.AppError(errors_1.ErrorCode.FORBIDDEN, 403, 'Insufficient permissions', { requiredAny: permissionCodes });
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.hasAnyPermission = hasAnyPermission;
