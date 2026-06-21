/**
 * Next.js Edge Middleware — Route Access Control
 *
 * Runs before every request on matching paths.
 * Reads auth_user and auth_token from cookies set at login.
 * Enforces role-based access server-side — cannot be bypassed by client navigation.
 */
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_ROUTES: { path: string; allowedRoles: string[] }[] = [
  { path: "/dashboard/admin",      allowedRoles: ["admin", "super_admin"] },
  { path: "/dashboard/employees",  allowedRoles: ["admin", "super_admin", "hr", "branch_manager"] },
  { path: "/dashboard/finance",    allowedRoles: ["admin", "super_admin", "accountant", "manager", "branch_manager"] },
  { path: "/dashboard/payroll",    allowedRoles: ["admin", "super_admin", "hr", "accountant"] },
  { path: "/dashboard/fleet",      allowedRoles: ["admin", "super_admin", "driver", "manager", "branch_manager"] },
  { path: "/dashboard/pos",        allowedRoles: ["admin", "super_admin", "cashier", "manager", "branch_manager"] },
  { path: "/dashboard/inventory",  allowedRoles: ["admin", "super_admin", "warehouse_staff", "manager", "branch_manager"] },
  { path: "/dashboard/purchasing", allowedRoles: ["admin", "super_admin", "procurement", "manager", "branch_manager"] },
  { path: "/dashboard/branches",   allowedRoles: ["admin", "super_admin"] },
];

const ROLE_FALLBACK: Record<string, string> = {
  procurement:     "/dashboard/purchasing",
  cashier:         "/dashboard/pos",
  warehouse_staff: "/dashboard/inventory",
  driver:          "/dashboard/fleet",
  hr:              "/dashboard/employees",
  accountant:      "/dashboard/finance",
  manager:         "/dashboard",
  branch_manager:  "/dashboard",
  user:            "/dashboard",
};

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const authToken   = request.cookies.get("auth_token")?.value;
  const authUserRaw = request.cookies.get("auth_user")?.value;
  const isAuthenticated = !!(authToken && authUserRaw);

  let userRole: string | null = null;
  if (authUserRaw) {
    try {
      const user = JSON.parse(decodeURIComponent(authUserRaw));
      userRole = user?.role ?? null;
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
  if (matchedRoute && (!userRole || !matchedRoute.allowedRoles.includes(userRole))) {
    const fallback = ROLE_FALLBACK[userRole ?? ""] ?? "/dashboard";
    // Silent redirect — no toast, the link simply doesn't appear in the UI
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|auth|api).*)"],
};
