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
  super_admin: "/dashboard/admin", // super_admin has same access as admin
  branch_manager: "/dashboard/branch/manager",
  manager: "/dashboard", // head-office Manager: no dedicated dashboard yet
  accountant: "/dashboard/finance",
  // Finance tiers: head-office finance officer and each branch's head accountant
  finance_manager: "/dashboard/finance",
  branch_finance_manager: "/dashboard/finance",
  senior_accountant: "/dashboard/finance",
  junior_accountant: "/dashboard/finance",
  director: "/dashboard/finance",
  hr: "/dashboard/employees",
  hr_manager: "/dashboard/employees",
  hr_officer: "/dashboard/employees",
  cashier: "/dashboard/pos",
  warehouse_staff: "/dashboard/inventory",
  driver: "/dashboard/fleet",
  procurement: "/dashboard/purchasing",
  procurement_officer: "/dashboard/purchasing",
  user: "/dashboard", // fallback for generic users
  // Seeded roles (see backend/scripts/maintenance/update-rbac.ts)
  erp_admin: "/dashboard/admin",
  ceo: "/dashboard/executive",
  auditor: "/dashboard/audit/findings",
  sales_manager: "/dashboard/executive?view=sales",
  sales_rep: "/dashboard/pos",
  warehouse_manager: "/dashboard/executive?view=inventory",
  inventory_manager: "/dashboard/executive?view=inventory",
  store_clerk: "/dashboard/inventory",
  purchasing_manager: "/dashboard/purchasing",
  purchasing_officer: "/dashboard/purchasing",
  petty_cash_custodian: "/dashboard/finance",
  it_support: "/dashboard/admin",
};

/**
 * Role priority for resolving default dashboard
 * Higher priority comes first
 */
export const ROLE_PRIORITY = [
  "super_admin",
  "admin",
  "erp_admin",
  "ceo",
  "auditor",
  "inventory_manager",
  "warehouse_manager",
  "sales_manager",
  "purchasing_manager",
  "purchasing_officer",
  "sales_rep",
  "store_clerk",
  "petty_cash_custodian",
  "it_support",
  "branch_manager",
  "manager",
  "finance_manager",
  "branch_finance_manager",
  "director",
  "senior_accountant",
  "junior_accountant",
  "accountant",
  "procurement_officer",
  "procurement",
  "hr_manager",
  "hr",
  "hr_officer",
  "cashier",
  "warehouse_staff",
  "driver",
  "user",
];

/** Return true when an account has an admin role in either role field. */
export function hasAdminRole(user: {
  role?: string | null;
  roles?: string[] | null;
} | null | undefined): boolean {
  if (!user) return false;

  return (
    user.role === "admin" ||
    user.role === "super_admin" ||
    user.roles?.some((role) => role === "admin" || role === "super_admin") === true
  );
}

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
  super_admin: "Super Admin",
  branch_manager: "Branch Manager",
  manager: "Manager",
  finance_manager: "Finance Manager (Head Office)",
  branch_finance_manager: "Branch Finance Manager",
  senior_accountant: "Senior Accountant",
  junior_accountant: "Junior Accountant",
  director: "Finance Director",
  hr_manager: "HR Manager",
  hr_officer: "HR Officer",
  accountant: "Accountant",
  procurement: "Procurement & Purchases",
  procurement_officer: "Procurement & Purchases",
  hr: "HR Manager",
  cashier: "Cashier",
  warehouse_staff: "Warehouse Staff",
  driver: "Driver",
  user: "User",
  erp_admin: "ERP Administrator",
  ceo: "CEO / MD",
  auditor: "Auditor",
  sales_manager: "Sales Manager",
  sales_rep: "Sales Representative",
  warehouse_manager: "Warehouse Manager",
  inventory_manager: "Inventory Manager",
  store_clerk: "Store Clerk",
  purchasing_manager: "Purchasing Manager",
  purchasing_officer: "Purchasing Officer",
  petty_cash_custodian: "Petty Cash Custodian",
  it_support: "IT Support",
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
  canViewFinance: (roles: string | string[]) => checkRoleAccess(["admin", "accountant", "manager", "branch_manager", "finance_manager", "branch_finance_manager", "senior_accountant", "junior_accountant", "director"], Array.isArray(roles) ? roles : [roles]),
  canManageFinance: (roles: string | string[]) => checkRoleAccess(["admin", "accountant", "finance_manager", "branch_finance_manager", "senior_accountant", "director"], Array.isArray(roles) ? roles : [roles]),
  canAccessPOS: (roles: string | string[]) => checkRoleAccess(["admin", "super_admin", "erp_admin", "cashier", "sales_rep", "sales_manager", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canManageInventory: (roles: string | string[]) => checkRoleAccess(["admin", "super_admin", "erp_admin", "warehouse_staff", "warehouse_manager", "inventory_manager", "store_clerk", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canViewDeliveries: (roles: string | string[]) => checkRoleAccess(["admin", "driver", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canManageDeliveries: (roles: string | string[]) => checkRoleAccess(["admin", "manager", "branch_manager"], Array.isArray(roles) ? roles : [roles]),
  canAccessAdminPanel: (roles: string | string[]) => checkRoleAccess(["admin"], Array.isArray(roles) ? roles : [roles]),
  canViewReports: (roles: string | string[]) => checkRoleAccess(["admin", "manager", "branch_manager", "accountant", "finance_manager", "branch_finance_manager", "director"], Array.isArray(roles) ? roles : [roles]),
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
