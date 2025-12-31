import { useAuth } from "@/lib/auth-context";

/**
 * Hook to check if the current user has a specific permission
 */
export function useHasPermission() {
  const { user } = useAuth();

  /**
   * Check if user has a specific permission
   */
  const hasPermission = (permissionCode: string): boolean => {
    if (!user || !user.permissions) return false;
    
    // Admin role bypass (optional, depends on if admin gets all permissions in DB)
    // If you want to be strict and only use DB permissions, remove the "admin" check
    if (user.role === 'admin') return true;

    return user.permissions.includes(permissionCode);
  };

  /**
   * Check if user has any of the provided permissions
   */
  const hasAnyPermission = (permissionCodes: string[]): boolean => {
    if (!user || !user.permissions) return false;
    if (user.role === 'admin') return true;

    return permissionCodes.some(code => user.permissions.includes(code));
  };

  return { hasPermission, hasAnyPermission };
}
