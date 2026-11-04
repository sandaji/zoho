import type { TokenPayload } from "../../types";

const ADMIN_ROLES = ["admin", "super_admin", "erp_admin"];

export function hasAdminRole(user: Pick<TokenPayload, "role" | "roles">): boolean {
  return (
    ADMIN_ROLES.includes(user.role) ||
    user.roles?.some((role) => ADMIN_ROLES.includes(role)) === true
  );
}

export function hasAnyRole(
  user: Pick<TokenPayload, "role" | "roles">,
  allowedRoles: string[],
): boolean {
  return (
    allowedRoles.includes(user.role) ||
    user.roles?.some((role) => allowedRoles.includes(role)) === true
  );
}
