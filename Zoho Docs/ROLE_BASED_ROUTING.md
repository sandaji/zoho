# Role-Based Dashboard Routing

## Overview
The system now automatically redirects users to their appropriate dashboard based on their role when they log in or access the main dashboard route.

## Role-to-Dashboard Mapping

| Role | Login Redirect | Dashboard Page |
|------|---------------|----------------|
| **Admin** | `/dashboard/admin` | Admin Dashboard with full system overview |
| **Branch Manager** | `/dashboard/branch/manager` | Branch Manager Dashboard (Management System) |
| **Manager** | `/dashboard` | General Dashboard |
| **Accountant** | `/dashboard/finance` | Finance Dashboard |
| **HR** | `/dashboard/employees` | Employee Management Dashboard |
| **Cashier** | `/dashboard/pos` | Point of Sale Dashboard |
| **Warehouse Staff** | `/dashboard/inventory` | Inventory Management Dashboard |
| **Driver** | `/dashboard/fleet` | Fleet/Delivery Dashboard |

## How It Works

### 1. Login Redirect
When a user logs in at `/auth/login`, they are automatically redirected to their role-specific dashboard:

```typescript
// Login flow
login(token, user);
const redirectPath = getRoleDashboardRoute(user.role);
router.push(redirectPath);
```

**Example:**
- Branch Manager logs in → Redirected to `/dashboard/branch/manager`
- Cashier logs in → Redirected to `/dashboard/pos`
- Admin logs in → Redirected to `/dashboard/admin`

### 2. Dashboard Auto-Redirect
If a user with a specific role navigates directly to `/dashboard`, they are automatically redirected to their appropriate dashboard:

```typescript
useEffect(() => {
  if (!isLoading && user && user.role !== "manager") {
    const roleDashboard = getRoleDashboardRoute(user.role);
    if (roleDashboard !== "/dashboard") {
      router.push(roleDashboard);
    }
  }
}, [user, isLoading, router]);
```

### 3. Route Protection
Each dashboard route should have role-based protection to ensure users can only access their permitted areas.

## Implementation Files

### Core Files
1. **`frontend/lib/role-routing.ts`** - Central role routing utilities
   - `getRoleDashboardRoute()` - Get dashboard route for a role
   - `ROLE_DASHBOARD_ROUTES` - Role-to-route mapping
   - `rolePermissions` - Permission checks for features
   - `canAccessRoute()` - Check if user can access a route

2. **`frontend/app/auth/login/page.tsx`** - Login page with role-based redirect

3. **`frontend/app/dashboard/page.tsx`** - Main dashboard with auto-redirect

### Role Permissions Utility
The `role-routing.ts` file also includes permission checking functions:

```typescript
rolePermissions.canManageBranches(role)      // Admin only
rolePermissions.canManageEmployees(role)     // Admin, HR, Branch Manager
rolePermissions.canViewFinance(role)         // Admin, Accountant, Managers
rolePermissions.canAccessPOS(role)           // Admin, Cashier, Managers
rolePermissions.canManageInventory(role)     // Admin, Warehouse Staff, Managers
rolePermissions.canViewDeliveries(role)      // Admin, Driver, Managers
```

## Usage Examples

### Check if User Can Access Feature
```typescript
import { rolePermissions } from '@/lib/role-routing';

// In a component
const { user } = useAuth();

if (rolePermissions.canManageEmployees(user.role)) {
  // Show employee management options
}
```

### Get User's Dashboard Link
```typescript
import { getRoleDashboardRoute } from '@/lib/role-routing';

const dashboardLink = getRoleDashboardRoute(user.role);
```

### Check Route Access
```typescript
import { canAccessRoute } from '@/lib/role-routing';

if (canAccessRoute(user.role, '/dashboard/admin')) {
  // User can access admin panel
}
```

## Testing the Implementation

### Test Scenarios

1. **Branch Manager Login**
   ```
   Email: manager@example.com
   Password: password123
   Expected: Redirected to /dashboard/branch/manager
   Page Title: "Zoho ERP - Management System"
   ```

2. **Cashier Login**
   ```
   Email: cashier@example.com
   Password: password123
   Expected: Redirected to /dashboard/pos
   ```

3. **Admin Login**
   ```
   Email: admin@example.com
   Password: password123
   Expected: Redirected to /dashboard/admin
   ```

4. **Direct Navigation Test**
   - Log in as Branch Manager
   - Navigate to `/dashboard` directly
   - Should auto-redirect to `/dashboard/branch/manager`

5. **Unauthorized Access Test**
   - Log in as Cashier
   - Try to access `/dashboard/admin` directly
   - Should be blocked or redirected

## Configuration

### Adding a New Role
To add a new role with a specific dashboard:

1. **Update the mapping** in `role-routing.ts`:
```typescript
export const ROLE_DASHBOARD_ROUTES: Record<string, string> = {
  // ... existing roles
  new_role: "/dashboard/new-role-page",
};
```

2. **Add display name**:
```typescript
export const ROLE_DISPLAY_NAMES: Record<string, string> = {
  // ... existing names
  new_role: "New Role Title",
};
```

3. **Add permissions** (if needed):
```typescript
export const rolePermissions = {
  // ... existing permissions
  canAccessNewFeature: (role: string) => ["new_role", "admin"].includes(role),
};
```

4. **Create the dashboard page** at `app/dashboard/new-role-page/page.tsx`

5. **Update auth context** `lib/auth-context.tsx` to include the new role in the type:
```typescript
export type UserRole = 
  | "admin" 
  | "manager" 
  | "new_role" // Add here
  | ...
```

## Security Considerations

1. **Server-Side Validation**: Always validate user roles on the backend. Client-side routing is for UX only.

2. **Protected Routes**: Each dashboard route should check user permissions:
```typescript
useEffect(() => {
  if (!user || !canAccessRoute(user.role, router.pathname)) {
    router.push('/dashboard');
  }
}, [user]);
```

3. **API Endpoints**: Backend endpoints must enforce role-based access control using middleware.

## Troubleshooting

### Issue: User Not Redirecting After Login
- Check that `login()` is being called with correct user data
- Verify `user.role` matches a key in `ROLE_DASHBOARD_ROUTES`
- Check browser console for errors

### Issue: Redirect Loop
- Ensure the target dashboard doesn't have its own redirect logic
- Check that role permissions are correctly set
- Verify the route exists

### Issue: Unauthorized Access
- Implement route guards on protected pages
- Add middleware to check permissions before rendering
- Use `canAccessRoute()` utility

## Future Enhancements

1. **Dynamic Role Management**: Allow admins to create custom roles with custom dashboard routes
2. **Multi-Role Support**: Users with multiple roles could choose their dashboard
3. **Dashboard Preferences**: Let users set their preferred landing page
4. **Role Hierarchy**: Implement role inheritance (e.g., Admin has all Manager permissions)
5. **Audit Logging**: Track when users access different dashboards

## Related Documentation
- [Authentication Fix](./DASHBOARD_AUTH_FIX.md)
- [Branch Management](./BRANCH_MANAGEMENT_GUIDE.md)
- [Employee Management](./EMPLOYEE_MANAGEMENT_GUIDE.md)
