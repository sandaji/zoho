import { useAuth } from "@/lib/auth-context";
import { useCallback } from "react";

/**
 * Hook to check if the current user has a specific permission
 */
export function useHasPermission() {
  const { user } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permissionCode: string): boolean => {
    if (!user || !user.permissions) return false;
    
    return user.permissions.includes(permissionCode);
  }, [user]);

  /**
   * Check if user has any of the provided permissions
   */
  const hasAnyPermission = useCallback((permissionCodes: string[]): boolean => {
    if (!user || !user.permissions) return false;

    return permissionCodes.some(code => user.permissions.includes(code));
  }, [user]);

  return { hasPermission, hasAnyPermission };
}
