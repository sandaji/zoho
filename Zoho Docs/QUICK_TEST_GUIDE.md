# 🚀 Quick Start: Branch Manager Login Test

## Test Right Now!

### Step 1: Create Branch Manager Account (if needed)

**Option A: Via Database**
```sql
-- Update an existing user to branch_manager
UPDATE users 
SET role = 'branch_manager'
WHERE email = 'your-email@example.com';
```

**Option B: Via API**
```bash
POST http://localhost:5000/v1/auth/register
Content-Type: application/json

{
  "email": "manager@company.com",
  "password": "password123",
  "name": "Branch Manager",
  "role": "branch_manager",
  "branchId": "your-branch-id"
}
```

### Step 2: Test Login Flow

1. **Open Login Page**
   ```
   http://localhost:3000/auth/login
   ```

2. **Enter Credentials**
   - Email: Your branch manager email
   - Password: Your password

3. **Expected Result**
   ```
   ✅ Login successful
   ✅ Automatically redirected to: /dashboard/branch/manager
   ✅ Page title: "Zoho ERP - Management System"
   ✅ Sidebar shows "Management System" highlighted
   ```

### Step 3: Verify Sidebar

**Branch Manager Should See:**
```
✅ Management System (highlighted)
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

**Branch Manager Should NOT See:**
```
❌ Admin Dashboard (admin only)
❌ POS Dashboard (cashier only)
```

### Step 4: Test Navigation

Click through each module:
- [ ] Management System → `/dashboard/branch/manager`
- [ ] Point of Sale → `/dashboard/pos`
- [ ] Inventory → `/dashboard/inventory`
- [ ] Products → `/dashboard/products`
- [ ] Warehouses → `/dashboard/warehouse`
- [ ] Fleet & Deliveries → `/dashboard/fleet`
- [ ] Branches → `/dashboard/branches`
- [ ] Employees → `/dashboard/employees`
- [ ] Finance → `/dashboard/finance`
- [ ] Reports → `/dashboard/reports`
- [ ] Settings → `/dashboard/settings`

### Step 5: Test Mobile View

1. Open DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Select a mobile device
4. Test:
   - [ ] Menu button opens sidebar
   - [ ] Overlay closes sidebar
   - [ ] All menu items accessible
   - [ ] Active state shows correctly

## Quick Troubleshooting

### ❌ Not Redirecting to Branch Manager Dashboard?

**Check 1: User Role**
```javascript
// Open browser console
const user = JSON.parse(localStorage.getItem('auth_user'));
console.log(user.role); // Should be: "branch_manager"
```

**Check 2: Token**
```javascript
const token = localStorage.getItem('auth_token');
console.log(token ? 'Token exists' : 'No token');
```

**Check 3: Backend**
```bash
# Is backend running?
curl http://localhost:5000/health
```

### ❌ 401 Unauthorized Errors?

1. Restart backend server
2. Clear browser cache
3. Login again
4. Check backend logs

### ❌ Sidebar Not Showing Correct Modules?

1. Logout
2. Clear browser localStorage
3. Login again
4. Verify role in database

## Success Checklist

After logging in as branch manager:

- [ ] ✅ URL is `/dashboard/branch/manager`
- [ ] ✅ Page title shows "Zoho ERP - Management System"
- [ ] ✅ Sidebar shows "Management System" highlighted in blue
- [ ] ✅ Sidebar shows 11 menu items (including Settings)
- [ ] ✅ User info shows "Branch Manager" role badge
- [ ] ✅ Dashboard loads without 401 errors
- [ ] ✅ Can navigate to other modules
- [ ] ✅ Mobile menu works
- [ ] ✅ Logout works

## Test Other Roles

### Admin
```
Email: admin@company.com
Expected: /dashboard/admin
Modules: All 12 modules
```

### Cashier
```
Email: cashier@company.com
Expected: /dashboard/pos
Modules: 3 modules (POS Dashboard, POS, Settings)
```

### Driver
```
Email: driver@company.com
Expected: /dashboard/fleet
Modules: 3 modules (Deliveries, Fleet, Settings)
```

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| Redirect loop | Clear browser cache, check role in DB |
| 401 errors | Restart backend, verify managerAccess middleware |
| Wrong modules shown | Verify role matches expected role |
| Sidebar not responsive | Check Tailwind CSS is loaded |
| Active state wrong | Check route matching in isActive() |

## Demo Credentials Template

For testing purposes, you can use these demo accounts:

```typescript
// Admin
Email: admin@company.com
Password: Admin123!
Expected Dashboard: /dashboard/admin

// Branch Manager ⭐
Email: manager@company.com
Password: Manager123!
Expected Dashboard: /dashboard/branch/manager

// Cashier
Email: cashier@company.com
Password: Cashier123!
Expected Dashboard: /dashboard/pos

// Driver
Email: driver@company.com
Password: Driver123!
Expected Dashboard: /dashboard/fleet
```

## Need Help?

1. **Check Documentation**
   - [UNIFIED_SIDEBAR_COMPLETE.md](./UNIFIED_SIDEBAR_COMPLETE.md)
   - [ROLE_BASED_ROUTING.md](./ROLE_BASED_ROUTING.md)

2. **Check Console Logs**
   - Browser Console (F12)
   - Backend Terminal

3. **Verify Database**
   ```sql
   SELECT id, email, name, role, branch_id 
   FROM users 
   WHERE role = 'branch_manager';
   ```

4. **Test API Directly**
   ```bash
   # Test login
   curl -X POST http://localhost:5000/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"manager@company.com","password":"Manager123!"}'
   ```

---

## 🎉 Ready to Test!

Everything is configured. Just login as a branch manager and you should see:

```
1. Automatic redirect to /dashboard/branch/manager
2. "Management System" highlighted in sidebar
3. All branch manager modules visible
4. No 401 errors
5. Smooth navigation
```

Good luck! 🚀
