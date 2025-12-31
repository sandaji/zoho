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
 * Get the appropriate dashboard route based on user role
 * @param role - The user's role
 * @returns The dashboard route path
 */
export function getRoleDashboardRoute(role: UserRole | string): string {
  return ROLE_DASHBOARD_ROUTES[role] || "/dashboard";
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
 */
export const rolePermissions = {
  canManageBranches: (role: string) => ["admin"].includes(role),
  canManageEmployees: (role: string) => ["admin", "hr", "branch_manager"].includes(role),
  canViewFinance: (role: string) => ["admin", "accountant", "manager", "branch_manager"].includes(role),
  canManageFinance: (role: string) => ["admin", "accountant"].includes(role),
  canAccessPOS: (role: string) => ["admin", "cashier", "manager", "branch_manager"].includes(role),
  canManageInventory: (role: string) => ["admin", "warehouse_staff", "manager", "branch_manager"].includes(role),
  canViewDeliveries: (role: string) => ["admin", "driver", "manager", "branch_manager"].includes(role),
  canManageDeliveries: (role: string) => ["admin", "manager", "branch_manager"].includes(role),
  canAccessAdminPanel: (role: string) => ["admin"].includes(role),
  canViewReports: (role: string) => ["admin", "manager", "branch_manager", "accountant"].includes(role),
  canManagePayroll: (role: string) => ["admin", "hr", "accountant"].includes(role),
};

/**
 * Get all accessible routes for a role
 * @param role - The user's role
 * @returns Array of accessible route paths
 */
export function getAccessibleRoutes(role: string): string[] {
  const routes = ["/dashboard"]; // Everyone can access main dashboard

  if (rolePermissions.canAccessAdminPanel(role)) {
    routes.push("/dashboard/admin");
  }

  if (rolePermissions.canManageBranches(role)) {
    routes.push("/dashboard/branches");
  }

  if (rolePermissions.canManageEmployees(role)) {
    routes.push("/dashboard/employees");
  }

  if (rolePermissions.canViewFinance(role)) {
    routes.push("/dashboard/finance");
  }

  if (rolePermissions.canAccessPOS(role)) {
    routes.push("/dashboard/pos");
  }

  if (rolePermissions.canManageInventory(role)) {
    routes.push("/dashboard/inventory");
  }

  if (rolePermissions.canViewDeliveries(role)) {
    routes.push("/dashboard/fleet");
  }

  if (rolePermissions.canManagePayroll(role)) {
    routes.push("/dashboard/payroll");
  }

  if (role === "branch_manager") {
    routes.push("/dashboard/branch/manager");
  }

  return routes;
}

/**
 * Check if user can access a specific route
 * @param role - The user's role
 * @param path - The route path to check
 * @returns Boolean indicating access permission
 */
export function canAccessRoute(role: string, path: string): boolean {
  const accessibleRoutes = getAccessibleRoutes(role);
  return accessibleRoutes.some(route => path.startsWith(route));
}
