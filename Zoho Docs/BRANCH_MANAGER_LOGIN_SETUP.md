# Quick Start: Branch Manager Login Redirect

## What Was Implemented

Branch managers now automatically get redirected to their management dashboard when they log in.

## Changes Made

### 1. ✅ Updated Login Page (`frontend/app/auth/login/page.tsx`)
- Added role-based redirect logic
- Branch managers now go to `/dashboard/branch/manager` after login
- Each role gets redirected to their appropriate dashboard

### 2. ✅ Created Role Routing Utility (`frontend/lib/role-routing.ts`)
- Central configuration for all role-based routing
- Permission checking functions
- Easy to add new roles and dashboards

### 3. ✅ Updated Main Dashboard (`frontend/app/dashboard/page.tsx`)
- Auto-redirects users if they navigate to `/dashboard` directly
- Ensures users always land on their appropriate dashboard

### 4. ✅ Updated Auth Context (`frontend/lib/auth-context.tsx`)
- Added all role types: branch_manager, accountant, hr, etc.
- Type-safe role handling

### 5. ✅ Fixed Backend Permissions (`backend/src/lib/auth.ts` & `backend/src/routes/index.ts`)
- Added `managerAccess` middleware
- Branch managers can now access necessary endpoints
- Fixed 401 Unauthorized errors

## Test It Now!

### Branch Manager Login
1. Navigate to: `http://localhost:3000/auth/login`
2. Use credentials:
   - Email: `manager@example.com` (or create a branch manager user)
   - Password: `password123`
3. After login, you should be automatically redirected to:
   - **`http://localhost:3000/dashboard/branch/manager`**
   - Page title: **"Zoho ERP - Management System"**

### Other Role Redirects
- **Admin** → `/dashboard/admin`
- **Accountant** → `/dashboard/finance`
- **HR** → `/dashboard/employees`
- **Cashier** → `/dashboard/pos`
- **Warehouse Staff** → `/dashboard/inventory`
- **Driver** → `/dashboard/fleet`
- **Manager** → `/dashboard` (general)

## How to Create a Branch Manager User

If you don't have a branch manager account yet:

### Option 1: Using the Backend API
```bash
POST http://localhost:5000/v1/auth/register
Content-Type: application/json

{
  "email": "branchmanager@example.com",
  "password": "password123",
  "name": "Branch Manager",
  "role": "branch_manager",
  "branchId": "your-branch-id"
}
```

### Option 2: Using Database
```sql
-- First create a branch if you don't have one
INSERT INTO branches (id, code, name, city, is_active)
VALUES ('branch-001', 'NBI001', 'Nairobi Main', 'Nairobi', true);

-- Then create the user
INSERT INTO users (id, email, password, name, role, branch_id, is_active)
VALUES (
  'user-001',
  'manager@example.com',
  '$2b$10$hashedpassword', -- Use bcrypt to hash 'password123'
  'John Manager',
  'branch_manager',
  'branch-001',
  true
);
```

### Option 3: Update Existing User
```sql
UPDATE users 
SET role = 'branch_manager'
WHERE email = 'your-email@example.com';
```

## Verify Everything Works

### ✅ Checklist
- [ ] Branch manager can log in
- [ ] Gets redirected to `/dashboard/branch/manager` automatically
- [ ] Dashboard loads without 401 errors
- [ ] Can see branch metrics and stats
- [ ] Can view products, deliveries, and staff performance
- [ ] Navigation works correctly

### 🔍 Debugging
If something doesn't work:

1. **Check Browser Console** - Look for errors
2. **Check Network Tab** - Verify API calls return 200, not 401
3. **Check Token** - Open browser dev tools → Application → Local Storage → Verify `auth_token` exists
4. **Check User Role** - Local Storage → `auth_user` → Verify `role` is `"branch_manager"`
5. **Restart Backend** - Ensure backend has the latest auth middleware changes

## Files Modified

```
✅ frontend/app/auth/login/page.tsx          - Login with role redirect
✅ frontend/app/dashboard/page.tsx           - Auto-redirect by role
✅ frontend/lib/auth-context.tsx             - Added all role types
✅ frontend/lib/role-routing.ts              - NEW: Role routing utilities
✅ frontend/lib/dashboard.service.ts         - Fixed API endpoints
✅ backend/src/lib/auth.ts                   - Added managerAccess middleware
✅ backend/src/routes/index.ts               - Updated route permissions
```

## Next Steps

1. **Test with Real Users**: Create branch manager accounts and test the flow
2. **Customize Dashboard**: Update the branch manager dashboard with actual branch-specific data
3. **Add Branch Filtering**: Show only data relevant to the manager's branch
4. **Implement Permissions**: Add permission checks on all dashboard features
5. **Add Role Management**: Let admins assign and change user roles

## Documentation
- [Full Role-Based Routing Guide](./ROLE_BASED_ROUTING.md)
- [Dashboard Auth Fix](./DASHBOARD_AUTH_FIX.md)
- [Branch Management](./BRANCH_MANAGEMENT_GUIDE.md)

## Support
If you encounter issues, check:
1. Backend is running on port 5000
2. Frontend is running on port 3000
3. Database migrations are up to date
4. User has correct role in database
