import { useAuth } from "@/lib/auth-context";
import { hasAdminRole } from "@/lib/role-routing";
import { useCallback } from "react";

/**
 * Hook to check if the current user has a specific permission
 */
export function useHasPermission() {
  const { user } = useAuth();
  const isAdmin = hasAdminRole(user);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (isAdmin) return true;
    if (!user || !user.permissions) return false;
    
    return user.permissions.includes(permissionCode);
  }, [isAdmin, user]);

  /**
   * Check if user has any of the provided permissions
   */
  const hasAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    if (isAdmin) return true;
    if (!user || !user.permissions) return false;

    return permissionCodes.some(code => user.permissions.includes(code));
  }, [isAdmin, user]);

  return { hasPermission, hasAnyPermission };
}
