# Unified Sidebar & Role-Based Navigation - Complete Guide

## Overview
The Zoho ERP system now uses a single, unified sidebar that intelligently displays modules based on user roles. Branch managers and all other roles are correctly redirected to their appropriate dashboards upon login.

## What Was Fixed

### ✅ 1. Branch Manager Login Redirect
- Branch managers now go directly to `/dashboard/branch/manager` when logging in
- No more redirect to generic `/dashboard`
- Uses `router.replace()` to avoid history pollution

### ✅ 2. Unified Sidebar
- Merged `sidebar.tsx` and `sidebar.tsx` into one component
- Role-based menu items - each role sees only their permitted modules
- Intelligent active state detection to highlight current page
- Collapsible sidebar for desktop users
- Mobile-responsive with overlay

### ✅ 3. Role-Specific Dashboards
Each role gets a customized dashboard link in the sidebar:

| Role | Dashboard Label | Route |
|------|----------------|-------|
| **Admin** | Admin Dashboard | `/dashboard/admin` |
| **Branch Manager** | Management System | `/dashboard/branch/manager` ✨ |
| **Manager** | Dashboard | `/dashboard` |
| **Accountant** | Finance Dashboard | `/dashboard/finance` |
| **HR** | HR Dashboard | `/dashboard/employees` |
| **Cashier** | POS Dashboard | `/dashboard/pos` |
| **Warehouse Staff** | Inventory Dashboard | `/dashboard/inventory` |
| **Driver** | Deliveries | `/dashboard/fleet` |

## Role-Based Module Access

### Admin (Full Access)
```
✅ Admin Dashboard
✅ Point of Sale
✅ Inventory
✅ Products
✅ Warehouses
✅ Fleet & Deliveries
✅ Branches
✅ Employees
✅ Payroll
✅ Finance
✅ Reports
✅ Settings
```

### Branch Manager
```
✅ Management System (Dashboard)
✅ Point of Sale
✅ Inventory
✅ Products
✅ Warehouses
✅ Fleet & Deliveries
✅ Branches
✅ Employees
✅ Finance
✅ Reports
✅ Settings
```

### Manager
```
✅ Dashboard
✅ Point of Sale
✅ Inventory
✅ Products
✅ Warehouses
✅ Fleet & Deliveries
✅ Finance
✅ Reports
✅ Settings
```

### Accountant
```
✅ Finance Dashboard
✅ Payroll
✅ Finance
✅ Reports
✅ Settings
```

### HR Manager
```
✅ HR Dashboard
✅ Employees
✅ Payroll
✅ Settings
```

### Cashier
```
✅ POS Dashboard
✅ Point of Sale
✅ Settings
```

### Warehouse Staff
```
✅ Inventory Dashboard
✅ Inventory
✅ Warehouses
✅ Settings
```

### Driver
```
✅ Deliveries
✅ Fleet & Deliveries
✅ Settings
```

## Implementation Details

### Files Modified

```
✅ frontend/components/Sidebar.tsx      - Single unified sidebar
✅ frontend/app/dashboard/page.tsx              - Fixed redirect logic
✅ frontend/app/auth/login/page.tsx             - Role-based login redirect
✅ frontend/lib/role-routing.ts                 - Role routing utilities
✅ frontend/lib/auth-context.tsx                - All role types
✅ backend/src/lib/auth.ts                      - Manager access middleware
✅ backend/src/routes/index.ts                  - Updated permissions
```

### Files Deprecated (Can Be Deleted)

```
❌ frontend/components/Sidebar.tsx              - Old sidebar (not used)
❌ frontend/components/admin/AdminSidebar.tsx   - Admin-specific (not used)
```

## How It Works

### Login Flow
1. User enters credentials at `/auth/login`
2. API validates and returns user data with role
3. `getRoleDashboardRoute(user.role)` determines target
4. User is redirected to role-specific dashboard
5. Sidebar renders with role-appropriate modules

### Sidebar Logic
```typescript
// 1. Get menu items based on role
const getMenuItems = (): MenuItem[] => {
  const items: MenuItem[] = [];
  
  // Add dashboard based on role
  if (user.role === "branch_manager") {
    items.push({
      label: "Management System",
      href: "/dashboard/branch/manager",
      icon: TrendingUp,
      roles: ["branch_manager"],
    });
  }
  
  // Add modules based on permissions
  if (["admin", "branch_manager", "manager"].includes(user.role)) {
    items.push({ label: "Point of Sale", ... });
  }
  
  return items.filter(item => item.roles.includes(user.role));
};

// 2. Check if route is active
const isActive = (href: string) => {
  if (href === "/dashboard/branch/manager") {
    return pathname === "/dashboard/branch/manager";
  }
  return pathname.startsWith(href);
};
```

### Dashboard Redirect Logic
```typescript
useEffect(() => {
  if (!isLoading && user) {
    const roleDashboard = getRoleDashboardRoute(user.role);
    
    // Only redirect if not already on the right dashboard
    if (roleDashboard !== "/dashboard") {
      router.replace(roleDashboard);
    }
  }
}, [user, isLoading, router]);
```

