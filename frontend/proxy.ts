/**
 * Next.js Edge Proxy — Route Access Control
 *
 * Runs before every request on matching paths.
 * Reads auth_user and auth_token from cookies set at login.
 * Enforces role-based access server-side — cannot be bypassed by client navigation.
 */
import { NextRequest, NextResponse } from "next/server";
import { getRoleDashboardRoute } from "./lib/role-routing";

const PROTECTED_ROUTES: { path: string; allowedRoles: string[] }[] = [
  { path: "/dashboard/admin",      allowedRoles: ["admin", "super_admin"] },
  { path: "/dashboard/employees",  allowedRoles: ["admin", "super_admin", "hr", "hr_manager", "hr_officer", "branch_manager"] },
  { path: "/dashboard/finance",    allowedRoles: ["admin", "super_admin", "accountant", "manager", "branch_manager", "finance_manager", "branch_finance_manager", "senior_accountant", "junior_accountant", "director"] },
  { path: "/dashboard/payroll",    allowedRoles: ["admin", "super_admin", "hr", "hr_manager", "accountant", "finance_manager", "branch_finance_manager"] },
  { path: "/dashboard/fleet",      allowedRoles: ["admin", "super_admin", "driver", "manager", "branch_manager"] },
  { path: "/dashboard/pos",        allowedRoles: ["admin", "super_admin", "cashier", "manager", "branch_manager"] },
  { path: "/dashboard/inventory",  allowedRoles: ["admin", "super_admin", "warehouse_staff", "manager", "branch_manager"] },
  { path: "/dashboard/purchasing", allowedRoles: ["admin", "super_admin", "procurement", "manager", "branch_manager"] },
  { path: "/dashboard/branches",   allowedRoles: ["admin", "super_admin"] },
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authToken   = request.cookies.get("auth_token")?.value;
  const authUserRaw = request.cookies.get("auth_user")?.value;
  const isAuthenticated = !!(authToken && authUserRaw);

  // Read the FULL set of roles a user holds. Access can come from the
  // legacy single User.role column, the modern multi-role RBAC system
  // (RoleAssignment -> Role), or both — the login response already merges
  // both into `roles`. Checking only the singular `role` field here would
  // silently block anyone whose access was granted purely through the
  // newer RBAC system (e.g. finance_manager, branch_finance_manager,
  // senior_accountant, hr_manager — none of which exist as a legacy
  // User.role value for most accounts).
  let userRoles: string[] = [];
  if (authUserRaw) {
    try {
      const user = JSON.parse(decodeURIComponent(authUserRaw));
      if (Array.isArray(user?.roles) && user.roles.length > 0) {
        userRoles = user.roles;
      } else if (user?.role) {
        userRoles = [user.role];
      }
    } catch {
      // Malformed cookie — treat as unauthenticated
    }
  }

  // 1. All /dashboard routes require authentication
  if (pathname.startsWith("/dashboard") && !isAuthenticated) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Role-gated routes — find the most specific matching path
  const matchedRoute = PROTECTED_ROUTES.find((r) => pathname.startsWith(r.path));
  if (matchedRoute && !matchedRoute.allowedRoles.some((r) => userRoles.includes(r))) {
    // Reuse the same priority-based resolution used right after login
    // (role-routing.ts) rather than a second, separately-maintained
    // fallback map, so the two can't drift out of sync with each other.
    const fallback = userRoles.length > 0 ? getRoleDashboardRoute(userRoles) : "/dashboard";
    // Silent redirect — no toast, the link simply doesn't appear in the UI
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth|api).*)"],
};
