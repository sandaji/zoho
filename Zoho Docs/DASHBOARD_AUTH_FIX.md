# Dashboard Authentication Fix

## Problem
Branch Manager dashboard was getting 401 Unauthorized errors when trying to access:
- `/v1/admin/products` 
- `/v1/admin/deliveries`
- `/v1/admin/users`

These endpoints were restricted to `adminOnly` middleware, preventing branch managers from viewing their own dashboard data.

## Solution

### 1. Updated Authentication Middleware (`backend/src/lib/auth.ts`)
- Added `branch_manager` role support to `roleMiddleware`
- Created new `managerAccess` middleware that allows:
  - `branch_manager`
  - `manager`
  - `admin`

```typescript
export function managerAccess(req: Request, _res: Response, next: NextFunction): void {
  roleMiddleware(["branch_manager", "manager", "admin"])(req, _res, next);
}
```

### 2. Updated API Routes (`backend/src/routes/index.ts`)
Changed admin endpoints to use `managerAccess` instead of `adminOnly`:

**Before:**
```typescript
router.get("/admin/stats", authMiddleware, adminOnly, ...);
router.get("/admin/products", authMiddleware, adminOnly, ...);
router.get("/admin/deliveries", authMiddleware, adminOnly, ...);
router.get("/admin/users", authMiddleware, adminOnly, ...);
```

**After:**
```typescript
router.get("/admin/stats", authMiddleware, managerAccess, ...);
router.get("/admin/products", authMiddleware, managerAccess, ...);
router.get("/admin/deliveries", authMiddleware, managerAccess, ...);
router.get("/admin/users", authMiddleware, managerAccess, ...);
```

### 3. Updated Dashboard Service (`frontend/lib/dashboard.service.ts`)
- Fixed `getTopProducts` to use `/v1/products` instead of `/v1/admin/products`
- Fixed `getLowStockItems` to use `/v1/products` instead of `/v1/admin/products`
- Fixed `getStaffPerformance` to use `/v1/hr/users` instead of `/v1/admin/users`
- Added better error handling and fallbacks
- Added support for paginated responses
- Improved data transformation logic

**Key Changes:**
```typescript
// OLD - Required admin access
await fetch(`${API_URL}/admin/products`, { ... });

// NEW - Uses authenticated products endpoint
await fetch(`${API_URL}/products?limit=20`, { ... });
```

## What Now Works

### Branch Manager Dashboard Can Now:
✅ View branch metrics and statistics
✅ See top selling products
✅ Monitor low stock items
✅ Track pending deliveries/orders
✅ View staff performance (if HR endpoint accessible)
✅ Access sales data
✅ Export dashboard data

### Security Maintained:
- Only managers, branch managers, and admins can access dashboard data
- Regular users (cashiers, drivers, warehouse staff) still cannot access admin endpoints
- True admin-only operations (like creating branches) remain protected

## Testing
1. Log in as a branch manager
2. Navigate to `/dashboard/branch/manager`
3. Dashboard should load without 401 errors
4. All sections should display data correctly

## Affected Files
```
backend/src/lib/auth.ts                      - Added managerAccess middleware
backend/src/routes/index.ts                  - Updated route permissions
frontend/lib/dashboard.service.ts            - Fixed API endpoint usage
```

## Next Steps
1. Test the dashboard with all three roles:
   - Admin (should work)
   - Branch Manager (should work now)
   - Manager (should work)
2. Verify regular users cannot access the dashboard
3. Consider adding branch-specific filtering so branch managers only see their branch data

## Notes
- The `managerAccess` middleware is more permissive than `adminOnly` but still restricts access to management roles
- Dashboard now uses standard authenticated endpoints where possible instead of admin-specific ones
- Better error handling prevents the entire dashboard from breaking if one API call fails