## Testing Checklist

### ✅ Branch Manager Flow
- [ ] Log in as branch manager
- [ ] Confirm redirect to `/dashboard/branch/manager`
- [ ] Verify sidebar shows "Management System" as active
- [ ] Check all accessible modules are visible
- [ ] Confirm restricted modules are hidden
- [ ] Test navigation between modules
- [ ] Verify logout works correctly

### ✅ Other Roles
- [ ] Admin → `/dashboard/admin`
- [ ] Manager → `/dashboard`
- [ ] Accountant → `/dashboard/finance`
- [ ] HR → `/dashboard/employees`
- [ ] Cashier → `/dashboard/pos`
- [ ] Warehouse Staff → `/dashboard/inventory`
- [ ] Driver → `/dashboard/fleet`

### ✅ Mobile Experience
- [ ] Sidebar menu button works
- [ ] Overlay closes sidebar when clicked
- [ ] All menu items are accessible
- [ ] Active state shows correctly
- [ ] Logout button is accessible

### ✅ Desktop Experience
- [ ] Sidebar collapse button works
- [ ] Collapsed sidebar shows icons only
- [ ] Tooltips appear on hover (collapsed)
- [ ] Badges display correctly
- [ ] Active highlighting works

## Features

### 🎨 Visual Enhancements
- **Active State**: Blue highlight with shadow for current page
- **Badges**: Red notification badges for pending items
- **Hover Effects**: Smooth transitions on hover
- **Role Badge**: Displays user's role in sidebar header
- **Collapse Mode**: Desktop users can minimize sidebar

### 📱 Responsive Design
- **Mobile**: Full-screen overlay sidebar
- **Tablet**: Collapsible sidebar
- **Desktop**: Persistent sidebar with collapse option
- **Touch-Friendly**: Large touch targets for mobile

### 🔒 Security Features
- **Role Validation**: Server-side and client-side checks
- **Route Protection**: Middleware validates access
- **Token-Based**: JWT authentication
- **Automatic Logout**: On token expiration

### 📊 Real-Time Updates
- **Live Badges**: Refresh stats every 60 seconds
- **Pending Items**: Shows count of pending deliveries
- **Low Stock**: Displays low stock item count
- **User Counts**: Shows total users and branches

## Customization

### Adding a New Role
1. Update `UserRole` type in `auth-context.tsx`
2. Add role to `ROLE_DASHBOARD_ROUTES` in `role-routing.ts`
3. Add role-specific dashboard case in sidebar
4. Create dashboard page component
5. Update backend role validation

### Adding a New Module
```typescript
// In sidebar.tsx, add to getMenuItems()
if (["admin", "branch_manager"].includes(user.role)) {
  items.push({
    label: "New Module",
    href: "/dashboard/new-module",
    icon: NewIcon,
    roles: ["admin", "branch_manager"],
    badge: stats.newModuleCount, // optional
  });
}
```

### Changing Module Permissions
Simply update the role array in the module definition:
```typescript
{
  label: "Finance",
  roles: ["admin", "branch_manager", "accountant"], // Add/remove roles
}
```

## Troubleshooting

### Issue: Branch Manager Redirects to Wrong Dashboard
**Solution**: Check `role-routing.ts` has correct mapping:
```typescript
export const ROLE_DASHBOARD_ROUTES = {
  branch_manager: "/dashboard/branch/manager", // Must be exact
};
```

### Issue: Sidebar Shows Wrong Modules
**Solution**: Verify role in auth token matches expected role:
```typescript
// Check in browser console
const user = JSON.parse(localStorage.getItem("auth_user"));
console.log(user.role); // Should be "branch_manager"
```

### Issue: Active State Not Highlighting
**Solution**: Check route path in `isActive()` function matches exactly

### Issue: 401 Unauthorized on Module Access
**Solution**: Verify backend `managerAccess` middleware includes the role

## Best Practices

1. **Always use role arrays**: Don't hardcode role checks
2. **Test all roles**: Verify each role sees correct modules
3. **Use descriptive labels**: Make navigation intuitive
4. **Add tooltips**: For collapsed sidebar icons
5. **Keep consistent**: Use same icons for related modules
6. **Mobile-first**: Ensure touch targets are large enough

## Future Enhancements

- [ ] Customizable sidebar per user
- [ ] Drag-and-drop module reordering
- [ ] Favorite/pinned modules
- [ ] Module search functionality
- [ ] Keyboard shortcuts
- [ ] Dark/light theme toggle
- [ ] Multi-language support
- [ ] Module notifications center

## Related Documentation
- [Role-Based Routing Guide](./ROLE_BASED_ROUTING.md)
- [Dashboard Auth Fix](./DASHBOARD_AUTH_FIX.md)
- [Branch Manager Login Setup](./BRANCH_MANAGER_LOGIN_SETUP.md)

## Support
For issues or questions:
1. Verify user role in localStorage
2. Check browser console for errors
3. Confirm backend is running
4. Verify API token is valid
5. Review backend logs for auth errors
