/**
 * Role-based routing utilities
 * Provides consistent navigation paths for different user roles
 */

import { UserRole } from "./auth-context";

/**
 * Role-based dashboard routes mapping
 */
export const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  admin: "/dashboard/admin",
  branch_manager: "/dashboard/branch/manager",
  manager: "/dashboard",
  accountant: "/dashboard/finance",
  hr: "/dashboard/employees",
  cashier: "/dashboard/pos",
  warehouse_staff: "/dashboard/inventory",
  driver: "/dashboard/fleet",
  user: "/dashboard", // fallback for generic users
};

/**
 * Role priority for resolving default dashboard
 * Higher priority comes first
 */
export const ROLE_PRIORITY = [
  "admin",
  "branch_manager",
  "manager",
  "accountant",
  "hr",
  "cashier",
  "warehouse_staff",
  "driver",
  "user",
];

/**
 * Get the appropriate dashboard route based on user roles
 * @param roles - The user's role(s)
 * @returns The dashboard route path
 */
export function getRoleDashboardRoute(roles: UserRole | string | string[]): string {
  const roleArray = Array.isArray(roles) ? roles : [roles];

  // Find the highest priority role that the user has
  const primaryRole = ROLE_PRIORITY.find((r) => roleArray.includes(r)) || roleArray[0] || "user";

  return ROLE_DASHBOARD_ROUTES[primaryRole] || "/dashboard";
}

/**
 * Role display names for UI
 */
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  admin: "Administrator",
  branch_manager: "Branch Manager",
  manager: "Manager",
  accountant: "Accountant",
  hr: "HR Manager",
  cashier: "Cashier",
  warehouse_staff: "Warehouse Staff",
  driver: "Driver",
  user: "User",
  // Add fallback for composed roles if needed
};

/**
 * Get display name for a role
 * @param role - The user's role
 * @returns Formatted role name
 */
export function getRoleDisplayName(role: UserRole | string): string {
  return ROLE_DISPLAY_NAMES[role] || role;
}

/**
 * Check if a role has access to a specific feature
 * Helper function to check if ANY of the user's roles allow access
 */
const checkRoleAccess = (allowedRoles: string[], userRoles: string[]) => {
  return userRoles.some(role => allowedRoles.includes(role));
};

export const rolePermissions = {
  canManageBranches: (roles: string | string[]) => checkRoleAccess(["admin"], Array.isArray(roles) ? roles : [roles]),
  canManageEmployees: (roles: string | string[]) => checkRoleAccess(["admin", "hr", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canViewFinance: (roles: string | string[]) => checkRoleAccess(["admin", "accountant", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canManageFinance: (roles: string | string[]) => checkRoleAccess(["admin", "accountant"], Array.isArray(roles) ? roles : [roles]),
  canAccessPOS: (roles: string | string[]) => checkRoleAccess(["admin", "cashier", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canManageInventory: (roles: string | string[]) => checkRoleAccess(["admin", "warehouse_staff", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canViewDeliveries: (roles: string | string[]) => checkRoleAccess(["admin", "driver", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canManageDeliveries: (roles: string | string[]) => checkRoleAccess(["admin", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canAccessAdminPanel: (roles: string | string[]) => checkRoleAccess(["admin"], Array.isArray(roles) ? roles : [roles]),
  canViewReports: (roles: string | string[]) => checkRoleAccess(["admin", "manager", "branch_manager", "accountant"], Array.isArray(roles) ? roles : [roles]),
  canManagePayroll: (roles: string | string[]) => checkRoleAccess(["admin", "hr", "accountant"], Array.isArray(roles) ? roles : [roles]),
};

/**
 * Get all accessible routes for a user based on their roles
 * @param roles - The user's role(s)
 * @returns Array of accessible route paths
 */
export function getAccessibleRoutes(roles: string | string[]): string[] {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  const routes = new Set(["/dashboard"]); // Everyone can access main dashboard

  if (rolePermissions.canAccessAdminPanel(roleArray)) {
    routes.add("/dashboard/admin");
  }

  if (rolePermissions.canManageBranches(roleArray)) {
    routes.add("/dashboard/branches");
  }

  if (rolePermissions.canManageEmployees(roleArray)) {
    routes.add("/dashboard/employees");
  }

  if (rolePermissions.canViewFinance(roleArray)) {
    routes.add("/dashboard/finance");
  }

  if (rolePermissions.canAccessPOS(roleArray)) {
    routes.add("/dashboard/pos");
  }

  if (rolePermissions.canManageInventory(roleArray)) {
    routes.add("/dashboard/inventory");
  }

  if (rolePermissions.canViewDeliveries(roleArray)) {
    routes.add("/dashboard/fleet");
  }

  if (rolePermissions.canManagePayroll(roleArray)) {
    routes.add("/dashboard/payroll");
  }

  if (roleArray.includes("branch_manager")) {
    routes.add("/dashboard/branch/manager");
  }

  return Array.from(routes);
}

/**
 * Check if user can access a specific route
 * @param roles - The user's role(s)
 * @param path - The route path to check
 * @returns Boolean indicating access permission
 */
export function canAccessRoute(roles: string | string[], path: string): boolean {
  const accessibleRoutes = getAccessibleRoutes(roles);
  return accessibleRoutes.some(route => path.startsWith(route));
}
