/**
 * Scoped Query Helper
 * Utility for building branch-scoped Prisma `where` clauses.
 *
 * Usage in service layers:
 *   const scope = buildBranchScope(req);
 *   const items = await prisma.someModel.findMany({ where: { ...scope, ...otherFilters } });
 *
 * How it works:
 *   - The RBAC middleware (`requirePermission`) resolves the user's scope for a permission.
 *   - If scope === 'BRANCH', it sets `req.authorizedBranchIds = [user.branchId]`.
 *   - If scope === 'GLOBAL' (admin, HR, finance), NO restriction is set.
 *   - This helper reads those values and returns the appropriate Prisma `where` fragment.
 *
 * IMPORTANT: HR and FINANCE roles with GLOBAL scope are NOT filtered.
 * Only BRANCH-scoped roles get the branchId filter applied.
 */

import { Request } from "express";

/**
 * Build a branch scope filter for Prisma queries.
 * Returns `{ branchId: <id> }` for branch-scoped users, or `{}` for global users.
 */
export function buildBranchScope(req: Request): { branchId?: string } {
  // If the RBAC middleware injected authorized branch IDs, use the first one
  if (req.authorizedBranchIds && req.authorizedBranchIds.length > 0) {
    return { branchId: req.authorizedBranchIds[0] };
  }

  // No restriction — user has GLOBAL scope or admin bypass
  return {};
}

/**
 * Build an "own records" scope filter for Prisma queries.
 * Returns `{ createdById: userId }` for OWN-scoped users, or `{}` otherwise.
 */
export function buildOwnScope(req: Request): { createdById?: string } {
  if (req.onlyOwnedRecords && req.user?.userId) {
    return { createdById: req.user.userId };
  }

  return {};
}

/**
 * Combined scope builder — merges branch AND own-record scopes.
 * Use this when a model has both `branchId` and `createdById` columns.
 */
export function buildFullScope(req: Request): {
  branchId?: string;
  createdById?: string;
} {
  return {
    ...buildBranchScope(req),
    ...buildOwnScope(req),
  };
}
